const express = require("express");
const router = express.Router();

const { Issue, Borrower, Copy } = require("../models");
const { Op } = require("sequelize");

/*
  GET /reports/active
*/
router.get("/active", async (req, res) => {
  try {
    const issues = await Issue.findAll({
      where: { status: "issued" },
      include: [Borrower, Copy]
    });

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
  GET /reports/history/:borrower_id
*/
router.get("/history/:borrower_id", async (req, res) => {
  try {
    const issues = await Issue.findAll({
      where: { borrower_id: req.params.borrower_id },
      include: [Copy]
    });

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
  GET /reports/overdue
*/
router.get("/overdue", async (req, res) => {
  try {
    const issues = await Issue.findAll({
      where: {
        status: "issued",
        due_date: {
          [Op.lt]: new Date()
        }
      },
      include: [Borrower, Copy]
    });

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
