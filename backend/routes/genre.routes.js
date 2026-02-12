const express = require("express");
const router = express.Router();
const { Genre } = require("../models");
const auth = require("../middleware/auth.middleware");

// ================= CREATE =================
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Genre name is required"
      });
    }

    // prevent duplicate genre
    const existing = await Genre.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        error: "Genre already exists"
      });
    }

    const genre = await Genre.create({ name });

    res.status(201).json(genre);

  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const genres = await Genre.findAll();
    res.json(genres);
  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id);

    if (!genre) {
      return res.status(404).json({
        error: "Genre not found"
      });
    }

    res.json(genre);

  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

// ================= UPDATE =================
router.put("/:id", auth, async (req, res) => {
  try {
    const { name } = req.body;

    const genre = await Genre.findByPk(req.params.id);
    if (!genre) {
      return res.status(404).json({
        error: "Genre not found"
      });
    }

    await genre.update({ name });

    res.json({
      message: "Genre updated successfully",
      genre
    });

  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

// ================= DELETE =================
router.delete("/:id", auth, async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id);

    if (!genre) {
      return res.status(404).json({
        error: "Genre not found"
      });
    }

    await genre.destroy();

    res.json({
      message: "Genre deleted successfully"
    });

  } catch (err) {
    res.status(500).json({
      error: "Server error"
    });
  }
});

module.exports = router;
