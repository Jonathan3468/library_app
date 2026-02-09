const express = require("express");
const router = express.Router();
const { Copy } = require("../models");

// Add a copy
router.post("/", async (req, res) => {
  try {
    const copy = await Copy.create(req.body);
    res.json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all copies
router.get("/", async (req, res) => {
  try {
    const copies = await Copy.findAll();
    res.json(copies);
  } catch (err) {
     console.error(err);
    res.status(500).json({ error: err.message, details: err.errors });
  }
});

module.exports = router;
