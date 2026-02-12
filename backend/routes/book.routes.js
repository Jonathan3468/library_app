const express = require("express");
const router = express.Router();
const { Book, Author, Genre, Publication, Category } = require("../models");


// ✅ CREATE BOOK
router.post("/", async (req, res) => {
  try {
    const { title, isbn, publication_year, publication_id, category_id, authorIds, genreIds } = req.body;

    const book = await Book.create({
      title,
      isbn,
      publication_year,
      publication_id,
      category_id
    });

    if (authorIds && authorIds.length > 0) {
      const authors = await Author.findAll({
        where: { author_id: authorIds }
      });
      await book.setAuthors(authors);
    }

    if (genreIds && genreIds.length > 0) {
      const genres = await Genre.findAll({
        where: { genre_id: genreIds }
      });
      await book.setGenres(genres);
    }

    const bookWithRelations = await Book.findByPk(book.book_id, {
      include: [Author, Genre, Publication, Category]
    });

    res.json(bookWithRelations);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ GET ALL BOOKS
router.get("/", async (req, res) => {
  try {
    const books = await Book.findAll({
      include: [Author, Genre, Publication, Category]
    });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ GET BOOK BY ID
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [Author, Genre, Publication, Category]
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(book);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ UPDATE BOOK
router.put("/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    await book.update(req.body);

    res.json(book);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ DELETE BOOK
router.delete("/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    await book.destroy();

    res.json({ message: "Book deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
