const express = require("express");
const router = express.Router();
const { Copy, Book } = require("../models");

router.post("/", async (req, res) => {
  try {
    const copy = await Copy.create(req.body);
    res.json(copy);
  } catch (err) {
    console.log("FULL ERROR 👉", err);
    console.log("ERRORS 👉", err.errors);
    res.status(500).json({
      message: err.message,
      errors: err.errors
    });
  }
});
