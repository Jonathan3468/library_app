const express = require("express");
const router = express.Router();
const { Copy, Issue, Borrower, Request } = require("../models");
const { Op } = require("sequelize");
const { getSetting } = require("../config/librarySettings");
const { log, ACTIONS } = require("../services/auditService");
const { auth } = require("../middleware/auth.middleware");

const calculateFine = (dueDate, returnDate) => {
  const FINE_PER_DAY = getSetting("FINE_PER_DAY");
  const due      = new Date(dueDate);
  const returned = new Date(returnDate);
  if (returned > due) {
    const daysLate = Math.ceil((returned - due) / (1000 * 60 * 60 * 24));
    return daysLate * FINE_PER_DAY;
  }
  return 0;
};

router.post("/", auth, async (req, res) => {
  try {
    const { rf_id, copy_code } = req.body;
    const ip = req.ip || req.headers["x-forwarded-for"];

    const borrower = await Borrower.findOne({ where: { rf_id } });
    if (!borrower) return res.status(404).json({ error: "Borrower not found" });

    const borrowerId = borrower.borrower_id;
    const copy = await Copy.findOne({ where: { copy_code } });
    if (!copy) return res.status(404).json({ error: "Copy not found" });

    // ─── ISSUE ───────────────────────────────────────────────────────────────
    if (copy.status === "available") {
      if (borrower.membership_expiry && new Date(borrower.membership_expiry) < new Date()) {
        return res.status(400).json({ error: "Membership expired" });
      }

      const outstandingFines = await Issue.sum("fine", {
        where: { borrower_id: borrowerId, fine: { [Op.gt]: 0 }, fine_paid: false },
      }) || 0;
      if (outstandingFines > 0) {
        return res.status(400).json({ error: `Cannot issue book. Outstanding fines: ₹${outstandingFines}` });
      }

      const activeIssues = await Issue.count({ where: { borrower_id: borrowerId, status: "issued" } });
      const MAX_BOOKS = getSetting("MAX_BOOKS_PER_BORROWER");
      if (activeIssues >= MAX_BOOKS) {
        return res.status(400).json({ error: `Borrowing limit reached (${MAX_BOOKS} books)` });
      }

      const today = new Date();
      const due   = new Date();
      due.setDate(today.getDate() + getSetting("LOAN_PERIOD_DAYS"));

      const issue = await Issue.create({
        borrower_id: borrowerId,
        copy_id:     copy.copy_id,
        status:      "issued",
        check_out:   today,
        due_date:    due,
        fine:        0,
        fine_paid:   false,
      });

      await copy.update({ status: "issued" });

      await log({
        action:     ACTIONS.BOOK_ISSUED,
        user:       req.user,
        targetType: "ISSUE",
        targetId:   issue.issue_id,
        details: {
          borrower_id:   borrowerId,
          borrower_name: borrower.borrower_name,
          copy_code,
          copy_id:       copy.copy_id,
          due_date:      due.toISOString(),
        },
        ip,
      });

      return res.json({ action: "ISSUED", due_date: due, issue_id: issue.issue_id });
    }

    // ─── RETURN ───────────────────────────────────────────────────────────────
    if (copy.status === "issued") {
      const activeIssue = await Issue.findOne({
        where: { borrower_id: borrowerId, copy_id: copy.copy_id, status: "issued" },
      });

      if (activeIssue) {
        const today = new Date();
        const fine  = calculateFine(activeIssue.due_date, today);

        await activeIssue.update({ status: "returned", check_in: today, fine, fine_paid: false });
        await copy.update({ status: "available" });

        const nextRequest = await Request.findOne({
          where: { copy_id: copy.copy_id, status: "pending" },
          order: [["request_date", "ASC"]],
        });

        await log({
          action:     ACTIONS.BOOK_RETURNED,
          user:       req.user,
          targetType: "ISSUE",
          targetId:   activeIssue.issue_id,
          details: {
            borrower_id:   borrowerId,
            borrower_name: borrower.borrower_name,
            copy_code,
            copy_id:       copy.copy_id,
            fine,
            days_late: fine > 0
              ? Math.ceil((today - new Date(activeIssue.due_date)) / (1000 * 60 * 60 * 24))
              : 0,
          },
          ip,
        });

        return res.json({
          action:          "RETURNED",
          fine,
          days_late:       fine > 0 ? Math.ceil((today - new Date(activeIssue.due_date)) / (1000 * 60 * 60 * 24)) : 0,
          pending_request: nextRequest ? true : false,
        });
      }

      const alreadyIssued = await Issue.findOne({
        where: { borrower_id: borrowerId, copy_id: copy.copy_id, status: "issued" },
      });
      if (alreadyIssued) return res.status(400).json({ error: "You already have this book issued to you!" });

      const existingRequest = await Request.findOne({
        where: { borrower_id: borrowerId, copy_id: copy.copy_id, status: "pending" },
      });
      if (existingRequest) return res.status(400).json({ error: "Request already exists for this book" });

      const today  = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + getSetting("REQUEST_EXPIRY_DAYS"));

      const request = await Request.create({
        borrower_id:  borrowerId,
        copy_id:      copy.copy_id,
        request_date: today,
        expiry_date:  expiry,
        status:       "pending",
      });

      return res.json({
        action:     "REQUEST_CREATED",
        request_id: request.request_id,
        message:    "Book is currently issued to another borrower. Your request has been created.",
      });
    }

    return res.status(400).json({ error: `Copy is not available (Status: ${copy.status})` });

  } catch (err) {
    console.error("SCAN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;