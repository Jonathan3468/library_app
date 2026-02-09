const express = require("express");
const router = express.Router();
const { Author } = require("../models");

// Create new author
router.post("/", async (req, res) => {
  try {
    const author = await Author.create(req.body);
    res.json(author);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all authors
router.get("/", async (req, res) => {
  try {
    const authors = await Author.findAll();
    res.json(authors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get author by id
router.get("/:id", async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ error: "Not found" });
    res.json(author);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update author
router.put("/:id", async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ error: "Not found" });
    await author.update(req.body);
    res.json(author);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete author
router.delete("/:id", async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id);
    if (!author) return res.status(404).json({ error: "Not found" });
    await author.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
