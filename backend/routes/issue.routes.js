const express = require("express");
const router = express.Router();
const { Issue } = require("../models");

// Borrow/Issue copy
router.post("/", async (req, res) => {
  try {
    const issue = await Issue.create(req.body);
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return copy (update check_in)
router.put("/:id/return", async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) return res.status(404).json({ error: "Not found" });

    issue.check_in = req.body.check_in;
    issue.status = "returned";
    await issue.save();

    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
