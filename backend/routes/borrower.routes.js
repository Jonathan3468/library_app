const express = require("express");
const router = express.Router();
const { Borrower } = require("../models");

// Create borrower
router.post("/", async (req, res) => {
  try {
    const borrower = await Borrower.create(req.body);
    res.json(borrower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all borrowers
router.get("/", async (req, res) => {
  try {
    const borrowers = await Borrower.findAll();
    res.json(borrowers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
