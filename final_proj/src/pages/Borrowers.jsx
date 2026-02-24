import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import API from "../services/api";
import { toast } from "sonner";

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const ICONS = {
  plus:    "M12 4v16m8-8H4",
  edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  renew:   "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  trash:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  filter:  "M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z",
  sort:    "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4",
  chevron: "M19 9l-7 7-7-7",
  x:       "M6 18L18 6M6 6l12 12",
  rfid:    "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  user:    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  back:    "M10 19l-7-7m0 0l7-7m-7 7h18",
  upload:  "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  check:   "M5 13l4 4L19 7",
  warn:    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  excel:   "M9 17v-2m3 2v-4m3 4v-6M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z",
};

const CSV_COLUMNS = ["borrower_name", "rf_id", "email", "phone", "address"];

/** Parse a CSV string into rows */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [], error: "File must have a header row and at least one data row." };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map(line => {
    const values = [];
    let current = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  }).filter(row => Object.values(row).some(v => v));
  return { headers, rows };
}

/** Parse an Excel file buffer into rows */
function parseExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (raw.length < 2) return { headers: [], rows: [], error: "File must have a header row and at least one data row." };
    const headers = raw[0].map(h => String(h).trim().toLowerCase());
    const rows = raw.slice(1)
      .map(rowArr => {
        const row = {};
        headers.forEach((h, i) => { row[h] = String(rowArr[i] ?? "").trim(); });
        return row;
      })
      .filter(row => Object.values(row).some(v => v));
    return { headers, rows };
  } catch (e) {
    return { headers: [], rows: [], error: "Failed to read Excel file. Make sure it's a valid .xlsx or .xls file." };
  }
}

const getMembershipStatus = (expiryDate) => {
  if (!expiryDate) return { text: "No expiry", color: "text-gray-400", bg: "bg-gray-100", dot: "bg-gray-300" };
  const expiry = new Date(expiryDate);
  const today  = new Date();
  if (expiry < today)                           return { text: "Expired",       color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-500"    };
  if (expiry - today < 30 * 24 * 60 * 60 * 1e3) return { text: "Expiring soon", color: "text-orange-600", bg: "bg-orange-50", dot: "bg-orange-400" };
  return                                               { text: "Active",        color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" };
};

export default function Borrowers() {
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal
  const [editingBorrower, setEditingBorrower] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ borrower_name: "", email: "", phone: "", address: "", rf_id: "" });

  // Assign RF ID modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rfIdForm, setRfIdForm] = useState({ rf_id: "", phone: "", address: "" });

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvStep, setCsvStep] = useState("upload");
  const [csvRows, setCsvRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileType, setFileType] = useState(""); // "csv" | "excel"
  const fileInputRef = useRef(null);

  // Search / filter / sort
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [rfidFilter, setRfidFilter] = useState("all");
  const [sortField, setSortField] = useState("borrower_name");
  const [sortDir, setSortDir] = useState("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { fetchBorrowers(); }, []);

  const fetchBorrowers = async () => {
    try {
      const res = await API.get("/borrowers");
      setBorrowers(Array.isArray(res.data) ? res.data : []);
    } catch { setError("Failed to load borrowers"); } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = [...borrowers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.borrower_name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) ||
        b.phone?.includes(q) || b.rf_id?.toLowerCase().includes(q) || b.borrower_id?.toString().includes(q)
      );
    }
    if (membershipFilter !== "all") {
      list = list.filter(b => {
        const status = getMembershipStatus(b.membership_expiry);
        if (membershipFilter === "active")  return status.text === "Active";
        if (membershipFilter === "expired") return status.text === "Expired";
        if (membershipFilter === "soon")    return status.text === "Expiring soon";
        return true;
      });
    }
    if (rfidFilter === "has")  list = list.filter(b => b.rf_id);
    if (rfidFilter === "none") list = list.filter(b => !b.rf_id);
    list.sort((a, b) => {
      let aVal, bVal;
      if      (sortField === "borrower_name")     { aVal = a.borrower_name?.toLowerCase() || ""; bVal = b.borrower_name?.toLowerCase() || ""; }
      else if (sortField === "membership_expiry") { aVal = new Date(a.membership_expiry || 0); bVal = new Date(b.membership_expiry || 0); }
      else if (sortField === "borrower_id")       { aVal = a.borrower_id; bVal = b.borrower_id; }
      else                                        { aVal = a[sortField] || ""; bVal = b[sortField] || ""; }
      return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return list;
  }, [borrowers, search, membershipFilter, rfidFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <Ic d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" className="w-3 h-3 text-gray-300" />;
    return <Ic d={sortDir === "asc" ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"} className="w-3 h-3 text-blue-500" />;
  };

  const activeFilterCount = (membershipFilter !== "all" ? 1 : 0) + (rfidFilter !== "all" ? 1 : 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = (borrower, e) => {
    e.stopPropagation();
    setEditingBorrower(borrower);
    setEditForm({ borrower_name: borrower.borrower_name, email: borrower.email || "", phone: borrower.phone || "", address: borrower.address || "", rf_id: borrower.rf_id || "" });
    setShowEditModal(true);
  };

  const handleUpdateBorrower = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/borrowers/${editingBorrower.borrower_id}`, editForm);
      toast.success("Borrower updated");
      setShowEditModal(false); setEditingBorrower(null); fetchBorrowers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
  };

  const handleDelete = (borrowerId, borrowerName, e) => {
    e.stopPropagation();
    toast(`Delete ${borrowerName}?`, {
      description: "This action cannot be undone.",
      action: { label: "Delete", onClick: async () => { try { await API.delete(`/borrowers/${borrowerId}`); fetchBorrowers(); } catch { } } },
      cancel: { label: "Cancel" },
    });
  };

  const handleRenewMembership = (borrowerId, borrowerName, e) => {
    e.stopPropagation();
    toast(`Renew membership for ${borrowerName}?`, {
      action: { label: "Renew", onClick: async () => { try { await API.put(`/borrowers/renew/${borrowerId}`); fetchBorrowers(); } catch { } } },
      cancel: { label: "Cancel" },
    });
  };

  const fetchUsersWithoutBorrowerProfile = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(res.data.users.filter(u => !u.borrower));
      setShowUserModal(true);
    } catch { toast.error("Failed to load users"); }
  };

  const handleAssignRfId = async (e) => {
    e.preventDefault();
    try {
      await API.post("/borrowers/assign-rfid", { user_id: selectedUser.id, rf_id: rfIdForm.rf_id, phone: rfIdForm.phone || null, address: rfIdForm.address || null });
      toast.success(`RF ID assigned to ${selectedUser.name}`);
      setShowUserModal(false); setSelectedUser(null); setRfIdForm({ rf_id: "", phone: "", address: "" });
      fetchBorrowers();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to assign RF ID"); }
  };

  // ── Import handlers ────────────────────────────────────────────────────────
  const resetImport = () => {
    setCsvStep("upload"); setCsvRows([]); setCsvHeaders([]); setCsvError(""); setImportResult(null); setFileType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processParseResult = ({ headers, rows, error }) => {
    if (error) { setCsvError(error); return; }
    if (!headers.includes("borrower_name")) {
      setCsvError(`File must include a "borrower_name" column. Found: ${headers.join(", ")}`);
      return;
    }
    setCsvError(""); setCsvHeaders(headers); setCsvRows(rows); setCsvStep("preview");
  };

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const isCSV   = name.endsWith(".csv");

    if (!isExcel && !isCSV) {
      setCsvError("Please upload a .csv, .xlsx, or .xls file.");
      return;
    }

    setCsvError("");
    setFileType(isExcel ? "excel" : "csv");

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => processParseResult(parseCSV(e.target.result));
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => processParseResult(parseExcel(new Uint8Array(e.target.result)));
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImportSubmit = async () => {
    try {
      setImporting(true);
      const res = await API.post("/borrowers/import", { borrowers: csvRows });
      setImportResult(res.data);
      setCsvStep("result");
      if (res.data.created > 0) fetchBorrowers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Import failed");
    } finally { setImporting(false); }
  };

  const downloadTemplate = (type = "csv") => {
    if (type === "csv") {
      const blob = new Blob([`${CSV_COLUMNS.join(",")}\nJane Smith,RFID001,jane@example.com,9876543210,123 Library Lane\n`], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = "borrowers_template.csv"; a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([
        CSV_COLUMNS,
        ["Jane Smith", "RFID001", "jane@example.com", "9876543210", "123 Library Lane"],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Borrowers");
      XLSX.writeFile(wb, "borrowers_template.xlsx");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Borrowers</h2>
            <p className="text-sm text-gray-400 mt-0.5">{filtered.length} of {borrowers.length} members</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { resetImport(); setShowImportModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-emerald-300 hover:text-emerald-700 text-sm font-medium transition">
              <Ic d={ICONS.upload} />
              Import
            </button>
            <button onClick={fetchUsersWithoutBorrowerProfile}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-700 text-sm font-medium transition">
              <Ic d={ICONS.rfid} />
              Assign RF ID
            </button>
            <button onClick={() => navigate("/borrowers/new")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition">
              <Ic d={ICONS.plus} />
              Add Borrower
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Search + Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Ic d={ICONS.search} className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone, RF ID..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <Ic d={ICONS.x} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Ic d={ICONS.sort} className="w-4 h-4 text-gray-400" />
            <select value={sortField} onChange={e => setSortField(e.target.value)}
              className="border border-gray-200 px-2.5 py-2 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-blue-300">
              <option value="borrower_name">Name</option>
              <option value="borrower_id">ID</option>
              <option value="membership_expiry">Expiry</option>
            </select>
            <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition">
              {sortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}
            </button>
          </div>
          <button onClick={() => setFiltersOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${
              filtersOpen || activeFilterCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}>
            <Ic d={ICONS.filter} className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
            <Ic d={ICONS.chevron} className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Membership Status</label>
              <div className="flex flex-wrap gap-1.5">
                {[["all","All"],["active","Active"],["soon","Expiring soon"],["expired","Expired"]].map(([val, label]) => (
                  <button key={val} onClick={() => setMembershipFilter(val)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      membershipFilter === val
                        ? val === "expired" ? "bg-red-100 border-red-300 text-red-700"
                          : val === "soon" ? "bg-orange-100 border-orange-300 text-orange-700"
                          : val === "active" ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                          : "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">RF ID</label>
              <div className="flex gap-1.5">
                {[["all","All"],["has","Has RF ID"],["none","No RF ID"]].map(([val, label]) => (
                  <button key={val} onClick={() => setRfidFilter(val)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      rfidFilter === val ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Active:</span>
                {membershipFilter !== "all" && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs">
                    {membershipFilter}<button onClick={() => setMembershipFilter("all")} className="hover:text-red-500 ml-0.5">×</button>
                  </span>
                )}
                {rfidFilter !== "all" && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs">
                    {rfidFilter === "has" ? "Has RF ID" : "No RF ID"}
                    <button onClick={() => setRfidFilter("all")} className="hover:text-red-500 ml-0.5">×</button>
                  </span>
                )}
                <button onClick={() => { setMembershipFilter("all"); setRfidFilter("all"); }} className="text-xs text-red-500 hover:text-red-700 ml-auto">Clear all</button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Ic d={ICONS.user} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">
              {search || activeFilterCount > 0 ? "No borrowers match your filters" : "No borrowers yet"}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[{ label: "Name", field: "borrower_name" }, { label: "RF ID", field: null }, { label: "Email", field: null }, { label: "Phone", field: null }, { label: "Membership", field: "membership_expiry" }].map(col => (
                      <th key={col.label} onClick={col.field ? () => toggleSort(col.field) : undefined}
                        className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide select-none ${col.field ? "cursor-pointer hover:text-gray-600" : ""}`}>
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          {col.field && <SortIcon field={col.field} />}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(borrower => {
                    const ms = getMembershipStatus(borrower.membership_expiry);
                    return (
                      <tr key={borrower.borrower_id} onClick={() => navigate(`/borrowers/${borrower.borrower_id}`)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {borrower.borrower_name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{borrower.borrower_name}</p>
                              <p className="text-xs text-gray-400">ID #{borrower.borrower_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {borrower.rf_id
                            ? <span className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">{borrower.rf_id}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{borrower.email || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{borrower.phone || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ms.dot}`} />
                            <div>
                              <p className={`text-xs font-semibold ${ms.color}`}>{ms.text}</p>
                              {borrower.membership_expiry && (
                                <p className="text-xs text-gray-400">{new Date(borrower.membership_expiry).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={e => handleEdit(borrower, e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit"><Ic d={ICONS.edit} /></button>
                            <button onClick={e => handleRenewMembership(borrower.borrower_id, borrower.borrower_name, e)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Renew membership"><Ic d={ICONS.renew} /></button>
                            <button onClick={e => handleDelete(borrower.borrower_id, borrower.borrower_name, e)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Ic d={ICONS.trash} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {borrowers.length} borrowers
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────────*/}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Edit Borrower</h3>
            </div>
            <form onSubmit={handleUpdateBorrower} className="px-6 py-5 space-y-4">
              {[
                { label: "Name",  key: "borrower_name", type: "text",  required: true  },
                { label: "RF ID", key: "rf_id",          type: "text",  required: false },
                { label: "Email", key: "email",          type: "email", required: false },
                { label: "Phone", key: "phone",          type: "tel",   required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label} {f.required && <span className="text-red-400">*</span>}</label>
                  <input type={f.type} value={editForm[f.key]}
                    onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required={f.required} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
                <textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Save Changes</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingBorrower(null); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ───────────────────────────────────────────────────────*/}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Ic d={ICONS.upload} className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Bulk Import Borrowers</h3>
                  <p className="text-xs text-gray-400">Upload a CSV or Excel file to create multiple borrowers at once</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); resetImport(); }} className="text-gray-300 hover:text-gray-500 transition">
                <Ic d={ICONS.x} className="w-5 h-5" />
              </button>
            </div>

            {/* Step tabs */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex items-center gap-2 text-xs mb-5">
                {[["upload", "1. Upload"], ["preview", "2. Preview"], ["result", "3. Result"]].map(([step, label], i) => (
                  <div key={step} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    <span className={`px-3 py-1 rounded-full font-medium transition ${csvStep === step ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6">

              {/* ── STEP 1: Upload ── */}
              {csvStep === "upload" && (
                <div className="space-y-5">
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                    className="border-2 border-dashed border-gray-200 hover:border-emerald-400 rounded-2xl p-10 text-center cursor-pointer transition group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-emerald-50 flex items-center justify-center mx-auto mb-3 transition">
                      <Ic d={ICONS.upload} className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Drop your file here</p>
                    <p className="text-xs text-gray-400 mb-3">or click to browse</p>
                    {/* Format badges */}
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                        <Ic d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" className="w-3 h-3" />
                        CSV
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-200">
                        <Ic d={ICONS.excel} className="w-3 h-3" />
                        Excel (.xlsx / .xls)
                      </span>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                      onChange={e => handleFile(e.target.files[0])} />
                  </div>

                  {csvError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      <Ic d={ICONS.warn} className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      {csvError}
                    </div>
                  )}

                  {/* Format guide + template downloads */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600">Expected format</p>
                      <div className="flex gap-2">
                        <button onClick={() => downloadTemplate("csv")}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                          <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="w-3.5 h-3.5" />
                          CSV template
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => downloadTemplate("excel")}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                          <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="w-3.5 h-3.5" />
                          Excel template
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {CSV_COLUMNS.map(col => (
                              <th key={col} className={`px-2 py-1.5 text-left font-semibold ${col === "borrower_name" ? "text-red-600" : "text-gray-600"}`}>
                                {col}{col === "borrower_name" && " *"}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {["Jane Smith", "RFID001", "jane@example.com", "9876543210", "123 Library Lane"].map((v, i) => (
                              <td key={i} className="px-2 py-1.5 text-gray-400">{v}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">* borrower_name is required. All other columns are optional.</p>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Preview ── */}
              {csvStep === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-800">{csvRows.length}</strong> borrowers ready to import
                      </p>
                      {fileType === "excel" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-200">
                          <Ic d={ICONS.excel} className="w-3 h-3" /> Excel
                        </span>
                      )}
                      {fileType === "csv" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">CSV</span>
                      )}
                    </div>
                    <button onClick={() => { setCsvStep("upload"); setCsvRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs text-gray-400 hover:text-gray-600">← Choose different file</button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                            {CSV_COLUMNS.filter(c => csvHeaders.includes(c)).map(col => (
                              <th key={col} className="px-3 py-2 text-left text-gray-500 font-semibold">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {csvRows.map((row, i) => (
                            <tr key={i} className={!row.borrower_name ? "bg-red-50" : "hover:bg-gray-50"}>
                              <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                              {CSV_COLUMNS.filter(c => csvHeaders.includes(c)).map(col => (
                                <td key={col} className={`px-3 py-2 ${col === "borrower_name" && !row[col] ? "text-red-500 font-semibold" : "text-gray-700"}`}>
                                  {row[col] || (col === "borrower_name" ? "⚠ Missing" : <span className="text-gray-300">—</span>)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    Existing RF IDs will be skipped. All borrowers will receive a 1-year membership.
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={handleImportSubmit} disabled={importing}
                      className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
                      {importing ? "Importing..." : `Import ${csvRows.length} Borrowers`}
                    </button>
                    <button onClick={() => { setShowImportModal(false); resetImport(); }}
                      className="px-5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Result ── */}
              {csvStep === "result" && importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">Created</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-orange-700">{importResult.skipped}</p>
                      <p className="text-xs text-orange-600 mt-0.5 font-medium">Skipped</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-700">{importResult.created + importResult.skipped}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">Total</p>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <div className="bg-red-50 px-4 py-2.5 border-b border-red-200">
                        <p className="text-xs font-semibold text-red-700">{importResult.errors.length} row{importResult.errors.length !== 1 ? "s" : ""} had issues</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="px-4 py-2.5 border-b border-red-50 text-xs flex items-start gap-2">
                            <span className="text-red-400 font-mono shrink-0">Row {err.row}</span>
                            <span className="text-gray-600">{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { setShowImportModal(false); resetImport(); }}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Done</button>
                    <button onClick={resetImport}
                      className="px-5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Import More</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign RF ID Modal ─────────────────────────────────────────────────*/}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {selectedUser && (
                  <button onClick={() => { setSelectedUser(null); setRfIdForm({ rf_id: "", phone: "", address: "" }); }}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition">
                    <Ic d={ICONS.back} className="w-4 h-4" />
                  </button>
                )}
                <h3 className="text-base font-bold text-gray-800">
                  {selectedUser ? `Assign RF ID — ${selectedUser.name}` : "Assign RF ID to User"}
                </h3>
              </div>
              <button onClick={() => { setShowUserModal(false); setSelectedUser(null); setUsers([]); }} className="text-gray-300 hover:text-gray-500 transition">
                <Ic d={ICONS.x} className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {!selectedUser ? (
                users.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Ic d={ICONS.user} className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm">All users already have borrower profiles</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-3">{users.length} users without a borrower profile</p>
                    {users.map(user => (
                      <div key={user.id} onClick={() => setSelectedUser(user)}
                        className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          user.role === "admin" ? "bg-red-100 text-red-700" :
                          user.role === "librarian" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>{user.role}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <form onSubmit={handleAssignRfId} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {selectedUser.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">{selectedUser.name}</p>
                      <p className="text-xs text-blue-600">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">RF ID / Card Number <span className="text-red-400">*</span></label>
                    <input type="text" value={rfIdForm.rf_id} onChange={e => setRfIdForm({ ...rfIdForm, rf_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Scan or enter RF ID" required autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone <span className="text-gray-300">(optional)</span></label>
                    <input type="tel" value={rfIdForm.phone} onChange={e => setRfIdForm({ ...rfIdForm, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Phone number" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address <span className="text-gray-300">(optional)</span></label>
                    <textarea value={rfIdForm.address} onChange={e => setRfIdForm({ ...rfIdForm, address: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={2} placeholder="Address" />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-amber-700">Creates a borrower profile with a 1-year membership for <strong>{selectedUser.name}</strong>.</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Assign RF ID</button>
                    <button type="button" onClick={() => { setSelectedUser(null); setRfIdForm({ rf_id: "", phone: "", address: "" }); }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Back</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}