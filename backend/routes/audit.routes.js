const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { auth, requireLibrarian } = require("../middleware/auth.middleware");
const { AuditLog } = require("../models");

// ================= GET AUDIT LOGS =================
router.get("/", auth, requireLibrarian, async (req, res) => {
  try {
    const {
      action,
      performed_by,
      target_type,
      search,
      date_from,
      date_to,
      page  = 1,
      limit = 50,
    } = req.query;

    const where = {};

    if (action)       where.action      = action;
    if (target_type)  where.target_type = target_type;
    if (performed_by) where.performed_by = parseInt(performed_by);

    if (search) {
      where[Op.or] = [
        { performed_by_name: { [Op.like]: `%${search}%` } },
        { action:            { [Op.like]: `%${search}%` } },
        { target_id:         { [Op.like]: `%${search}%` } },
      ];
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt[Op.gte] = new Date(date_from);
      if (date_to) {
        const end = new Date(date_to);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    const parsedPage  = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(200, parseInt(limit));
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order:  [["createdAt", "DESC"]],
      limit:  parsedLimit,
      offset,
    });

    res.json({
      success: true,
      logs:    rows,
      pagination: {
        total:      count,
        page:       parsedPage,
        limit:      parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (err) {
    console.error("GET AUDIT LOGS ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET DISTINCT ACTIONS (for filter dropdown) =================
router.get("/actions", auth, requireLibrarian, async (req, res) => {
  try {
    const rows = await AuditLog.findAll({
      attributes: ["action"],
      group:      ["action"],
      order:      [["action", "ASC"]],
      raw:        true,
    });
    res.json({ success: true, actions: rows.map(r => r.action) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET DISTINCT PERFORMERS (for filter dropdown) =================
router.get("/performers", auth, requireLibrarian, async (req, res) => {
  try {
    const rows = await AuditLog.findAll({
      attributes: ["performed_by", "performed_by_name"],
      group:      ["performed_by", "performed_by_name"],
      order:      [["performed_by_name", "ASC"]],
      raw:        true,
    });
    res.json({ success: true, performers: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

/*
─────────────────────────────────────────────────────────────────
ADD TO app.js:
  const auditRoutes = require("./routes/audit.routes");
  app.use("/audit-logs", auditRoutes);
─────────────────────────────────────────────────────────────────
ADD TO models/index.js:

  const AuditLog = require("./AuditLog")(sequelize, DataTypes);

  // No associations needed - AuditLog is append-only.

  // In module.exports:
  AuditLog,
─────────────────────────────────────────────────────────────────
*/