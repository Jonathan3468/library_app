import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";
import { getCurrentUser, getUserRole, getBorrowerId } from "../utils/auth";

const PREVIEW_LIMIT = 3;

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const ICONS = {
  back:    "M10 19l-7-7m0 0l7-7m-7 7h18",
  edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  renew:   "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  trash:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  chevron: "M19 9l-7 7-7-7",
  book:    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  inbox:   "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  fine:    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  check:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  clock:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  warn:    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  return:  "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  filter:  "M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z",
};

function Section({ title, count, icon, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll]   = useState(false);

  const hasMore = Array.isArray(children) && children.length > PREVIEW_LIMIT;
  const visible = showAll ? children : (Array.isArray(children) ? children.slice(0, PREVIEW_LIMIT) : children);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Ic d={ICONS[icon]} className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{count}</span>
          )}
        </div>
        <Ic d={ICONS.chevron} className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`} />
      </button>
      {expanded && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-4 space-y-2">{visible}</div>
          {hasMore && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full px-5 py-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-t border-gray-100 transition-colors text-center"
            >
              {showAll ? "Show less" : `Show ${children.length - PREVIEW_LIMIT} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RenewalBadge({ status }) {
  const cfg = {
    pending:  { bg: "bg-amber-50 border-amber-200 text-amber-700",       label: "Renewal Pending"  },
    approved: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Renewal Approved" },
    denied:   { bg: "bg-red-50 border-red-200 text-red-600",             label: "Renewal Denied"   },
  }[status] || {};

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bg}`}>
      <Ic d={ICONS.renew} className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ borrowerId }) {
  const [issues, setIssues]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all"); // "all" | "returned" | "active"
  const [pagination, setPagination] = useState(null);
  const [page, setPage]             = useState(1);

  const fetchHistory = useCallback(async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const res = await API.get(`/borrowers/${borrowerId}/issues`, {
        params: { page: p, limit: 20, filter: f },
      });
      setIssues(res.data.issues || []);
      setPagination(res.data.pagination);
    } catch {
      toast.error("Failed to load reading history");
    } finally {
      setLoading(false);
    }
  }, [borrowerId, filter]);

  useEffect(() => { fetchHistory(1, filter); }, [filter]);

  const handleFilter = (f) => { setFilter(f); setPage(1); };
  const handlePage   = (p) => { setPage(p); fetchHistory(p, filter); };

  const FILTERS = [
    { val: "all",      label: "All"      },
    { val: "returned", label: "Returned" },
    { val: "active",   label: "Active"   },
  ];

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <Ic d={ICONS.filter} className="w-3.5 h-3.5 text-gray-400" />
        {FILTERS.map(f => (
          <button
            key={f.val}
            onClick={() => handleFilter(f.val)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              filter === f.val
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-gray-400 text-sm gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading history…
        </div>
      ) : issues.length === 0 ? (
        <div className="py-12 text-center">
          <Ic d={ICONS.history} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No issue history found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {issues.map(issue => {
              const returned  = !!issue.check_in;
              const overdue   = issue.was_overdue;
              const hasFine   = issue.fine > 0;

              return (
                <div key={issue.issue_id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    {/* Book info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{issue.book_title}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{issue.copy_code}</p>

                      {/* Dates */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Ic d={ICONS.book} className="w-3 h-3 text-gray-400" />
                          Borrowed {new Date(issue.check_out).toLocaleDateString()}
                        </span>
                        {returned ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Ic d={ICONS.return} className="w-3 h-3" />
                            Returned {new Date(issue.check_in).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-semibold" : "text-blue-600"}`}>
                            <Ic d={ICONS.clock} className="w-3 h-3" />
                            Due {new Date(issue.due_date).toLocaleDateString()}
                            {overdue && " · Overdue"}
                          </span>
                        )}
                        {issue.days_kept !== null && (
                          <span className="text-gray-400">
                            {issue.days_kept} day{issue.days_kept !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: status + fine */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Status badge */}
                      {returned ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                          Returned
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          overdue
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}>
                          {overdue ? "Overdue" : "Active"}
                        </span>
                      )}

                      {/* Fine badge */}
                      {hasFine && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          issue.fine_paid
                            ? "bg-gray-50 border-gray-200 text-gray-500"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}>
                          ₹{issue.fine} {issue.fine_paid ? "paid" : "fine"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                Showing {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Request History Tab ───────────────────────────────────────────────────────
function RequestHistoryTab({ requests, requestsLoading, onCancel, cancellingIds, canEdit, isOwnData }) {
  const [filter, setFilter] = useState("all");

  const reqBadge = (status) => ({
    pending:   "bg-amber-50 text-amber-700 border-amber-200",
    fulfilled: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
    expired:   "bg-gray-100 text-gray-500 border-gray-200",
  }[status] || "bg-gray-100 text-gray-500 border-gray-200");

  const FILTERS = ["all", "pending", "fulfilled", "cancelled", "expired"];

  const filtered = filter === "all"
    ? requests
    : requests.filter(r => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Ic d={ICONS.filter} className="w-3.5 h-3.5 text-gray-400" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border capitalize transition ${
              filter === f
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {requestsLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading requests…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Ic d={ICONS.inbox} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <div key={req.request_id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${reqBadge(req.status)}`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-gray-300">#{req.request_id}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{req.Copy?.Book?.title}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{req.Copy?.copy_code}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requested {new Date(req.request_date).toLocaleDateString()}
                  </p>
                </div>
                {req.status === "pending" && (canEdit || isOwnData) && (
                  <button
                    onClick={() => onCancel(req.request_id)}
                    disabled={cancellingIds.has(req.request_id)}
                    className="shrink-0 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition disabled:opacity-40"
                  >
                    {cancellingIds.has(req.request_id) ? "…" : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BorrowerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const userRole       = getUserRole();
  const userBorrowerId = getBorrowerId();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ borrower_name: "", email: "", phone: "", address: "", rf_id: "" });

  const [fines, setFines]                     = useState([]);
  const [finesLoading, setFinesLoading]       = useState(false);
  const [requests, setRequests]               = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [cancellingIds, setCancellingIds]     = useState(new Set());

  const [renewalMap, setRenewalMap]               = useState({});
  const [renewalLoading, setRenewalLoading]       = useState(false);
  const [requestingRenewal, setRequestingRenewal] = useState(new Set());

  // Tab state — "overview" | "history" | "requests"
  const [activeTab, setActiveTab] = useState("overview");

  const isOwnData = userBorrowerId && userBorrowerId.toString() === id;
  const canEdit   = ["admin", "librarian"].includes(userRole);
  const isMember  = userRole === "member";

  useEffect(() => {
    fetchBorrowerDetails();
    fetchBorrowerFines();
    fetchBorrowerRequests();
    if (isOwnData || canEdit) fetchRenewalRequests();
  }, [id]);

  const fetchBorrowerDetails = async () => {
    try {
      const res = await API.get(`/borrowers/${id}`);
      setData(res.data);
      setEditForm({
        borrower_name: res.data.borrower.borrower_name,
        email:   res.data.borrower.email   || "",
        phone:   res.data.borrower.phone   || "",
        address: res.data.borrower.address || "",
        rf_id:   res.data.borrower.rf_id   || "",
      });
    } catch { setError("Failed to load borrower details"); }
    finally  { setLoading(false); }
  };

  const fetchBorrowerFines = async () => {
    setFinesLoading(true);
    try {
      const res = await API.get(`/borrowers/${id}/fines`);
      setFines(res.data.fines || []);
    } catch { } finally { setFinesLoading(false); }
  };

  const fetchBorrowerRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await API.get(`/requests`, { params: { borrower_id: id } });
      setRequests(res.data.requests || []);
    } catch { } finally { setRequestsLoading(false); }
  };

  const fetchRenewalRequests = async () => {
    setRenewalLoading(true);
    try {
      const endpoint = isOwnData ? "/renewal-requests/my" : `/renewal-requests?borrower_id=${id}`;
      const res = await API.get(endpoint);
      const map = {};
      (res.data.requests || []).forEach(r => {
        if (!map[r.issue_id] || new Date(r.createdAt) > new Date(map[r.issue_id].createdAt)) {
          map[r.issue_id] = r;
        }
      });
      setRenewalMap(map);
    } catch { } finally { setRenewalLoading(false); }
  };

  const handleRequestRenewal = async (issueId) => {
    setRequestingRenewal(prev => new Set(prev).add(issueId));
    try {
      await API.post("/renewal-requests", { issue_id: issueId });
      toast.success("Renewal request submitted — the librarian will review it shortly.");
      fetchRenewalRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit renewal request");
    } finally {
      setRequestingRenewal(prev => { const s = new Set(prev); s.delete(issueId); return s; });
    }
  };

  const handleCancelRequest = async (requestId) => {
    setCancellingIds(prev => new Set(prev).add(requestId));
    try {
      await API.delete(`/requests/${requestId}`);
      toast.success("Request cancelled");
      fetchBorrowerRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel");
    } finally {
      setCancellingIds(prev => { const s = new Set(prev); s.delete(requestId); return s; });
    }
  };

  const handleUpdateBorrower = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/borrowers/${id}`, editForm);
      toast.success("Updated successfully!");
      setShowEditModal(false);
      fetchBorrowerDetails();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
  };

  const handleDelete = async () => {
  toast(`Delete ${data.borrower.borrower_name}?`, {
    description: "This action cannot be undone.",
    action: {
      label: "Delete",
      onClick: async () => {
        try {
          await API.delete(`/borrowers/${id}`);
          toast.success("Borrower deleted successfully");
          navigate("/borrowers");
        } catch (err) {
          toast.error(err.response?.data?.error || "Failed to delete");
        }
      },
    },
    cancel: {
      label: "Cancel",
    },
  });
};

  const handleRenewMembership = async () => {
  toast(`Renew membership for ${data.borrower.borrower_name}?`, {
    description: "This will extend their membership by 1 year.",
    action: {
      label: "Renew",
      onClick: async () => {
        try {
          const res = await API.put(`/borrowers/renew/${id}`);
          toast.success(`Renewed · Expiry: ${new Date(res.data.new_expiry_date).toLocaleDateString()}`);
          fetchBorrowerDetails();
        } catch (err) {
          toast.error(err.response?.data?.error || "Failed to renew");
        }
      },
    },
    cancel: {
      label: "Cancel",
    },
  });
};

  const isExpired = (date) => new Date(date) < new Date();

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500 text-sm">{error}</div>;
  if (!data)   return <div className="p-8 text-gray-400 text-sm">Not found</div>;

  const { borrower, active_issues, outstanding_fines, total_borrowed } = data;

  // ── Issue rows (for overview) ─────────────────────────────────────────────
  const issueRows = active_issues.map(issue => {
    const renewal    = renewalMap[issue.issue_id];
    const overdue    = isExpired(issue.due_date);
    const canRequest = isOwnData &&
      (!renewal || renewal.status === "denied") &&
      !requestingRenewal.has(issue.issue_id);

    return (
      <div key={issue.issue_id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{issue.Copy?.Book?.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{issue.Copy?.copy_code}</p>
          <p className="text-xs text-gray-400">Issued {new Date(issue.check_out).toLocaleDateString()}</p>
          {renewal && (
            <div className="mt-1.5">
              <RenewalBadge status={renewal.status} />
              {renewal.status === "approved" && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  New due date: {new Date(issue.due_date).toLocaleDateString()}
                </p>
              )}
              {renewal.status === "denied" && renewal.notes && (
                <p className="text-xs text-red-500 mt-0.5">Note: {renewal.notes}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <p className={`text-xs font-semibold ${overdue ? "text-red-600" : "text-emerald-600"}`}>
            Due {new Date(issue.due_date).toLocaleDateString()}
          </p>
          {overdue && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <Ic d={ICONS.warn} className="w-3 h-3" /> Overdue
            </span>
          )}
          {isOwnData && (
            <>
              {renewal?.status === "pending" ? (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <Ic d={ICONS.clock} className="w-3 h-3" /> Awaiting review
                </span>
              ) : canRequest ? (
                <button
                  onClick={() => handleRequestRenewal(issue.issue_id)}
                  disabled={requestingRenewal.has(issue.issue_id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <Ic d={ICONS.renew} className="w-3 h-3" />
                  {requestingRenewal.has(issue.issue_id) ? "Requesting…" : "Request Renewal"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  });

  // ── Fine rows ─────────────────────────────────────────────────────────────
  const fineRows = fines.map(fine => (
    <div
      key={fine.issue_id || fine.payment_id}
      onClick={() => {
        if (canEdit) {
          fine.type === "custom_fine"
            ? navigate(`/fines/custom/${fine.payment_id}`)
            : navigate(`/fines/${fine.issue_id}`);
        }
      }}
      className={`flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0 ${canEdit ? "cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{fine.book_title || fine.reason}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {fine.type === "custom_fine" ? "Custom fine" : "Late return"}
          {fine.due_date && ` · Due ${new Date(fine.due_date).toLocaleDateString()}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-red-600">₹{fine.fine || fine.amount}</p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          fine.status === "paid"   ? "bg-green-100 text-green-700" :
          fine.status === "waived" ? "bg-yellow-100 text-yellow-700" :
                                     "bg-red-100 text-red-700"
        }`}>
          {fine.status === "paid" ? "Paid" : fine.status === "waived" ? "Waived" : "Pending"}
        </span>
      </div>
    </div>
  ));

  const isMembershipExpired = borrower.membership_expiry && isExpired(borrower.membership_expiry);

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview",  label: "Overview",         icon: ICONS.book    },
    { id: "history",   label: "Reading History",  icon: ICONS.history },
    { id: "requests",  label: "Requests",         icon: ICONS.inbox,
      badge: requests.filter(r => r.status === "pending").length || null },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(canEdit ? "/borrowers" : "/dashboard")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Ic d={ICONS.back} className="w-4 h-4" />
              Back
            </button>
            <span className="text-gray-300">/</span>
            <h2 className="text-lg font-bold text-gray-800">
              {isOwnData && isMember ? "My Profile" : borrower.borrower_name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(canEdit || isOwnData) && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition"
              >
                <Ic d={ICONS.edit} className="w-4 h-4" />
                Edit
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={handleRenewMembership}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                >
                  <Ic d={ICONS.renew} className="w-4 h-4" />
                  Renew
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                >
                  <Ic d={ICONS.trash} className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Profile card ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {borrower.borrower_name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{borrower.borrower_name}</p>
                  <p className="text-xs text-gray-400">ID #{borrower.borrower_id}</p>
                </div>
              </div>
              <div className="space-y-3">
                {borrower.rf_id && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">RF ID</p>
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                      {borrower.rf_id}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <p className="text-sm font-medium text-gray-700">{borrower.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-gray-700">{borrower.phone || "—"}</p>
                </div>
                {(canEdit || isOwnData) && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Address</p>
                    <p className="text-sm font-medium text-gray-700">{borrower.address || "—"}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Membership Expiry</p>
                  <p className={`text-sm font-medium ${isMembershipExpired ? "text-red-600" : "text-gray-700"}`}>
                    {borrower.membership_expiry
                      ? new Date(borrower.membership_expiry).toLocaleDateString()
                      : "—"}
                    {isMembershipExpired && " · Expired"}
                  </p>
                </div>
              </div>
            </div>

            {/* Fines summary */}
            <div className={`rounded-xl border p-5 ${outstanding_fines > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Ic d={ICONS.fine} className={`w-4 h-4 ${outstanding_fines > 0 ? "text-red-500" : "text-emerald-500"}`} />
                <p className="text-xs font-semibold text-gray-600">Outstanding Fines</p>
              </div>
              <p className={`text-3xl font-bold ${outstanding_fines > 0 ? "text-red-600" : "text-emerald-600"}`}>
                ₹{outstanding_fines}
              </p>
              {outstanding_fines > 0 && canEdit && (
                <button onClick={() => navigate("/fines")} className="mt-2 text-xs text-red-600 hover:underline">
                  Manage fines →
                </button>
              )}
            </div>

            {/* Quick stats — now includes total_borrowed */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Books Read",   value: total_borrowed || 0,   icon: ICONS.book,    color: "text-indigo-600" },
                { label: "Active Now",   value: active_issues.length,  icon: ICONS.clock,   color: "text-blue-600"   },
                { label: "Requests",     value: requests.length,       icon: ICONS.inbox,   color: "text-amber-600"  },
                { label: "Fines",        value: fines.length,          icon: ICONS.fine,    color: "text-red-500"    },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                  <svg className={`w-4 h-4 ${s.color} mx-auto mb-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={s.icon} />
                  </svg>
                  <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Renewal info tip */}
            {isOwnData && active_issues.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <div className="flex gap-2.5 items-start">
                  <Ic d={ICONS.renew} className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Need more time? Use <strong>Request Renewal</strong> on any active issue and a librarian will extend your due date.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Tabs ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Tab bar — only show for members viewing own data, or librarians */}
            <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={tab.icon} />
                  </svg>
                  {tab.label}
                  {tab.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === tab.id ? "bg-white/30 text-white" : "bg-amber-500 text-white"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Overview tab ── */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {active_issues.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
                    <Ic d={ICONS.book} className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No active issues</p>
                  </div>
                ) : (
                  <Section
                    title={isOwnData ? "My Active Issues" : "Active Issues"}
                    count={active_issues.length}
                    icon="book"
                  >
                    {issueRows}
                  </Section>
                )}

                {finesLoading ? (
                  <div className="bg-white rounded-xl border border-gray-200 px-5 py-6 text-center text-sm text-gray-400">Loading fines…</div>
                ) : fines.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 px-5 py-8 text-center">
                    <Ic d={ICONS.check} className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No fines</p>
                  </div>
                ) : (
                  <Section title={isOwnData ? "My Fines" : "Fines"} count={fines.length} icon="fine">
                    {fineRows}
                  </Section>
                )}
              </div>
            )}

            {/* ── Reading History tab ── */}
            {activeTab === "history" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <Ic d={ICONS.history} className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800">Reading History</h3>
                  {total_borrowed > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      {total_borrowed} total
                    </span>
                  )}
                </div>
                <HistoryTab borrowerId={id} />
              </div>
            )}

            {/* ── Requests tab ── */}
            {activeTab === "requests" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <Ic d={ICONS.inbox} className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800">
                    {isOwnData ? "My Requests" : "Requests"}
                  </h3>
                  {requests.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      {requests.length}
                    </span>
                  )}
                </div>
                <RequestHistoryTab
                  requests={requests}
                  requestsLoading={requestsLoading}
                  onCancel={handleCancelRequest}
                  cancellingIds={cancellingIds}
                  canEdit={canEdit}
                  isOwnData={isOwnData}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (canEdit || isOwnData) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">
                {isOwnData && !canEdit ? "Edit My Info" : "Edit Borrower"}
              </h3>
            </div>
            <form onSubmit={handleUpdateBorrower} className="px-6 py-5 space-y-4">
              {canEdit && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name <span className="text-red-400">*</span></label>
                    <input type="text" value={editForm.borrower_name} onChange={e => setEditForm({ ...editForm, borrower_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">RF ID</label>
                    <input type="text" value={editForm.rf_id} onChange={e => setEditForm({ ...editForm, rf_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Scan or enter RF ID" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
                <textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">Save</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}