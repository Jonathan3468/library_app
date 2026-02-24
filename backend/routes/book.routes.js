//book.routes.js
const express = require("express");
const router = express.Router();
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");

const { Op, Sequelize } = require("sequelize");
const { query, validationResult } = require("express-validator");
const { createBookSchema } = require("../validators/book.validator");

const {
  Book,
  Author,
  Genre,
  Publication,
  Category,
  Copy,
  Issue,
  Borrower,
  AuthorBook,
  BookGenre,
  sequelize
} = require("../models");


// ======================================================
// QUERY VALIDATION FOR GET BOOKS
// ======================================================

const validateGetBooks = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than 0"),

  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Limit must be an integer greater than 0"),

  query("category")
    .optional()
    .custom((value) => {
      const ids = value.split(',').map(id => parseInt(id));
      return ids.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage("Category must be a comma-separated list of integers"),

  query("genre")
    .optional()
    .custom((value) => {
      const ids = value.split(',').map(id => parseInt(id));
      return ids.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage("Genre must be a comma-separated list of integers"),

  query("author")
    .optional()
    .custom((value) => {
      const ids = value.split(',').map(id => parseInt(id));
      return ids.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage("Author must be a comma-separated list of integers"),

  query("publication")
    .optional()
    .custom((value) => {
      const ids = value.split(',').map(id => parseInt(id));
      return ids.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage("Publication must be a comma-separated list of integers"),

  query("order")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Order must be ASC or DESC"),

  query("sortBy")
    .optional()
    .isIn(["title", "publication_year", "createdAt", "updatedAt"])
    .withMessage("Invalid sort field"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];


// ======================================================
// GET ALL BOOKS (FILTER + PAGINATION + SORTING)
// Anyone can view books
// ======================================================

router.get("/", validateGetBooks, async (req, res) => {
  try {

    const {
      category,
      genre,
      author,
      publication,
      search,
      page = 1,
      limit = 5,
      sortBy = "createdAt",
      order = "DESC"
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClause = {};

    // Search by title
    if (search) {
      whereClause.title = {
        [Op.like]: `%${search}%`
      };
    }

    // Filter by category (multiple - OR logic)
    if (category) {
      const categoryIds = category.split(',').map(id => parseInt(id));
      whereClause.category_id = {
        [Op.in]: categoryIds
      };
    }

    // Filter by publication (multiple - OR logic)
    if (publication) {
      const publicationIds = publication.split(',').map(id => parseInt(id));
      whereClause.publication_id = {
        [Op.in]: publicationIds
      };
    }

    // For genres and authors with AND logic, we need to filter book IDs first
    let bookIdsFromGenres = null;
    let bookIdsFromAuthors = null;

    // Filter by genres - must have ALL selected genres
    if (genre) {
      const genreIds = genre.split(',').map(id => parseInt(id));
      
      const bookGenreCounts = await BookGenre.findAll({
        where: {
          genre_id: {
            [Op.in]: genreIds
          }
        },
        attributes: [
          'book_id',
          [Sequelize.fn('COUNT', Sequelize.col('genre_id')), 'genre_count']
        ],
        group: ['book_id'],
        having: Sequelize.literal(`COUNT(genre_id) = ${genreIds.length}`),
        raw: true
      });

      bookIdsFromGenres = bookGenreCounts.map(bg => bg.book_id);
      
      // If no books match all genres, return empty
      if (bookIdsFromGenres.length === 0) {
        return res.json({
          success: true,
          totalBooks: 0,
          totalPages: 0,
          currentPage: parsedPage,
          books: []
        });
      }
    }

    // Filter by authors - must have ALL selected authors
    if (author) {
      const authorIds = author.split(',').map(id => parseInt(id));
      
      const bookAuthorCounts = await AuthorBook.findAll({
        where: {
          author_id: {
            [Op.in]: authorIds
          }
        },
        attributes: [
          'book_id',
          [Sequelize.fn('COUNT', Sequelize.col('author_id')), 'author_count']
        ],
        group: ['book_id'],
        having: Sequelize.literal(`COUNT(author_id) = ${authorIds.length}`),
        raw: true
      });

      bookIdsFromAuthors = bookAuthorCounts.map(ba => ba.book_id);
      
      // If no books match all authors, return empty
      if (bookIdsFromAuthors.length === 0) {
        return res.json({
          success: true,
          totalBooks: 0,
          totalPages: 0,
          currentPage: parsedPage,
          books: []
        });
      }
    }

    // Combine book IDs from both filters (intersection)
    if (bookIdsFromGenres !== null || bookIdsFromAuthors !== null) {
      let combinedBookIds = [];
      
      if (bookIdsFromGenres !== null && bookIdsFromAuthors !== null) {
        // Both filters - intersection
        combinedBookIds = bookIdsFromGenres.filter(id => bookIdsFromAuthors.includes(id));
      } else if (bookIdsFromGenres !== null) {
        combinedBookIds = bookIdsFromGenres;
      } else {
        combinedBookIds = bookIdsFromAuthors;
      }

      if (combinedBookIds.length === 0) {
        return res.json({
          success: true,
          totalBooks: 0,
          totalPages: 0,
          currentPage: parsedPage,
          books: []
        });
      }

      whereClause.book_id = {
        [Op.in]: combinedBookIds
      };
    }

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      limit: parsedLimit,
      offset,
      order: [[sortBy, order]],
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        { model: Publication },
        { model: Category }
      ],
      distinct: true
    });

    res.json({
      success: true,
      totalBooks: count,
      totalPages: Math.ceil(count / parsedLimit),
      currentPage: parsedPage,
      books: rows
    });

  } catch (err) {
    console.error("GET BOOKS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});


// ======================================================
// GET BOOK BY ID
// Anyone can view book details
// ======================================================

router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        Publication,
        Category
      ]
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    res.json({
      success: true,
      book
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// GET COPIES OF A BOOK
// Anyone can view copy status
// ======================================================
router.get("/copies/by-code/:copyCode", async (req, res) => {
  try {
    const copy = await Copy.findOne({
      where: { copy_code: req.params.copyCode }
    });

    if (!copy) {
      return res.status(404).json({ success: false, message: "Copy not found" });
    }

    res.json({ success: true, copy });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/:id/copies", async (req, res) => {
  try {

    const copies = await Copy.findAll({
      where: { book_id: req.params.id },
      include: [
        {
          model: Issue,
          where: {
            status: "issued",
            check_in: null
          },
          required: false,
          include: [
            {
              model: Borrower,
              attributes: ["borrower_id", "borrower_name"]
            }
          ]
        }
      ]
    });

    const formatted = copies.map(copy => {
      const activeIssue =
        copy.Issues && copy.Issues.length > 0
          ? copy.Issues[0]
          : null;

      return {
        copy_id: copy.copy_id,
        copy_code: copy.copy_code,
        status: activeIssue ? "Issued" : "Available",
        borrower: activeIssue
          ? {
              borrower_id: activeIssue.Borrower.borrower_id,
              borrower_name: activeIssue.Borrower.borrower_name,
              due_date: activeIssue.due_date
            }
          : null
      };
    });

    res.json({
      success: true,
      copies: formatted
    });

  } catch (err) {
    console.error("COPY STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


// ======================================================
// CREATE BOOK (WITH JOI VALIDATION)
// Only librarians and admins can create books
// ======================================================

router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { error } = createBookSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const {
      title,
      isbn,
      publication_year,
      publication_id,
      category_id,
      authorIds,
      genreIds
    } = req.body;

    const book = await Book.create({
      title,
      isbn,
      publication_year,
      publication_id,
      category_id
    });

    const authors = await Author.findAll({
      where: { author_id: authorIds }
    });

    await book.setAuthors(authors);

    const genres = await Genre.findAll({
      where: { genre_id: genreIds }
    });

    await book.setGenres(genres);

    const bookWithRelations = await Book.findByPk(book.book_id, {
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        Publication,
        Category
      ]
    });

    res.status(201).json({
      success: true,
      book: bookWithRelations
    });

  } catch (err) {
    console.error("CREATE BOOK ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// UPDATE BOOK
// Only librarians and admins can update books
// ======================================================

router.put("/:id", auth, requireLibrarian, async (req, res) => {
  try {

    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    // Update basic fields
    const { authorIds, genreIds, ...basicFields } = req.body;
    await book.update(basicFields);

    // Update authors if provided
    if (authorIds && Array.isArray(authorIds)) {
      const authors = await Author.findAll({
        where: { author_id: authorIds }
      });
      await book.setAuthors(authors);
    }

    // Update genres if provided
    if (genreIds && Array.isArray(genreIds)) {
      const genres = await Genre.findAll({
        where: { genre_id: genreIds }
      });
      await book.setGenres(genres);
    }

    const updatedBook = await Book.findByPk(book.book_id, {
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        Publication,
        Category
      ]
    });

    res.json({
      success: true,
      book: updatedBook
    });

  } catch (err) {
    console.error("UPDATE BOOK ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================================
// DELETE BOOK
// Only admins can delete books
// ======================================================

router.delete("/:id", auth, requireAdmin, async (req, res) => {
  try {

    const book = await Book.findByPk(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    await book.destroy();

    res.json({
      success: true,
      message: "Book deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ======================================================
// GET RECENTLY ADDED BOOKS
// ======================================================

router.get("/recent/new-arrivals", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const books = await Book.findAll({
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        { model: Publication },
        { model: Category }
      ]
    });

    res.json({
      success: true,
      books
    });

  } catch (err) {
    console.error("RECENT BOOKS ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});


// ======================================================
// GET POPULAR BOOKS (Most borrowed)
// ======================================================

router.get("/popular/most-borrowed", async (req, res) => {
  try {
    const { limit = 10, period = "all" } = req.query;

    let dateCondition = "";
    let dateValue = null;

    if (period === "month") {
      dateCondition = "WHERE i.check_out >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
    } else if (period === "year") {
      dateCondition = "WHERE i.check_out >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    }

    const popularBooks = await sequelize.query(`
      SELECT 
        b.book_id,
        b.title,
        b.isbn,
        b.publication_year,
        COUNT(i.issue_id) as borrow_count
      FROM Books b
      INNER JOIN Copies c ON b.book_id = c.book_id
      INNER JOIN Issues i ON c.copy_id = i.copy_id
      ${dateCondition}
      GROUP BY b.book_id, b.title, b.isbn, b.publication_year
      ORDER BY borrow_count DESC
      LIMIT :limit
    `, {
      replacements: { limit: parseInt(limit) },
      type: sequelize.QueryTypes.SELECT
    });

    // Get full book details for each
    const bookIds = popularBooks.map(b => b.book_id);
    
    if (bookIds.length === 0) {
      return res.json({
        success: true,
        period,
        books: []
      });
    }

    const booksWithDetails = await Book.findAll({
      where: { book_id: { [Op.in]: bookIds } },
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        { model: Publication },
        { model: Category }
      ]
    });

    // Merge borrow count
    const result = booksWithDetails.map(book => {
      const popularBook = popularBooks.find(pb => pb.book_id === book.book_id);
      return {
        ...book.toJSON(),
        borrow_count: popularBook.borrow_count
      };
    });

    // Sort by borrow count
    result.sort((a, b) => b.borrow_count - a.borrow_count);

    res.json({
      success: true,
      period,
      books: result
    });

  } catch (err) {
    console.error("POPULAR BOOKS ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err.message
    });
  }
});


// ======================================================
// GET BOOK RECOMMENDATIONS (Based on genre)
// ======================================================

router.get("/recommendations/:book_id", async (req, res) => {
  try {
    const { book_id } = req.params;
    const { limit = 5 } = req.query;

    // Get the genres of this book
    const book = await Book.findByPk(book_id, {
      include: [{ model: Genre }]
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found"
      });
    }

    const genreIds = book.Genres.map(g => g.genre_id);

    if (genreIds.length === 0) {
      return res.json({
        success: true,
        books: []
      });
    }

    // Find books with same genres
    const recommendations = await BookGenre.findAll({
      where: {
        genre_id: { [Op.in]: genreIds },
        book_id: { [Op.ne]: book_id } // Exclude current book
      },
      attributes: [
        'book_id',
        [Sequelize.fn('COUNT', Sequelize.col('genre_id')), 'matching_genres']
      ],
      group: ['book_id'],
      order: [[Sequelize.literal('matching_genres'), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    const bookIds = recommendations.map(r => r.book_id);

    if (bookIds.length === 0) {
      return res.json({
        success: true,
        books: []
      });
    }

    const books = await Book.findAll({
      where: { book_id: { [Op.in]: bookIds } },
      include: [
        { model: Author, through: { attributes: [] } },
        { model: Genre, through: { attributes: [] } },
        { model: Publication },
        { model: Category }
      ]
    });

    res.json({
      success: true,
      books
    });

  } catch (err) {
    console.error("RECOMMENDATIONS ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

module.exports = router;