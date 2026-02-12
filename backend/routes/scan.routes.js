const express = require("express");
const router = express.Router();
const { Copy, Issue, Borrower, Request } = require("../models");

router.post("/", async (req, res) => {
  try {
    const { borrower_id, copy_code } = req.body;

    // ================= VALIDATE BORROWER =================
    const borrower = await Borrower.findByPk(borrower_id);
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // ================= VALIDATE COPY =================
    const copy = await Copy.findOne({ where: { copy_code } });
    if (!copy) {
      return res.status(404).json({ error: "Copy not found" });
    }

    // =====================================================
    // ================= ISSUE LOGIC =======================
    // =====================================================
    if (copy.status === "available") {

      // Membership expiry check
      if (
        !borrower.membership_expiry ||
        new Date(borrower.membership_expiry) < new Date()
      ) {
        return res.status(400).json({
          error: "Membership expired"
        });
      }

      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 7); // 7-day loan

      const issue = await Issue.create({
        borrower_id,
        copy_id: copy.copy_id,
        status: "issued",
        check_out: today,
        due_date: due
      });

      await copy.update({ status: "issued" });

      return res.json({
        action: "ISSUED",
        due_date: due,
        issue_id: issue.issue_id
      });
    }

    // =====================================================
    // ================= REQUEST LOGIC =====================
    // =====================================================
    if (copy.status === "issued") {

      // Check if this borrower already has an active issue
      const activeIssue = await Issue.findOne({
        where: {
          borrower_id,
          copy_id: copy.copy_id,
          status: "issued"
        }
      });

      // If same borrower → RETURN
      if (activeIssue) {

        const today = new Date();
        let fine = 0;

        if (today > activeIssue.due_date) {
          const diffTime = today - activeIssue.due_date;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          fine = diffDays * 5; // ₹5 per day
        }

        await activeIssue.update({
          status: "returned",
          check_in: today,
          fine: fine
        });

        await copy.update({ status: "available" });

        // Check for oldest pending request
        const nextRequest = await Request.findOne({
          where: {
            copy_id: copy.copy_id,
            status: "pending"
          },
          order: [["request_date", "ASC"]]
        });

        if (nextRequest) {
          await nextRequest.update({ status: "fulfilled" });
        }

        return res.json({
          action: "RETURNED",
          fine: fine
        });
      }

      // Otherwise → Create Reservation Request
      const existingRequest = await Request.findOne({
        where: {
          borrower_id,
          copy_id: copy.copy_id,
          status: "pending"
        }
      });

      if (existingRequest) {
        return res.status(400).json({
          message: "Request already exists"
        });
      }

      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + 7);

      const request = await Request.create({
        borrower_id,
        copy_id: copy.copy_id,
        request_date: today,
        expiry_date: expiry,
        status: "pending"
      });

      return res.json({
        action: "REQUEST_CREATED",
        request_id: request.request_id
      });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
