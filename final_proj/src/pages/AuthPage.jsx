import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { updateStoredUser } from "../utils/auth";
import API from "../services/api";

// ─── Validation helpers ────────────────────────────────────────────────────────
const validators = {
  name: (v) => {
    if (!v.trim()) return "Full name is required.";
    if (v.trim().length < 2) return "Name must be at least 2 characters.";
    if (!/^[a-zA-Z\s'-]+$/.test(v)) return "Name contains invalid characters.";
    return null;
  },
  email: (v) => {
    if (!v.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
    return null;
  },
  password: (v) => {
    if (!v) return "Password is required.";
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v)) return "Include at least one uppercase letter.";
    if (!/[0-9]/.test(v)) return "Include at least one number.";
    return null;
  },
  confirmPassword: (v, password) => {
    if (!v) return "Please confirm your password.";
    if (v !== password) return "Passwords do not match.";
    return null;
  },
  roleCode: (v, role) => {
    if (role === "member") return null;
    if (!v.trim()) return "Access code is required for this role.";
    return null;
  },
};

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

function ServerError({ msg }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-xs text-red-600">{msg}</p>
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, onBlur, error, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full border ${
            error ? "border-red-400 bg-red-50" : "border-gray-300"
          } rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
            error ? "focus:ring-red-200" : "focus:ring-blue-200"
          } transition-all`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none"
          >
            {show ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ─── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "bg-red-400", "bg-yellow-400", "bg-blue-500", "bg-green-500"];
  return (
    <div className="mb-4 -mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400">{score > 0 ? labels[score] : ""}</p>
    </div>
  );
}

// ─── Role selector ─────────────────────────────────────────────────────────────
const ROLES = [
  { value: "member",    label: "Member",    desc: "Browse & borrow books" },
  { value: "librarian", label: "Librarian", desc: "Manage library operations" },
  { value: "admin",     label: "Admin",     desc: "Full system access" },
];

function RoleSelector({ value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Account Role</label>
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(r.value)}
            className={`rounded border p-2.5 text-left transition-all ${
              value === r.value
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            <p className={`text-xs font-bold ${value === r.value ? "text-blue-600" : "text-gray-700"}`}>
              {r.label}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state initializers ──────────────────────────────────────────────────
const EMPTY_LOGIN = { email: "", password: "" };
const EMPTY_REG   = { name: "", email: "", password: "", confirmPassword: "", role: "member", roleCode: "" };

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode]       = useState("login"); // "login" | "register" | "forgot"
  const [loading, setLoading] = useState(false);

  // ── Clear session on mount ───────────────────────────────────────────────────
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete API.defaults.headers.common["Authorization"];
  }, []);

  // ── Login state ──────────────────────────────────────────────────────────────
  const [loginForm,        setLoginForm]        = useState(EMPTY_LOGIN);
  const [loginErrors,      setLoginErrors]      = useState({});
  const [loginTouched,     setLoginTouched]     = useState({});
  const [loginServerError, setLoginServerError] = useState("");

  // ── Register state ───────────────────────────────────────────────────────────
  const [regForm,        setRegForm]        = useState(EMPTY_REG);
  const [regErrors,      setRegErrors]      = useState({});
  const [regTouched,     setRegTouched]     = useState({});
  const [regServerError, setRegServerError] = useState("");

  // ── Forgot password state ────────────────────────────────────────────────────
  const [forgotEmail,       setForgotEmail]       = useState("");
  const [forgotEmailError,  setForgotEmailError]  = useState("");
  const [forgotEmailTouched, setForgotEmailTouched] = useState(false);

  // ── Reset all state when switching modes ─────────────────────────────────────
  const switchMode = (next) => {
    setMode(next);
    // Reset login
    setLoginForm(EMPTY_LOGIN);
    setLoginErrors({});
    setLoginTouched({});
    setLoginServerError("");
    // Reset register
    setRegForm(EMPTY_REG);
    setRegErrors({});
    setRegTouched({});
    setRegServerError("");
    // Reset forgot
    setForgotEmail("");
    setForgotEmailError("");
    setForgotEmailTouched(false);
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const validateLogin = (form) => ({
    email:    validators.email(form.email),
    password: form.password ? null : "Password is required.",
  });

  const handleLoginBlur = (field) => {
    setLoginTouched((t) => ({ ...t, [field]: true }));
    setLoginErrors((e) => ({ ...e, [field]: validateLogin(loginForm)[field] }));
  };

  const handleLoginChange = (field, value) => {
    const updated = { ...loginForm, [field]: value };
    setLoginForm(updated);
    setLoginServerError("");
    if (loginTouched[field]) {
      setLoginErrors((e) => ({ ...e, [field]: validateLogin(updated)[field] }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLogin(loginForm);
    setLoginErrors(errs);
    setLoginTouched({ email: true, password: true });
    setLoginServerError("");
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    try {
      const { data } = await API.post("/auth/login", loginForm);
      localStorage.setItem("token", data.token);
      updateStoredUser(data.user);
      API.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || "Incorrect email or password. Please try again.";
      setLoginServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────────
  const validateRegister = (form) => ({
    name:            validators.name(form.name),
    email:           validators.email(form.email),
    password:        validators.password(form.password),
    confirmPassword: validators.confirmPassword(form.confirmPassword, form.password),
    roleCode:        validators.roleCode(form.roleCode, form.role),
  });

  const handleRegBlur = (field) => {
    setRegTouched((t) => ({ ...t, [field]: true }));
    setRegErrors((e) => ({ ...e, [field]: validateRegister(regForm)[field] }));
  };

  const handleRegChange = (field, value) => {
    const updated = { ...regForm, [field]: value };
    // Clear roleCode when switching to member
    if (field === "role") {
      updated.roleCode = "";
      setRegErrors((e) => ({ ...e, roleCode: null }));
      setRegTouched((t) => ({ ...t, roleCode: false }));
    }
    setRegForm(updated);
    setRegServerError("");
    if (regTouched[field]) {
      setRegErrors((e) => ({ ...e, [field]: validateRegister(updated)[field] }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validateRegister(regForm);
    setRegErrors(errs);
    setRegTouched({ name: true, email: true, password: true, confirmPassword: true, roleCode: true });
    setRegServerError("");
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    try {
      await API.post("/auth/register", {
        name:     regForm.name,
        email:    regForm.email,
        password: regForm.password,
        role:     regForm.role,
        roleCode: regForm.roleCode,
      });
      toast.success("Account created! Please sign in.");
      switchMode("login");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed. Please try again.";
      setRegServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password ──────────────────────────────────────────────────────────
  const handleForgotBlur = () => {
    setForgotEmailTouched(true);
    setForgotEmailError(validators.email(forgotEmail));
  };

  const handleForgotChange = (value) => {
    setForgotEmail(value);
    if (forgotEmailTouched) setForgotEmailError(validators.email(value));
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const err = validators.email(forgotEmail);
    setForgotEmailError(err);
    setForgotEmailTouched(true);
    if (err) return;

    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email: forgotEmail });
      toast.success("Reset link sent! Check your inbox.");
      switchMode("login");
    } catch (err) {
      const msg = err.response?.data?.error || "Could not send reset link. Please try again.";
      setForgotEmailError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">SmartLib</h2>
          <p className="text-gray-500 text-sm mt-1">Library Management System</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tabs */}
          {mode !== "forgot" && (
            <div className="flex border-b border-gray-200">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-3 text-sm font-semibold transition-all ${
                    mode === m
                      ? "text-blue-600 border-b-2 border-blue-600 -mb-px bg-white"
                      : "text-gray-400 hover:text-gray-600 bg-gray-50"
                  }`}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
          )}

          <div className="p-8">

            {/* ── Login Form ── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} noValidate>
                <InputField
                  label="Email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => handleLoginChange("email", e.target.value)}
                  onBlur={() => handleLoginBlur("email")}
                  error={loginTouched.email ? loginErrors.email : null}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <InputField
                  label="Password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => handleLoginChange("password", e.target.value)}
                  onBlur={() => handleLoginBlur("password")}
                  error={loginTouched.password ? loginErrors.password : null}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <div className="flex justify-end -mt-2 mb-4">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <ServerError msg={loginServerError} />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-all"
                >
                  {loading ? "Logging in…" : "Login"}
                </button>
              </form>
            )}

            {/* ── Register Form ── */}
            {mode === "register" && (
              <form onSubmit={handleRegister} noValidate>
                <InputField
                  label="Full Name"
                  value={regForm.name}
                  onChange={(e) => handleRegChange("name", e.target.value)}
                  onBlur={() => handleRegBlur("name")}
                  error={regTouched.name ? regErrors.name : null}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
                <InputField
                  label="Email"
                  type="email"
                  value={regForm.email}
                  onChange={(e) => handleRegChange("email", e.target.value)}
                  onBlur={() => handleRegBlur("email")}
                  error={regTouched.email ? regErrors.email : null}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <InputField
                  label="Password"
                  type="password"
                  value={regForm.password}
                  onChange={(e) => handleRegChange("password", e.target.value)}
                  onBlur={() => handleRegBlur("password")}
                  error={regTouched.password ? regErrors.password : null}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <PasswordStrength password={regForm.password} />
                <InputField
                  label="Confirm Password"
                  type="password"
                  value={regForm.confirmPassword}
                  onChange={(e) => handleRegChange("confirmPassword", e.target.value)}
                  onBlur={() => handleRegBlur("confirmPassword")}
                  error={regTouched.confirmPassword ? regErrors.confirmPassword : null}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <RoleSelector value={regForm.role} onChange={(v) => handleRegChange("role", v)} />
                {regForm.role !== "member" && (
                  <div className="mt-2 mb-4">
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded">
                      <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-xs text-yellow-700">
                        <span className="font-semibold capitalize">{regForm.role}</span> access requires an authorization code.
                      </p>
                    </div>
                    <InputField
                      label={`${regForm.role.charAt(0).toUpperCase() + regForm.role.slice(1)} Access Code`}
                      value={regForm.roleCode}
                      onChange={(e) => handleRegChange("roleCode", e.target.value)}
                      onBlur={() => handleRegBlur("roleCode")}
                      error={regTouched.roleCode ? regErrors.roleCode : null}
                      placeholder="Enter your access code"
                    />
                  </div>
                )}
                <ServerError msg={regServerError} />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-all"
                >
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>
            )}

            {/* ── Forgot Password Form ── */}
            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} noValidate>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Forgot Password</h3>
                <p className="text-sm text-gray-500 mb-5">
                  Enter your registered email and we'll send you a reset link.
                </p>
                <InputField
                  label="Email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => handleForgotChange(e.target.value)}
                  onBlur={handleForgotBlur}
                  error={forgotEmailTouched ? forgotEmailError : null}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-all"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600"
                >
                  ← Back to login
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} SmartLib · Library Management System
        </p>
      </div>
    </div>
  );
}