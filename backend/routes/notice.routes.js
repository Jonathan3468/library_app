const express = require("express");
const router = express.Router();
const { Notice } = require("../models");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const notices = await Notice.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json({ notices });
  } catch (err) {
    console.error("GET NOTICES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE =================
router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { message, type } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const notice = await Notice.create({
      message: message.trim(),
      type: type || "info",
      posted_by: req.user.id,
      posted_by_name: req.user.name,
    });

    res.status(201).json({ success: true, notice });
  } catch (err) {
    console.error("CREATE NOTICE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE =================
router.delete("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const notice = await Notice.findByPk(req.params.id);

    if (!notice) {
      return res.status(404).json({ error: "Notice not found" });
    }

    await notice.destroy();
    res.json({ success: true, message: "Notice deleted" });
  } catch (err) {
    console.error("DELETE NOTICE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;