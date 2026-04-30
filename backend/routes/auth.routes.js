//auth.routes.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Borrower } = require("../models");
const { auth, requireAdmin } = require("../middleware/auth.middleware");
const { sendPasswordResetEmail } = require("../services/notificationService");
const { log, ACTIONS } = require("../services/auditService");

const ROLE_CODES = {
  librarian: process.env.ROLE_CODE_LIBRARIAN,
  admin: process.env.ROLE_CODE_ADMIN,
};

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, roleCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const validRoles = ["admin", "librarian", "member"];
    const assignedRole = role || "member";

    if (!validRoles.includes(assignedRole)) {
      return res.status(400).json({ error: "Invalid role. Must be admin, librarian, or member" });
    }

    if (assignedRole !== "member") {
      const expectedCode = ROLE_CODES[assignedRole];
      if (!expectedCode) {
        return res.status(500).json({ error: "Role code not configured on server. Contact administrator." });
      }
      if (!roleCode || roleCode !== expectedCode) {
        return res.status(403).json({ error: "Invalid access code for this role." });
      }
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    await log({
      action:     ACTIONS.USER_CREATED,
      targetType: "USER",
      targetId:   user.id,
      details:    { name: user.name, email: user.email, role: user.role, method: "self_register" },
      ip:         req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: "Account is deactivated. Contact administrator." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    let borrower_id = null;
    const borrower = await Borrower.findOne({
      where: { user_id: user.id },
      attributes: ["borrower_id"],
    });
    borrower_id = borrower?.borrower_id || null;

    await log({
      action:     ACTIONS.LOGIN,
      user:       { id: user.id, name: user.name },
      targetType: "USER",
      targetId:   user.id,
      details:    { email: user.email, role: user.role },
      ip:         req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, borrower_id },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET CURRENT USER =================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    let borrower_id = null;
    const borrower = await Borrower.findOne({
      where: { user_id: user.id },
      attributes: ["borrower_id"],
    });
    borrower_id = borrower?.borrower_id || null;

    res.json({ success: true, user: { ...user.toJSON(), borrower_id } });

  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= GET ALL USERS =================
router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Borrower,
          as: "borrower",
          attributes: ["borrower_id", "rf_id", "phone", "address"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= UPDATE USER ROLE (Admin only) =================
router.put("/users/:id/role", auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ["admin", "librarian", "member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be admin, librarian, or member" });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.id === req.user.id) return res.status(400).json({ error: "Cannot change your own role" });

    const previousRole = user.role;
    await user.update({ role });

    await log({
      action:     ACTIONS.USER_ROLE_CHANGED,
      user:       req.user,
      targetType: "USER",
      targetId:   user.id,
      details:    { name: user.name, email: user.email, previous_role: previousRole, new_role: role },
      ip:         req.ip,
    });

    res.json({
      success: true,
      message: "User role updated successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= TOGGLE USER ACTIVE STATUS (Admin only) =================
router.put("/users/:id/toggle-active", auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.id === req.user.id) return res.status(400).json({ error: "Cannot deactivate your own account" });

    await user.update({ is_active: !user.is_active });

    res.json({
      success: true,
      message: `User ${user.is_active ? "activated" : "deactivated"} successfully`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active },
    });

  } catch (err) {
    console.error("TOGGLE ACTIVE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DELETE USER (Admin only) =================
router.delete("/users/:id", auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.id === req.user.id) return res.status(400).json({ error: "Cannot delete your own account" });

    const name  = user.name;
    const email = user.email;
    const role  = user.role;
    await user.destroy();

    await log({
      action:     ACTIONS.USER_DELETED,
      user:       req.user,
      targetType: "USER",
      targetId:   id,
      details:    { name, email, role },
      ip:         req.ip,
    });

    res.json({ success: true, message: "User deleted successfully" });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= ADMIN: CHANGE ANOTHER USER'S PASSWORD (Admin only) =================
router.put("/users/:id/password", auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: "New password is required" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.id === req.user.id) {
      return res.status(400).json({ error: "Use the change-password endpoint to update your own password" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ error: "Cannot reset another admin's password" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    await log({
      action:     ACTIONS.PASSWORD_RESET,
      user:       req.user,
      targetType: "USER",
      targetId:   user.id,
      details:    { name: user.name, email: user.email, method: "admin_reset" },
      ip:         req.ip,
    });

    res.json({ success: true, message: `Password updated for ${user.name}` });

  } catch (err) {
    console.error("ADMIN CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CHANGE PASSWORD =================
router.put("/change-password", auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(current_password, user.password);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    await log({
      action:     ACTIONS.PASSWORD_RESET,
      user:       req.user,
      targetType: "USER",
      targetId:   req.user.id,
      details:    { method: "change_password" },
      ip:         req.ip,
    });

    res.json({ success: true, message: "Password changed successfully" });

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "No account found with that email address." });

    const token  = crypto.randomBytes(32).toString("hex");
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({ reset_token: token, reset_otp: otp, reset_token_expiry: expiry });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user, resetLink, otp);

    res.json({ success: true, message: "Password reset link sent to your email." });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= VERIFY RESET TOKEN / OTP (Flutter Step 1) =================
router.post("/verify-reset-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    const user = await User.findOne({
      where: {
        [Op.or]: [{ reset_token: token }, { reset_otp: token }],
        reset_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired code." });

    res.json({ success: true, message: "Code verified." });

  } catch (err) {
    console.error("VERIFY RESET TOKEN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= RESET PASSWORD =================
// Web:    { token: "<full_url_token>", new_password: "..." }
// Mobile: { token: "<6_digit_otp>",    password: "..."     }
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, new_password } = req.body;
    const newPass = password || new_password;

    if (!token || !newPass) return res.status(400).json({ error: "Token and password are required" });
    if (newPass.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const user = await User.findOne({
      where: {
        [Op.or]: [{ reset_token: token }, { reset_otp: token }],
        reset_token_expiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: "Reset link is invalid or has expired." });

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await user.update({
      password:            hashedPassword,
      reset_token:         null,
      reset_otp:           null,
      reset_token_expiry:  null,
    });

    await log({
      action:     ACTIONS.PASSWORD_RESET,
      targetType: "USER",
      targetId:   user.id,
      details:    { email: user.email, method: "reset_link" },
      ip:         req.ip,
    });

    res.json({ success: true, message: "Password reset successfully. You can now log in." });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= CREATE ACCOUNT FOR EXISTING BORROWER (Admin only) =================
router.post("/users/create-from-borrower/:borrowerId", auth, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const borrower = await Borrower.findByPk(req.params.borrowerId);

    if (!borrower) return res.status(404).json({ error: "Borrower not found" });
    if (borrower.user_id) return res.status(400).json({ error: "Borrower already has a linked account" });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: borrower.borrower_name, email, password: hashedPassword, role: "member" });
    await borrower.update({ user_id: user.id });

    await log({
      action:     ACTIONS.ACCOUNT_CREATED_FOR_BORROWER,
      user:       req.user,
      targetType: "USER",
      targetId:   user.id,
      details:    { name: user.name, email, borrower_id: borrower.borrower_id, borrower_name: borrower.borrower_name },
      ip:         req.ip,
    });

    res.status(201).json({ success: true, message: `Account created for ${borrower.borrower_name}` });
  } catch (err) {
    console.error("CREATE FROM BORROWER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;