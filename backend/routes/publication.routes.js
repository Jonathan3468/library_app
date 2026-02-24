const express = require("express");
const router = express.Router();
const { Publication, Book } = require("../models");
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");


// ================= CREATE =================
router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { publication_name } = req.body;

    if (!publication_name) {
      return res.status(400).json({
        error: "Publication name is required"
      });
    }

    // prevent duplicate publication
    const existing = await Publication.findOne({
      where: { publication_name }
    });

    if (existing) {
      return res.status(400).json({
        error: "Publication already exists"
      });
    }

    const publication = await Publication.create({ publication_name });

    res.status(201).json({
      success: true,
      message: "Publication created successfully",
      publication
    });

  } catch (err) {
    console.error("CREATE PUBLICATION ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const publications = await Publication.findAll({
      order: [["publication_name", "ASC"]]
    });

    res.json(publications);

  } catch (err) {
    console.error("GET PUBLICATIONS ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= GET ONE =================
router.get("/:id", auth, async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id, {
      include: [{ model: Book }]
    });

    if (!publication) {
      return res.status(404).json({
        error: "Publication not found"
      });
    }

    res.json({
      success: true,
      publication
    });

  } catch (err) {
    console.error("GET PUBLICATION ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= UPDATE =================
router.put("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const { publication_name } = req.body;

    const publication = await Publication.findByPk(req.params.id);

    if (!publication) {
      return res.status(404).json({
        error: "Publication not found"
      });
    }

    await publication.update({ publication_name });

    res.json({
      success: true,
      message: "Publication updated successfully",
      publication
    });

  } catch (err) {
    console.error("UPDATE PUBLICATION ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


// ================= DELETE =================
router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id, {
      include: [{ model: Book }]
    });

    if (!publication) {
      return res.status(404).json({
        error: "Publication not found"
      });
    }

    // prevent delete if books exist
    if (publication.Books && publication.Books.length > 0) {
      return res.status(400).json({
        error: `Cannot delete publication with ${publication.Books.length} associated books`
      });
    }

    await publication.destroy();

    res.json({
      success: true,
      message: "Publication deleted successfully"
    });

  } catch (err) {
    console.error("DELETE PUBLICATION ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});


module.exports = router;
