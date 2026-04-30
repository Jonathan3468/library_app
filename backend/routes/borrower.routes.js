//borrower.routes.js
const express = require("express");
const router = express.Router();
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");
const { Borrower, Issue, Copy, Book, FinePayment, User } = require("../models");
const { Op } = require("sequelize");
const { sendFineCreatedEmail, sendFinePaidEmail } = require("../services/notificationService");
const { getSetting } = require("../config/librarySettings");
const { log, ACTIONS } = require("../services/auditService");

// ================= SEARCH BORROWERS =================
router.get("/search", auth, requireLibrarian, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, borrowers: [] });

    const borrowers = await Borrower.findAll({
      where: {
        [Op.or]: [
          { borrower_name: { [Op.like]: `%${q}%` } },
          { email:         { [Op.like]: `%${q}%` } },
          { borrower_id:   { [Op.like]: `%${q}%` } },
          { rf_id:         { [Op.like]: `%${q}%` } },
        ],
      },
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
      attributes: ["borrower_id", "borrower_name", "email", "rf_id", "phone", "user_id"],
      limit: 10,
      order: [["borrower_name", "ASC"]],
    });

    res.json({ success: true, borrowers });
  } catch (err) {
    console.error("SEARCH BORROWERS ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= LOOKUP BY RF_ID =================
router.get("/rf/:rfId", auth, requireLibrarian, async (req, res) => {
  try {
    const borrower = await Borrower.findOne({
      where: { rf_id: req.params.rfId },
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
      attributes: ["borrower_id", "borrower_name", "email", "rf_id", "phone", "user_id"],
    });
    if (!borrower) return res.status(404).json({ success: false, error: "Borrower not found" });
    res.json({ success: true, borrower });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET ALL BORROWERS =================
router.get("/", auth, requireLibrarian, async (req, res) => {
  try {
    const borrowers = await Borrower.findAll({
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
      order: [["borrower_name", "ASC"]],
    });
    res.json(borrowers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET BORROWER FINES =================
router.get("/:id/fines", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const borrower = await Borrower.findByPk(id, {
      include: [{ model: User, as: "user", attributes: ["id"] }],
    });
    if (!borrower) return res.status(404).json({ success: false, error: "Borrower not found" });

    const isOwnData = borrower.user_id && borrower.user_id === req.user.id;
    if (!["admin", "librarian"].includes(req.user.role) && !isOwnData) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const issueFines = await Issue.findAll({
      where: { borrower_id: id, fine: { [Op.gt]: 0 } },
      include: [{ model: Copy, include: [{ model: Book, attributes: ["title"] }] }],
      order: [["check_out", "DESC"]],
    });

    let customFines = [];
    try {
      customFines = await FinePayment.findAll({
        where: { borrower_id: id },
        order: [["createdAt", "DESC"]],
      });
    } catch {}

    const fines = [
      ...issueFines.map(issue => ({
        type: "issue_fine", issue_id: issue.issue_id,
        book_title: issue.Copy?.Book?.title || "N/A",
        fine: issue.fine,
        status: issue.fine_paid ? (issue.waive_reason ? "waived" : "paid") : "pending",
        due_date: issue.due_date, check_in: issue.check_in,
        payment_date: issue.payment_date, payment_method: issue.payment_method,
      })),
      ...customFines.map(cf => ({
        type: "custom_fine", payment_id: cf.payment_id,
        reason: cf.reason, amount: cf.amount, status: cf.status,
        payment_date: cf.payment_date, payment_method: cf.payment_method,
      })),
    ];

    res.json({ success: true, fines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET BORROWER ISSUES =================
router.get("/:id/issues", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const filter = req.query.filter || "all";

    const borrower = await Borrower.findByPk(id);
    if (!borrower) return res.status(404).json({ success: false, error: "Borrower not found" });

    const isOwnData = borrower.user_id && borrower.user_id === req.user.id;
    if (!["admin", "librarian"].includes(req.user.role) && !isOwnData) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const where = { borrower_id: id };
    if (filter === "returned") where.check_in = { [Op.ne]: null };
    if (filter === "active")   where.status   = "issued";

    const { count, rows } = await Issue.findAndCountAll({
      where,
      include: [{
        model: Copy,
        include: [{ model: Book, attributes: ["book_id", "title", "isbn"] }],
        attributes: ["copy_id", "copy_code"],
      }],
      order:  [["check_out", "DESC"]],
      limit, offset,
    });

    const issues = rows.map(issue => ({
      issue_id:    issue.issue_id,
      copy_code:   issue.Copy?.copy_code,
      book_id:     issue.Copy?.Book?.book_id,
      book_title:  issue.Copy?.Book?.title,
      book_isbn:   issue.Copy?.Book?.isbn,
      check_out:   issue.check_out,
      check_in:    issue.check_in,
      due_date:    issue.due_date,
      status:      issue.status,
      fine:        issue.fine || 0,
      fine_paid:   issue.fine_paid,
      days_kept:   issue.check_in
        ? Math.ceil((new Date(issue.check_in) - new Date(issue.check_out)) / (1000 * 60 * 60 * 24))
        : null,
      was_overdue: issue.check_in
        ? new Date(issue.check_in) > new Date(issue.due_date)
        : new Date() > new Date(issue.due_date),
    }));

    res.json({
      success: true, issues,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit), hasMore: page * limit < count },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET OWN BORROWER PROFILE (MEMBER) =================
router.get("/me", auth, async (req, res) => {
  try {
    const borrower = await Borrower.findOne({
      where: { user_id: req.user.id },
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
    });
    if (!borrower) return res.status(404).json({ success: false, error: "No borrower profile found for this account" });

    res.json({ success: true, borrower });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ================= GET SINGLE BORROWER =================
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const borrower = await Borrower.findByPk(id, {
      include: [{ model: User, as: "user", attributes: ["id", "name", "email", "role"] }],
    });
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });

    const isOwnData = borrower.user_id && borrower.user_id === req.user.id;
    if (!["admin", "librarian"].includes(req.user.role) && !isOwnData) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const activeIssues = await Issue.findAll({
      where: { borrower_id: borrower.borrower_id, status: "issued" },
      include: [{
        model: Copy,
        include: [{ model: Book, attributes: ["book_id", "title"] }],
        attributes: ["copy_id", "copy_code"],
      }],
      order: [["due_date", "ASC"]],
    });

    const issueFines = await Issue.sum("fine", {
      where: { borrower_id: borrower.borrower_id, fine: { [Op.gt]: 0 }, fine_paid: false },
    }) || 0;

    let customFines = 0;
    try {
      customFines = await FinePayment.sum("amount", {
        where: { borrower_id: borrower.borrower_id, status: "pending" },
      }) || 0;
    } catch {}

    const totalBorrowed = await Issue.count({ where: { borrower_id: borrower.borrower_id } });

    res.json({
      success: true, borrower, active_issues: activeIssues,
      outstanding_fines: issueFines + customFines,
      total_borrowed: totalBorrowed, is_own_data: isOwnData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ASSIGN RF_ID (ADMIN) =================
router.post("/assign-rfid", auth, requireAdmin, async (req, res) => {
  try {
    const { user_id, rf_id, phone, address } = req.body;
    if (!user_id || !rf_id) return res.status(400).json({ error: "User ID and RF ID are required" });

    const user = await User.findByPk(user_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingBorrower = await Borrower.findOne({ where: { user_id } });
    if (existingBorrower) return res.status(400).json({ error: "This user already has a borrower profile" });

    const rfIdExists = await Borrower.findOne({ where: { rf_id } });
    if (rfIdExists) return res.status(400).json({ error: "This RF ID is already assigned" });

    const membershipExpiry = new Date();
    membershipExpiry.setFullYear(membershipExpiry.getFullYear() + getSetting("MEMBERSHIP_DURATION_YEARS"));

    const borrower = await Borrower.create({
      user_id, borrower_name: user.name, email: user.email,
      phone: phone || null, address: address || null, rf_id, membership_expiry: membershipExpiry,
    });

    await log({
      action: ACTIONS.BORROWER_CREATED, user: req.user,
      targetType: "BORROWER", targetId: borrower.borrower_id,
      details: { borrower_name: borrower.borrower_name, rf_id, method: "assign_rfid" },
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: `RF ID assigned to ${user.name} successfully`, borrower });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE BORROWER =================
router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { borrower_name, rf_id, email, phone, address, user_id } = req.body;
    if (!borrower_name) return res.status(400).json({ error: "Borrower name is required" });

    if (user_id) {
      const user = await User.findByPk(user_id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const existing = await Borrower.findOne({ where: { user_id } });
      if (existing) return res.status(400).json({ error: "This user already has a borrower profile" });
    }

    const membershipExpiry = new Date();
    membershipExpiry.setFullYear(membershipExpiry.getFullYear() + getSetting("MEMBERSHIP_DURATION_YEARS"));

    const borrower = await Borrower.create({
      user_id: user_id || null, borrower_name, email, phone, address, rf_id, membership_expiry: membershipExpiry,
    });

    await log({
      action: ACTIONS.BORROWER_CREATED, user: req.user,
      targetType: "BORROWER", targetId: borrower.borrower_id,
      details: { borrower_name, rf_id: rf_id || null },
      ip: req.ip,
    });

    res.status(201).json({ success: true, message: "Borrower created successfully", borrower });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= BULK CSV IMPORT =================
// Frontend sends pre-parsed JSON array — no multer needed.
router.post("/import", auth, requireLibrarian, async (req, res) => {
  try {
    const { borrowers: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No borrower rows provided" });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: "Maximum 500 rows per import" });
    }

    const membershipExpiry = new Date();
    membershipExpiry.setFullYear(membershipExpiry.getFullYear() + getSetting("MEMBERSHIP_DURATION_YEARS"));

    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      if (!row.borrower_name?.trim()) {
        results.errors.push({ row: rowNum, error: "Missing borrower_name" });
        results.skipped++;
        continue;
      }

      // Skip if RF ID already exists
      if (row.rf_id?.trim()) {
        const existing = await Borrower.findOne({ where: { rf_id: row.rf_id.trim() } });
        if (existing) {
          results.errors.push({ row: rowNum, error: `RF ID "${row.rf_id}" already assigned to ${existing.borrower_name}` });
          results.skipped++;
          continue;
        }
      }

      try {
        await Borrower.create({
          borrower_name:     row.borrower_name.trim(),
          rf_id:             row.rf_id?.trim()      || null,
          email:             row.email?.trim()       || null,
          phone:             row.phone?.trim()       || null,
          address:           row.address?.trim()     || null,
          membership_expiry: membershipExpiry,
          user_id:           null,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, error: err.message });
        results.skipped++;
      }
    }

    await log({
      action: ACTIONS.CSV_IMPORT, user: req.user,
      targetType: "BORROWER", targetId: null,
      details: { total: rows.length, created: results.created, skipped: results.skipped },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
      ...results,
    });
  } catch (err) {
    console.error("CSV IMPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE BORROWER =================
router.put("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const borrower = await Borrower.findByPk(req.params.id);
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });

    if (req.body.user_id && req.body.user_id !== borrower.user_id) {
      return res.status(400).json({ error: "Cannot change user association after creation" });
    }

    const before = { borrower_name: borrower.borrower_name, email: borrower.email, rf_id: borrower.rf_id };
    await borrower.update(req.body);

    await log({
      action: ACTIONS.BORROWER_UPDATED, user: req.user,
      targetType: "BORROWER", targetId: borrower.borrower_id,
      details: { before, after: { borrower_name: borrower.borrower_name, email: borrower.email, rf_id: borrower.rf_id } },
      ip: req.ip,
    });

    res.json({ success: true, message: "Borrower updated successfully", borrower });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE BORROWER =================
router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const borrower = await Borrower.findByPk(req.params.id);
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });

    const activeIssues = await Issue.count({ where: { borrower_id: req.params.id, status: "issued" } });
    if (activeIssues > 0) return res.status(400).json({ error: "Cannot delete borrower with active issues" });

    const outstanding = await Issue.sum("fine", {
      where: { borrower_id: req.params.id, fine: { [Op.gt]: 0 }, fine_paid: false },
    }) || 0;
    if (outstanding > 0) return res.status(400).json({ error: `Cannot delete borrower with outstanding fines (₹${outstanding})` });

    const name = borrower.borrower_name;
    const id   = borrower.borrower_id;


    const customFines = await FinePayment.count({
      where: { borrower_id: req.params.id, status: "pending" }
    });
    if (customFines > 0) return res.status(400).json({
      error: "Cannot delete borrower with pending custom or replacement fines"
    });

    await FinePayment.destroy({ 
      where: { borrower_id: req.params.id } 
    });
    
    await borrower.destroy();

    await log({
      action: ACTIONS.BORROWER_DELETED, user: req.user,
      targetType: "BORROWER", targetId: id,
      details: { borrower_name: name },
      ip: req.ip,
    });

    res.json({ success: true, message: "Borrower deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RENEW MEMBERSHIP =================
router.put("/renew/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const borrower = await Borrower.findByPk(req.params.id);
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let expiryDate = borrower.membership_expiry ? new Date(borrower.membership_expiry) : null;
    if (expiryDate) expiryDate.setHours(0, 0, 0, 0);
    const baseDate  = expiryDate && expiryDate >= today ? expiryDate : today;
    const newExpiry = new Date(baseDate);
    newExpiry.setFullYear(baseDate.getFullYear() + 1);

    await borrower.update({ membership_expiry: newExpiry });

    await log({
      action: ACTIONS.MEMBERSHIP_RENEWED, user: req.user,
      targetType: "BORROWER", targetId: borrower.borrower_id,
      details: {
        borrower_name: borrower.borrower_name,
        previous_expiry: expiryDate,
        new_expiry: newExpiry,
      },
      ip: req.ip,
    });

    res.json({ success: true, message: "Membership renewed successfully", previous_expiry: expiryDate, new_expiry_date: newExpiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NOTIFICATION HELPERS =================
async function notifyFineCreated(borrowerId, fineDetails) {
  try {
    const borrower = await Borrower.findByPk(borrowerId);
    if (borrower?.email) await sendFineCreatedEmail(borrower, fineDetails);
  } catch (error) { console.error("Error sending fine created email:", error); }
}

async function notifyFinePaid(borrowerId, fineDetails) {
  try {
    const borrower = await Borrower.findByPk(borrowerId);
    if (borrower?.email) await sendFinePaidEmail(borrower, fineDetails);
  } catch (error) { console.error("Error sending fine paid email:", error); }
}

module.exports = router;