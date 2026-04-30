const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");
const { getSetting } = require("../config/librarySettings");

const { RenewalRequest, Issue, Borrower, Copy, Book } = require("../models");

// ── Shared include for full request details ──────────────────────────────────
const fullInclude = [
  {
    model: Issue,
    include: [
      { model: Copy, include: [{ model: Book, attributes: ["title", "isbn"] }] },
    ],
  },
  {
    model: Borrower,
    attributes: ["borrower_id", "borrower_name", "email", "rf_id"],
  },
];

// ================= GET ALL (librarian) =================
router.get("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const requests = await RenewalRequest.findAll({
      where,
      include: fullInclude,
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("GET RENEWAL REQUESTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= GET MY REQUESTS (member) =================
router.get("/my", auth, async (req, res) => {
  try {
    const borrower = await Borrower.findOne({ where: { user_id: req.user.id } });
    if (!borrower) return res.json({ success: true, requests: [] });

    const requests = await RenewalRequest.findAll({
      where: { borrower_id: borrower.borrower_id },
      include: [
        {
          model: Issue,
          include: [
            { model: Copy, include: [{ model: Book, attributes: ["title"] }] },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("GET MY RENEWAL REQUESTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE (member) =================
router.post("/", auth, async (req, res) => {
  try {
    const { issue_id } = req.body;
    if (!issue_id) return res.status(400).json({ error: "issue_id is required" });

    const borrower = await Borrower.findOne({ where: { user_id: req.user.id } });
    if (!borrower) return res.status(403).json({ error: "No borrower profile found" });

    const issue = await Issue.findOne({
      where: { issue_id, borrower_id: borrower.borrower_id },
    });
    if (!issue) return res.status(404).json({ error: "Issue not found or not yours" });
    if (issue.check_in) return res.status(400).json({ error: "Book has already been returned" });

    const existing = await RenewalRequest.findOne({
      where: { issue_id, status: "pending" },
    });
    if (existing) return res.status(400).json({ error: "A renewal request is already pending for this book" });

    const request = await RenewalRequest.create({
      issue_id,
      borrower_id: borrower.borrower_id,
      copy_id: issue.copy_id,
    });

    res.status(201).json({ success: true, message: "Renewal request submitted", request });
  } catch (err) {
    console.error("CREATE RENEWAL REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= APPROVE (librarian) =================
router.put("/:id/approve", auth, requireLibrarian, async (req, res) => {
  const transaction = await RenewalRequest.sequelize.transaction();

  try {
    const request = await RenewalRequest.findByPk(req.params.id, {
      include: [
        {
          model: Issue,
          include: [{ model: Borrower }],
        },
      ],
      transaction,
    });

    // ✅ rollback before every early return
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "pending") {
      await transaction.rollback();
      return res.status(400).json({ error: "Request is no longer pending" });
    }

    const issue = request.Issue;

    if (!issue || issue.check_in) {
      await transaction.rollback();
      return res.status(400).json({ error: "Issue not found or already returned" });
    }

    const borrower = issue.Borrower;
    const today = new Date();
    const warnings = [];

    // 1️⃣ Outstanding fines check
    const outstandingFines =
      (await Issue.sum("fine", {
        where: {
          borrower_id: borrower.borrower_id,
          fine: { [Op.gt]: 0 },
          fine_paid: false,
        },
        transaction,
      })) || 0;

    if (outstandingFines > 0)
      warnings.push(`Outstanding fines: ₹${outstandingFines}`);

    // 2️⃣ Overdue check
    if (new Date(issue.due_date) < today) {
      const daysOverdue = Math.ceil(
        (today - new Date(issue.due_date)) / (1000 * 60 * 60 * 24)
      );
      warnings.push(`Book is ${daysOverdue} days overdue`);
    }

    // 3️⃣ Renew limit check
    const MAX_RENEWALS = getSetting("MAX_RENEWALS");
    if (issue.renew_count >= MAX_RENEWALS)
      warnings.push(`Renew limit reached (${MAX_RENEWALS} max)`);

    // 4️⃣ Membership expiry check
    if (
      borrower.membership_expiry &&
      new Date(borrower.membership_expiry) < today
    )
      warnings.push("Membership expired");

    // ✅ rollback before returning a 400 with warnings
    if (warnings.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: "Renewal blocked due to policy rules",
        warnings,
      });
    }

    // 5️⃣ Calculate new due date
    const RENEWAL_PERIOD = getSetting("RENEWAL_PERIOD_DAYS");
    const newDue = new Date(issue.due_date);
    newDue.setDate(newDue.getDate() + RENEWAL_PERIOD);

    const newRenewCount = issue.renew_count + 1;

    // 6️⃣ Update issue
    await issue.update(
      { due_date: newDue, renew_count: newRenewCount },
      { transaction }
    );

    // 7️⃣ Update request
    await request.update(
      { status: "approved", processed_by: req.user.id },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: "Renewal approved",
      new_due_date: newDue,
      renew_count: newRenewCount,
      renewal_period_days: RENEWAL_PERIOD,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("APPROVE RENEWAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DENY (librarian) =================
router.put("/:id/deny", auth, requireLibrarian, async (req, res) => {
  try {
    const { notes } = req.body;
    const request = await RenewalRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "pending")
      return res.status(400).json({ error: "Request is no longer pending" });

    await request.update({ status: "denied", notes: notes || null });

    res.json({ success: true, message: "Renewal denied" });
  } catch (err) {
    console.error("DENY RENEWAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;