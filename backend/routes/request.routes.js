const express = require("express");
const router = express.Router();
const { Request, Borrower, Copy, Book, Issue } = require("../models");
const { Op } = require("sequelize");
const { auth } = require("../middleware/auth.middleware");
const { sendRequestCancelledEmail } = require("../services/notificationService");
const { getSetting } = require("../config/librarySettings");

const expireStaleRequests = async () => {
  await Request.update(
    { status: "expired" },
    { where: { status: "pending", expiry_date: { [Op.lt]: new Date() } } }
  );
};

// =====================================================
// CREATE REQUEST
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { rf_id, copy_code } = req.body;

    const borrower = await Borrower.findOne({ where: { rf_id } });
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found with this RF ID" });
    }

    const copy = await Copy.findOne({
      where: { copy_code },
      include: [{ model: Book }]
    });

    if (!copy) {
      return res.status(404).json({ error: "Copy not found with this barcode" });
    }

    if (copy.status === "available") {
      return res.status(400).json({
        error: "This book is available. You can borrow it directly instead of requesting."
      });
    }

    const alreadyIssuedToSameBorrower = await Issue.findOne({
      where: {
        borrower_id: borrower.borrower_id,
        copy_id: copy.copy_id,
        status: "issued"
      }
    });

    if (alreadyIssuedToSameBorrower) {
      return res.status(400).json({
        error: "You already have this book issued to you. You cannot request your own book!"
      });
    }

    const existingRequest = await Request.findOne({
      where: {
        borrower_id: borrower.borrower_id,
        copy_id: copy.copy_id,
        status: "pending"
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        error: "You already have a pending request for this book"
      });
    }

    if (
      borrower.membership_expiry &&
      new Date(borrower.membership_expiry) < new Date()
    ) {
      return res.status(400).json({
        error: "Membership expired. Please renew to create requests."
      });
    }

    const today = new Date();
    const expiry = new Date();
    const REQUEST_EXPIRY_DAYS = getSetting("REQUEST_EXPIRY_DAYS");
    expiry.setDate(today.getDate() + REQUEST_EXPIRY_DAYS);

    const request = await Request.create({
      borrower_id: borrower.borrower_id,
      copy_id: copy.copy_id,
      request_date: today,
      expiry_date: expiry,
      status: "pending"
    });

    return res.json({
      success: true,
      message: "Request created successfully!",
      request,
      book_title: copy.Book?.title,
      expiry_date: expiry
    });

  } catch (err) {
    console.error("CREATE REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// FULFILL REQUEST
// =====================================================
router.post("/:id/fulfill", async (req, res) => {
  try {
    await expireStaleRequests();
    const request = await Request.findByPk(req.params.id, {
      include: [
        { model: Borrower },
        { model: Copy }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be fulfilled" });
    }

    if (request.Copy.status !== "available") {
      return res.status(400).json({
        error: "Book is not available yet. It hasn't been returned."
      });
    }

    const today = new Date();
    const due = new Date();
    const LOAN_PERIOD = getSetting("LOAN_PERIOD_DAYS");
    due.setDate(today.getDate() + LOAN_PERIOD);

    await Issue.create({
      borrower_id: request.borrower_id,
      copy_id: request.copy_id,
      status: "issued",
      check_out: today,
      due_date: due,
      fine: 0,
      fine_paid: false
    });

    await request.Copy.update({ status: "issued" });
    await request.update({ status: "fulfilled" });

    return res.json({
      success: true,
      message: `Book issued to ${request.Borrower.borrower_name}`,
      due_date: due
    });

  } catch (err) {
    console.error("FULFILL REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// GET ALL REQUESTS
// =====================================================
router.get("/", async (req, res) => {
  try {
    const { status, borrower_id } = req.query;

    await expireStaleRequests();
    const where = {};
    if (status) where.status = status;
    if (borrower_id) where.borrower_id = borrower_id;

    const requests = await Request.findAll({
      where,
      include: [
        {
          model: Borrower,
          attributes: ["borrower_id", "borrower_name", "email"]
        },
        {
          model: Copy,
          include: [{ model: Book }]
        }
      ],
      order: [["request_date", "DESC"]]
    });

    res.json({ success: true, requests });

  } catch (err) {
    console.error("GET REQUESTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// GET REQUEST BY ID
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        {
          model: Borrower,
          attributes: ["borrower_id", "borrower_name", "email", "phone"]
        },
        {
          model: Copy,
          include: [{ model: Book }]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({ success: true, request });

  } catch (err) {
    console.error("GET REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// UPDATE REQUEST STATUS
// =====================================================
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const request = await Request.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    await request.update({ status });

    res.json({ success: true, message: "Request updated successfully", request });

  } catch (err) {
    console.error("UPDATE REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// CANCEL REQUEST
// Members can cancel their own; staff can cancel any
// =====================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findByPk(req.params.id, {
      include: [
        { model: Borrower },
        { model: Copy, include: [{ model: Book }] }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be cancelled" });
    }

    const userRole = req.user.role;
    const isStaff = ["admin", "librarian"].includes(userRole);

    // For members, verify this request belongs to them
    if (!isStaff) {
      const borrower = await Borrower.findOne({ where: { user_id: req.user.id } });
      if (!borrower || borrower.borrower_id !== request.borrower_id) {
        return res.status(403).json({ error: "You can only cancel your own requests" });
      }
    }

    await request.update({ status: "cancelled" });

    // Only email if staff cancelled on member's behalf — member knows they cancelled themselves
    if (isStaff) {
      const borrower = request.Borrower;
      const book = request.Copy?.Book;
      if (borrower && book) {
        sendRequestCancelledEmail(borrower, {
          request_id: request.request_id,
          book_title: book.title,
          copy_code: request.Copy?.copy_code,
          cancelled_by: "staff"
        }).catch(err => console.error("Cancellation email failed silently:", err));
      }
    }

    res.json({ success: true, message: "Request cancelled successfully" });

  } catch (err) {
    console.error("CANCEL REQUEST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// GET MY REQUESTS (by RF ID)
// =====================================================
router.post("/my-requests", async (req, res) => {
  try {
    await expireStaleRequests();
    const { rf_id } = req.body;

    const borrower = await Borrower.findOne({ where: { rf_id } });
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    const requests = await Request.findAll({
      where: { borrower_id: borrower.borrower_id },
      include: [
        {
          model: Copy,
          include: [{ model: Book }]
        }
      ],
      order: [["request_date", "DESC"]]
    });

    res.json({
      success: true,
      borrower_name: borrower.borrower_name,
      requests
    });

  } catch (err) {
    console.error("GET MY REQUESTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;