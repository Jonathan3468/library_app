const express = require("express");
const router = express.Router();
const { Book, Author, Genre, Publication, Category } = require("../models");

router.post("/", async (req, res) => {
  try {
    const { title, isbn, publication_year, publication_id, category_id, authorIds, genreIds } = req.body;

    // Create the book
    const book = await Book.create({ title, isbn, publication_year, publication_id, category_id });

    // Link authors (only existing ones)
    if (authorIds && authorIds.length > 0) {
      const authors = await Author.findAll({ where: { author_id: authorIds } });
      await book.setAuthors(authors); // pass instances, not IDs
    }

    // Link genres (only existing ones)
    if (genreIds && genreIds.length > 0) {
      const genres = await Genre.findAll({ where: { genre_id: genreIds } });
      await book.setGenres(genres); // pass instances
    }

    // Fetch the book with relations to return in response
    const bookWithRelations = await Book.findByPk(book.book_id, {
      include: [Author, Genre, Publication, Category]
    });

    res.json(bookWithRelations);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
