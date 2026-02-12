const express = require("express");
const router = express.Router();
const { Category } = require("../models");
const auth = require("../middleware/auth.middleware");

// ================= CREATE =================
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Category name is required"
      });
    }

    const existing = await Category.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        error: "Category already exists"
      });
    }

    const category = await Category.create({ name });

    res.status(201).json(category);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= UPDATE =================
router.put("/:id", auth, async (req, res) => {
  try {
    const { name } = req.body;

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category.update({ name });

    res.json({
      message: "Category updated successfully",
      category
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DELETE =================
router.delete("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category.destroy();

    res.json({ message: "Category deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
