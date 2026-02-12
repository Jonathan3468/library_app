const express = require("express");
const router = express.Router();

const { Issue, Borrower, Copy } = require("../models");
const { Op } = require("sequelize");


/*
  POST /issues/renew
  Renew (Re-Issue) with soft override support
*/
router.post("/renew", async (req, res) => {
  try {
    const { borrower_id, copy_id, override } = req.body;

    // Find active issue
    const issue = await Issue.findOne({
      where: {
        borrower_id,
        copy_id,
        status: "issued"
      }
    });

    if (!issue) {
      return res.status(404).json({ error: "Active issue not found" });
    }

    const warnings = [];

    // Check overdue
    if (issue.due_date < new Date()) {
      warnings.push("Book is overdue");
    }

    // Check renew limit
    if (issue.renew_count >= 2) {
      warnings.push("Renew limit reached");
    }

    // If warnings exist and no override → stop
    if (warnings.length > 0 && !override) {
      return res.status(400).json({
        message: "Renewal has warnings",
        warnings,
        requires_override: true
      });
    }

    // Extend due date by 7 days
    const newDue = new Date(issue.due_date);
    newDue.setDate(newDue.getDate() + 7);

    await issue.update({
      due_date: newDue,
      renew_count: issue.renew_count + 1
    });

    res.json({
      message: override ? "Renewed with override" : "Renewed successfully",
      new_due_date: newDue,
      warnings
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
