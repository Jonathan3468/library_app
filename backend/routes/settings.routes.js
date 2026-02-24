const express = require("express");
const router = express.Router();
const { auth, requireAdmin, requireLibrarian } = require("../middleware/auth.middleware");
const { loadSettings, saveSettings, DEFAULTS } = require("../config/librarySettings");
const { getSetting } = require("../config/librarySettings");
// ================= GET SETTINGS =================
// Admin and librarians can view settings
router.get("/", auth, requireLibrarian, (req, res) => {
  try {
    const settings = loadSettings();
    res.json({ success: true, settings, defaults: DEFAULTS });
  } catch (err) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// ================= UPDATE SETTINGS =================
// Admin only can change settings
router.put("/", auth, requireAdmin, (req, res) => {
  try {
    const allowed = [
      "LOAN_PERIOD_DAYS",
      "RENEWAL_PERIOD_DAYS",
      "MAX_RENEWALS",
      "MAX_BOOKS_PER_BORROWER",
      "FINE_PER_DAY",
      "REQUEST_EXPIRY_DAYS",
      "MEMBERSHIP_DURATION_YEARS",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const val = parseFloat(req.body[key]);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ error: `Invalid value for ${key}` });
        }
        updates[key] = val;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid settings provided" });
    }

    const saved = saveSettings(updates);
    res.json({ success: true, message: "Settings updated successfully", settings: saved });

  } catch (err) {
    console.error("UPDATE SETTINGS ERROR:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ================= RESET TO DEFAULTS =================
router.post("/reset", auth, requireAdmin, (req, res) => {
  try {
    saveSettings(DEFAULTS);
    res.json({ success: true, message: "Settings reset to defaults", settings: DEFAULTS });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset settings" });
  }
});

module.exports = router;