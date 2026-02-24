import React, { useState, useEffect, useCallback } from "react";
import API from "../services/api";

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const ICONS = {
  search:  "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  filter:  "M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z",
  x:       "M6 18L18 6M6 6l12 12",
  chevron: "M19 9l-7 7-7-7",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  shield:  "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  user:    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  download:"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
};

const ACTION_META = {
  BOOK_ISSUED:          { label: "Issued",              dot: "bg-blue-500",    pill: "bg-blue-50 text-blue-700 border-blue-200"          },
  BOOK_RETURNED:        { label: "Returned",             dot: "bg-slate-400",   pill: "bg-slate-50 text-slate-700 border-slate-200"       },
  BOOK_RENEWED:         { label: "Renewed",              dot: "bg-cyan-500",    pill: "bg-cyan-50 text-cyan-700 border-cyan-200"           },
  RENEWAL_APPROVED:     { label: "Renewal Approved",     dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200"  },
  RENEWAL_DENIED:       { label: "Renewal Denied",       dot: "bg-red-400",     pill: "bg-red-50 text-red-700 border-red-200"             },
  FINE_PAID:            { label: "Fine Paid",            dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200"  },
  FINE_WAIVED:          { label: "Fine Waived",          dot: "bg-violet-500",  pill: "bg-violet-50 text-violet-700 border-violet-200"    },
  FINE_CUSTOM_CREATED:  { label: "Custom Fine",          dot: "bg-orange-500",  pill: "bg-orange-50 text-orange-700 border-orange-200"    },
  REPLACEMENT_FINE:     { label: "Replacement Fine",     dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200"             },
  COPY_ADDED:           { label: "Copy Added",           dot: "bg-teal-500",    pill: "bg-teal-50 text-teal-700 border-teal-200"          },
  COPY_DELETED:         { label: "Copy Deleted",         dot: "bg-red-400",     pill: "bg-red-50 text-red-600 border-red-200"             },
  COPY_MARKED_LOST:     { label: "Marked Lost",          dot: "bg-red-600",     pill: "bg-red-50 text-red-800 border-red-300"             },
  COPY_RESTORED:        { label: "Copy Restored",        dot: "bg-emerald-400", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BORROWER_CREATED:     { label: "Borrower Created",     dot: "bg-blue-400",    pill: "bg-blue-50 text-blue-700 border-blue-200"          },
  BORROWER_UPDATED:     { label: "Borrower Updated",     dot: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 border-amber-200"       },
  BORROWER_DELETED:     { label: "Borrower Deleted",     dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200"             },
  MEMBERSHIP_RENEWED:   { label: "Membership Renewed",   dot: "bg-indigo-500",  pill: "bg-indigo-50 text-indigo-700 border-indigo-200"    },
  CSV_IMPORT:           { label: "CSV Import",           dot: "bg-emerald-600", pill: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  USER_CREATED:         { label: "User Created",         dot: "bg-sky-500",     pill: "bg-sky-50 text-sky-700 border-sky-200"             },
  USER_ROLE_CHANGED:    { label: "Role Changed",         dot: "bg-purple-500",  pill: "bg-purple-50 text-purple-700 border-purple-200"    },
  USER_DELETED:         { label: "User Deleted",         dot: "bg-red-500",     pill: "bg-red-50 text-red-700 border-red-200"             },
  LOGIN:                { label: "Login",                dot: "bg-gray-400",    pill: "bg-gray-50 text-gray-600 border-gray-200"          },
  PASSWORD_RESET:       { label: "Password Reset",       dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200"       },
  ACCOUNT_CREATED_FOR_BORROWER: { label: "Account Created", dot: "bg-sky-400", pill: "bg-sky-50 text-sky-700 border-sky-200"             },
};

const getActionMeta = (action) =>
  ACTION_META[action] || { label: action, dot: "bg-gray-400", pill: "bg-gray-50 text-gray-600 border-gray-200" };

const TARGET_LABELS = {
  ISSUE: "Issue", BORROWER: "Borrower", COPY: "Copy", FINE: "Fine", USER: "User",
};

function DetailCell({ details }) {
  const parsed = typeof details === "string" ? (() => { try { return JSON.parse(details); } catch { return null; } })() : details;
  if (!parsed) return <span className="text-gray-300">—</span>;
  const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span className="text-gray-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => {
        const val = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (val === "undefined") return null;
        const display = val.length > 60 ? val.slice(0, 57) + "…" : val;
        return (
          <span key={k} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[11px]">
            <span className="text-gray-400">{k.replace(/_/g, " ")}</span>
            <span className="font-medium text-gray-700">
              {val === "true" ? "✓" : val === "false" ? "✗" : display}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function AuditLog() {
  const [logs, setLogs]           = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading]     = useState(true);
  const [actions, setActions]     = useState([]);

  const [search, setSearch]               = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [filtersOpen, setFiltersOpen]     = useState(false);
  const [page, setPage]                   = useState(1);
  const [expandedRow, setExpandedRow]     = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 50 });
      if (search)         params.set("search", search);
      if (selectedAction) params.set("action", selectedAction);
      if (selectedTarget) params.set("target_type", selectedTarget);
      if (dateFrom)       params.set("date_from", dateFrom);
      if (dateTo)         params.set("date_to", dateTo);

      const res = await API.get(`/audit-logs?${params}`);
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 });
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedAction, selectedTarget, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    API.get("/audit-logs/actions")
      .then(r => setActions(r.data.actions || []))
      .catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearch(""); setSelectedAction(""); setSelectedTarget("");
    setDateFrom(""); setDateTo(""); setPage(1);
  };

  const hasFilters = search || selectedAction || selectedTarget || dateFrom || dateTo;

  const exportCSV = () => {
    const headers = ["Time", "Action", "Performed By", "Target Type", "Target ID", "Details", "IP"];
    const rows = logs.map(l => [
      formatDate(l.createdAt), l.action, l.performed_by_name,
      l.target_type || "", l.target_id || "",
      l.details ? JSON.stringify(l.details) : "", l.ip_address || "",
    ]);
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              <Ic d={ICONS.shield} className="w-5 h-5 text-slate-200" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Audit Log</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {pagination.total.toLocaleString()} events recorded
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition">
              <Ic d={ICONS.refresh} className="w-3.5 h-3.5" />
              Refresh
            </button>
            {logs.length > 0 && (
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition">
                <Ic d={ICONS.download} className="w-3.5 h-3.5" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Ic d={ICONS.search} className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, action, target ID..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <Ic d={ICONS.x} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedAction}
            onChange={e => { setSelectedAction(e.target.value); setPage(1); }}
            className="border border-gray-200 px-3 py-2 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-slate-300 min-w-[160px]"
          >
            <option value="">All actions</option>
            {(actions.length > 0 ? actions : Object.keys(ACTION_META)).map(a => (
              <option key={a} value={a}>{getActionMeta(a).label}</option>
            ))}
          </select>

          <button
            onClick={() => setFiltersOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${
              filtersOpen || (selectedTarget || dateFrom || dateTo)
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <Ic d={ICONS.filter} className="w-3.5 h-3.5" />
            More filters
            <Ic d={ICONS.chevron} className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
              Clear all
            </button>
          )}
        </div>

        {/* Extended filters */}
        {filtersOpen && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Type</label>
              <div className="flex flex-wrap gap-1.5">
                {["", ...Object.keys(TARGET_LABELS)].map(t => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTarget(t); setPage(1); }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      selectedTarget === t
                        ? "bg-slate-800 border-slate-800 text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t ? TARGET_LABELS[t] : "All"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading audit log...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <Ic d={ICONS.shield} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-semibold">No log entries found</p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Performed By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((entry, i) => {
                      const meta       = getActionMeta(entry.action);
                      const isExpanded = expandedRow === entry.id;
                      return (
                        <React.Fragment key={entry.id}>
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                            className={`border-b border-gray-50 cursor-pointer transition-colors ${
                              isExpanded ? "bg-slate-50" : i % 2 === 0 ? "hover:bg-gray-50" : "bg-gray-50/30 hover:bg-gray-50"
                            }`}
                          >
                            {/* Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-xs font-mono text-gray-600">
                                {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              </p>
                              <p className="text-[11px] text-gray-400 font-mono">
                                {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                              </p>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.pill}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </td>

                            {/* Performer */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {entry.performed_by_name?.[0]?.toUpperCase() || "S"}
                                </div>
                                <span className="text-xs text-gray-700 font-medium">{entry.performed_by_name}</span>
                              </div>
                            </td>

                            {/* Target */}
                            <td className="px-4 py-3">
                              {entry.target_type ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-400">{TARGET_LABELS[entry.target_type] || entry.target_type}</span>
                                  {entry.target_id && (
                                    <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                      {entry.target_id}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>

                            {/* Details (compact) */}
                            <td className="px-4 py-3 max-w-xs">
                              <DetailCell details={entry.details} />
                            </td>

                            {/* IP */}
                            <td className="px-4 py-3">
                              <span className="font-mono text-[11px] text-gray-400">{entry.ip_address || "—"}</span>
                            </td>
                          </tr>

                         {isExpanded && (
  <tr className="bg-slate-50 border-b border-slate-100">
    <td colSpan={6} className="px-6 py-4">
      <div className="flex items-start gap-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Full Timestamp</p>
          <p className="text-xs font-mono text-gray-700">{formatDate(entry.createdAt)}</p>
        </div>
        {(() => {
          const parsed = typeof entry.details === "string"
            ? (() => { try { return JSON.parse(entry.details); } catch { return null; } })()
            : entry.details;
          return parsed && Object.keys(parsed).length > 0 ? (
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">All Details</p>
              <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                {Object.entries(parsed).map(([k, v]) => v != null && (
                  <div key={k}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{k.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-800 font-medium break-all">
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </td>
  </tr>
)}
                    
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} events
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="px-2.5 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1.5 text-gray-600 font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-2.5 py-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {logs.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Click any row to expand full details
          </p>
        )}
      </div>
    </div>
  );
}