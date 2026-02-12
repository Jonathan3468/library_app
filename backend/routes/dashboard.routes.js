const express = require("express");
const router = express.Router();
const { Book, Copy, Borrower, Issue } = require("../models");

router.get("/", async (req, res) => {
  try {
    const totalBooks = await Book.count();
    const totalCopies = await Copy.count();
    const totalBorrowers = await Borrower.count();
    const issuedBooks = await Issue.count({ where: { status: "issued" } });
    const returnedBooks = await Issue.count({ where: { status: "returned" } });

    res.json({
      totalBooks,
      totalCopies,
      totalBorrowers,
      issuedBooks,
      returnedBooks
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
