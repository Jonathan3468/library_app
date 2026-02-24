const express = require("express");
const router = express.Router();
const { Issue, Borrower, Copy } = require("../models");
const { Op } = require("sequelize");
const { getSetting } = require("../config/librarySettings");
const { log, ACTIONS } = require("../services/auditService");
const { auth } = require("../middleware/auth.middleware");

const calculateFine = (dueDate, returnDate) => {
  const FINE_PER_DAY = getSetting("FINE_PER_DAY");
  const due      = new Date(dueDate);
  const returned = new Date(returnDate);
  if (returned > due) {
    const daysLate = Math.ceil((returned - due) / (1000 * 60 * 60 * 24));
    return daysLate * FINE_PER_DAY;
  }
  return 0;
};

router.post("/renew", auth, async (req, res) => {
  try {
    const { rf_id, copy_code, override } = req.body;
    const ip = req.ip || req.headers["x-forwarded-for"];

    const borrower = await Borrower.findOne({ where: { rf_id } });
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });
    const borrower_id = borrower.borrower_id;

    const copy = await Copy.findOne({ where: { copy_code } });
    if (!copy) return res.status(404).json({ error: "Copy not found" });

    const issue = await Issue.findOne({
      where: { borrower_id, copy_id: copy.copy_id, status: "issued" },
      include: [{ model: Borrower }],
    });
    if (!issue) return res.status(404).json({ error: "Active issue not found" });

    const warnings = [];

    const outstandingFines = (await Issue.sum("fine", {
      where: { borrower_id, fine: { [Op.gt]: 0 }, fine_paid: false },
    })) || 0;
    if (outstandingFines > 0) warnings.push(`Outstanding fines: ₹${outstandingFines}`);

    const today = new Date();
    if (new Date(issue.due_date) < today) {
      const daysOverdue = Math.ceil((today - new Date(issue.due_date)) / (1000 * 60 * 60 * 24));
      warnings.push(`Book is ${daysOverdue} days overdue`);
    }

    const MAX_RENEWALS = getSetting("MAX_RENEWALS");
    if (issue.renew_count >= MAX_RENEWALS) warnings.push(`Renew limit reached (${MAX_RENEWALS} renewals max)`);

    if (issue.Borrower.membership_expiry && new Date(issue.Borrower.membership_expiry) < today) {
      warnings.push("Membership expired");
    }

    if (warnings.length > 0 && !override) {
      return res.status(400).json({ message: "Renewal has warnings", warnings, requires_override: true });
    }

    const RENEWAL_PERIOD = getSetting("RENEWAL_PERIOD_DAYS");
    const newDue = new Date(new Date(issue.due_date).getTime() + RENEWAL_PERIOD * 24 * 60 * 60 * 1000);

    await issue.update({ due_date: newDue, renew_count: issue.renew_count + 1 });

    await log({
      action:     ACTIONS.BOOK_RENEWED,
      user:       req.user,
      targetType: "ISSUE",
      targetId:   issue.issue_id,
      details: {
        borrower_id:   borrower_id,
        borrower_name: borrower.borrower_name,
        copy_code,
        new_due_date:  newDue.toISOString(),
        renew_count:   issue.renew_count + 1,
        override_used: !!override,
        warnings:      override && warnings.length > 0 ? warnings : undefined,
      },
      ip,
    });

    res.json({
      success:      true,
      message:      override ? "Renewed with override" : "Renewed successfully",
      new_due_date: newDue,
      renew_count:  issue.renew_count + 1,
      warnings:     override ? warnings : [],
    });

  } catch (err) {
    console.error("RENEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;