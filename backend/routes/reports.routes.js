const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Issue, Borrower, Copy, Book, Author, Genre, Category, Publication } = require("../models");

// ======================================================
// GET ACTIVE ISSUES
// ======================================================
router.get("/active", async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "due_date", order = "ASC" } = req.query;
    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Issue.findAndCountAll({
      where: { status: "issued" },
      include: [
        { model: Borrower, required: false },
        {
          model: Copy,
          attributes: ["copy_id", "copy_code", "book_id", "status"],
          required: false,
          include: [{
            model: Book,
            attributes: ["book_id", "title", "isbn", "publication_year"],
            required: false,
            include: [
              { model: Author,      attributes: ["author_id", "author_name"],           through: { attributes: [] }, required: false },
              { model: Category,    attributes: ["category_id", "category_name"],                                    required: false },
              { model: Genre,       attributes: ["genre_id", "genre_name"],             through: { attributes: [] }, required: false },
              { model: Publication, attributes: ["publication_id", "publication_name"],                               required: false },
            ],
          }],
        },
      ],
      limit: parsedLimit, offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    res.json({ success: true, totalIssues: count, totalCount: count, totalPages: Math.ceil(count / parsedLimit), currentPage: parsedPage, issues: rows });
  } catch (err) {
    console.error("ACTIVE ISSUES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ======================================================
// GET OVERDUE ISSUES
// ======================================================
router.get("/overdue", async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "due_date", order = "ASC" } = req.query;
    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Issue.findAndCountAll({
      where: { status: "issued", due_date: { [Op.lt]: new Date() } },
      include: [
        { model: Borrower, required: false },
        {
          model: Copy,
          attributes: ["copy_id", "copy_code", "book_id", "status"],
          required: false,
          include: [{
            model: Book,
            attributes: ["book_id", "title", "isbn", "publication_year"],
            required: false,
            include: [
              { model: Author,      attributes: ["author_id", "author_name"],           through: { attributes: [] }, required: false },
              { model: Category,    attributes: ["category_id", "category_name"],                                    required: false },
              { model: Genre,       attributes: ["genre_id", "genre_name"],             through: { attributes: [] }, required: false },
              { model: Publication, attributes: ["publication_id", "publication_name"],                               required: false },
            ],
          }],
        },
      ],
      limit: parsedLimit, offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    res.json({ success: true, totalIssues: count, totalCount: count, totalPages: Math.ceil(count / parsedLimit), currentPage: parsedPage, issues: rows });
  } catch (err) {
    console.error("OVERDUE ISSUES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ======================================================
// GET ISSUE HISTORY BY BORROWER
// ======================================================
router.get("/history/:borrower_id", async (req, res) => {
  try {
    const { borrower_id } = req.params;
    const { page = 1, limit = 10, sortBy = "due_date", order = "DESC" } = req.query;
    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Issue.findAndCountAll({
      where: { borrower_id },
      include: [
        { model: Borrower, required: false },
        {
          model: Copy,
          attributes: ["copy_id", "copy_code", "book_id", "status"],
          required: false,
          include: [{
            model: Book,
            attributes: ["book_id", "title", "isbn", "publication_year"],
            required: false,
            include: [
              { model: Author,      attributes: ["author_id", "author_name"],           through: { attributes: [] }, required: false },
              { model: Category,    attributes: ["category_id", "category_name"],                                    required: false },
              { model: Genre,       attributes: ["genre_id", "genre_name"],             through: { attributes: [] }, required: false },
              { model: Publication, attributes: ["publication_id", "publication_name"],                               required: false },
            ],
          }],
        },
      ],
      limit: parsedLimit, offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    res.json({ success: true, totalIssues: count, totalCount: count, totalPages: Math.ceil(count / parsedLimit), currentPage: parsedPage, issues: rows });
  } catch (err) {
    console.error("BORROWER HISTORY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ======================================================
// FILTER ISSUES
// ======================================================
router.get("/", async (req, res) => {
  try {
    const {
      borrower_id,
      book_id,
      overdue,
      status,
      fine_filter,
      page = 1,
      limit = 10,
      sortBy = "due_date",
      order = "ASC"
    } = req.query;

    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    let whereClause     = {};
    let copyWhereClause = {};

    if (borrower_id) whereClause.borrower_id = borrower_id;
    if (status)      whereClause.status      = status;

    if (overdue === "true") {
      whereClause.due_date = { [Op.lt]: new Date() };
      whereClause.status   = "issued";
    }

    if (book_id) copyWhereClause.book_id = book_id;

    if (fine_filter === "has_fine") {
      whereClause.fine = { [Op.gt]: 0 };
    } else if (fine_filter === "no_fine") {
      whereClause.fine = { [Op.or]: [{ [Op.eq]: 0 }, { [Op.is]: null }] };
    }

    const { count, rows } = await Issue.findAndCountAll({
      where: whereClause,
      include: [
        { model: Borrower, required: false },
        {
          model: Copy,
          attributes: ["copy_id", "copy_code", "book_id", "status"],
          where: Object.keys(copyWhereClause).length > 0 ? copyWhereClause : undefined,
          required: Object.keys(copyWhereClause).length > 0,
          include: [{
            model: Book,
            attributes: ["book_id", "title", "isbn", "publication_year"],
            required: false,
            include: [
              { model: Author,      attributes: ["author_id", "author_name"],           through: { attributes: [] }, required: false },
              { model: Category,    attributes: ["category_id", "category_name"],                                    required: false },
              { model: Genre,       attributes: ["genre_id", "genre_name"],             through: { attributes: [] }, required: false },
              { model: Publication, attributes: ["publication_id", "publication_name"],                               required: false },
            ],
          }],
        },
      ],
      limit: parsedLimit, offset,
      order: [[sortBy, order]],
      distinct: true,
    });

    res.json({ success: true, totalIssues: count, totalCount: count, totalPages: Math.ceil(count / parsedLimit), currentPage: parsedPage, issues: rows });
  } catch (err) {
    console.error("FILTER ISSUES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

module.exports = router;