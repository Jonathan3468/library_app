const express = require("express");
const router = express.Router();
const { searchAll, getSearchSuggestions } = require("../controllers/search.controllers");

// Global search
router.get("/", searchAll);

// Search suggestions (autocomplete)
router.get("/suggestions", getSearchSuggestions);

module.exports = router;