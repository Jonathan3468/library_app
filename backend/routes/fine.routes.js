// fine.routes.js
const express = require("express");
const router = express.Router();
const { Issue, Borrower, Copy, Book, FinePayment } = require("../models");
const { Op } = require("sequelize");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");
const { notifyFineCreated, notifyFinePaid } = require("../services/notificationService");
const { getSetting } = require("../config/librarySettings");
const { log, ACTIONS } = require("../services/auditService");

const validateRequired = (fields, data) => {
  const missing = fields.filter(f => !data[f] || (typeof data[f] === "string" && data[f].trim() === ""));
  if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(", ")}`);
};

// ── GET OUTSTANDING ──────────────────────────────────────────────────────────
router.get("/outstanding", auth, requireLibrarian, async (req, res) => {
  try {
    const issues = await Issue.findAll({
      where: { fine: { [Op.gt]: 0 }, fine_paid: false },
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, attributes: ["copy_id", "copy_code"], include: [{ model: Book, attributes: ["title"] }] },
      ],
      order: [["due_date", "ASC"]],
    });

    const customFines = await FinePayment.findAll({
      where: { status: "pending" },
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, required: false, attributes: ["copy_id", "copy_code"], include: [{ model: Book, attributes: ["title"] }] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = [
      ...issues.map(issue => {
        const isReturned = issue.check_in !== null;
        const isOverdue  = new Date(issue.due_date) < new Date();
        return {
          type: "issue_fine", issue_id: issue.issue_id,
          borrower_id: issue.Borrower.borrower_id, borrower_name: issue.Borrower.borrower_name, rf_id: issue.Borrower.rf_id,
          book_title: issue.Copy?.Book?.title || "N/A", copy_code: issue.Copy?.copy_code || "N/A",
          reason: "Late return", due_date: issue.due_date, check_in: issue.check_in, fine: issue.fine,
          status: isReturned ? "returned" : (isOverdue ? "not_returned" : "pending"),
          days_overdue: isOverdue ? Math.ceil((new Date() - new Date(issue.due_date)) / (1000 * 60 * 60 * 24)) : 0,
        };
      }),
      ...customFines.map(cf => ({
        type: "custom_fine", issue_id: cf.payment_id, display_id: `CF-${cf.payment_id}`,
        borrower_id: cf.Borrower.borrower_id, borrower_name: cf.Borrower.borrower_name, rf_id: cf.Borrower.rf_id,
        book_title: cf.Copy?.Book?.title || "N/A", copy_code: cf.Copy?.copy_code || "N/A",
        reason: cf.reason, due_date: null, check_in: null, fine: cf.amount, status: "pending", days_overdue: null,
      })),
    ];

    res.json({ success: true, issues: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET HISTORY ──────────────────────────────────────────────────────────────
router.get("/history", auth, requireLibrarian, async (req, res) => {
  try {
    const paidIssues = await Issue.findAll({
      where: { fine: { [Op.gt]: 0 }, fine_paid: true },
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "rf_id"] },
        { model: Copy, required: false, attributes: ["copy_id", "copy_code"], include: [{ model: Book, attributes: ["title"] }] },
      ],
      order: [["updatedAt", "DESC"]],
    });

    const customFines = await FinePayment.findAll({
      where: { status: { [Op.in]: ["paid", "waived"] } },
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "rf_id"] },
        { model: Copy, attributes: ["copy_id", "copy_code"], include: [{ model: Book, attributes: ["title"] }] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const history = [
      ...paidIssues.map(issue => ({
        id: issue.issue_id, type: "issue_fine",
        borrower_id: issue.Borrower.borrower_id, borrower_name: issue.Borrower.borrower_name, rf_id: issue.Borrower.rf_id,
        book_title: issue.Copy?.Book?.title, copy_code: issue.Copy?.copy_code,
        reason: "Late return", fine: issue.fine,
        payment_method: issue.payment_method || "cash",
        status: issue.waive_reason ? "waived" : "paid",
        payment_date: issue.payment_date || issue.updatedAt, createdAt: issue.createdAt,
      })),
      ...customFines.map(cf => ({
        id: cf.payment_id, type: "custom_fine",
        borrower_id: cf.Borrower.borrower_id, borrower_name: cf.Borrower.borrower_name, rf_id: cf.Borrower.rf_id,
        book_title: cf.Copy?.Book?.title || "N/A", copy_code: cf.Copy?.copy_code || "N/A",
        reason: cf.reason, amount: cf.amount,
        payment_method: cf.payment_method, status: cf.status,
        payment_date: cf.payment_date, createdAt: cf.createdAt,
      })),
    ].sort((a, b) => new Date(b.payment_date || b.createdAt) - new Date(a.payment_date || a.createdAt));

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET STATS ────────────────────────────────────────────────────────────────
router.get("/stats", auth, requireLibrarian, async (req, res) => {
  try {
    const totalGenerated    = await Issue.sum("fine") || 0;
    const totalCollected    = await Issue.sum("fine", { where: { fine_paid: true } }) || 0;
    const customCollected   = await FinePayment.sum("amount", { where: { status: "paid" } }) || 0;
    const totalOutstanding  = await Issue.sum("fine", { where: { fine_paid: false } }) || 0;
    const customOutstanding = await FinePayment.sum("amount", { where: { status: "pending" } }) || 0;
    const issuesWithFines   = await Issue.count({ where: { fine: { [Op.gt]: 0 } } });
    const customFinesCount  = await FinePayment.count();

    res.json({
      success: true,
      stats: {
        total_fines_generated: Math.round(totalGenerated + await FinePayment.sum("amount") || 0),
        total_collected:       Math.round(totalCollected + customCollected),
        total_outstanding:     Math.round(totalOutstanding + customOutstanding),
        issues_with_fines:     issuesWithFines + customFinesCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET SINGLE FINE ──────────────────────────────────────────────────────────
router.get("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const fine = await Issue.findByPk(req.params.id, {
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, include: [{ model: Book, attributes: ["title"] }] },
      ],
    });

    if (fine && fine.fine > 0) {
      const isReturned = fine.check_in !== null;
      const isOverdue  = new Date(fine.due_date) < new Date();
      return res.json({
        success: true,
        fine: {
          type: "issue_fine", issue_id: fine.issue_id,
          borrower_id: fine.Borrower.borrower_id, borrower_name: fine.Borrower.borrower_name, rf_id: fine.Borrower.rf_id,
          book_title: fine.Copy?.Book?.title, fine: fine.fine, reason: "Late return",
          payment_method: fine.payment_method, payment_date: fine.payment_date,
          waive_reason: fine.waive_reason, waived_date: fine.waived_date,
          status: fine.fine_paid ? (fine.waive_reason ? "waived" : "paid") : (isReturned ? "returned" : (isOverdue ? "not_returned" : "pending")),
          due_date: fine.due_date, check_in: fine.check_in,
        },
      });
    }

    return res.status(404).json({ success: false, error: "Fine not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET CUSTOM FINE ──────────────────────────────────────────────────────────
router.get("/custom/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const fine = await FinePayment.findByPk(req.params.id, {
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, required: false, attributes: ["copy_id", "copy_code"], include: [{ model: Book, attributes: ["title"] }] },
      ],
    });

    if (fine) {
      return res.json({
        success: true,
        fine: {
          type: "custom_fine", payment_id: fine.payment_id,
          borrower_id: fine.Borrower.borrower_id, borrower_name: fine.Borrower.borrower_name, rf_id: fine.Borrower.rf_id,
          amount: fine.amount, reason: fine.reason,
          payment_method: fine.payment_method, payment_date: fine.payment_date, status: fine.status,
          copy_code: fine.Copy?.copy_code || null, book_title: fine.Copy?.Book?.title || null,
        },
      });
    }

    return res.status(404).json({ success: false, error: "Fine not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE CUSTOM FINE REASON ────────────────────────────────────────────────
router.put("/custom/:id/reason", auth, requireLibrarian, async (req, res) => {
  try {
    validateRequired(["reason"], req.body);
    const fine = await FinePayment.findByPk(req.params.id);
    if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });
    await fine.update({ reason: req.body.reason });
    return res.json({ success: true, message: "Reason updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE CUSTOM PAYMENT METHOD ─────────────────────────────────────────────
router.put("/custom/:id/payment-method", auth, requireLibrarian, async (req, res) => {
  try {
    validateRequired(["payment_method"], req.body);
    const fine = await FinePayment.findByPk(req.params.id);
    if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });
    await fine.update({ payment_method: req.body.payment_method });
    return res.json({ success: true, message: "Payment method updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MARK CUSTOM FINE AS PAID ─────────────────────────────────────────────────
router.post("/custom/:id/mark-paid", auth, requireLibrarian, async (req, res) => {
  try {
    const fine = await FinePayment.findByPk(req.params.id, {
      include: [{ model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] }],
    });
    if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });
    if (fine.status === "paid") return res.status(400).json({ success: false, error: "Fine already paid" });

    await fine.update({ status: "paid", payment_date: new Date() });

    await log({
      action: ACTIONS.FINE_PAID, user: req.user,
      targetType: "FINE", targetId: `CF-${fine.payment_id}`,
      details: { borrower_name: fine.Borrower.borrower_name, amount: fine.amount, reason: fine.reason, type: "custom_fine" },
      ip: req.ip,
    });

    try {
      await notifyFinePaid(fine.Borrower, {
        amount: fine.amount, reason: fine.reason, type: "custom_fine",
        payment_id: fine.payment_id, payment_method: fine.payment_method || "cash", payment_date: new Date(),
      });
    } catch {}

    return res.json({ success: true, message: "Fine marked as paid" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── WAIVE CUSTOM FINE ────────────────────────────────────────────────────────
router.post("/custom/:id/waive", auth, requireLibrarian, async (req, res) => {
  try {
    validateRequired(["reason"], req.body);
    const fine = await FinePayment.findByPk(req.params.id, {
      include: [{ model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] }],
    });
    if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });

    await fine.update({ status: "waived", reason: req.body.reason, payment_date: new Date() });

    await log({
      action: ACTIONS.FINE_WAIVED, user: req.user,
      targetType: "FINE", targetId: `CF-${fine.payment_id}`,
      details: { borrower_name: fine.Borrower.borrower_name, amount: fine.amount, waive_reason: req.body.reason, type: "custom_fine" },
      ip: req.ip,
    });

    return res.json({ success: true, message: "Fine waived successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PAY FINE (from outstanding tab) ─────────────────────────────────────────
router.post("/pay/:issue_id", auth, requireLibrarian, async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { amount_paid, payment_method = "cash" } = req.body;
    validateRequired(["payment_method"], { payment_method });

    if (issue_id.startsWith("CF-")) {
      const paymentId = issue_id.replace("CF-", "");
      const fine = await FinePayment.findByPk(paymentId, {
        include: [{ model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] }],
      });
      if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });
      if (fine.status === "paid") return res.status(400).json({ success: false, error: "Fine already paid" });

      await fine.update({ status: "paid", payment_method, payment_date: new Date() });

      await log({
        action: ACTIONS.FINE_PAID, user: req.user,
        targetType: "FINE", targetId: issue_id,
        details: { borrower_name: fine.Borrower.borrower_name, amount: fine.amount, payment_method, type: "custom_fine" },
        ip: req.ip,
      });

      try {
        await notifyFinePaid(fine.Borrower, {
          amount: fine.amount, reason: fine.reason, type: "custom_fine",
          payment_id: fine.payment_id, payment_method, payment_date: new Date(),
        });
      } catch {}

      return res.json({ success: true, message: "Payment recorded successfully" });
    }

    const issue = await Issue.findByPk(issue_id, {
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, include: [{ model: Book, attributes: ["title"] }] },
      ],
    });
    if (!issue) return res.status(404).json({ success: false, error: "Issue not found" });
    if (issue.fine_paid) return res.status(400).json({ success: false, error: "Fine already paid" });

    await issue.update({ fine_paid: true, payment_method, payment_date: new Date() });

    await log({
      action: ACTIONS.FINE_PAID, user: req.user,
      targetType: "FINE", targetId: issue_id,
      details: {
        borrower_name: issue.Borrower.borrower_name,
        amount: amount_paid || issue.fine,
        payment_method, type: "issue_fine",
        book_title: issue.Copy?.Book?.title,
      },
      ip: req.ip,
    });

    try {
      await notifyFinePaid(issue.Borrower, {
        amount: amount_paid || issue.fine, reason: "Late return", type: "late_return",
        issue_id: issue.issue_id, payment_method, payment_date: new Date(),
        book_title: issue.Copy?.Book?.title, due_date: issue.due_date, check_in: issue.check_in,
      });
    } catch {}

    res.json({ success: true, message: "Payment recorded successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── WAIVE FINE (from outstanding tab) ────────────────────────────────────────
router.post("/waive/:issue_id", auth, requireLibrarian, async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { reason } = req.body;
    validateRequired(["reason"], req.body);

    if (issue_id.startsWith("CF-")) {
      const paymentId = issue_id.replace("CF-", "");
      const fine = await FinePayment.findByPk(paymentId, {
        include: [{ model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] }],
      });
      if (!fine) return res.status(404).json({ success: false, error: "Fine not found" });
      await fine.update({ status: "waived", reason, payment_date: new Date() });

      await log({
        action: ACTIONS.FINE_WAIVED, user: req.user,
        targetType: "FINE", targetId: issue_id,
        details: { borrower_name: fine.Borrower.borrower_name, amount: fine.amount, waive_reason: reason, type: "custom_fine" },
        ip: req.ip,
      });

      return res.json({ success: true, message: "Fine waived successfully" });
    }

    const issue = await Issue.findByPk(issue_id, {
      include: [
        { model: Borrower, attributes: ["borrower_id", "borrower_name", "email", "rf_id"] },
        { model: Copy, include: [{ model: Book, attributes: ["title"] }] },
      ],
    });
    if (!issue) return res.status(404).json({ success: false, error: "Issue not found" });

    await issue.update({ fine: 0, fine_paid: true, waive_reason: reason, waived_date: new Date() });

    await log({
      action: ACTIONS.FINE_WAIVED, user: req.user,
      targetType: "FINE", targetId: issue_id,
      details: {
        borrower_name: issue.Borrower.borrower_name,
        original_fine: issue.fine, waive_reason: reason, type: "issue_fine",
        book_title: issue.Copy?.Book?.title,
      },
      ip: req.ip,
    });

    res.json({ success: true, message: "Fine waived successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ADD CUSTOM FINE ──────────────────────────────────────────────────────────
router.post("/custom", auth, requireLibrarian, async (req, res) => {
  try {
    const { borrower_id, amount, reason, payment_method = "cash", mark_as_paid = false, copy_code, book_id } = req.body;
    validateRequired(["borrower_id", "amount", "reason"], req.body);
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: "Amount must be a positive number" });
    }

    const borrower = await Borrower.findByPk(borrower_id);
    if (!borrower) return res.status(404).json({ success: false, error: "Borrower not found" });

    let copy_id = null;
    if (copy_code?.trim()) {
      const copy = await Copy.findOne({ where: { copy_code: copy_code.trim() } });
      if (!copy) return res.status(404).json({ success: false, error: `Copy "${copy_code}" not found` });
      copy_id = copy.copy_id;
    } else if (book_id) {
      const copy = await Copy.findOne({ where: { book_id } });
      if (copy) copy_id = copy.copy_id;
    }

    const finePayment = await FinePayment.create({
      borrower_id, copy_id: copy_id || null,
      amount: parseFloat(amount), reason: reason.trim(),
      payment_method: payment_method.trim(),
      status:         mark_as_paid ? "paid" : "pending",
      payment_date:   mark_as_paid ? new Date() : null,
      created_by:     req.user?.id || null,
    });

    await log({
      action: ACTIONS.FINE_CUSTOM_CREATED, user: req.user,
      targetType: "FINE", targetId: `CF-${finePayment.payment_id}`,
      details: {
        borrower_name: borrower.borrower_name, amount: parseFloat(amount),
        reason: reason.trim(), mark_as_paid,
      },
      ip: req.ip,
    });

    try {
      if (mark_as_paid) {
        await notifyFinePaid(borrower, { amount: parseFloat(amount), reason: reason.trim(), type: "custom_fine", payment_id: finePayment.payment_id, payment_method: payment_method.trim(), payment_date: new Date() });
      } else {
        await notifyFineCreated(borrower, { amount: parseFloat(amount), reason: reason.trim(), type: "custom_fine", payment_id: finePayment.payment_id });
      }
    } catch {}

    res.status(201).json({
      success: true,
      message: `Custom fine ${mark_as_paid ? "added and marked as paid" : "added successfully"}`,
      fine: finePayment,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── RECALCULATE FINE ─────────────────────────────────────────────────────────
router.post("/:id/recalculate", auth, requireLibrarian, async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: "Issue not found" });

    const FINE_PER_DAY  = getSetting("FINE_PER_DAY");
    const due           = new Date(issue.due_date);
    const oldFine       = issue.fine;
    const compareDate   = issue.check_in ? new Date(issue.check_in) : new Date();
    let newFine = 0;
    if (compareDate > due) {
      newFine = Math.ceil((compareDate - due) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY;
    }

    await issue.update({ fine: newFine });

    return res.json({
      success: true, message: "Fine recalculated successfully",
      old_fine: oldFine, new_fine: newFine,
      days_late: newFine > 0 ? Math.ceil((compareDate - due) / (1000 * 60 * 60 * 24)) : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── RECALCULATE ALL ───────────────────────────────────────────────────────────
router.post("/recalculate-all", auth, requireLibrarian, async (req, res) => {
  try {
    const { mode = "all" } = req.body;
    const validModes = ["all", "returned", "overdue"];
    if (!validModes.includes(mode)) return res.status(400).json({ success: false, error: `Invalid mode. Must be: ${validModes.join(", ")}` });

    const FINE_PER_DAY = getSetting("FINE_PER_DAY");
    let recalculated = 0, totalAdjustment = 0, returnedCount = 0, overdueCount = 0;

    if (mode === "all" || mode === "returned") {
      const returned = await Issue.findAll({ where: { status: "returned", check_in: { [Op.ne]: null } } });
      for (const issue of returned) {
        const due = new Date(issue.due_date);
        const ret = new Date(issue.check_in);
        const newFine = ret > due ? Math.ceil((ret - due) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY : 0;
        if (newFine !== issue.fine) { totalAdjustment += (newFine - issue.fine); await issue.update({ fine: newFine }); recalculated++; }
        returnedCount++;
      }
    }

    if (mode === "all" || mode === "overdue") {
      const overdue = await Issue.findAll({ where: { status: "issued", check_in: null, due_date: { [Op.lt]: new Date() } } });
      const today = new Date();
      for (const issue of overdue) {
        const due = new Date(issue.due_date);
        const newFine = today > due ? Math.ceil((today - due) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY : 0;
        if (newFine !== issue.fine) { totalAdjustment += (newFine - issue.fine); await issue.update({ fine: newFine }); recalculated++; }
        overdueCount++;
      }
    }

    res.json({
      success: true,
      message: `Recalculated ${recalculated} fines (${returnedCount} returned, ${overdueCount} overdue)`,
      recalculated_count: recalculated, total_adjustment: totalAdjustment,
      returned_books: returnedCount, overdue_books: overdueCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;