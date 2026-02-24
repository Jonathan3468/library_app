const { AuditLog } = require("../models");

/**
 * Log an action to the audit trail.
 * Never throws — audit failures must never break normal operations.
 *
 * @param {object} opts
 * @param {string}  opts.action           - e.g. "BOOK_ISSUED", "FINE_WAIVED"
 * @param {object}  [opts.user]           - req.user (id + name)
 * @param {string}  [opts.targetType]     - "BORROWER" | "COPY" | "ISSUE" | "FINE" | "USER"
 * @param {string|number} [opts.targetId]
 * @param {object}  [opts.details]        - any extra JSON context
 * @param {string}  [opts.ip]             - request IP
 */
const log = async ({ action, user, targetType, targetId, details, ip }) => {
  try {
    await AuditLog.create({
      action,
      performed_by:      user?.id   || null,
      performed_by_name: user?.name || "System",
      target_type: targetType || null,
      target_id:   targetId != null ? String(targetId) : null,
      details:     details   || null,
      ip_address:  ip        || null,
    });
  } catch (err) {
    console.error("⚠️  AUDIT LOG WRITE FAILED:", err.message);
  }
};

// Convenience action constants — import these in routes for consistency
const ACTIONS = {
  // Issues / Scan
  BOOK_ISSUED:          "BOOK_ISSUED",
  BOOK_RETURNED:        "BOOK_RETURNED",
  BOOK_RENEWED:         "BOOK_RENEWED",
  RENEWAL_APPROVED:     "RENEWAL_APPROVED",
  RENEWAL_DENIED:       "RENEWAL_DENIED",

  // Copies
  COPY_ADDED:           "COPY_ADDED",
  COPY_DELETED:         "COPY_DELETED",
  COPY_MARKED_LOST:     "COPY_MARKED_LOST",

  // Borrowers
  BORROWER_CREATED:     "BORROWER_CREATED",
  BORROWER_UPDATED:     "BORROWER_UPDATED",
  BORROWER_DELETED:     "BORROWER_DELETED",
  MEMBERSHIP_RENEWED:   "MEMBERSHIP_RENEWED",
  CSV_IMPORT:           "CSV_IMPORT",

  // Fines
  FINE_PAID:            "FINE_PAID",
  FINE_WAIVED:          "FINE_WAIVED",
  FINE_CUSTOM_CREATED:  "FINE_CUSTOM_CREATED",
  REPLACEMENT_FINE:     "REPLACEMENT_FINE",

  // Users
  USER_CREATED:         "USER_CREATED",
  USER_ROLE_CHANGED:    "USER_ROLE_CHANGED",
  USER_DELETED:         "USER_DELETED",
  USER_TOGGLED:         "USER_TOGGLED",
  ACCOUNT_CREATED_FOR_BORROWER: "ACCOUNT_CREATED_FOR_BORROWER",

  // Auth
  LOGIN:                "LOGIN",
  PASSWORD_RESET:       "PASSWORD_RESET",
};

module.exports = { log, ACTIONS };