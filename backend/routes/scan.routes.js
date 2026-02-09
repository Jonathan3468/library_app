const express = require("express");
const router = express.Router();
const { Copy, Issue } = require("../models");

router.post("/", async (req, res) => {
  try {
    const { borrower_id, copy_code } = req.body;

    // 1️⃣ Find copy by scanned code
    const copy = await Copy.findOne({ where: { copy_code } });
    if (!copy) {
      return res.status(404).json({ error: "Copy not found" });
    }

    // 2️⃣ CASE: ISSUE (copy is available)
    if (copy.status === "available") {
      const issue = await Issue.create({
        borrower_id,
        copy_id: copy.copy_id,
        status: "issued",
        check_out: new Date(),
        check_in: null
      });

      await copy.update({ status: "issued" });

      return res.json({
        action: "ISSUED",
        issue_id: issue.issue_id
      });
    }

    // 3️⃣ CASE: RETURN (copy is issued)
    const activeIssue = await Issue.findOne({
      where: {
        copy_id: copy.copy_id,
        status: "issued"
      }
    });

    if (!activeIssue) {
      return res.status(400).json({
        error: "No active issue found for this copy"
      });
    }

    await activeIssue.update({
      status: "returned",
      check_in: new Date()
    });

    await copy.update({ status: "available" });

    return res.json({
      action: "RETURNED",
      issue_id: activeIssue.issue_id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
