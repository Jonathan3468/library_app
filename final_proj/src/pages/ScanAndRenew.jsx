import { useState, useEffect } from "react";
import API from "../services/api";
import { toast } from "sonner";
import BarcodeScanner from "./BarcodeScanner";

function ValidationMsg({ type, msg }) {
  if (!msg) return null;
  const styles = { error: "text-red-500", success: "text-green-600", loading: "text-gray-400" };
  const icons  = { error: "✗", success: "✓", loading: "…" };
  return (
    <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${styles[type]}`}>
      <span>{icons[type]}</span> {msg}
    </p>
  );
}

const Spinner = ({ color = "blue" }) => (
  <svg className={`animate-spin h-5 w-5 text-${color}-600`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const ICONS = {
  check:  "M5 13l4 4L19 7",
  x:      "M6 18L18 6M6 6l12 12",
  renew:  "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  user:   "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  book:   "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  clock:  "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  warn:   "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
};

// ── Camera Button ─────────────────────────────────────────────────────────────
// Small button to open the scanner modal, placed next to barcode inputs
function CameraButton({ onClick, color = "blue" }) {
  const colorMap = {
    blue:   "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200",
    green:  "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title="Scan with camera"
      className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition shrink-0 ${colorMap[color]}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={ICONS.camera} />
      </svg>
      Camera
    </button>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel, confirmClass, loading, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-base font-bold text-gray-800 text-center mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-500 text-center">{description}</p>}
          {children}
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmClass}`}>
            {loading ? <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Working…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Renewal Requests Panel ────────────────────────────────────────────────────
function RenewalRequests() {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("pending");
  const [actionModal, setActionModal] = useState({ open: false, type: null, req: null });
  const [denyNotes, setDenyNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [renewalPeriodDays, setRenewalPeriodDays] = useState(7);

  useEffect(() => {
    API.get("/settings")
      .then(res => {
        const days = res.data?.RENEWAL_PERIOD_DAYS ?? res.data?.settings?.RENEWAL_PERIOD_DAYS;
        if (days !== undefined) setRenewalPeriodDays(days);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRequests(); }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/renewal-requests?status=${filter}`);
      setRequests(res.data.requests || []);
    } catch { toast.error("Failed to load renewal requests"); }
    finally { setLoading(false); }
  };

  const openApprove = (req) => setActionModal({ open: true, type: "approve", req });
  const openDeny    = (req) => { setDenyNotes(""); setActionModal({ open: true, type: "deny", req }); };
  const closeModal  = () => { if (!actionLoading) setActionModal({ open: false, type: null, req: null }); };

  const handleAction = async () => {
    const { type, req } = actionModal;
    setActionLoading(true);
    try {
      if (type === "approve") {
        const res = await API.put(`/renewal-requests/${req.id}/approve`);
        toast.success(`Renewal approved · New due: ${new Date(res.data.new_due_date).toLocaleDateString()}`);
      } else {
        await API.put(`/renewal-requests/${req.id}/deny`, { notes: denyNotes || null });
        toast.success("Renewal denied");
      }
      closeModal();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally { setActionLoading(false); }
  };

  const isOverdue = (date) => new Date(date) < new Date();

  const FILTERS = [
    { val: "pending",  label: "Pending",  color: "bg-amber-100 border-amber-300 text-amber-700"      },
    { val: "approved", label: "Approved", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
    { val: "denied",   label: "Denied",   color: "bg-red-100 border-red-300 text-red-700"             },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filter === f.val ? f.color : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-gray-400 text-sm gap-2"><Spinner color="gray" /> Loading…</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center">
          <Ic d={ICONS.renew} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No {filter} renewal requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const issue = req.Issue; const borrower = req.Borrower;
            const copy  = issue?.Copy; const book = copy?.Book;
            const overdue = issue?.due_date && isOverdue(issue.due_date);
            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {borrower?.borrower_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{borrower?.borrower_name}</p>
                        <p className="text-xs text-gray-400">ID #{borrower?.borrower_id}{borrower?.rf_id && ` · RF: ${borrower.rf_id}`}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                      <Ic d={ICONS.book} className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{book?.title}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{copy?.copy_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Ic d={ICONS.clock} className={`w-3.5 h-3.5 ${overdue ? "text-red-500" : "text-gray-400"}`} />
                        <span className={overdue ? "text-red-600 font-semibold" : "text-gray-500"}>
                          Due: {issue?.due_date ? new Date(issue.due_date).toLocaleDateString() : "—"}
                          {overdue && " (Overdue)"}
                        </span>
                      </div>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-400">Requested {new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    {req.status === "denied" && req.notes && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">Note: {req.notes}</p>
                    )}
                    {req.status === "approved" && (
                      <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
                        <Ic d={ICONS.check} className="w-3 h-3" />
                        Approved — due date extended by {renewalPeriodDays} days
                      </p>
                    )}
                  </div>
                  {req.status === "pending" && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => openApprove(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition">
                        <Ic d={ICONS.check} className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => openDeny(req)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition">
                        <Ic d={ICONS.x} className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  )}
                  {req.status !== "pending" && (
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${req.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
                      {req.status === "approved" ? "Approved" : "Denied"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal open={actionModal.open && actionModal.type === "approve"} onClose={closeModal} onConfirm={handleAction} loading={actionLoading}
        title="Approve Renewal?" description={`Extend the due date by ${renewalPeriodDays} days for ${actionModal.req?.Borrower?.borrower_name}.`}
        confirmLabel="Approve" confirmClass="bg-emerald-600 hover:bg-emerald-700" />

      <ConfirmModal open={actionModal.open && actionModal.type === "deny"} onClose={closeModal} onConfirm={handleAction} loading={actionLoading}
        title="Deny Renewal?" description="The borrower will be notified that their renewal was not approved."
        confirmLabel="Deny" confirmClass="bg-red-600 hover:bg-red-700">
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason <span className="text-gray-400">(optional — shown to borrower)</span></label>
          <textarea value={denyNotes} onChange={e => setDenyNotes(e.target.value)}
            placeholder="e.g. Another borrower has requested this book"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" rows={2} />
        </div>
      </ConfirmModal>
    </div>
  );
}

// ── Main ScanAndRenew ─────────────────────────────────────────────────────────
export default function ScanAndRenew() {
  const [activeTab, setActiveTab] = useState("scan");

  // ── Scanner modal state ───────────────────────────────────────────────────
  // target: "scan-copy" | "renew-copy" | null
  const [scannerTarget, setScannerTarget] = useState(null);

  // ── Scan tab ──────────────────────────────────────────────────────────────
  const [scanRfId, setScanRfId]         = useState("");
  const [copyCode, setCopyCode]         = useState("");
  const [scanResult, setScanResult]     = useState(null);
  const [scanLoading, setScanLoading]   = useState(false);

  const [borrowerSearch, setBorrowerSearch]                 = useState("");
  const [borrowers, setBorrowers]                           = useState([]);
  const [showBorrowerDropdown, setShowBorrowerDropdown]     = useState(false);
  const [selectedBorrower, setSelectedBorrower]             = useState(null);
  const [isSearchingBorrower, setIsSearchingBorrower]       = useState(false);
  const [borrowerValidation, setBorrowerValidation]         = useState(null);

  const [bookSearch, setBookSearch]                     = useState("");
  const [books, setBooks]                               = useState([]);
  const [showBookDropdown, setShowBookDropdown]         = useState(false);
  const [selectedBook, setSelectedBook]                 = useState(null);
  const [isSearchingBook, setIsSearchingBook]           = useState(false);
  const [copies, setCopies]                             = useState([]);
  const [selectedCopy, setSelectedCopy]                 = useState(null);
  const [loadingCopies, setLoadingCopies]               = useState(false);
  const [copyCodeValidation, setCopyCodeValidation]     = useState(null);

  const [issuedBooks, setIssuedBooks]           = useState([]);
  const [loadingIssuedBooks, setLoadingIssuedBooks] = useState(false);
  const [isReturningMode, setIsReturningMode]   = useState(false);

  // ── Renew tab ─────────────────────────────────────────────────────────────
  const [renewRfId, setRenewRfId]           = useState("");
  const [renewCopyCode, setRenewCopyCode]   = useState("");
  const [renewResult, setRenewResult]       = useState(null);
  const [renewLoading, setRenewLoading]     = useState(false);

  const [renewBorrowerSearch, setRenewBorrowerSearch]               = useState("");
  const [renewBorrowers, setRenewBorrowers]                         = useState([]);
  const [showRenewBorrowerDropdown, setShowRenewBorrowerDropdown]   = useState(false);
  const [selectedRenewBorrower, setSelectedRenewBorrower]           = useState(null);
  const [isSearchingRenewBorrower, setIsSearchingRenewBorrower]     = useState(false);
  const [renewBorrowerValidation, setRenewBorrowerValidation]       = useState(null);

  const [renewBookSearch, setRenewBookSearch]               = useState("");
  const [renewBooks, setRenewBooks]                         = useState([]);
  const [showRenewBookDropdown, setShowRenewBookDropdown]   = useState(false);
  const [selectedRenewBook, setSelectedRenewBook]           = useState(null);
  const [isSearchingRenewBook, setIsSearchingRenewBook]     = useState(false);
  const [renewCopies, setRenewCopies]                       = useState([]);
  const [selectedRenewCopy, setSelectedRenewCopy]           = useState(null);
  const [loadingRenewCopies, setLoadingRenewCopies]         = useState(false);
  const [renewCopyCodeValidation, setRenewCopyCodeValidation] = useState(null);

  const [pendingRenewalCount, setPendingRenewalCount] = useState(0);

  useEffect(() => {
    API.get("/renewal-requests?status=pending")
      .then(res => setPendingRenewalCount(res.data.requests?.length || 0))
      .catch(() => {});
  }, []);

  // ── Camera scan handler ───────────────────────────────────────────────────
  // Called when ZXing successfully reads a barcode
  const handleCameraScan = (code) => {
    setScannerTarget(null); // close modal

    if (scannerTarget === "scan-copy") {
      setCopyCode(code);
      setSelectedBook(null);
      setSelectedCopy(null);
      setBookSearch("");
      setIsReturningMode(false);
      setCopyCodeValidation(null);
      toast.success(`Barcode scanned: ${code}`);
    }

    if (scannerTarget === "renew-copy") {
      setRenewCopyCode(code);
      setSelectedRenewBook(null);
      setSelectedRenewCopy(null);
      setRenewBookSearch("");
      setRenewCopyCodeValidation(null);
      toast.success(`Barcode scanned: ${code}`);
    }
  };

  // ── Borrower search effects ───────────────────────────────────────────────
  useEffect(() => {
    if (selectedBorrower) return;
    const trimmed = borrowerSearch.trim();
    if (!trimmed) { setBorrowers([]); setShowBorrowerDropdown(false); setBorrowerValidation(null); return; }
    setBorrowerValidation({ type: "loading", msg: "Looking up borrower…" });
    const id = setTimeout(async () => {
      if (/^\d+$/.test(trimmed)) await lookupByRfId(trimmed);
      else if (trimmed.length >= 2) await searchBorrowers();
      else setBorrowerValidation(null);
    }, 350);
    return () => clearTimeout(id);
  }, [borrowerSearch, selectedBorrower]);

  useEffect(() => {
    if (selectedRenewBorrower) return;
    const trimmed = renewBorrowerSearch.trim();
    if (!trimmed) { setRenewBorrowers([]); setShowRenewBorrowerDropdown(false); setRenewBorrowerValidation(null); return; }
    setRenewBorrowerValidation({ type: "loading", msg: "Looking up borrower…" });
    const id = setTimeout(async () => {
      if (/^\d+$/.test(trimmed)) await lookupRenewByRfId(trimmed);
      else if (trimmed.length >= 2) await searchRenewBorrowers();
      else setRenewBorrowerValidation(null);
    }, 350);
    return () => clearTimeout(id);
  }, [renewBorrowerSearch, selectedRenewBorrower]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (bookSearch.length >= 2) searchBooks();
      else { setBooks([]); setShowBookDropdown(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [bookSearch]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (renewBookSearch.length >= 2) searchRenewBooks();
      else { setRenewBooks([]); setShowRenewBookDropdown(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [renewBookSearch]);

  useEffect(() => {
    if (selectedCopy || selectedBook) { setCopyCodeValidation(null); return; }
    const trimmed = copyCode.trim();
    if (!trimmed) { setCopyCodeValidation(null); return; }
    setCopyCodeValidation({ type: "loading", msg: "Checking copy code…" });
    const id = setTimeout(async () => {
      try {
        await API.get(`/books/copies/by-code/${trimmed}`);
        setCopyCodeValidation({ type: "success", msg: "Copy found." });
      } catch (err) {
        setCopyCodeValidation({ type: "error", msg: err.response?.status === 404 ? "Copy code not found." : "Could not verify copy code." });
      }
    }, 400);
    return () => clearTimeout(id);
  }, [copyCode, selectedCopy, selectedBook]);

  useEffect(() => {
    if (selectedRenewCopy || selectedRenewBook) { setRenewCopyCodeValidation(null); return; }
    const trimmed = renewCopyCode.trim();
    if (!trimmed) { setRenewCopyCodeValidation(null); return; }
    setRenewCopyCodeValidation({ type: "loading", msg: "Checking copy code…" });
    const id = setTimeout(async () => {
      try {
        await API.get(`/books/copies/by-code/${trimmed}`);
        setRenewCopyCodeValidation({ type: "success", msg: "Copy found." });
      } catch (err) {
        setRenewCopyCodeValidation({ type: "error", msg: err.response?.status === 404 ? "Copy code not found." : "Could not verify." });
      }
    }, 400);
    return () => clearTimeout(id);
  }, [renewCopyCode, selectedRenewCopy, selectedRenewBook]);

  // ── API helpers ───────────────────────────────────────────────────────────
  const lookupByRfId = async (rfId) => {
    setIsSearchingBorrower(true);
    try {
      const res = await API.get(`/borrowers/rf/${rfId}`);
      if (res.data.borrower) { handleSelectBorrower(res.data.borrower); setBorrowerSearch(rfId); setBorrowerValidation(null); }
      else await searchBorrowers();
    } catch { setBorrowerValidation({ type: "error", msg: "No borrower found with this RF ID." }); }
    finally { setIsSearchingBorrower(false); }
  };

  const lookupRenewByRfId = async (rfId) => {
    setIsSearchingRenewBorrower(true);
    try {
      const res = await API.get(`/borrowers/rf/${rfId}`);
      if (res.data.borrower) { handleSelectRenewBorrower(res.data.borrower); setRenewBorrowerSearch(rfId); setRenewBorrowerValidation(null); }
      else await searchRenewBorrowers();
    } catch { setRenewBorrowerValidation({ type: "error", msg: "No borrower found with this RF ID." }); }
    finally { setIsSearchingRenewBorrower(false); }
  };

  const searchBorrowers = async () => {
    setIsSearchingBorrower(true);
    try {
      const res = await API.get(`/borrowers/search?q=${borrowerSearch}`);
      const list = res.data.borrowers || [];
      setBorrowers(list); setShowBorrowerDropdown(list.length > 0);
      setBorrowerValidation(list.length === 0 ? { type: "error", msg: "No borrowers found." } : null);
    } catch { setBorrowers([]); setBorrowerValidation({ type: "error", msg: "Search failed." }); }
    finally { setIsSearchingBorrower(false); }
  };

  const searchRenewBorrowers = async () => {
    setIsSearchingRenewBorrower(true);
    try {
      const res = await API.get(`/borrowers/search?q=${renewBorrowerSearch}`);
      const list = res.data.borrowers || [];
      setRenewBorrowers(list); setShowRenewBorrowerDropdown(list.length > 0);
      setRenewBorrowerValidation(list.length === 0 ? { type: "error", msg: "No borrowers found." } : null);
    } catch { setRenewBorrowers([]); setRenewBorrowerValidation({ type: "error", msg: "Search failed." }); }
    finally { setIsSearchingRenewBorrower(false); }
  };

  const searchBooks      = async () => { setIsSearchingBook(true); try { const res = await API.get(`/search?q=${encodeURIComponent(bookSearch)}`); setBooks(res.data.results?.books || []); setShowBookDropdown(true); } catch { setBooks([]); } finally { setIsSearchingBook(false); } };
  const searchRenewBooks = async () => { setIsSearchingRenewBook(true); try { const res = await API.get(`/search?q=${encodeURIComponent(renewBookSearch)}`); setRenewBooks(res.data.results?.books || []); setShowRenewBookDropdown(true); } catch { setRenewBooks([]); } finally { setIsSearchingRenewBook(false); } };

  const fetchIssuedBooks = async (borrowerId) => {
    setLoadingIssuedBooks(true);
    try { const res = await API.get(`/borrowers/${borrowerId}/issues`); setIssuedBooks(res.data.issues?.filter(i => !i.check_in) || []); }
    catch { setIssuedBooks([]); } finally { setLoadingIssuedBooks(false); }
  };

  const fetchCopies = async (bookId) => {
    setLoadingCopies(true);
    try { const res = await API.get(`/books/${bookId}/copies`); setCopies(res.data.copies || []); }
    catch { setCopies([]); } finally { setLoadingCopies(false); }
  };

  const fetchRenewCopies = async (bookId) => {
    setLoadingRenewCopies(true);
    try { const res = await API.get(`/books/${bookId}/copies`); setRenewCopies(res.data.copies || []); }
    catch { setRenewCopies([]); } finally { setLoadingRenewCopies(false); }
  };

  // ── Select handlers ───────────────────────────────────────────────────────
  const handleSelectBorrower = (borrower) => {
    setSelectedBorrower(borrower);
    setBorrowerSearch(`${borrower.borrower_name} (${borrower.rf_id ? "RF: " + borrower.rf_id : "ID: " + borrower.borrower_id})`);
    setShowBorrowerDropdown(false); setBorrowers([]);
    setScanRfId(borrower.rf_id || borrower.borrower_id.toString());
    setBorrowerValidation(null);
    fetchIssuedBooks(borrower.borrower_id);
  };

  const handleSelectRenewBorrower = (borrower) => {
    setSelectedRenewBorrower(borrower);
    setRenewBorrowerSearch(`${borrower.borrower_name} (${borrower.rf_id ? "RF: " + borrower.rf_id : "ID: " + borrower.borrower_id})`);
    setShowRenewBorrowerDropdown(false); setRenewBorrowers([]);
    setRenewRfId(borrower.rf_id || borrower.borrower_id.toString());
    setRenewBorrowerValidation(null);
  };

  const handleSelectBook = async (book) => {
    setSelectedBook(book); setBookSearch(book.title);
    setShowBookDropdown(false); setBooks([]);
    setSelectedCopy(null); setIsReturningMode(false); setCopyCodeValidation(null);
    await fetchCopies(book.book_id);
  };

  const handleSelectRenewBook = async (book) => {
    setSelectedRenewBook(book); setRenewBookSearch(book.title);
    setShowRenewBookDropdown(false); setRenewBooks([]);
    setSelectedRenewCopy(null); setRenewCopyCodeValidation(null);
    await fetchRenewCopies(book.book_id);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleScan = async () => {
    const finalRfId     = selectedBorrower ? (selectedBorrower.rf_id || selectedBorrower.borrower_id.toString()) : scanRfId;
    const finalCopyCode = selectedCopy ? selectedCopy.copy_code : copyCode;
    if (!finalRfId || !finalCopyCode) { setScanResult({ error: "Please enter RF ID and Copy Code" }); return; }
    try {
      setScanLoading(true); setScanResult(null);
      const res = await API.post("/scan", { rf_id: finalRfId, copy_code: finalCopyCode });
      setScanResult(res.data);
      if (res.data.action) setTimeout(() => handleClearScanForm(), 2000);
    } catch (err) { setScanResult(err.response?.data || { error: "Something went wrong" }); }
    finally { setScanLoading(false); }
  };

  const handleRenew = async (override = false) => {
    const finalRfId     = selectedRenewBorrower ? (selectedRenewBorrower.rf_id || selectedRenewBorrower.borrower_id.toString()) : renewRfId;
    const finalCopyCode = selectedRenewCopy ? selectedRenewCopy.copy_code : renewCopyCode;
    if (!finalRfId || !finalCopyCode) { setRenewResult({ error: "Please enter RF ID and Copy Code" }); return; }
    try {
      setRenewLoading(true); setRenewResult(null);
      const res = await API.post("/issues/renew", { rf_id: finalRfId, copy_code: finalCopyCode, override });
      setRenewResult({ success: true, message: "Book renewed successfully", new_due_date: res.data.new_due_date, warnings: res.data.warnings || [] });
      setTimeout(() => handleClearRenewForm(), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires_override) {
        toast(`Override required`, {
          description: data.warnings.join(" · "),
          action: { label: "Override", onClick: () => handleRenew(true) },
          cancel: { label: "Cancel" },
        });
        setRenewResult({ warning: true, warnings: data.warnings });
      } else { setRenewResult({ error: data?.error || "Renewal failed" }); }
    } finally { setRenewLoading(false); }
  };

  const handleClearScanForm = () => {
    setScanRfId(""); setCopyCode(""); setBorrowerSearch(""); setSelectedBorrower(null);
    setBookSearch(""); setSelectedBook(null); setSelectedCopy(null); setCopies([]);
    setBorrowers([]); setBooks([]); setIssuedBooks([]); setScanResult(null);
    setIsReturningMode(false); setBorrowerValidation(null); setCopyCodeValidation(null);
  };

  const handleClearRenewForm = () => {
    setRenewRfId(""); setRenewCopyCode(""); setRenewBorrowerSearch(""); setSelectedRenewBorrower(null);
    setRenewBookSearch(""); setSelectedRenewBook(null); setSelectedRenewCopy(null); setRenewCopies([]);
    setRenewBorrowers([]); setRenewBooks([]); setRenewResult(null);
    setRenewBorrowerValidation(null); setRenewCopyCodeValidation(null);
  };

  const handleKeyPress = (e, action) => { if (e.key === "Enter") action === "scan" ? handleScan() : handleRenew(); };
  const isCopyReturnableByCurrentBorrower = (copy) => selectedBorrower && copy.status === "Issued" && copy.borrower?.borrower_id === selectedBorrower.borrower_id;
  const inputBorder = (validation, isSelected, focusColor = "blue") => {
    if (validation?.type === "error") return "border-red-400 focus:border-red-500";
    if (isSelected || validation?.type === "success") return "border-green-400 focus:border-green-500";
    return `border-gray-300 focus:border-${focusColor}-500`;
  };

  const TABS = [
    { id: "scan",             label: "Scan Book",         color: "bg-blue-600"    },
    { id: "renew",            label: "Renew Book",         color: "bg-emerald-600" },
    { id: "renewal-requests", label: "Renewal Requests",   color: "bg-amber-500",
      badge: pendingRenewalCount > 0 ? pendingRenewalCount : null },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Library Operations</h2>
          <p className="text-sm text-gray-400 mt-0.5">Issue, return, renew, and manage renewal requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-white border border-gray-200 rounded-xl p-1.5 w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? `${tab.color} text-white shadow-sm` : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-white/30 text-white" : "bg-amber-500 text-white"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          {/* ══════════ RENEWAL REQUESTS TAB ══════════ */}
          {activeTab === "renewal-requests" && <RenewalRequests />}

          {/* ══════════ SCAN TAB ══════════ */}
          {activeTab === "scan" && (
            <div className="space-y-6">

              {/* Borrower */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scan RF ID or Search Borrower</label>
                <div className="relative">
                  <input type="text" value={borrowerSearch} autoComplete="off"
                    onChange={e => { setBorrowerSearch(e.target.value); if (selectedBorrower) { setSelectedBorrower(null); setIssuedBooks([]); } }}
                    onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                    placeholder="Scan RF card or type to search..."
                    className={`w-full border-2 p-3 pr-10 rounded-lg focus:outline-none transition ${inputBorder(borrowerValidation, selectedBorrower)}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSearchingBorrower ? <Spinner /> : selectedBorrower ? (
                      <button type="button" onClick={() => { setSelectedBorrower(null); setBorrowerSearch(""); setScanRfId(""); setIssuedBooks([]); setBorrowerValidation(null); }} className="text-gray-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : null}
                  </div>
                </div>
                <ValidationMsg type={borrowerValidation?.type} msg={borrowerValidation?.msg} />
                {showBorrowerDropdown && borrowers.length > 0 && !selectedBorrower && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {borrowers.map(b => (
                      <div key={b.borrower_id} onClick={() => handleSelectBorrower(b)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition">
                        <p className="font-semibold text-gray-800 text-sm">{b.borrower_name}</p>
                        <p className="text-xs text-gray-500">ID: {b.borrower_id}{b.rf_id && ` · RF ID: ${b.rf_id}`}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedBorrower && (
                  <div className="mt-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Ic d={ICONS.check} className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-sm">{selectedBorrower.borrower_name}</p>
                      {selectedBorrower.rf_id && <p className="text-xs text-emerald-700">RF ID: {selectedBorrower.rf_id}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Issued Books */}
              {selectedBorrower && issuedBooks.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-orange-900 text-sm">Books issued to {selectedBorrower.borrower_name}</p>
                    {loadingIssuedBooks && <Spinner color="orange" />}
                  </div>
                  <p className="text-xs text-orange-700 mb-3">Click to select for return</p>
                  <div className="space-y-2">
                    {issuedBooks.map(issue => (
                      <div key={issue.issue_id}
                        onClick={() => { setCopyCode(issue.copy_code); setSelectedBook(null); setSelectedCopy(null); setBookSearch(""); setIsReturningMode(true); setCopyCodeValidation(null); }}
                        className={`p-3 rounded-xl cursor-pointer transition border-2 ${copyCode === issue.copy_code ? "bg-orange-100 border-orange-500" : "bg-white border-gray-200 hover:border-orange-300"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{issue.book_title}</p>
                            <p className="text-xs text-gray-500 font-mono">{issue.copy_code}</p>
                            <p className={`text-xs mt-0.5 font-medium ${new Date(issue.due_date) < new Date() ? "text-red-600" : "text-gray-400"}`}>
                              Due: {new Date(issue.due_date).toLocaleDateString()}
                              {new Date(issue.due_date) < new Date() && " · Overdue"}
                            </p>
                          </div>
                          {copyCode === issue.copy_code && <Ic d={ICONS.check} className="w-5 h-5 text-orange-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Book Search */}
              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">{selectedBorrower && issuedBooks.length > 0 ? "Or Issue a New Book" : "Select Book & Copy"}</p>
                <div className="relative mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Search by title or ISBN</label>
                  <div className="relative">
                    <input type="text" value={bookSearch} autoComplete="off"
                      onChange={e => { setBookSearch(e.target.value); if (selectedBook) { setSelectedBook(null); setCopies([]); setSelectedCopy(null); setIsReturningMode(false); } }}
                      onFocus={() => books.length > 0 && setShowBookDropdown(true)}
                      placeholder="Search..."
                      className="w-full border-2 border-gray-300 p-3 pr-10 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingBook ? <Spinner /> : selectedBook ? (
                        <button type="button" onClick={() => { setSelectedBook(null); setBookSearch(""); setCopies([]); setSelectedCopy(null); setIsReturningMode(false); }} className="text-gray-400 hover:text-red-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {showBookDropdown && books.length > 0 && !selectedBook && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {books.map(book => (
                        <div key={book.book_id} onClick={() => handleSelectBook(book)} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition">
                          <p className="font-semibold text-gray-800 text-sm">{book.title}</p>
                          <p className="text-xs text-gray-500">ISBN: {book.isbn} · {book.publication_year}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedBook && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-blue-900 text-sm">{selectedBook.title}</p>
                      {loadingCopies && <Spinner />}
                    </div>
                    {copies.length === 0 && !loadingCopies ? <p className="text-sm text-red-600">No copies available</p> : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-blue-800 mb-2">Select a copy:</p>
                        {copies.map(copy => {
                          const isReturnable = isCopyReturnableByCurrentBorrower(copy);
                          const isAvailable  = copy.status === "Available";
                          const isClickable  = isAvailable || isReturnable;
                          return (
                            <div key={copy.copy_id}
                              onClick={() => { if (isClickable) { setSelectedCopy(copy); setCopyCode(copy.copy_code); setIsReturningMode(isReturnable); setCopyCodeValidation(null); } }}
                              className={`p-3 rounded-xl transition border-2 ${
                                selectedCopy?.copy_id === copy.copy_id
                                  ? isReturnable ? "bg-orange-100 border-orange-500" : "bg-blue-100 border-blue-500"
                                  : isReturnable ? "bg-orange-50 border-orange-300 hover:border-orange-400 cursor-pointer"
                                  : isAvailable  ? "bg-white border-gray-200 hover:border-blue-300 cursor-pointer"
                                  : "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                              }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm font-mono">{copy.copy_code}</p>
                                  <p className={`text-xs font-semibold ${isReturnable ? "text-orange-600" : isAvailable ? "text-emerald-600" : "text-red-600"}`}>
                                    {isReturnable ? "Return this book" : copy.status}
                                  </p>
                                  {copy.borrower && <p className="text-xs text-gray-400">{isReturnable ? "Issued to you" : `Issued to: ${copy.borrower.borrower_name}`}{copy.borrower.due_date && ` · Due: ${new Date(copy.borrower.due_date).toLocaleDateString()}`}</p>}
                                </div>
                                {selectedCopy?.copy_id === copy.copy_id && <Ic d={ICONS.check} className={`w-5 h-5 ${isReturnable ? "text-orange-600" : "text-blue-600"}`} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Barcode input with camera button */}
                {!issuedBooks.length && (
                  <>
                    <div className="flex items-center my-4"><div className="flex-1 border-t border-gray-200" /><span className="px-3 text-xs text-gray-400 font-semibold">OR</span><div className="flex-1 border-t border-gray-200" /></div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Scan Book Barcode</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Scan copy barcode..."
                          className={`flex-1 border-2 p-3 rounded-lg focus:outline-none transition ${inputBorder(copyCodeValidation, false)}`}
                          value={copyCode}
                          onChange={e => { setCopyCode(e.target.value); if (e.target.value) { setSelectedBook(null); setSelectedCopy(null); setBookSearch(""); setIsReturningMode(false); } else setCopyCodeValidation(null); }}
                          onKeyPress={e => handleKeyPress(e, "scan")}
                        />
                        <CameraButton onClick={() => setScannerTarget("scan-copy")} color="blue" />
                      </div>
                      <ValidationMsg type={copyCodeValidation?.type} msg={copyCodeValidation?.msg} />
                    </div>
                  </>
                )}
              </div>

              <button onClick={handleScan} disabled={scanLoading}
                className={`w-full py-3.5 rounded-xl text-white font-semibold transition-all text-sm ${scanLoading ? "bg-gray-400 cursor-not-allowed" : isReturningMode ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                {scanLoading ? "Processing…" : isReturningMode ? "Return Book" : "Issue Book"}
              </button>
              {(selectedBorrower || selectedBook || copyCode) && (
                <button type="button" onClick={handleClearScanForm} className="w-full bg-gray-100 text-gray-600 py-2 px-6 rounded-xl hover:bg-gray-200 text-sm font-medium transition">Clear Form</button>
              )}
              {scanResult && (
                <div className={`mt-4 p-4 rounded-xl border-2 ${scanResult.error ? "bg-red-50 border-red-300" : "bg-emerald-50 border-emerald-300"}`}>
                  {scanResult.error && <p className="text-red-700 font-semibold text-sm">{scanResult.error}</p>}
                  {scanResult.action === "ISSUED"   && <p className="text-emerald-800 font-semibold text-sm">✓ Book Issued · Due: {new Date(scanResult.due_date).toLocaleDateString()}</p>}
                  {scanResult.action === "RETURNED" && <><p className="text-emerald-800 font-semibold text-sm">✓ Book Returned · Fine: ₹{scanResult.fine || 0}</p>{scanResult.pending_request && <p className="text-amber-600 text-xs mt-1">⚠ Someone has a pending request for this book</p>}</>}
                </div>
              )}
            </div>
          )}

          {/* ══════════ RENEW TAB ══════════ */}
          {activeTab === "renew" && (
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scan RF ID or Search Borrower</label>
                <div className="relative">
                  <input type="text" value={renewBorrowerSearch} autoComplete="off"
                    onChange={e => { setRenewBorrowerSearch(e.target.value); if (selectedRenewBorrower) setSelectedRenewBorrower(null); }}
                    onFocus={() => renewBorrowers.length > 0 && setShowRenewBorrowerDropdown(true)}
                    placeholder="Scan RF card or type to search..."
                    className={`w-full border-2 p-3 pr-10 rounded-lg focus:outline-none transition ${inputBorder(renewBorrowerValidation, selectedRenewBorrower, "green")}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSearchingRenewBorrower ? <Spinner color="green" /> : selectedRenewBorrower ? (
                      <button type="button" onClick={() => { setSelectedRenewBorrower(null); setRenewBorrowerSearch(""); setRenewRfId(""); setRenewBorrowerValidation(null); }} className="text-gray-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : null}
                  </div>
                </div>
                <ValidationMsg type={renewBorrowerValidation?.type} msg={renewBorrowerValidation?.msg} />
                {showRenewBorrowerDropdown && renewBorrowers.length > 0 && !selectedRenewBorrower && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {renewBorrowers.map(b => (
                      <div key={b.borrower_id} onClick={() => handleSelectRenewBorrower(b)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition">
                        <p className="font-semibold text-gray-800 text-sm">{b.borrower_name}</p>
                        <p className="text-xs text-gray-500">ID: {b.borrower_id}{b.rf_id && ` · RF ID: ${b.rf_id}`}</p>
                      </div>
                    ))}
                  </div>
                )}
                {selectedRenewBorrower && (
                  <div className="mt-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Ic d={ICONS.check} className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 text-sm">{selectedRenewBorrower.borrower_name}</p>
                      {selectedRenewBorrower.rf_id && <p className="text-xs text-emerald-700">RF ID: {selectedRenewBorrower.rf_id}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-semibold text-gray-700 mb-4">Select Book & Copy</p>
                <div className="relative mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Search by title or ISBN</label>
                  <div className="relative">
                    <input type="text" value={renewBookSearch} autoComplete="off"
                      onChange={e => { setRenewBookSearch(e.target.value); if (selectedRenewBook) { setSelectedRenewBook(null); setRenewCopies([]); setSelectedRenewCopy(null); } }}
                      onFocus={() => renewBooks.length > 0 && setShowRenewBookDropdown(true)}
                      placeholder="Search..."
                      className="w-full border-2 border-gray-300 p-3 pr-10 rounded-lg focus:outline-none focus:border-green-500 transition"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingRenewBook ? <Spinner color="green" /> : selectedRenewBook ? (
                        <button type="button" onClick={() => { setSelectedRenewBook(null); setRenewBookSearch(""); setRenewCopies([]); setSelectedRenewCopy(null); }} className="text-gray-400 hover:text-red-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {showRenewBookDropdown && renewBooks.length > 0 && !selectedRenewBook && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {renewBooks.map(book => (
                        <div key={book.book_id} onClick={() => handleSelectRenewBook(book)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 transition">
                          <p className="font-semibold text-gray-800 text-sm">{book.title}</p>
                          <p className="text-xs text-gray-500">ISBN: {book.isbn} · {book.publication_year}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRenewBook && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-emerald-900 text-sm">{selectedRenewBook.title}</p>
                      {loadingRenewCopies && <Spinner color="green" />}
                    </div>
                    {renewCopies.length === 0 && !loadingRenewCopies ? <p className="text-sm text-red-600">No copies found</p> : (
                      <div className="space-y-2">
                        {renewCopies.map(copy => (
                          <div key={copy.copy_id}
                            onClick={() => { setSelectedRenewCopy(copy); setRenewCopyCode(copy.copy_code); setRenewCopyCodeValidation(null); }}
                            className={`p-3 rounded-xl cursor-pointer transition border-2 ${selectedRenewCopy?.copy_id === copy.copy_id ? "bg-emerald-100 border-emerald-500" : "bg-white border-gray-200 hover:border-emerald-300"}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-800 text-sm font-mono">{copy.copy_code}</p>
                                <p className={`text-xs ${copy.status === "Available" ? "text-emerald-600" : "text-red-600"}`}>{copy.status}</p>
                                {copy.borrower && <p className="text-xs text-gray-400">Issued to: {copy.borrower.borrower_name}{copy.borrower.due_date && ` · Due: ${new Date(copy.borrower.due_date).toLocaleDateString()}`}</p>}
                              </div>
                              {selectedRenewCopy?.copy_id === copy.copy_id && <Ic d={ICONS.check} className="w-5 h-5 text-emerald-600" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center my-4"><div className="flex-1 border-t border-gray-200" /><span className="px-3 text-xs text-gray-400 font-semibold">OR</span><div className="flex-1 border-t border-gray-200" /></div>

                {/* Barcode input with camera button */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Scan Barcode</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Scan copy barcode..."
                      className={`flex-1 border-2 p-3 rounded-lg focus:outline-none transition ${inputBorder(renewCopyCodeValidation, false, "green")}`}
                      value={renewCopyCode}
                      onChange={e => { setRenewCopyCode(e.target.value); if (e.target.value) { setSelectedRenewBook(null); setSelectedRenewCopy(null); setRenewBookSearch(""); } else setRenewCopyCodeValidation(null); }}
                      onKeyPress={e => handleKeyPress(e, "renew")}
                    />
                    <CameraButton onClick={() => setScannerTarget("renew-copy")} color="green" />
                  </div>
                  <ValidationMsg type={renewCopyCodeValidation?.type} msg={renewCopyCodeValidation?.msg} />
                </div>
              </div>

              <button onClick={() => handleRenew()} disabled={renewLoading}
                className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all ${renewLoading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {renewLoading ? "Processing…" : "Renew Now"}
              </button>
              {(selectedRenewBorrower || selectedRenewBook || renewCopyCode) && (
                <button type="button" onClick={handleClearRenewForm} className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl hover:bg-gray-200 text-sm font-medium transition">Clear Form</button>
              )}
              {renewResult && (
                <div className={`mt-4 p-4 rounded-xl border-2 ${renewResult.error ? "bg-red-50 border-red-300" : renewResult.warning ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-300"}`}>
                  {renewResult.error   && <p className="text-red-700 font-semibold text-sm">{renewResult.error}</p>}
                  {renewResult.success && <p className="text-emerald-800 font-semibold text-sm">✓ {renewResult.message}{renewResult.new_due_date && ` · New due: ${new Date(renewResult.new_due_date).toLocaleDateString()}`}</p>}
                  {renewResult.warning && <ul className="text-amber-700 text-sm list-disc list-inside">{renewResult.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Camera Scanner Modal */}
      {scannerTarget && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setScannerTarget(null)}
        />
      )}
    </div>
  );
}