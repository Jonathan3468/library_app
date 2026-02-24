import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

// ── Icon helper ───────────────────────────────────────────────────────────────
const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);
const ICONS = {
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  x:       "M6 18L18 6M6 6l12 12",
  user:    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  users:   "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  link:    "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  trash:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  eye:     "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  eyeOff:  "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21",
  rfid:    "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  key:     "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  check:   "M5 13l4 4L19 7",
};

// ── Role badge ────────────────────────────────────────────────────────────────
const roleBadge = (role) => ({
  admin:     "bg-red-100 text-red-700",
  librarian: "bg-blue-100 text-blue-700",
  member:    "bg-emerald-100 text-emerald-700",
}[role] || "bg-gray-100 text-gray-600");

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = "w-8 h-8", text = "text-xs", gradient = "from-blue-400 to-indigo-500" }) => (
  <div className={`${size} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 ${text}`}>
    {name?.[0]?.toUpperCase()}
  </div>
);

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", confirmClass = "bg-red-600 hover:bg-red-700", icon, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {icon && <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 mx-auto mb-4 flex items-center justify-center">{icon}</div>}
          <h3 className="text-base font-bold text-gray-800 text-center mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-500 text-center">{description}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmClass}`}>
            {loading ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Working...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Password input ────────────────────────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder = "Password", required = false, label }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label} {required && <span className="text-red-400">*</span>}</label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
          <Ic d={show ? ICONS.eyeOff : ICONS.eye} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UserManagement() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState("users");
  const [users, setUsers]             = useState([]);
  const [borrowers, setBorrowers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [borrowersLoading, setBorrowersLoading] = useState(false);
  const [search, setSearch]           = useState("");

  // Modals
  const [assignModal, setAssignModal]   = useState({ open: false, user: null });
  const [editModal, setEditModal]       = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal]   = useState({ open: false, user: null, loading: false });
  const [roleModal, setRoleModal]       = useState({ open: false, user: null, newRole: "" });
  const [createModal, setCreateModal]   = useState({ open: false, borrower: null }); // NEW

  // Form state
  const [rfIdForm, setRfIdForm]   = useState({ rf_id: "", phone: "", address: "" });
  const [editForm, setEditForm]   = useState({ rf_id: "", phone: "", address: "" });
  const [createForm, setCreateForm] = useState({ email: "", password: "", confirmPassword: "" }); // NEW

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { if (activeTab === "unlinked") fetchUnlinkedBorrowers(); }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data.users || []);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const fetchUnlinkedBorrowers = async () => {
    setBorrowersLoading(true);
    try {
      const res = await API.get("/borrowers");
      const all = Array.isArray(res.data) ? res.data : [];
      // Borrowers with no linked user_id
      setBorrowers(all.filter(b => !b.user_id));
    } catch { toast.error("Failed to load borrowers"); }
    finally { setBorrowersLoading(false); }
  };

  // ── Search filtering ───────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.includes(q)
    );
  }, [users, search]);

  const filteredBorrowers = useMemo(() => {
    if (!search.trim()) return borrowers;
    const q = search.toLowerCase();
    return borrowers.filter(b =>
      b.borrower_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.rf_id?.includes(q) ||
      b.borrower_id?.toString().includes(q)
    );
  }, [borrowers, search]);

  // ── Handlers: Users tab ────────────────────────────────────────────────────
  const handleAssignRfId = async (e) => {
    e.preventDefault();
    try {
      await API.post("/borrowers/assign-rfid", {
        user_id: assignModal.user.id,
        rf_id: rfIdForm.rf_id,
        phone: rfIdForm.phone || null,
        address: rfIdForm.address || null,
      });
      toast.success(`RF ID assigned to ${assignModal.user.name}`);
      setAssignModal({ open: false, user: null });
      setRfIdForm({ rf_id: "", phone: "", address: "" });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to assign RF ID"); }
  };

  const handleEditBorrower = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/borrowers/${editModal.user.borrower.borrower_id}`, editForm);
      toast.success("Borrower profile updated");
      setEditModal({ open: false, user: null });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
  };

  const handleDeleteUser = async () => {
    setDeleteModal(m => ({ ...m, loading: true }));
    try {
      await API.delete(`/auth/users/${deleteModal.user.id}`);
      toast.success(`"${deleteModal.user.name}" deleted`);
      setDeleteModal({ open: false, user: null, loading: false });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
      setDeleteModal(m => ({ ...m, loading: false }));
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await API.put(`/auth/users/${user.id}/toggle-active`);
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const handleChangeRole = async () => {
    try {
      await API.put(`/auth/users/${roleModal.user.id}/role`, { role: roleModal.newRole });
      toast.success(`Role changed to ${roleModal.newRole}`);
      setRoleModal({ open: false, user: null, newRole: "" });
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to change role"); }
  };

  // ── Handler: Create account for existing borrower ─────────────────────────
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (createForm.password !== createForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await API.post(`/auth/users/create-from-borrower/${createModal.borrower.borrower_id}`, {
        email: createForm.email,
        password: createForm.password,
      });
      toast.success(`Account created for ${createModal.borrower.borrower_name}`);
      setCreateModal({ open: false, borrower: null });
      setCreateForm({ email: "", password: "", confirmPassword: "" });
      fetchUnlinkedBorrowers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to create account"); }
  };

  // ── Tabs config ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "users",    label: "Users",              count: users.length,     icon: ICONS.users },
    { id: "unlinked", label: "Unlinked Borrowers", count: borrowers.length, icon: ICONS.link  },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage accounts, roles, and borrower links</p>
          </div>
        </div>

        {/* Tabs + Search bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={tab.icon} />
                </svg>
                {tab.label}
                <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Ic d={ICONS.search} className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === "users" ? "Search name, email, role..." : "Search name, email, RF ID..."}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <Ic d={ICONS.x} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="py-16 flex items-center justify-center text-gray-400 text-sm gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["User", "Role", "Status", "Borrower Profile", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">

                        {/* User */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={user.name} gradient={user.role === "admin" ? "from-red-400 to-rose-500" : user.role === "librarian" ? "from-blue-400 to-indigo-500" : "from-emerald-400 to-teal-500"} />
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role — inline select */}
                        <td className="px-4 py-3.5">
                          <select
                            value={user.role}
                            onChange={e => setRoleModal({ open: true, user, newRole: e.target.value })}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-200 ${roleBadge(user.role)}`}
                          >
                            <option value="admin">Admin</option>
                            <option value="librarian">Librarian</option>
                            <option value="member">Member</option>
                          </select>
                        </td>

                        {/* Active toggle */}
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                            {user.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>

                        {/* Borrower profile */}
                        <td className="px-4 py-3.5">
                          {user.borrower ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                                {user.borrower.rf_id || "No RF ID"}
                              </span>
                              <button
                                onClick={() => navigate(`/borrowers/${user.borrower.borrower_id}`)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAssignModal({ open: true, user }); setRfIdForm({ rf_id: "", phone: "", address: "" }); }}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition"
                            >
                              <Ic d={ICONS.rfid} className="w-3.5 h-3.5" />
                              Assign RF ID
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {user.borrower && (
                              <button
                                onClick={() => { setEditModal({ open: true, user }); setEditForm({ rf_id: user.borrower.rf_id || "", phone: user.borrower.phone || "", address: user.borrower.address || "" }); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit borrower"
                              >
                                <Ic d={ICONS.edit} />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteModal({ open: true, user, loading: false })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete user"
                            >
                              <Ic d={ICONS.trash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        )}

        {/* ── Unlinked Borrowers Tab ── */}
        {activeTab === "unlinked" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Ic d={ICONS.link} className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Borrowers without accounts</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    These borrowers exist in the system but don't have a login account. You can create one for them so they can sign in as members.
                  </p>
                </div>
              </div>
            </div>

            {borrowersLoading ? (
              <div className="py-16 flex items-center justify-center text-gray-400 text-sm gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading...
              </div>
            ) : filteredBorrowers.length === 0 ? (
              <div className="py-16 text-center">
                <Ic d={ICONS.check} className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-400">
                  {search ? "No borrowers match your search" : "All borrowers have linked accounts"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Borrower", "RF ID", "Email", "Phone", "Membership", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBorrowers.map(b => (
                      <tr key={b.borrower_id} className="hover:bg-gray-50 transition-colors">

                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={b.borrower_name} gradient="from-gray-400 to-gray-500" />
                            <div>
                              <p className="font-semibold text-gray-800">{b.borrower_name}</p>
                              <p className="text-xs text-gray-400">ID #{b.borrower_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* RF ID */}
                        <td className="px-4 py-3.5">
                          {b.rf_id
                            ? <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">{b.rf_id}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-xs text-gray-600">{b.email || <span className="text-gray-300">—</span>}</td>

                        {/* Phone */}
                        <td className="px-4 py-3.5 text-xs text-gray-600">{b.phone || <span className="text-gray-300">—</span>}</td>

                        {/* Membership */}
                        <td className="px-4 py-3.5">
                          {b.membership_expiry ? (
                            <p className="text-xs text-gray-500">{new Date(b.membership_expiry).toLocaleDateString()}</p>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>

                        {/* Create account */}
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => {
                              setCreateModal({ open: true, borrower: b });
                              setCreateForm({ email: b.email || "", password: "", confirmPassword: "" });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
                          >
                            <Ic d={ICONS.key} className="w-3.5 h-3.5" />
                            Create Account
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              {filteredBorrowers.length} unlinked borrower{filteredBorrowers.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* ── Assign RF ID Modal ── */}
      {assignModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Assign RF ID</h3>
              <p className="text-xs text-gray-400 mt-0.5">Creating borrower profile for <span className="font-semibold text-gray-600">{assignModal.user?.name}</span></p>
            </div>
            <form onSubmit={handleAssignRfId} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">RF ID / Card Number <span className="text-red-400">*</span></label>
                <input type="text" value={rfIdForm.rf_id} onChange={e => setRfIdForm(f => ({ ...f, rf_id: e.target.value }))} required autoFocus placeholder="Scan or enter RF ID" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone <span className="text-gray-300">(optional)</span></label>
                <input type="tel" value={rfIdForm.phone} onChange={e => setRfIdForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address <span className="text-gray-300">(optional)</span></label>
                <textarea value={rfIdForm.address} onChange={e => setRfIdForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-700">Creates a borrower profile with a 1-year membership.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">Assign RF ID</button>
                <button type="button" onClick={() => setAssignModal({ open: false, user: null })} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Borrower Modal ── */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Edit Borrower Profile</h3>
              <p className="text-xs text-gray-400 mt-0.5">{editModal.user?.name}</p>
            </div>
            <form onSubmit={handleEditBorrower} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">RF ID <span className="text-red-400">*</span></label>
                <input type="text" value={editForm.rf_id} onChange={e => setEditForm(f => ({ ...f, rf_id: e.target.value }))} required autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
                <textarea value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">Save Changes</button>
                <button type="button" onClick={() => setEditModal({ open: false, user: null })} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Account Modal ── */}
      {createModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Create Member Account</h3>
              <p className="text-xs text-gray-400 mt-0.5">Linking a login account to an existing borrower</p>
            </div>
            <form onSubmit={handleCreateAccount} className="px-6 py-5 space-y-4">

              {/* Borrower info card */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
                <Avatar name={createModal.borrower?.borrower_name} size="w-9 h-9" text="text-sm" gradient="from-gray-400 to-gray-500" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">{createModal.borrower?.borrower_name}</p>
                  <p className="text-xs text-blue-500">
                    ID #{createModal.borrower?.borrower_id}
                    {createModal.borrower?.rf_id && ` · RF: ${createModal.borrower.rf_id}`}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoFocus
                  placeholder="member@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <PasswordInput
                label="Password"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                required
                placeholder="Min. 8 characters"
              />

              <PasswordInput
                label="Confirm Password"
                value={createForm.confirmPassword}
                onChange={e => setCreateForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                placeholder="Repeat password"
              />

              {createForm.password && createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                <p className="text-xs text-red-500 -mt-2">Passwords do not match</p>
              )}

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <p className="text-xs text-emerald-700">
                  This will create a <strong>member</strong> account and link it to <strong>{createModal.borrower?.borrower_name}</strong>'s borrower profile. They can log in immediately.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setCreateModal({ open: false, borrower: null }); setCreateForm({ email: "", password: "", confirmPassword: "" }); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Role change confirm ── */}
      <ConfirmModal
        open={roleModal.open}
        onClose={() => setRoleModal({ open: false, user: null, newRole: "" })}
        onConfirm={handleChangeRole}
        title={`Change role to ${roleModal.newRole}?`}
        description={`${roleModal.user?.name} will be given ${roleModal.newRole} permissions immediately.`}
        confirmLabel="Change Role"
        confirmClass="bg-blue-600 hover:bg-blue-700"
        icon={<Ic d={ICONS.users} className="w-6 h-6 text-blue-500" />}
      />

      {/* ── Delete confirm ── */}
      <ConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null, loading: false })}
        onConfirm={handleDeleteUser}
        loading={deleteModal.loading}
        title="Delete User?"
        description={`"${deleteModal.user?.name}" will be permanently deleted. All associated borrower data may also be affected.`}
        confirmLabel="Yes, Delete"
        confirmClass="bg-red-600 hover:bg-red-700"
        icon={<Ic d={ICONS.trash} className="w-6 h-6 text-red-500" />}
      />
    </div>
  );
}