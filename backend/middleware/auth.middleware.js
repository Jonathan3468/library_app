const jwt = require("jsonwebtoken");

// Basic authentication middleware
const auth = (req, res, next) => {
  try {
    // 1️⃣ Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "No token provided"
      });
    }

    // Format should be: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Invalid token format"
      });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Attach user to request
    req.user = decoded;

    next(); // continue to route

  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
};

// Role-based middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied. Insufficient permissions.",
        required_role: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
};

// Specific role middlewares
const requireAdmin = requireRole("admin");
const requireLibrarian = requireRole("admin", "librarian");
const requireMember = requireRole("admin", "librarian", "member");

module.exports = {
  auth,
  requireRole,
  requireAdmin,
  requireLibrarian,
  requireMember
};