const express = require("express");
const router = express.Router();
const { Genre } = require("../models");
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");
const { query, validationResult } = require("express-validator");


// ======================================================
// Helper — normalize genre so frontend always gets genre_name
// ======================================================

const normalizeGenre = (genre) => {
  const g = genre.toJSON ? genre.toJSON() : { ...genre };
  return {
    ...g,
    genre_id:   g.genre_id   ?? g.id,
    genre_name: g.genre_name ?? g.name,
  };
};


// ======================================================
// QUERY VALIDATION (Pagination + Sorting)
// ======================================================

const validateGetGenres = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than 0"),

  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Limit must be an integer greater than 0"),

  query("order")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Order must be ASC or DESC"),

  query("sortBy")
    .optional()
    .isIn(["genre_name", "createdAt", "updatedAt"])
    .withMessage("Invalid sort field"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];


// ======================================================
// CREATE GENRE
// Only librarians and admins
// ======================================================

router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    // Accept either { name } or { genre_name } from the request body
    const name = req.body.name || req.body.genre_name;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Genre name is required"
      });
    }

    const existing = await Genre.findOne({ where: { genre_name: name } });

    if (existing) {
      // Return the existing genre instead of erroring — useful for autofill/import
      return res.status(200).json({
        success: true,
        genre: normalizeGenre(existing)
      });
    }

    const genre = await Genre.create({ genre_name: name });

    res.status(201).json({
      success: true,
      genre: normalizeGenre(genre)
    });

  } catch (err) {
    console.error("CREATE GENRE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// GET ALL GENRES (Pagination + Sorting)
// Anyone authenticated
// ======================================================

router.get("/", auth, validateGetGenres, async (req, res) => {
  try {
    const {
      page  = 1,
      limit = 100,      // raised default so frontend gets all genres in one call
      sortBy = "genre_name",
      order  = "ASC"
    } = req.query;

    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset      = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Genre.findAndCountAll({
      limit:  parsedLimit,
      offset,
      order: [[sortBy, order]]
    });

    res.json({
      success:      true,
      totalGenres:  count,
      totalPages:   Math.ceil(count / parsedLimit),
      currentPage:  parsedPage,
      genres:       rows.map(normalizeGenre)
    });

  } catch (err) {
    console.error("GET GENRES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// GET ONE GENRE
// Anyone authenticated
// ======================================================

router.get("/:id", auth, async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id);

    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" });
    }

    res.json({ success: true, genre: normalizeGenre(genre) });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// UPDATE GENRE
// Only librarians and admins
// ======================================================

router.put("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const name = req.body.name || req.body.genre_name;

    const genre = await Genre.findByPk(req.params.id);

    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" });
    }

    if (name) {
      const existing = await Genre.findOne({ where: { genre_name: name } });
      if (existing && existing.genre_id !== genre.genre_id) {
        return res.status(400).json({
          success: false,
          message: "Another genre with this name already exists"
        });
      }
    }

    await genre.update({ genre_name: name });

    res.json({
      success: true,
      message: "Genre updated successfully",
      genre:   normalizeGenre(genre)
    });

  } catch (err) {
    console.error("UPDATE GENRE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// DELETE GENRE
// Only admins
// ======================================================

router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const genre = await Genre.findByPk(req.params.id);

    if (!genre) {
      return res.status(404).json({ success: false, message: "Genre not found" });
    }

    await genre.destroy();

    res.json({ success: true, message: "Genre deleted successfully" });

  } catch (err) {
    console.error("DELETE GENRE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;