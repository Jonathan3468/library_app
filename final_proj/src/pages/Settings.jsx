import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getCurrentUser, isAdmin, isLibrarian } from "../utils/auth";
import API from "../services/api";

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ path, className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const ICONS = {
  lock:     "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  back:     "M10 19l-7-7m0 0l7-7m-7 7h18",
  check:    "M5 13l4 4L19 7",
  chevron:  "M9 5l7 7-7 7",
  user:     "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  library:  "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
  reset:    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  warning:  "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

// ─── Password strength ─────────────────────────────────────────────────────────
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
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400">{score > 0 ? labels[score] : ""}</p>
    </div>
  );
}

// ─── Password input ────────────────────────────────────────────────────────────
function PasswordInput({ label, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border ${error ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"} rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all`}
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs select-none">
          {show ? "HIDE" : "SHOW"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Setting hub card ──────────────────────────────────────────────────────────
function SettingCard({ iconPath, iconBg, title, description, onClick, badge }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon path={iconPath} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">{badge}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <Icon path={ICONS.chevron} className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
    </button>
  );
}

// ─── Sub-page header ───────────────────────────────────────────────────────────
function SubHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <Icon path={ICONS.back} className="w-4 h-4" />
        Back
      </button>
      <span className="text-gray-300">/</span>
      <span className="text-sm font-semibold text-gray-700">{title}</span>
    </div>
  );
}

// ─── Change Password view ──────────────────────────────────────────────────────
function ChangePasswordView({ onBack }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.current_password) errs.current_password = "Current password is required.";
    if (!form.new_password) errs.new_password = "New password is required.";
    else if (form.new_password.length < 8) errs.new_password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.new_password)) errs.new_password = "Include at least one uppercase letter.";
    else if (!/[0-9]/.test(form.new_password)) errs.new_password = "Include at least one number.";
    if (!form.confirm_password) errs.confirm_password = "Please confirm your new password.";
    else if (form.new_password !== form.confirm_password) errs.confirm_password = "Passwords do not match.";
    if (form.current_password && form.new_password && form.current_password === form.new_password)
      errs.new_password = "New password must differ from your current one.";
    return errs;
  };

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
    setLoading(true);
    try {
      await API.put("/auth/change-password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(true);
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setErrors({});
      toast.success("Password changed successfully!");
    } catch (err) {
      const msg = err.response?.data?.error || "";
      if (err.response?.status === 401 || msg.toLowerCase().includes("current") || msg.toLowerCase().includes("incorrect")) {
        setErrors({ current_password: "Current password is incorrect." });
      } else {
        toast.error(msg || "Failed to change password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SubHeader title="Change Password" onBack={onBack} />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon path={ICONS.lock} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Change Password</h3>
            <p className="text-xs text-gray-400">Update your account password</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} noValidate className="px-6 py-6 max-w-md">
          {success && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
              <Icon path={ICONS.check} className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Password updated successfully.</p>
            </div>
          )}
          <PasswordInput label="Current Password" value={form.current_password}
            onChange={(e) => handleChange("current_password", e.target.value)}
            placeholder="••••••••" error={errors.current_password} />
          <PasswordInput label="New Password" value={form.new_password}
            onChange={(e) => handleChange("new_password", e.target.value)}
            placeholder="••••••••" error={errors.new_password} />
          <PasswordStrength password={form.new_password} />
          <PasswordInput label="Confirm New Password" value={form.confirm_password}
            onChange={(e) => handleChange("confirm_password", e.target.value)}
            placeholder="••••••••" error={errors.confirm_password} />
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-5">
            <p className="text-xs text-yellow-700">
              Password must be at least 8 characters and include an uppercase letter and a number.
            </p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium text-sm transition-all">
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Account Info view ─────────────────────────────────────────────────────────
function AccountInfoView({ onBack }) {
  const user = getCurrentUser();
  return (
    <div>
      <SubHeader title="Account Info" onBack={onBack} />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <Icon path={ICONS.user} className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Account Info</h3>
            <p className="text-xs text-gray-400">Your account details</p>
          </div>
        </div>
        <div className="px-6 py-6 space-y-4 max-w-md">
          <div>
            <p className="text-xs text-gray-400 mb-1">Full Name</p>
            <p className="text-sm font-semibold text-gray-800">{user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Email Address</p>
            <p className="text-sm font-semibold text-gray-800">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Role</p>
            <p className="text-sm font-semibold text-gray-800 capitalize">{user?.role || "—"}</p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-400 italic">
              To update your name or email, contact a librarian or administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Library Settings view ─────────────────────────────────────────────────────
const SETTING_FIELDS = [
  {
    key: "LOAN_PERIOD_DAYS",
    label: "Loan Period",
    description: "How many days a borrower can keep a book",
    unit: "days",
    min: 1, max: 365,
  },
  {
    key: "RENEWAL_PERIOD_DAYS",
    label: "Renewal Period",
    description: "How many extra days are added when a book is renewed",
    unit: "days",
    min: 1, max: 365,
  },
  {
    key: "MAX_RENEWALS",
    label: "Max Renewals",
    description: "Maximum number of times a book can be renewed",
    unit: "times",
    min: 0, max: 20,
  },
  {
    key: "MAX_BOOKS_PER_BORROWER",
    label: "Borrowing Limit",
    description: "Maximum number of books a borrower can have at once",
    unit: "books",
    min: 1, max: 50,
  },
  {
    key: "FINE_PER_DAY",
    label: "Fine Per Day",
    description: "Fine charged per day for overdue books",
    unit: "₹ / day",
    min: 0, max: 1000,
    isDecimal: true,
  },
  {
    key: "REQUEST_EXPIRY_DAYS",
    label: "Request Expiry",
    description: "How many days before a pending book request expires",
    unit: "days",
    min: 1, max: 90,
  },
  {
    key: "MEMBERSHIP_DURATION_YEARS",
    label: "Membership Duration",
    description: "How many years a membership lasts when created or renewed",
    unit: "years",
    min: 1, max: 10,
  },
];

function LibrarySettingsView({ onBack }) {
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const canChange = isAdmin();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/settings");
      setSettings(res.data.settings);
      setForm({ ...res.data.settings });
      setDirty(false);
    } catch (err) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate all fields
    for (const field of SETTING_FIELDS) {
      const val = parseFloat(form[field.key]);
      if (isNaN(val) || val < field.min || val > field.max) {
        toast.error(`${field.label} must be between ${field.min} and ${field.max}`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {};
      for (const field of SETTING_FIELDS) {
        payload[field.key] = parseFloat(form[field.key]);
      }
      await API.put("/api/settings", payload);
      setSettings({ ...form });
      setDirty(false);
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all library settings to their default values?")) return;
    setResetting(true);
    try {
      const res = await API.post("/api/settings/reset");
      setSettings(res.data.settings);
      setForm({ ...res.data.settings });
      setDirty(false);
      toast.success("Settings reset to defaults");
    } catch (err) {
      toast.error("Failed to reset settings");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <SubHeader title="Library Settings" onBack={onBack} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Icon path={ICONS.library} className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Library Settings</h3>
              <p className="text-xs text-gray-400">
                {canChange ? "Configure system-wide library rules" : "View current library configuration"}
              </p>
            </div>
          </div>
          {canChange && (
            <button onClick={handleReset} disabled={resetting}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
              <Icon path={ICONS.reset} className="w-3.5 h-3.5" />
              {resetting ? "Resetting..." : "Reset to defaults"}
            </button>
          )}
        </div>

        {/* Read-only notice for librarians */}
        {!canChange && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Icon path={ICONS.warning} className="w-4 h-4 text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-700">
              Only administrators can change these settings. You can view them here.
            </p>
          </div>
        )}

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading settings...</div>
        ) : (
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {SETTING_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    {field.label}
                  </label>
                  <p className="text-xs text-gray-400 leading-snug">{field.description}</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={form[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      min={field.min}
                      max={field.max}
                      step={field.isDecimal ? "0.5" : "1"}
                      disabled={!canChange}
                      className={`w-full border rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                        !canChange
                          ? "bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                          : "border-gray-300 text-gray-900"
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                      {field.unit}
                    </span>
                  </div>
                  {/* Show if value differs from saved */}
                  {canChange && form[field.key] != settings[field.key] && (
                    <p className="text-xs text-blue-500">
                      Was: {settings[field.key]} {field.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {canChange && (
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-all"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {dirty && (
                  <button
                    onClick={() => { setForm({ ...settings }); setDirty(false); }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
                  >
                    Discard
                  </button>
                )}
                {dirty && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Icon path={ICONS.warning} className="w-3.5 h-3.5" />
                    Unsaved changes
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings hub ─────────────────────────────────────────────────────────
export default function Settings() {
  const [view, setView] = useState("hub");
  const user = getCurrentUser();
  const isStaff = isAdmin() || isLibrarian();

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {view === "hub" && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-1">Settings</h2>
            <p className="text-gray-500 text-sm">Manage your account and system preferences</p>
          </div>
        )}

        {/* Hub */}
        {view === "hub" && (
          <div className="space-y-3">
            {/* Account section — everyone */}
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1 pt-1">Account</p>
            <SettingCard
              iconPath={ICONS.user}
              iconBg="bg-purple-50 text-purple-600"
              title="Account Info"
              description="View your name, email, and role"
              onClick={() => setView("account-info")}
            />
            <SettingCard
              iconPath={ICONS.lock}
              iconBg="bg-blue-50 text-blue-600"
              title="Change Password"
              description="Update your account password"
              onClick={() => setView("change-password")}
            />

            {/* Library section — staff only */}
            {isStaff && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1 pt-4">Library</p>
                <SettingCard
                  iconPath={ICONS.library}
                  iconBg="bg-orange-50 text-orange-600"
                  title="Library Settings"
                  description="Loan periods, fines, borrowing limits, and more"
                  onClick={() => setView("library-settings")}
                  badge={isAdmin() ? "Admin" : undefined}
                />
              </>
            )}
          </div>
        )}

        {view === "change-password"  && <ChangePasswordView  onBack={() => setView("hub")} />}
        {view === "account-info"     && <AccountInfoView     onBack={() => setView("hub")} />}
        {view === "library-settings" && <LibrarySettingsView onBack={() => setView("hub")} />}
      </div>
    </div>
  );
}