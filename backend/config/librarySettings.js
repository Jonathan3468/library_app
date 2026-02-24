const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "library.settings.json");

const DEFAULTS = {
  LOAN_PERIOD_DAYS: 7,
  RENEWAL_PERIOD_DAYS: 7,
  MAX_RENEWALS: 2,
  MAX_BOOKS_PER_BORROWER: 5,
  FINE_PER_DAY: 5,
  REQUEST_EXPIRY_DAYS: 7,
  MEMBERSHIP_DURATION_YEARS: 1,
  REPLACEMENT_FINE_AMOUNT: 500,
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Failed to load library settings, using defaults:", err.message);
  }
  return { ...DEFAULTS };
}

function saveSettings(updated) {
  const current = loadSettings();
  const merged = { ...current, ...updated };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function getSetting(key) {
  const settings = loadSettings();
  // Env vars still take precedence if explicitly set
  return process.env[key] !== undefined
    ? parseFloat(process.env[key])
    : settings[key] ?? DEFAULTS[key];
}

module.exports = { loadSettings, saveSettings, getSetting, DEFAULTS };