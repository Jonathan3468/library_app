const express = require("express");
const router = express.Router();
const { Request } = require("../models");

// Create request
router.post("/", async (req, res) => {
  try {
    const request = await Request.create(req.body);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all requests
router.get("/", async (req, res) => {
  try {
    const requests = await Request.findAll();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
