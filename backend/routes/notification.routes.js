const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { Op } = require("sequelize");
const { Issue, Borrower, Copy, Book, Request, User } = require("../models");
const {
  sendOverdueEmail,
  sendOverdueSMS,
  sendReminderEmail,
  sendRequestAvailableEmail,
  sendPasswordResetEmail
} = require("../services/notificationService");

// ======================================================
// SEND OVERDUE NOTIFICATIONS (All overdue books)
// ======================================================
router.post("/send-overdue", async (req, res) => {
  try {
    const overdueIssues = await Issue.findAll({
      where: {
        status: "issued",
        due_date: { [Op.lt]: new Date() }
      },
      include: [
        { model: Borrower },
        { model: Copy, include: [{ model: Book }] }
      ]
    });

    const results = { total: overdueIssues.length, emailsSent: 0, smsSent: 0, failed: 0 };

    for (const issue of overdueIssues) {
      const borrower = issue.Borrower;
      const book = issue.Copy.Book;
      try {
        const emailSent = await sendOverdueEmail(borrower, issue, book);
        if (emailSent) results.emailsSent++;
      } catch (error) {
        console.error(`Failed to notify borrower ${borrower.borrower_id}:`, error);
        results.failed++;
      }
    }

    res.json({ success: true, message: "Overdue notifications sent", results });

  } catch (err) {
    console.error("SEND OVERDUE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send notifications", error: err.message });
  }
});

// ======================================================
// SEND REMINDERS (Books due soon)
// ======================================================
router.post("/send-reminders", async (req, res) => {
  try {
    const { daysBeforeDue = 2 } = req.body;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(daysBeforeDue));

    const upcomingIssues = await Issue.findAll({
      where: {
        status: "issued",
        due_date: { [Op.between]: [today, futureDate] }
      },
      include: [
        { model: Borrower },
        { model: Copy, include: [{ model: Book }] }
      ]
    });

    const results = { total: upcomingIssues.length, sent: 0, failed: 0 };

    for (const issue of upcomingIssues) {
      const borrower = issue.Borrower;
      const book = issue.Copy.Book;
      try {
        const sent = await sendReminderEmail(borrower, issue, book);
        if (sent) results.sent++;
      } catch (error) {
        console.error(`Failed to remind borrower ${borrower.borrower_id}:`, error);
        results.failed++;
      }
    }

    res.json({ success: true, message: "Reminder notifications sent", results });

  } catch (err) {
    console.error("SEND REMINDERS ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send reminders", error: err.message });
  }
});

// ======================================================
// MANUAL NOTIFICATION (Single issue)
// ======================================================
router.post("/send-manual/:issue_id", async (req, res) => {
  try {
    const { issue_id } = req.params;
    const { type } = req.body;

    const issue = await Issue.findByPk(issue_id, {
      include: [
        { model: Borrower },
        { model: Copy, include: [{ model: Book }] }
      ]
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const borrower = issue.Borrower;
    const book = issue.Copy.Book;

    let sent = false;
    if (type === 'overdue') {
      sent = await sendOverdueEmail(borrower, issue, book);
    } else {
      sent = await sendReminderEmail(borrower, issue, book);
    }

    res.json({
      success: true,
      sent,
      message: sent
        ? "Notification sent successfully"
        : "Failed to send notification (borrower may not have email)"
    });

  } catch (err) {
    console.error("SEND MANUAL ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send notification", error: err.message });
  }
});

// ======================================================
// NOTIFY REQUEST AVAILABLE (Manual — per request)
// ======================================================
router.post("/send-request-available/:request_id", async (req, res) => {
  try {
    const { request_id } = req.params;

    const request = await Request.findByPk(request_id, {
      include: [
        { model: Borrower },
        { model: Copy, include: [{ model: Book }] }
      ]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot notify — request status is "${request.status}". Only pending requests can be notified.`
      });
    }

    const borrower = request.Borrower;
    const book = request.Copy.Book;
    const copy = request.Copy;

    if (!borrower.email) {
      return res.status(400).json({
        success: false,
        message: "Borrower does not have an email address on file."
      });
    }

    const sent = await sendRequestAvailableEmail(borrower, {
      book_title: book.title,
      copy_code: copy.copy_code,
    });

    res.json({
      success: true,
      sent,
      message: sent
        ? `Availability notification sent to ${borrower.email}`
        : "Failed to send email — please check the mail server configuration."
    });

  } catch (err) {
    console.error("SEND REQUEST AVAILABLE ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to send notification", error: err.message });
  }
});

// ======================================================
// SEND PASSWORD RESET EMAIL
// Checks if email exists in Users table, generates token,
// saves it, and sends the reset email.
// ======================================================
router.post("/send-password-reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with that email address." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({ reset_token: token, reset_otp: otp, reset_token_expiry: expiry });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const sent = await sendPasswordResetEmail(user, resetLink, otp); // pass otp

    if (!sent) {
      return res.status(500).json({ success: false, message: "Failed to send reset email." });
    }

    res.json({ success: true, message: "Password reset link sent to your email." });

  } catch (err) {
    console.error("SEND PASSWORD RESET ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ======================================================
// VERIFY RESET TOKEN/OTP (Flutter Step 1)
// ======================================================
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token is required." });

    const user = await User.findOne({
      where: {
        [Op.or]: [{ reset_token: token }, { reset_otp: token }],
        reset_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired code." });
    }

    res.json({ success: true, message: "Code verified." });

  } catch (err) {
    console.error("VERIFY RESET TOKEN ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// ======================================================
// RESET PASSWORD (Web uses URL token, Flutter uses OTP)
// ======================================================
router.post("/reset-password", async (req, res) => {
  try {
    // Web sends { token, new_password }, Flutter sends { token, password }
    const { token, password, new_password } = req.body;
    const newPass = password || new_password;

    if (!token || !newPass) {
      return res.status(400).json({ success: false, message: "Token and password are required." });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ reset_token: token }, { reset_otp: token }],
        reset_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    const bcrypt = require("bcrypt");
    const hashed = await bcrypt.hash(newPass, 10);

    await user.update({
      password: hashed,
      reset_token: null,
      reset_otp: null,
      reset_token_expiry: null
    });

    res.json({ success: true, message: "Password reset successfully." });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

module.exports = router;