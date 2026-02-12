const express = require("express");
const router = express.Router();
const { Borrower } = require("../models");


// ================= CREATE BORROWER =================
router.post("/", async (req, res) => {
  try {
    const borrower = await Borrower.create(req.body);
    res.json(borrower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= GET ALL BORROWERS =================
router.get("/", async (req, res) => {
  try {
    const borrowers = await Borrower.findAll();
    res.json(borrowers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= SMART RENEW MEMBERSHIP =================
router.put("/renew/:id", async (req, res) => {
  try {
    const borrower = await Borrower.findByPk(req.params.id);

    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // Remove time from today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get expiry and remove time
    let expiryDate = borrower.membership_expiry
      ? new Date(borrower.membership_expiry)
      : null;

    if (expiryDate) {
      expiryDate.setHours(0, 0, 0, 0);
    }

    let baseDate;

    // If membership still active → extend from expiry
    if (expiryDate && expiryDate >= today) {
      baseDate = expiryDate;
    } else {
      // If expired → extend from today
      baseDate = today;
    }

    const newExpiry = new Date(baseDate);
    newExpiry.setFullYear(baseDate.getFullYear() + 1);

    await borrower.update({
      membership_expiry: newExpiry
    });

    res.json({
      message: "Membership renewed successfully",
      previous_expiry: expiryDate,
      new_expiry_date: newExpiry
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
