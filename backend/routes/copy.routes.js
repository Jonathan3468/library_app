//copies.routes.js
const express = require("express");
const router = express.Router();
const { Copy, Book, Issue, Borrower, FinePayment } = require("../models");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");
const { log, ACTIONS } = require("../services/auditService");
const { getSetting } = require("../config/librarySettings");

// ================= ADD COPY =================
router.post("/", auth, requireLibrarian, async (req, res) => {
  try {
    const { book_id, copy_code, status = "available" } = req.body;

    if (!book_id || !copy_code) {
      return res.status(400).json({ error: "book_id and copy_code are required" });
    }

    const book = await Book.findByPk(book_id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    const existing = await Copy.findOne({ where: { copy_code } });
    if (existing) return res.status(400).json({ error: `Copy code "${copy_code}" already exists` });

    const copy = await Copy.create({ book_id, copy_code, status });

    await log({
      action: ACTIONS.COPY_ADDED, user: req.user,
      targetType: "COPY", targetId: copy.copy_id,
      details: { book_id, book_title: book.title, copy_code },
      ip: req.ip,
    });

    res.status(201).json({ success: true, copy });
  } catch (err) {
    console.error("ADD COPY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE COPY =================
router.delete("/:id", auth, requireLibrarian, async (req, res) => {
  try {
    const copy = await Copy.findByPk(req.params.id, {
      include: [{ model: Book, attributes: ["title"] }],
    });
    if (!copy) return res.status(404).json({ error: "Copy not found" });

    if (copy.status === "issued") {
      return res.status(400).json({ error: "Cannot delete a copy that is currently issued" });
    }

    const copyCode  = copy.copy_code;
    const bookTitle = copy.Book?.title;

    await copy.destroy();

    await log({
      action: ACTIONS.COPY_DELETED, user: req.user,
      targetType: "COPY", targetId: req.params.id,
      details: { copy_code: copyCode, book_title: bookTitle },
      ip: req.ip,
    });

    res.json({ success: true, message: "Copy deleted successfully" });
  } catch (err) {
    console.error("DELETE COPY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= MARK COPY AS LOST =================
// POST /copies/:id/mark-lost
// Body: { borrower_id?, notes? }
// - If currently issued: marks issue as returned, calculates fine, creates a replacement fine
// - If available: just marks copy status as lost
router.post("/:id/mark-lost", auth, requireLibrarian, async (req, res) => {
  try {
    const copy = await Copy.findByPk(req.params.id, {
      include: [{ model: Book, attributes: ["book_id", "title", "isbn"] }],
    });
    if (!copy) return res.status(404).json({ error: "Copy not found" });
    if (copy.status === "lost") return res.status(400).json({ error: "Copy is already marked as lost" });

    const { notes } = req.body;
    let replacementFine = null;
    let activeIssue     = null;

    const REPLACEMENT_FINE_AMOUNT = getSetting("REPLACEMENT_FINE_AMOUNT") || 500;

    // ── Case 1: copy is currently issued ────────────────────────────────────
    if (copy.status === "issued") {
      activeIssue = await Issue.findOne({
        where: { copy_id: copy.copy_id, status: "issued" },
        include: [{ model: Borrower, attributes: ["borrower_id", "borrower_name", "email"] }],
      });

      if (activeIssue) {
        const today = new Date();

        // Calculate any existing late fine
        const FINE_PER_DAY  = getSetting("FINE_PER_DAY");
        const due           = new Date(activeIssue.due_date);
        const lateFine = today > due
          ? Math.ceil((today - due) / (1000 * 60 * 60 * 24)) * FINE_PER_DAY
          : 0;

        // Close the issue
        await activeIssue.update({
          status:    "returned",
          check_in:  today,
          fine:      lateFine,
          fine_paid: false,
        });

        // Create replacement fine via FinePayment
        replacementFine = await FinePayment.create({
          borrower_id:    activeIssue.borrower_id,
          copy_id:        copy.copy_id,
          amount:         REPLACEMENT_FINE_AMOUNT,
          reason:         `Replacement fine — lost copy ${copy.copy_code} (${copy.Book?.title || "Unknown"})${notes ? `: ${notes}` : ""}`,
          payment_method: "cash",
          status:         "pending",
          created_by:     req.user?.id || null,
        });
      }
    }

    // ── Mark copy as lost ────────────────────────────────────────────────────
    await copy.update({ status: "lost" });

    await log({
      action: ACTIONS.COPY_MARKED_LOST, user: req.user,
      targetType: "COPY", targetId: copy.copy_id,
      details: {
        copy_code:          copy.copy_code,
        book_title:         copy.Book?.title,
        was_issued:         !!activeIssue,
        borrower_id:        activeIssue?.borrower_id   || null,
        borrower_name:      activeIssue?.Borrower?.borrower_name || null,
        replacement_fine:   replacementFine?.payment_id ? `CF-${replacementFine.payment_id}` : null,
        replacement_amount: REPLACEMENT_FINE_AMOUNT,
        notes:              notes || null,
      },
      ip: req.ip,
    });

    if (replacementFine) {
      await log({
        action: ACTIONS.REPLACEMENT_FINE, user: req.user,
        targetType: "FINE", targetId: `CF-${replacementFine.payment_id}`,
        details: {
          borrower_name: activeIssue?.Borrower?.borrower_name,
          amount:        REPLACEMENT_FINE_AMOUNT,
          copy_code:     copy.copy_code,
          book_title:    copy.Book?.title,
        },
        ip: req.ip,
      });
    }

    res.json({
      success: true,
      message: activeIssue
        ? `Copy marked as lost. Replacement fine of ₹${REPLACEMENT_FINE_AMOUNT} created for ${activeIssue.Borrower?.borrower_name}.`
        : "Copy marked as lost.",
      copy_id:              copy.copy_id,
      was_issued:           !!activeIssue,
      borrower_name:        activeIssue?.Borrower?.borrower_name || null,
      replacement_fine_id:  replacementFine ? `CF-${replacementFine.payment_id}` : null,
      replacement_amount:   replacementFine ? REPLACEMENT_FINE_AMOUNT : null,
    });
  } catch (err) {
    console.error("MARK LOST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= RESTORE COPY (un-mark lost) =================
router.post("/:id/restore", auth, requireLibrarian, async (req, res) => {
  try {
    const copy = await Copy.findByPk(req.params.id, {
      include: [{ model: Book, attributes: ["title"] }],
    });
    if (!copy) return res.status(404).json({ error: "Copy not found" });
    if (copy.status !== "lost") return res.status(400).json({ error: "Copy is not marked as lost" });

    await copy.update({ status: "available" });

    await log({
      action: "COPY_RESTORED", user: req.user,
      targetType: "COPY", targetId: copy.copy_id,
      details: { copy_code: copy.copy_code, book_title: copy.Book?.title },
      ip: req.ip,
    });

    res.json({ success: true, message: "Copy restored to available" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/*
─────────────────────────────────────────────────────────────────
ADD TO app.js:
  const copyRoutes = require("./routes/copies.routes");
  app.use("/copies", copyRoutes);
─────────────────────────────────────────────────────────────────
ADD TO librarySettings.js (if not present):
  REPLACEMENT_FINE_AMOUNT: 500,   // ₹ charged for a lost book
─────────────────────────────────────────────────────────────────
*/