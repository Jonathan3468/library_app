const express = require("express");
const router = express.Router();
const { Author, Book } = require("../models");
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");


// ================= CREATE =================
router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { author_name } = req.body;

    if (!author_name) {
      return res.status(400).json({
        error: "Author name is required"
      });
    }

    // prevent duplicate author
    const existing = await Author.findOne({ where: { author_name } });
    if (existing) {
      return res.status(400).json({
        error: "Author already exists"
      });
    }

    const author = await Author.create({ author_name });

    res.status(201).json({
      success: true,
      message: "Author created successfully",
      author
    });

  } catch (err) {
    console.error("CREATE AUTHOR ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const authors = await Author.findAll({
      order: [["author_name", "ASC"]]
    });

    res.json(authors);

  } catch (err) {
    console.error("GET AUTHORS ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id, {
      include: [
        {
          model: Book,
          through: { attributes: [] } // hide junction table
        }
      ]
    });

    if (!author) {
      return res.status(404).json({
        error: "Author not found"
      });
    }

    res.json({
      success: true,
      author
    });

  } catch (err) {
    console.error("GET AUTHOR ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= UPDATE =================
router.put("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const { author_name } = req.body;

    const author = await Author.findByPk(req.params.id);

    if (!author) {
      return res.status(404).json({
        error: "Author not found"
      });
    }

    await author.update({ author_name });

    res.json({
      success: true,
      message: "Author updated successfully",
      author
    });

  } catch (err) {
    console.error("UPDATE AUTHOR ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= DELETE =================
router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const author = await Author.findByPk(req.params.id, {
      include: [{ model: Book }]
    });

    if (!author) {
      return res.status(404).json({
        error: "Author not found"
      });
    }

    // prevent delete if books exist
    if (author.Books && author.Books.length > 0) {
      return res.status(400).json({
        error: `Cannot delete author with ${author.Books.length} associated books`
      });
    }

    await author.destroy();

    res.json({
      success: true,
      message: "Author deleted successfully"
    });

  } catch (err) {
    console.error("DELETE AUTHOR ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


module.exports = router;
