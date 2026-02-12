const express = require("express");
const router = express.Router();
const { Publication } = require("../models");
const auth = require("../middleware/auth.middleware");

// ================= CREATE =================
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Publication name is required"
      });
    }

    const existing = await Publication.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        error: "Publication already exists"
      });
    }

    const publication = await Publication.create({ name });

    res.status(201).json(publication);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const publications = await Publication.findAll();
    res.json(publications);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id);

    if (!publication) {
      return res.status(404).json({ error: "Publication not found" });
    }

    res.json(publication);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= UPDATE =================
router.put("/:id", auth, async (req, res) => {
  try {
    const { name } = req.body;

    const publication = await Publication.findByPk(req.params.id);
    if (!publication) {
      return res.status(404).json({ error: "Publication not found" });
    }

    await publication.update({ name });

    res.json({
      message: "Publication updated successfully",
      publication
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DELETE =================
router.delete("/:id", auth, async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id);

    if (!publication) {
      return res.status(404).json({ error: "Publication not found" });
    }

    await publication.destroy();

    res.json({ message: "Publication deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
