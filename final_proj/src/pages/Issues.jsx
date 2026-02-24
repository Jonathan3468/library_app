import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const ICONS = {
  fine:     "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bell:     "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  filter:   "M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z",
  chevron:  "M19 9l-7 7-7-7",
  x:        "M6 18L18 6M6 6l12 12",
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  sort:     "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4",
  book:     "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
};

const Spinner = ({ size = 4 }) => (
  <svg className={`animate-spin h-${size} w-${size}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function Issues() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Type filter
  const [filterType, setFilterType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [fineFilter, setFineFilter] = useState(""); // "has_fine" | "no_fine" | ""

  // Borrower search
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [borrowers, setBorrowers] = useState([]);
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [isSearchingBorrower, setIsSearchingBorrower] = useState(false);

  // Book search
  const [bookSearch, setBookSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isSearchingBook, setIsSearchingBook] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState("due_date");
  const [order, setOrder] = useState("ASC");

  // UI state
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [filterType, selectedBorrower, selectedBook, statusFilter, fineFilter, sortBy, order]);

  useEffect(() => { fetchIssues(); }, [page, limit, filterType, selectedBorrower, selectedBook, statusFilter, fineFilter, sortBy, order]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (borrowerSearch.length >= 2) searchBorrowers();
      else { setBorrowers([]); setShowBorrowerDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [borrowerSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (bookSearch.length >= 2) searchBooks();
      else { setBooks([]); setShowBookDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [bookSearch]);

  const searchBorrowers = async () => {
    setIsSearchingBorrower(true);
    try {
      const res = await API.get(`/borrowers/search?q=${borrowerSearch}`);
      setBorrowers(res.data.borrowers || []); setShowBorrowerDropdown(true);
    } catch { setBorrowers([]); } finally { setIsSearchingBorrower(false); }
  };

  const searchBooks = async () => {
    setIsSearchingBook(true);
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(bookSearch)}`);
      setBooks(res.data.results?.books || []); setShowBookDropdown(true);
    } catch { setBooks([]); } finally { setIsSearchingBook(false); }
  };

  const handleSelectBorrower = (b) => {
    setSelectedBorrower(b);
    setBorrowerSearch(`${b.borrower_name} (ID: ${b.borrower_id})`);
    setShowBorrowerDropdown(false); setBorrowers([]);
  };

  const handleSelectBook = (b) => {
    setSelectedBook(b); setBookSearch(b.title);
    setShowBookDropdown(false); setBooks([]);
  };

  const fetchIssues = async () => {
    setLoading(true); setError(null);
    try {
      let endpoint = "/reports";
      const params = { page, limit, sortBy, order };
      if (filterType === "active")        endpoint = "/reports/active";
      else if (filterType === "overdue")  endpoint = "/reports/overdue";
      else {
        if (selectedBorrower) params.borrower_id = selectedBorrower.borrower_id;
        if (selectedBook)     params.book_id     = selectedBook.book_id;
        if (statusFilter)     params.status      = statusFilter;
        if (fineFilter)       params.fine_filter = fineFilter;
      }
      const res = await API.get(endpoint, { params });
      setIssues(Array.isArray(res.data.issues) ? res.data.issues : []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || res.data.issues?.length || 0);
    } catch { setError("Failed to load issues."); setIssues([]); } finally { setLoading(false); }
  };

  const sendNotification = (issueId, e) => {
    e.stopPropagation();
    toast("Send overdue notification?", {
      description: "An email reminder will be sent to the borrower.",
      action: { label: "Send", onClick: async () => { try { await API.post(`/notifications/send-manual/${issueId}`, { type: "overdue" }); } catch { } } },
      cancel: { label: "Cancel" },
    });
  };

  const calculateOverdueFines = () => {
    toast("Calculate fines for all overdue books?", {
      description: "This will update fine amounts based on overdue days.",
      action: { label: "Calculate", onClick: async () => { try { await API.post("/fines/calculate-overdue"); fetchIssues(); } catch { } } },
      cancel: { label: "Cancel" },
    });
  };

  const getStatusLabel = (issue) => {
    if (issue.status === "returned") return { label: "Returned", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (new Date(issue.due_date) < new Date() && issue.status === "issued") return { label: "Overdue", cls: "bg-red-50 text-red-600 border-red-200" };
    return { label: "Active", cls: "bg-blue-50 text-blue-600 border-blue-200" };
  };

  const fmt   = (d) => d ? new Date(d).toLocaleDateString() : "—";
  const daysOverdue = (d) => { const diff = Math.ceil((new Date() - new Date(d)) / 86400000); return diff > 0 ? diff : 0; };

  // Sort helpers
  const toggleSort = (field) => {
    if (sortBy === field) setOrder(o => o === "ASC" ? "DESC" : "ASC");
    else { setSortBy(field); setOrder("ASC"); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <Ic d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" className="w-3 h-3 text-gray-300" />;
    return <Ic d={order === "ASC" ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"} className="w-3 h-3 text-blue-500" />;
  };

  const activeFilterCount = (selectedBorrower ? 1 : 0) + (selectedBook ? 1 : 0) + (statusFilter ? 1 : 0) + (fineFilter ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedBorrower(null); setBorrowerSearch("");
    setSelectedBook(null);     setBookSearch("");
    setStatusFilter("");
    setFineFilter("");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Issue Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {loading ? "Loading..." : `${totalCount || issues.length} records`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={calculateOverdueFines}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-violet-300 hover:text-violet-700 text-sm font-medium transition"
            >
              <Ic d={ICONS.fine} />
              Calculate Fines
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition"
            >
              <Ic d={ICONS.bell} />
              Notifications
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="underline">Dismiss</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-3 items-center">

          {/* Type tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            {[["all","All"], ["active","Active"], ["overdue","Overdue"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterType(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterType === val
                    ? val === "overdue" ? "bg-red-500 text-white shadow-sm"
                      : val === "active" ? "bg-blue-500 text-white shadow-sm"
                      : "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Ic d={ICONS.sort} className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-blue-300"
            >
              <option value="due_date">Due Date</option>
              <option value="check_out">Issue Date</option>
              <option value="check_in">Return Date</option>
            </select>
            <button
              onClick={() => setOrder(o => o === "ASC" ? "DESC" : "ASC")}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition"
            >
              {order === "ASC" ? "↑ Asc" : "↓ Desc"}
            </button>

            {/* Per-page */}
            <select
              value={limit}
              onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
              className="border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-blue-300"
            >
              {[5,10,20,50].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>

            {/* Filters toggle — always shown */}
            <button
              onClick={() => setFiltersOpen(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                filtersOpen || activeFilterCount > 0
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Ic d={ICONS.filter} className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
              <Ic d={ICONS.chevron} className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Collapsible filter panel ── */}
        {filtersOpen && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Borrower */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Borrower</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search borrower..."
                    value={borrowerSearch}
                    onChange={e => { setBorrowerSearch(e.target.value); if (selectedBorrower) setSelectedBorrower(null); }}
                    onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                    className="w-full border border-gray-200 px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoComplete="off"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {isSearchingBorrower ? <Spinner size={3} /> : selectedBorrower ? (
                      <button onClick={() => { setSelectedBorrower(null); setBorrowerSearch(""); }} className="text-gray-300 hover:text-red-400">
                        <Ic d={ICONS.x} className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                {showBorrowerDropdown && borrowers.length > 0 && !selectedBorrower && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {borrowers.map(b => (
                      <div key={b.borrower_id} onClick={() => handleSelectBorrower(b)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <p className="text-sm font-semibold text-gray-800">{b.borrower_name}</p>
                        <p className="text-xs text-gray-400">ID: {b.borrower_id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Book</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search book..."
                    value={bookSearch}
                    onChange={e => { setBookSearch(e.target.value); if (selectedBook) setSelectedBook(null); }}
                    onFocus={() => books.length > 0 && setShowBookDropdown(true)}
                    className="w-full border border-gray-200 px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoComplete="off"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {isSearchingBook ? <Spinner size={3} /> : selectedBook ? (
                      <button onClick={() => { setSelectedBook(null); setBookSearch(""); }} className="text-gray-300 hover:text-red-400">
                        <Ic d={ICONS.x} className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                {showBookDropdown && books.length > 0 && !selectedBook && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                    {books.map(b => (
                      <div key={b.book_id} onClick={() => handleSelectBook(b)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <p className="text-sm font-semibold text-gray-800">{b.title}</p>
                        <p className="text-xs text-gray-400">ISBN: {b.isbn}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Return Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {[["","All"], ["issued","Issued"], ["returned","Returned"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setStatusFilter(val)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        statusFilter === val
                          ? val === "issued"   ? "bg-blue-100 border-blue-300 text-blue-700"
                            : val === "returned" ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                            : "bg-gray-200 border-gray-300 text-gray-700"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fine</label>
                <div className="flex flex-wrap gap-1.5">
                  {[["","All"], ["has_fine","Has Fine"], ["no_fine","No Fine"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setFineFilter(val)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        fineFilter === val
                          ? val === "has_fine" ? "bg-red-100 border-red-300 text-red-700"
                            : val === "no_fine"  ? "bg-gray-200 border-gray-300 text-gray-700"
                            : "bg-gray-200 border-gray-300 text-gray-700"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active chips + clear */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400">Active:</span>
                {selectedBorrower && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs">
                    👤 {selectedBorrower.borrower_name}
                    <button onClick={() => { setSelectedBorrower(null); setBorrowerSearch(""); }} className="hover:text-red-500">×</button>
                  </span>
                )}
                {selectedBook && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs">
                    📚 {selectedBook.title}
                    <button onClick={() => { setSelectedBook(null); setBookSearch(""); }} className="hover:text-red-500">×</button>
                  </span>
                )}
                {statusFilter && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs capitalize">
                    {statusFilter}
                    <button onClick={() => setStatusFilter("")} className="hover:text-red-500">×</button>
                  </span>
                )}
                {fineFilter && (
                  <span className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs">
                    {fineFilter === "has_fine" ? "Has fine" : "No fine"}
                    <button onClick={() => setFineFilter("")} className="hover:text-red-500">×</button>
                  </span>
                )}
                <button onClick={clearAllFilters} className="ml-auto text-xs text-red-500 hover:text-red-700">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <Spinner size={4} /> Loading...
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <Ic d={ICONS.book} className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">
              {activeFilterCount > 0 || filterType !== "all" ? "No issues match your filters" : "No issues found"}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="mt-2 text-xs text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Book</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Authors</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Copy</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Borrower</th>

                    {/* Sortable date columns */}
                    {[
                      { label: "Issue Date", field: "check_out" },
                      { label: "Due Date",   field: "due_date"  },
                      { label: "Returned",   field: "check_in"  },
                    ].map(col => (
                      <th
                        key={col.field}
                        onClick={() => toggleSort(col.field)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          <SortIcon field={col.field} />
                        </div>
                      </th>
                    ))}

                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {issues.map(issue => {
                    const { label, cls } = getStatusLabel(issue);
                    const isOverdue = issue.status === "issued" && new Date(issue.due_date) < new Date();
                    return (
                      <tr key={issue.issue_id} className="hover:bg-gray-50 transition-colors">

                        {/* Book */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 text-xs line-clamp-1">{issue.Copy?.Book?.title || "—"}</p>
                          <p className="text-xs text-gray-400 font-mono">{issue.Copy?.Book?.isbn}</p>
                        </td>

                        {/* Authors */}
                        <td className="px-4 py-3.5 text-xs text-gray-500 max-w-[120px] truncate">
                          {issue.Copy?.Book?.Authors?.map(a => a.author_name).join(", ") || "—"}
                        </td>

                        {/* Copy */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                            {issue.Copy?.copy_code || "—"}
                          </span>
                        </td>

                        {/* Borrower */}
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 text-xs">{issue.Borrower?.borrower_name || "—"}</p>
                          <p className="text-xs text-gray-400">#{issue.borrower_id}</p>
                        </td>

                        {/* Issue Date */}
                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmt(issue.check_out)}</td>

                        {/* Due Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-gray-600">{fmt(issue.due_date)}</p>
                          {isOverdue && (
                            <p className="text-xs text-red-500 font-semibold">{daysOverdue(issue.due_date)}d overdue</p>
                          )}
                        </td>

                        {/* Return */}
                        <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmt(issue.check_in)}</td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
                            {label}
                          </span>
                          {issue.fine > 0 && (
                            <p className="text-xs text-red-500 font-semibold mt-0.5">₹{issue.fine}</p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/reports/${issue.issue_id}`)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View
                            </button>
                            {isOverdue && (
                              <button
                                onClick={e => sendNotification(issue.issue_id, e)}
                                className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                              >
                                Notify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Page {page} of {totalPages} · {totalCount || issues.length} total records
            </div>
          </div>
        )}

        {/* ── Pagination ── */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← Prev
            </button>
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                    page === p
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Next →
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition"
            >
              »
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}