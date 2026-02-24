const { Book, Author, Borrower, Issue, Genre, Category, Publication, Copy } = require("../models");
const { Op } = require("sequelize");

// Global search across books, authors, borrowers
const searchAll = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "Please provide a search query." 
      });
    }

    // 🔹 Search Books by title or ISBN
    const books = await Book.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { isbn: { [Op.like]: `%${query}%` } }
        ]
      },
      attributes: ["book_id", "title", "isbn", "publication_year"],
      limit: 10
    });

    // 🔹 Search Authors
    const authors = await Author.findAll({
      where: {
        author_name: { [Op.like]: `%${query}%` }
      },
      attributes: ["author_id", "author_name"],
      limit: 10
    });

    // 🔹 Search Borrowers
    const borrowers = await Borrower.findAll({
      where: {
        [Op.or]: [
          { borrower_name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } }
        ]
      },
      attributes: ["borrower_id", "borrower_name", "email", "membership_date"],
      limit: 10
    });

    // 🔹 Search Publishers
    const publishers = await Publication.findAll({
      where: {
        publication_name: { [Op.like]: `%${query}%` }
      },
      attributes: ["publication_id", "publication_name"],
      limit: 10
    });

    return res.json({ 
      success: true,
      results: {
        books,
        authors,
        borrowers,
        publishers
      },
      total: books.length + authors.length + borrowers.length + publishers.length
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim() === "" || query.length < 2) {
      return res.json({ 
        success: true,
        suggestions: [] 
      });
    }

    // Get book titles
    const bookTitles = await Book.findAll({
      where: {
        title: { [Op.like]: `%${query}%` }
      },
      attributes: ["book_id", "title"],
      limit: 5
    });

    // Get author names
    const authorNames = await Author.findAll({
      where: {
        author_name: { [Op.like]: `%${query}%` }
      },
      attributes: ["author_id", "author_name"],
      limit: 5
    });

    // Get borrower names
    const borrowerNames = await Borrower.findAll({
      where: {
        borrower_name: { [Op.like]: `%${query}%` }
      },
      attributes: ["borrower_id", "borrower_name"],
      limit: 5
    });

    // Get publisher names
    const publisherNames = await Publication.findAll({
      where: {
        publication_name: { [Op.like]: `%${query}%` }
      },
      attributes: ["publication_id", "publication_name"],
      limit: 5
    });

    const suggestions = [
      ...bookTitles.map(b => ({ 
        type: 'book', 
        text: b.title,
        id: b.book_id 
      })),
      ...authorNames.map(a => ({ 
        type: 'author', 
        text: a.author_name,
        id: a.author_id 
      })),
      ...borrowerNames.map(b => ({ 
        type: 'borrower', 
        text: b.borrower_name,
        id: b.borrower_id 
      })),
      ...publisherNames.map(p => ({ 
        type: 'publisher', 
        text: p.publication_name,
        id: p.publication_id 
      }))
    ];

    return res.json({ 
      success: true,
      suggestions 
    });

  } catch (err) {
    console.error("SUGGESTIONS ERROR:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

module.exports = { 
  searchAll,
  getSearchSuggestions
};