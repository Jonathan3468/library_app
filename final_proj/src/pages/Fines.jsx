import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function Fines() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("outstanding");
  const [fines, setFines] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom fine modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFine, setCustomFine] = useState({
    borrower_id: "", amount: "", reason: "", payment_method: "cash",
    mark_as_paid: false, link_to_copy: false, copy_code: ""
  });

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFineForPayment, setSelectedFineForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Recalculate modal
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);

  // Borrower search
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [borrowers, setBorrowers] = useState([]);
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Book & Copy search (for custom fine modal)
  const [customFineBookSearch, setCustomFineBookSearch] = useState("");
  const [customFineBooks, setCustomFineBooks] = useState([]);
  const [showCustomFineBookDropdown, setShowCustomFineBookDropdown] = useState(false);
  const [selectedCustomFineBook, setSelectedCustomFineBook] = useState(null);
  const [isSearchingCustomFineBook, setIsSearchingCustomFineBook] = useState(false);
  const [customFineCopies, setCustomFineCopies] = useState([]);
  const [selectedCustomFineCopy, setSelectedCustomFineCopy] = useState(null);
  const [loadingCustomFineCopies, setLoadingCustomFineCopies] = useState(false);

  // History filtering
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySortBy, setHistorySortBy] = useState("date");
  const [historySortOrder, setHistorySortOrder] = useState("desc");

  // Stats chart view
  const [activeChart, setActiveChart] = useState("overview");

  useEffect(() => {
    if (activeTab === "outstanding") fetchOutstandingFines();
    else if (activeTab === "history") fetchHistory();
    else if (activeTab === "stats") fetchStatsAndHistory();
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (borrowerSearch.length >= 2) {
        if (/^\d+$/.test(borrowerSearch)) lookupByRfId(borrowerSearch);
        else searchBorrowers();
      } else { setBorrowers([]); setShowBorrowerDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [borrowerSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (customFineBookSearch.length >= 2) searchCustomFineBooks();
      else { setCustomFineBooks([]); setShowCustomFineBookDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [customFineBookSearch]);

  const lookupByRfId = async (rfId) => {
    setIsSearching(true);
    try {
      const res = await API.get(`/borrowers/rf/${rfId}`);
      if (res.data.borrower) { handleSelectBorrower(res.data.borrower); setBorrowerSearch(rfId); }
      else searchBorrowers();
    } catch { searchBorrowers(); } finally { setIsSearching(false); }
  };

  const searchBorrowers = async () => {
    setIsSearching(true);
    try {
      const res = await API.get(`/borrowers/search?q=${borrowerSearch}`);
      setBorrowers(res.data.borrowers || []);
      setShowBorrowerDropdown(true);
    } catch { setBorrowers([]); } finally { setIsSearching(false); }
  };

  const searchCustomFineBooks = async () => {
    setIsSearchingCustomFineBook(true);
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(customFineBookSearch)}`);
      setCustomFineBooks(res.data.results?.books || []);
      setShowCustomFineBookDropdown(true);
    } catch { setCustomFineBooks([]); } finally { setIsSearchingCustomFineBook(false); }
  };

  const fetchCustomFineCopies = async (bookId) => {
    setLoadingCustomFineCopies(true);
    try {
      const res = await API.get(`/books/${bookId}/copies`);
      setCustomFineCopies(res.data.copies || []);
    } catch { setCustomFineCopies([]); } finally { setLoadingCustomFineCopies(false); }
  };

  const handleSelectCustomFineBook = async (book) => {
    setSelectedCustomFineBook(book);
    setCustomFineBookSearch(book.title);
    setShowCustomFineBookDropdown(false);
    setCustomFineBooks([]);
    setSelectedCustomFineCopy(null);
    await fetchCustomFineCopies(book.book_id);
  };

  const isCopyIssuedToCurrentBorrower = (copy) => {
    if (!selectedBorrower || copy.status !== "Issued") return false;
    return copy.borrower?.borrower_id === selectedBorrower.borrower_id;
  };

  const fetchOutstandingFines = async () => {
    setLoading(true); setError(null);
    try {
      const res = await API.get("/fines/outstanding");
      setFines(res.data.issues);
    } catch { setError("Failed to load fines"); } finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    setLoading(true); setError(null);
    try {
      const res = await API.get("/fines/history");
      setHistory(res.data.history);
    } catch { setError("Failed to load history"); } finally { setLoading(false); }
  };

  const fetchStatsAndHistory = async () => {
    setLoading(true); setError(null);
    try {
      const requests = [
        API.get("/fines/stats"),
        history.length === 0 ? API.get("/fines/history") : Promise.resolve(null),
      ];
      const [statsRes, historyRes] = await Promise.all(requests);
      setStats(statsRes.data.stats);
      if (historyRes) setHistory(historyRes.data.history);
    } catch { setError("Failed to load statistics"); } finally { setLoading(false); }
  };

  const initiatePayment = (issueId, fine) => {
    setSelectedFineForPayment({ issueId, amount: fine });
    setPaymentMethod("cash");
    setShowPaymentModal(true);
  };

  // ── FIX 1: handlePayment ────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedFineForPayment) return;
    try {
      await API.post(`/fines/pay/${selectedFineForPayment.issueId}`, {
        amount_paid: selectedFineForPayment.amount,
        payment_method: paymentMethod
      });
      setShowPaymentModal(false);
      setSelectedFineForPayment(null);
      await fetchOutstandingFines();
    } catch (err) {
      console.error("Payment failed:", err);
    }
  };

  // ── FIX 2: handleWaive ──────────────────────────────────────────────────────
  const handleWaive = (issueId, fine) => {
    toast(`Waive fine of ₹${fine}?`, {
      description: "This will mark the fine as waived.",
      action: {
        label: "Waive",
        onClick: async () => {
          try {
            await API.post(`/fines/waive/${issueId}`, { reason: "Waived by librarian" });
            await fetchOutstandingFines();
          } catch (err) {
            console.error("Waive failed:", err);
          }
        },
      },
      cancel: { label: "Cancel" },
    });
  };

  // ── FIX 3: handleRecalculateIndividual ──────────────────────────────────────
  const handleRecalculateIndividual = (issueId) => {
    toast("Recalculate fine for this issue?", {
      description: "This will update the fine amount.",
      action: {
        label: "Recalculate",
        onClick: async () => {
          try {
            await API.post(`/fines/${issueId}/recalculate`);
            await fetchOutstandingFines();
          } catch (err) {
            console.error("Failed to recalculate fine:", err);
          }
        },
      },
      cancel: { label: "Cancel" },
    });
  };

  const handleRecalculateAll = (mode) => {
    const descriptions = {
      overdue: "Recalculate fines for overdue books.",
      returned: "Recalculate fines for returned books.",
      all: "Recalculate ALL fines.",
    };
    toast("Recalculate fines?", {
      description: descriptions[mode],
      action: {
        label: "Recalculate",
        onClick: async () => {
          try {
            await API.post("/fines/recalculate-all", { mode });
            setShowRecalculateModal(false);
            fetchOutstandingFines();
          } catch (err) { console.error("Failed to recalculate fines:", err); }
        },
      },
      cancel: { label: "Cancel" },
    });
  };

  const handleSelectBorrower = (borrower) => {
    setSelectedBorrower(borrower);
    if (/^\d+$/.test(borrowerSearch) && borrower.rf_id === borrowerSearch) {
      // keep RF ID as-is
    } else {
      setBorrowerSearch(`${borrower.borrower_name} (${borrower.rf_id ? "RF: " + borrower.rf_id : "ID: " + borrower.borrower_id})`);
    }
    setCustomFine({ ...customFine, borrower_id: borrower.borrower_id });
    setShowBorrowerDropdown(false);
    setBorrowers([]);
  };

  const handleCustomFineSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBorrower) { toast.error("Please select a borrower"); return; }
    try {
      await API.post("/fines/custom", customFine);
      setShowCustomModal(false);
      setCustomFine({ borrower_id: "", amount: "", reason: "", payment_method: "cash", mark_as_paid: false, link_to_copy: false, copy_code: "" });
      setBorrowerSearch(""); setSelectedBorrower(null);
      setCustomFineBookSearch(""); setSelectedCustomFineBook(null);
      setSelectedCustomFineCopy(null); setCustomFineCopies([]);
      if (customFine.mark_as_paid) {
        if (activeTab === "history") fetchHistory();
        else setActiveTab("history");
      } else fetchOutstandingFines();
    } catch (err) { console.error("Failed to add custom fine:", err); }
  };

  const getFilteredAndSortedHistory = () => {
    let filtered = [...history];
    if (historySearch.trim()) {
      const search = historySearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.borrower_name?.toLowerCase().includes(search) ||
        item.book_title?.toLowerCase().includes(search) ||
        item.reason?.toLowerCase().includes(search) ||
        item.borrower_id?.toString().includes(search)
      );
    }
    if (historyFilter !== "all") {
      if (historyFilter === "paid")             filtered = filtered.filter(i => i.status === "paid");
      else if (historyFilter === "waived")      filtered = filtered.filter(i => i.status === "waived");
      else if (historyFilter === "issue_fine")  filtered = filtered.filter(i => i.type === "issue_fine");
      else if (historyFilter === "custom_fine") filtered = filtered.filter(i => i.type === "custom_fine");
    }
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (historySortBy === "date")          { aVal = new Date(a.payment_date || a.createdAt); bVal = new Date(b.payment_date || b.createdAt); }
      else if (historySortBy === "amount")   { aVal = a.fine || a.amount || 0; bVal = b.fine || b.amount || 0; }
      else if (historySortBy === "borrower") { aVal = a.borrower_name?.toLowerCase() || ""; bVal = b.borrower_name?.toLowerCase() || ""; }
      return historySortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return filtered;
  };

  const handleCloseModal = () => {
    setShowCustomModal(false);
    setCustomFine({ borrower_id: "", amount: "", reason: "", payment_method: "cash", mark_as_paid: false, link_to_copy: false, copy_code: "" });
    setBorrowerSearch(""); setSelectedBorrower(null); setBorrowers([]); setShowBorrowerDropdown(false);
    setCustomFineBookSearch(""); setSelectedCustomFineBook(null);
    setSelectedCustomFineCopy(null); setCustomFineCopies([]); setShowCustomFineBookDropdown(false);
  };

  const handleHistoryRowClick = (item) => {
    if (item.type === "custom_fine") navigate(`/fines/custom/${item.id}`);
    else navigate(`/fines/${item.id}`);
  };

  // ── Chart data derivations ──────────────────────────────────────────────────

  const statusPieData = stats ? [
    { name: "Outstanding", value: stats.total_outstanding || 0,  color: "#ef4444" },
    { name: "Collected",   value: stats.total_collected   || 0,  color: "#10b981" },
    { name: "Waived",      value: (stats.total_fines_generated || 0) - (stats.total_outstanding || 0) - (stats.total_collected || 0), color: "#f59e0b" },
  ].filter(d => d.value > 0) : [];

  const typePieData = stats ? [
    { name: "Late Returns", value: stats.issue_fines_count  || 0, color: "#6366f1" },
    { name: "Custom Fines", value: stats.custom_fines_count || 0, color: "#a855f7" },
  ].filter(d => d.value > 0) : [];

  const monthlyData = (() => {
    if (!history.length) return [];
    const map = {};
    history.forEach(item => {
      const d = new Date(item.payment_date || item.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { key, label, collected: 0, waived: 0, count: 0 };
      const amount = Number(item.fine || item.amount || 0);
      if (item.status === "waived") map[key].waived += amount;
      else map[key].collected += amount;
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8);
  })();

  const paymentMethodData = (() => {
    if (!history.length) return [];
    const map = {};
    history.forEach(item => {
      const method = item.payment_method || "unknown";
      if (!map[method]) map[method] = { name: method.charAt(0).toUpperCase() + method.slice(1), value: 0, count: 0 };
      map[method].value += Number(item.fine || item.amount || 0);
      map[method].count += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  })();

  const topBorrowers = (() => {
    if (!history.length) return [];
    const map = {};
    history.forEach(item => {
      const id = item.borrower_id;
      if (!map[id]) map[id] = { name: item.borrower_name || `#${id}`, total: 0, count: 0 };
      map[id].total += Number(item.fine || item.amount || 0);
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  })();

  const CHART_TABS = [
    { id: "overview",  label: "Overview" },
    { id: "trends",    label: "Monthly Trends" },
    { id: "breakdown", label: "Breakdown" },
    { id: "borrowers", label: "Top Borrowers" },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {typeof p.value === "number" && p.name !== "Count" ? `₹${p.value.toFixed(2)}` : p.value}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs">
        <p className="font-semibold text-gray-700">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }} className="font-medium">₹{Number(payload[0].value).toFixed(2)}</p>
      </div>
    );
  };

  const TABS = [
    { id: "outstanding", label: "Outstanding", activeClass: "bg-red-600",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "history",     label: "History",     activeClass: "bg-green-600", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "stats",       label: "Statistics",  activeClass: "bg-blue-600",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Fine Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">Track, collect, and manage borrower fines</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRecalculateModal(true)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recalculate
            </button>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Custom Fine
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? `${tab.activeClass} text-white shadow-sm`
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>

        ) : activeTab === "outstanding" ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {fines.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-gray-500">No outstanding fines</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["ID","Type","Borrower","Book","Copy","Reason","Due","Returned","Fine",""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fines.map((fine) => (
                      <tr key={fine.issue_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{fine.display_id || fine.issue_id}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fine.type === "custom_fine" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {fine.type === "custom_fine" ? "Custom" : "Late"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-800 text-xs">{fine.borrower_name}</p>
                          <p className="text-gray-400 text-xs">#{fine.borrower_id}</p>
                        </td>
                        <td className="px-4 py-3.5 max-w-[140px]">
                          <p className="text-xs text-gray-700 truncate">{fine.book_title && fine.book_title !== "N/A" ? fine.book_title : <span className="text-gray-300">—</span>}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {fine.copy_code && fine.copy_code !== "N/A"
                            ? <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{fine.copy_code}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 max-w-[120px]"><p className="text-xs text-gray-600 truncate">{fine.reason}</p></td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {fine.due_date
                            ? <span className={`text-xs ${new Date(fine.due_date) < new Date() ? "text-red-600 font-semibold" : "text-gray-600"}`}>{new Date(fine.due_date).toLocaleDateString()}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {fine.check_in
                            ? <span className="text-xs text-gray-600">{new Date(fine.check_in).toLocaleDateString()}</span>
                            : <span className="text-xs font-semibold text-orange-500">Not returned</span>}
                        </td>
                        <td className="px-4 py-3.5"><span className="text-sm font-bold text-red-600">₹{fine.fine}</span></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => initiatePayment(fine.display_id || fine.issue_id, fine.fine)} className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition">Pay</button>
                            <button onClick={() => handleWaive(fine.display_id || fine.issue_id, fine.fine)} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition">Waive</button>
                            {fine.type === "issue_fine" && (
                              <button onClick={() => handleRecalculateIndividual(fine.issue_id)} className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition" title="Recalculate">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        ) : activeTab === "history" ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Search</label>
                  <input type="text" placeholder="Borrower, book, reason..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full border border-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Filter</label>
                  <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="w-full border border-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="all">All Fines</option>
                    <option value="paid">Paid Only</option>
                    <option value="waived">Waived Only</option>
                    <option value="issue_fine">Late Return</option>
                    <option value="custom_fine">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sort By</label>
                  <div className="flex gap-2">
                    <select value={historySortBy} onChange={(e) => setHistorySortBy(e.target.value)} className="flex-1 border border-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                      <option value="date">Date</option>
                      <option value="amount">Amount</option>
                      <option value="borrower">Borrower</option>
                    </select>
                    <button onClick={() => setHistorySortOrder(o => o === "asc" ? "desc" : "asc")} className="px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">{historySortOrder === "asc" ? "↑" : "↓"}</button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Showing {getFilteredAndSortedHistory().length} of {history.length} records</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {getFilteredAndSortedHistory().length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {historySearch || historyFilter !== "all" ? "No fines match your filters" : "No history available"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Date","Type","Borrower","Book / Reason","Copy","Amount","Method","Status"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {getFilteredAndSortedHistory().map((item, idx) => (
                        <tr key={idx} onClick={() => handleHistoryRowClick(item)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                          <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{new Date(item.payment_date || item.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === "custom_fine" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {item.type === "custom_fine" ? "Custom" : "Late"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-semibold text-gray-800">{item.borrower_name}</p>
                            <p className="text-xs text-gray-400">#{item.borrower_id}</p>
                          </td>
                          <td className="px-4 py-3.5 max-w-[160px]"><p className="text-xs text-gray-700 truncate">{item.book_title || item.reason || "—"}</p></td>
                          <td className="px-4 py-3.5">
                            {item.copy_code && item.copy_code !== "N/A"
                              ? <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{item.copy_code}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5"><span className="text-sm font-bold text-gray-800">₹{item.fine || item.amount}</span></td>
                          <td className="px-4 py-3.5"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{item.payment_method || "—"}</span></td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === "waived" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {item.status === "waived" ? "Waived" : "Paid"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        ) : (
          // ── Statistics Tab ────────────────────────────────────────────────────
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Generated", value: `₹${stats?.total_fines_generated || 0}`, sub: `${stats?.issues_with_fines || 0} issues`, bg: "bg-blue-50", color: "text-blue-600", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Collected",       value: `₹${stats?.total_collected || 0}`,        sub: `${stats?.paid_count || 0} payments`,  bg: "bg-emerald-50", color: "text-emerald-600", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Outstanding",     value: `₹${stats?.total_outstanding || 0}`,       sub: `${stats?.outstanding_count || 0} unpaid`,    bg: "bg-red-50",     color: "text-red-600",     icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Collection Rate", value: stats?.total_fines_generated ? `${Math.round((stats.total_collected / stats.total_fines_generated) * 100)}%` : "—", sub: "of total generated", bg: "bg-indigo-50", color: "text-indigo-600", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className={`${s.bg} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
                    <svg className={`w-4 h-4 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-xs font-medium mb-0.5">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Chart nav */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
              {CHART_TABS.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => setActiveChart(ct.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeChart === ct.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            {/* ── Overview ── */}
            {activeChart === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Fine Status Distribution</h4>
                  <p className="text-xs text-gray-400 mb-4">Breakdown by payment status</p>
                  {statusPieData.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-16">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend formatter={(value, entry) => (<span className="text-xs text-gray-600">{value} — ₹{Number(entry.payload.value).toFixed(2)}</span>)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Fine Type Distribution</h4>
                  <p className="text-xs text-gray-400 mb-4">Late returns vs custom fines</p>
                  {typePieData.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-16">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={typePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {typePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend formatter={(value, entry) => (<span className="text-xs text-gray-600">{value} — {entry.payload.value} fines</span>)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* ── Monthly Trends ── */}
            {activeChart === "trends" && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Monthly Fine Collection</h4>
                  <p className="text-xs text-gray-400 mb-4">Collected vs waived amounts over the last 8 months</p>
                  {monthlyData.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-16">No history data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={v => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
                        <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="waived"    name="Waived"    fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Transaction Volume</h4>
                  <p className="text-xs text-gray-400 mb-4">Number of fine transactions per month</p>
                  {monthlyData.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-16">No history data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="count" name="Count" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* ── Breakdown ── */}
            {activeChart === "breakdown" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Revenue by Payment Method</h4>
                <p className="text-xs text-gray-400 mb-4">Total amount collected per payment channel</p>
                {paymentMethodData.length === 0 ? (
                  <p className="text-center text-xs text-gray-300 py-16">No history data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={paymentMethodData} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[0, 4, 4, 0]}>
                        {paymentMethodData.map((_, i) => (
                          <Cell key={i} fill={["#6366f1","#10b981","#f59e0b","#ef4444"][i % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {paymentMethodData.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
                    {paymentMethodData.map((m, i) => (
                      <div key={i} className="text-center">
                        <p className="text-xs text-gray-400 mb-1 capitalize">{m.name}</p>
                        <p className="text-base font-bold text-gray-800">₹{m.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{m.count} transactions</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Top Borrowers ── */}
            {activeChart === "borrowers" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Top Borrowers by Fines</h4>
                <p className="text-xs text-gray-400 mb-4">Borrowers who have paid or been waived the most</p>
                {topBorrowers.length === 0 ? (
                  <p className="text-center text-xs text-gray-300 py-16">No history data available</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topBorrowers} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" name="Total Fines" radius={[4, 4, 0, 0]}>
                          {topBorrowers.map((_, i) => (
                            <Cell key={i} fill={["#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e","#ef4444"][i % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                      {topBorrowers.map((b, i) => {
                        const maxTotal = topBorrowers[0].total || 1;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"}`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <p className="text-xs font-semibold text-gray-700 truncate">{b.name}</p>
                                <p className="text-xs font-bold text-gray-800 ml-2 shrink-0">₹{b.total.toFixed(2)}</p>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(b.total / maxTotal) * 100}%`, background: ["#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e","#ef4444"][i % 6] }} />
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">{b.count} fines</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Recalculate Modal ── */}
      {showRecalculateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Recalculate Fines</h3>
              <p className="text-xs text-gray-400 mt-0.5">Choose which fines to recalculate</p>
            </div>
            <div className="p-5 space-y-2.5">
              {[
                { mode: "overdue",  label: "Overdue Only",       desc: "Books still checked out",    color: "hover:border-orange-300 hover:bg-orange-50", dot: "bg-orange-400" },
                { mode: "returned", label: "Returned Books Only", desc: "Already returned books",      color: "hover:border-blue-300 hover:bg-blue-50",   dot: "bg-blue-400"   },
                { mode: "all",      label: "All Fines",           desc: "Both overdue and returned",   color: "hover:border-indigo-300 hover:bg-indigo-50", dot: "bg-indigo-500" },
              ].map(opt => (
                <button key={opt.mode} onClick={() => handleRecalculateAll(opt.mode)} className={`w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl transition text-left ${opt.color}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setShowRecalculateModal(false)} className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Fine Modal ── */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-gray-800">Add Custom Fine</h3>
            </div>
            <form onSubmit={handleCustomFineSubmit} className="px-6 py-5 space-y-4">

              {/* Borrower search */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Borrower <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="text" value={borrowerSearch}
                    onChange={(e) => { setBorrowerSearch(e.target.value); if (selectedBorrower) setSelectedBorrower(null); }}
                    onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                    placeholder="Scan RF ID or type to search..."
                    className="w-full border border-gray-200 px-3 py-2.5 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isSearching ? (
                      <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : selectedBorrower ? (
                      <button type="button" onClick={() => { setSelectedBorrower(null); setBorrowerSearch(""); setCustomFine({ ...customFine, borrower_id: "" }); }} className="text-gray-300 hover:text-red-400 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    ) : null}
                  </div>
                  {showBorrowerDropdown && borrowers.length > 0 && !selectedBorrower && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {borrowers.map(b => (
                        <div key={b.borrower_id} onClick={() => handleSelectBorrower(b)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition">
                          <p className="text-sm font-semibold text-gray-800">{b.borrower_name}</p>
                          <p className="text-xs text-gray-400">#{b.borrower_id}{b.rf_id && ` · RF: ${b.rf_id}`}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedBorrower && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">{selectedBorrower.borrower_name}</p>
                      <p className="text-xs text-green-600">#{selectedBorrower.borrower_id}{selectedBorrower.rf_id && ` · RF: ${selectedBorrower.rf_id}`}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (₹) <span className="text-red-400">*</span></label>
                <input type="number" step="0.01" value={customFine.amount} onChange={(e) => setCustomFine({ ...customFine, amount: e.target.value })} className="w-full border border-gray-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" required />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason <span className="text-red-400">*</span></label>
                <textarea value={customFine.reason} onChange={(e) => setCustomFine({ ...customFine, reason: e.target.value })} className="w-full border border-gray-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} required placeholder="e.g. Lost book, Damaged pages..." />
              </div>

              {/* Link to copy */}
              <div className="border border-gray-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={customFine.link_to_copy} onChange={(e) => setCustomFine({ ...customFine, link_to_copy: e.target.checked, copy_code: e.target.checked ? customFine.copy_code : "" })} className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Link to a book copy</p>
                    <p className="text-xs text-gray-400 mt-0.5">For fines related to a specific copy</p>
                  </div>
                </label>
                {customFine.link_to_copy && (
                  <div className="mt-4 space-y-3">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Search Book</label>
                      <div className="relative">
                        <input type="text" value={customFineBookSearch} onChange={(e) => { setCustomFineBookSearch(e.target.value); if (selectedCustomFineBook) { setSelectedCustomFineBook(null); setCustomFineCopies([]); setSelectedCustomFineCopy(null); } }} onFocus={() => customFineBooks.length > 0 && setShowCustomFineBookDropdown(true)} placeholder="Title or ISBN..." className="w-full border border-gray-200 px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" autoComplete="off" />
                        {isSearchingCustomFineBook && <svg className="animate-spin h-4 w-4 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                        {showCustomFineBookDropdown && customFineBooks.length > 0 && !selectedCustomFineBook && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {customFineBooks.map(book => (
                              <div key={book.book_id} onClick={() => handleSelectCustomFineBook(book)} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition">
                                <p className="text-sm font-semibold text-gray-800">{book.title}</p>
                                <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedCustomFineBook && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">{selectedCustomFineBook.title}</p>
                        {loadingCustomFineCopies ? (
                          <p className="text-xs text-gray-400">Loading copies...</p>
                        ) : customFineCopies.length === 0 ? (
                          <p className="text-xs text-red-500">No copies found</p>
                        ) : (
                          <div className="space-y-1.5">
                            {customFineCopies.map(copy => {
                              const isIssuedToCurrentBorrower = isCopyIssuedToCurrentBorrower(copy);
                              const isAvailable = copy.status === "Available";
                              const isClickable = isAvailable || isIssuedToCurrentBorrower;
                              return (
                                <div key={copy.copy_id} onClick={() => { if (isClickable) { setSelectedCustomFineCopy(copy); setCustomFine({ ...customFine, copy_code: copy.copy_code }); } }} className={`p-2.5 rounded-lg border transition ${selectedCustomFineCopy?.copy_id === copy.copy_id ? "bg-blue-50 border-blue-300" : isClickable ? "bg-white border-gray-200 hover:border-blue-200 cursor-pointer" : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"}`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700 font-mono">{copy.copy_code}</p>
                                      <p className={`text-xs ${isIssuedToCurrentBorrower ? "text-orange-500" : isAvailable ? "text-emerald-500" : "text-red-400"}`}>{isIssuedToCurrentBorrower ? "Issued to this borrower" : copy.status}</p>
                                    </div>
                                    {selectedCustomFineCopy?.copy_id === copy.copy_id && <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mark as paid */}
              <div className="border border-gray-200 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={customFine.mark_as_paid} onChange={(e) => setCustomFine({ ...customFine, mark_as_paid: e.target.checked })} className="mt-0.5 w-4 h-4 text-green-600 rounded border-gray-300" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Mark as paid immediately</p>
                    <p className="text-xs text-gray-400 mt-0.5">Borrower has already paid</p>
                  </div>
                </label>
                {customFine.mark_as_paid && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
                    <select value={customFine.payment_method} onChange={(e) => setCustomFine({ ...customFine, payment_method: e.target.value })} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="online">Online Transfer</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition">Add Fine</button>
                <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Record Payment</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Amount to collect</p>
                <p className="text-3xl font-bold text-emerald-700">₹{selectedFineForPayment?.amount}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method <span className="text-red-400">*</span></label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-gray-200 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" autoFocus>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePayment} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">Confirm Payment</button>
                <button onClick={() => { setShowPaymentModal(false); setSelectedFineForPayment(null); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}