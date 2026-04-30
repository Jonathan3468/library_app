import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

const Ic = ({ d, className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const PALETTE = {
  blue:"#3b82f6",indigo:"#6366f1",violet:"#8b5cf6",
  emerald:"#10b981",amber:"#f59e0b",red:"#ef4444",
  rose:"#f43f5e",pink:"#ec4899",teal:"#14b8a6",orange:"#f97316",
};
const TOP_COLORS = [PALETTE.indigo,PALETTE.violet,PALETTE.pink,PALETTE.rose,PALETTE.red,PALETTE.amber,PALETTE.orange,PALETTE.teal];
const MONTH_OPTIONS = [1,2,3,6,12,24,36];

const fmt = (d) => d ? new Date(d).toLocaleDateString() : "—";
const daysAgo = (d) => Math.ceil((new Date() - new Date(d)) / 86400000);
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

// ── Tooltips ─────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-xs min-w-[120px]">
      {label && <p className="font-bold text-gray-700 mb-1.5 border-b border-gray-100 pb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Section shell ─────────────────────────────────────────────────────────────
const Section = ({ title, sub, children, actions }) => (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0 ml-4">{actions}</div>}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ── KPI card ─────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, bg, icon, color, onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl border border-gray-200 p-4 ${onClick ? "cursor-pointer hover:border-blue-300 hover:shadow-sm transition" : ""}`}>
    <div className={`${bg} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
      <Ic d={icon} className={`w-3.5 h-3.5 ${color}`} />
    </div>
    <p className="text-xl font-black text-gray-800 leading-none mb-1">{value}</p>
    <p className="text-[11px] font-medium text-gray-500">{label}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color, label, sublabel }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-baseline">
      <span className="text-xs font-semibold text-gray-700 truncate max-w-[65%]">{label}</span>
      <span className="text-xs font-bold text-gray-800 ml-2 shrink-0">{sublabel}</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min((value/(max||1))*100,100)}%`, background: color }} />
    </div>
  </div>
);

// ── Risk badge ────────────────────────────────────────────────────────────────
const RiskBadge = ({ days }) => {
  if (days <= 7)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">{days}d · Low</span>;
  if (days <= 14) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">{days}d · Mid</span>;
  if (days <= 30) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">{days}d · High</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300">{days}d · Critical</span>;
};

// ── Range pills ───────────────────────────────────────────────────────────────
const RangePills = ({ value, onChange }) => (
  <div className="flex gap-1.5 flex-wrap">
    {MONTH_OPTIONS.map(m => (
      <button key={m} onClick={() => onChange(m)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
          value === m ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
        }`}>
        {m >= 36 ? "All time" : m >= 12 ? `${m/12}yr` : `${m}mo`}
      </button>
    ))}
  </div>
);

// ── Nav item ──────────────────────────────────────────────────────────────────
const NavItem = ({ id, label, icon, count, countColor, active, onClick }) => (
  <button onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      active ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    }`}>
    <Ic d={icon} className="w-4 h-4 shrink-0" />
    <span className="flex-1 text-left text-[13px]">{label}</span>
    {count !== undefined && count > 0 && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${active ? "bg-white/25 text-white" : countColor || "bg-gray-100 text-gray-600"}`}>
        {count}
      </span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function IssueStats() {
  const navigate = useNavigate();
  const [section, setSection] = useState("overview");
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(6);
  const [selectedOverdueBucket, setSelectedOverdueBucket] = useState(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try {
      const res = await API.get("/reports", { params: { page: 1, limit: 9999, sortBy: "check_out", order: "DESC" } });
      setAllIssues(Array.isArray(res.data.issues) ? res.data.issues : []);
    } catch { setError("Failed to load data."); } finally { setLoading(false); }
  };

  const issues = useMemo(() => {
    if (months >= 36) return allIssues;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return allIssues.filter(i => !isNaN(new Date(i.check_out)) && new Date(i.check_out) >= cutoff);
  }, [allIssues, months]);

  // ── Core metrics ────────────────────────────────────────────────────────────
  const core = useMemo(() => {
    const now = new Date();
    const active   = issues.filter(i => i.status === "issued" && new Date(i.due_date) >= now);
    const overdue  = issues.filter(i => i.status === "issued" && new Date(i.due_date) < now);
    const returned = issues.filter(i => i.status === "returned");
    const withFine = issues.filter(i => Number(i.fine) > 0);
    const totalFine = issues.reduce((s, i) => s + Number(i.fine || 0), 0);
    const returnRate = issues.length ? Math.round((returned.length / issues.length) * 100) : 0;
    const avgOverdueDays = overdue.length
      ? Math.round(overdue.reduce((s, i) => s + daysAgo(i.due_date), 0) / overdue.length) : 0;
    return { total: issues.length, active, overdue, returned, withFine, totalFine, returnRate, avgOverdueDays };
  }, [issues]);

  // ── Monthly data ─────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = {};
    issues.forEach(i => {
      const d = new Date(i.check_out); if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { key, label, issued: 0, returned: 0, overdue: 0, fines: 0 };
      map[key].issued++;
      if (i.status === "returned") map[key].returned++;
      if (i.status === "issued" && new Date(i.due_date) < new Date()) map[key].overdue++;
      map[key].fines += Number(i.fine || 0);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [issues]);

  // ── Overdue buckets ──────────────────────────────────────────────────────────
  const overdueBuckets = useMemo(() => {
    const b = [
      { label: "1–7 days",   min: 1,  max: 7,    color: PALETTE.amber,   items: [] },
      { label: "8–14 days",  min: 8,  max: 14,   color: PALETTE.orange,  items: [] },
      { label: "15–30 days", min: 15, max: 30,   color: PALETTE.red,     items: [] },
      { label: "30+ days",   min: 31, max: 9999, color: "#991b1b",       items: [] },
    ];
    core.overdue.forEach(i => {
      const d = daysAgo(i.due_date);
      const bucket = b.find(bk => d >= bk.min && d <= bk.max);
      if (bucket) bucket.items.push({ ...i, daysOverdue: d });
    });
    return b.map(bk => ({ ...bk, count: bk.items.length }));
  }, [core.overdue]);

  const bucketItems = useMemo(() => {
    if (!selectedOverdueBucket) return core.overdue.map(i => ({ ...i, daysOverdue: daysAgo(i.due_date) })).sort((a, b) => b.daysOverdue - a.daysOverdue);
    return overdueBuckets.find(b => b.label === selectedOverdueBucket)?.items || [];
  }, [selectedOverdueBucket, overdueBuckets, core.overdue]);

  // ── Due soon ─────────────────────────────────────────────────────────────────
  const dueSoon = useMemo(() => {
    const now = new Date(); const soon = new Date(); soon.setDate(soon.getDate() + 7);
    return allIssues
      .filter(i => i.status === "issued" && new Date(i.due_date) >= now && new Date(i.due_date) <= soon)
      .map(i => ({ ...i, daysLeft: daysUntil(i.due_date) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [allIssues]);

  // ── Borrower stats ───────────────────────────────────────────────────────────
  const borrowerStats = useMemo(() => {
    const map = {};
    issues.forEach(i => {
      const id = i.borrower_id; if (!id) return;
      if (!map[id]) map[id] = { id, name: i.Borrower?.borrower_name || `#${id}`, total: 0, returned: 0, overdue: 0, fines: 0 };
      map[id].total++;
      if (i.status === "returned") map[id].returned++;
      if (i.status === "issued" && new Date(i.due_date) < new Date()) map[id].overdue++;
      map[id].fines += Number(i.fine || 0);
    });
    const arr = Object.values(map).sort((a, b) => b.total - a.total);
    const maxT = arr[0]?.total || 1;
    return arr.map(b => ({ ...b, _max: maxT, reliabilityRate: b.total ? Math.round((b.returned / b.total) * 100) : 0 }));
  }, [issues]);

  const segments = useMemo(() => [
    { name: "Power Users (5+)", value: borrowerStats.filter(b => b.total >= 5).length,               color: PALETTE.indigo },
    { name: "Regular (2–4)",    value: borrowerStats.filter(b => b.total >= 2 && b.total < 5).length, color: PALETTE.blue   },
    { name: "Casual (1)",       value: borrowerStats.filter(b => b.total === 1).length,               color: PALETTE.teal   },
    { name: "At Risk",          value: borrowerStats.filter(b => b.overdue > 0).length,               color: PALETTE.red    },
  ].filter(s => s.value > 0), [borrowerStats]);

  // ── Book stats ───────────────────────────────────────────────────────────────
  const bookStats = useMemo(() => {
    const map = {};
    issues.forEach(i => {
      const title = i.Copy?.Book?.title; if (!title) return;
      if (!map[title]) map[title] = { name: title.length > 30 ? title.slice(0,30)+"…" : title, count: 0, returned: 0, overdue: 0, copies: new Set() };
      map[title].count++;
      if (i.status === "returned") map[title].returned++;
      if (i.status === "issued" && new Date(i.due_date) < new Date()) map[title].overdue++;
      if (i.Copy?.copy_code) map[title].copies.add(i.Copy.copy_code);
    });
    const arr = Object.values(map).sort((a, b) => b.count - a.count).map(b => ({ ...b, copies: b.copies.size }));
    const maxC = arr[0]?.count || 1;
    return arr.map(b => ({ ...b, _max: maxC })).slice(0, 20);
  }, [issues]);

  // ── Fine stats ───────────────────────────────────────────────────────────────
  const fineStats = useMemo(() => {
    const outstanding = issues.filter(i => Number(i.fine) > 0 && !i.fine_paid);
    const totalOut = outstanding.reduce((s, i) => s + Number(i.fine), 0);
    const byBorrower = {};
    outstanding.forEach(i => {
      const id = i.borrower_id; if (!id) return;
      if (!byBorrower[id]) byBorrower[id] = { name: i.Borrower?.borrower_name || `#${id}`, total: 0, count: 0 };
      byBorrower[id].total += Number(i.fine);
      byBorrower[id].count++;
    });
    const debtors = Object.values(byBorrower).sort((a, b) => b.total - a.total).slice(0, 8);
    const maxD = debtors[0]?.total || 1;
    return { outstanding, totalOut, debtors: debtors.map(b => ({ ...b, _max: maxD })) };
  }, [issues]);

  // ── Day-of-week ──────────────────────────────────────────────────────────────
  const dowData = useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const map = Object.fromEntries(days.map(d => [d, { day: d, issued: 0, returned: 0 }]));
    issues.forEach(i => {
      const d = new Date(i.check_out); if (isNaN(d)) return;
      map[days[d.getDay()]].issued++;
    });
    issues.forEach(i => {
      if (i.status !== "returned" || !i.check_in) return;
      const d = new Date(i.check_in); if (isNaN(d)) return;
      map[days[d.getDay()]].returned++;
    });
    return days.map(d => map[d]);
  }, [issues]);

  // ─────────────────────────────────────────────────────────────────────────────
  const NAV = [
    { id:"overview",  label:"Overview",           icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { id:"overdue",   label:"Overdue Analysis",   icon:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",   count: core.overdue.length,   countColor: "bg-red-100 text-red-600" },
    { id:"duesoon",   label:"Due Soon",            icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",         count: dueSoon.length,         countColor: "bg-amber-100 text-amber-600" },
    { id:"trends",    label:"Circulation Trends",  icon:"M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h13M3 8h9m-9 4h6" },
    { id:"borrowers", label:"Borrower Insights",   icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", count: borrowerStats.length },
    { id:"books",     label:"Book Performance",    icon:"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", count: bookStats.length },
    { id:"fines",     label:"Fine Analytics",      icon:"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", count: fineStats.outstanding.length, countColor: "bg-rose-100 text-rose-600" },
  ];

  if (loading) return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400"><Spinner /><p className="text-sm">Loading statistics…</p></div>
    </div>
  );
  if (error) return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2"><p className="text-red-500 text-sm">{error}</p><button onClick={fetchAll} className="text-xs text-blue-600 underline">Retry</button></div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => navigate("/reports")} className="text-gray-400 hover:text-gray-600 transition p-1">
            <Ic d="M15 19l-7-7 7-7" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-none">Advanced Statistics</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">{core.total} of {allIssues.length} records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RangePills value={months} onChange={setMonths} />
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-blue-300 text-xs font-medium transition shrink-0">
            <Ic d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 p-3 space-y-0.5 shrink-0 overflow-y-auto">
          {NAV.map(n => <NavItem key={n.id} {...n} active={section === n.id} onClick={setSection} />)}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ═══════════════════════ OVERVIEW ══════════════════════════════════ */}
          {section === "overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI label="Total Issues"   value={core.total}                       sub="in selected range"                  bg="bg-blue-50"    color="text-blue-600"    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                <KPI label="Active"         value={core.active.length}               sub="currently out"                      bg="bg-indigo-50"  color="text-indigo-600"  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <KPI label="Overdue"        value={core.overdue.length}              sub={`avg ${core.avgOverdueDays}d late`}  bg="bg-red-50"     color="text-red-600"     icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" onClick={() => setSection("overdue")} />
                <KPI label="Return Rate"    value={`${core.returnRate}%`}            sub={`${core.returned.length} returned`}  bg="bg-emerald-50" color="text-emerald-600"  icon="M5 13l4 4L19 7" />
                <KPI label="Due Soon"       value={dueSoon.length}                   sub="within 7 days"                      bg="bg-amber-50"   color="text-amber-600"   icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" onClick={() => setSection("duesoon")} />
                <KPI label="With Fines"     value={core.withFine.length}             sub="have a fine"                        bg="bg-rose-50"    color="text-rose-600"    icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2" onClick={() => setSection("fines")} />
                <KPI label="Total Fines"    value={`₹${core.totalFine.toFixed(0)}`} sub="in range"                           bg="bg-violet-50"  color="text-violet-600"  icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" />
                <KPI label="Unique Titles"  value={bookStats.length}                 sub="in circulation"                     bg="bg-teal-50"    color="text-teal-600"    icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5" onClick={() => setSection("books")} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Health ratios */}
                <Section title="Collection Health" sub="Key ratios">
                  <div className="space-y-5">
                    {[
                      { label: "Return Rate",     v: core.returnRate, color: PALETTE.emerald, sub: `${core.returned.length} of ${core.total}` },
                      { label: "Overdue Rate",    v: core.total ? Math.round((core.overdue.length/core.total)*100) : 0, color: PALETTE.red, sub: `${core.overdue.length} of ${core.total}` },
                      { label: "Fine Recovery",   v: core.totalFine > 0 ? Math.round(((core.totalFine - fineStats.totalOut) / core.totalFine)*100) : 100, color: PALETTE.violet, sub: `₹${(core.totalFine - fineStats.totalOut).toFixed(0)} recovered` },
                    ].map(m => (
                      <div key={m.label} className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                          <span className="text-sm font-black text-gray-800">{m.v}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: m.color }} />
                        </div>
                        <p className="text-[10px] text-gray-400">{m.sub}</p>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Status pie */}
                <Section title="Issue Status" sub="Distribution">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[
                        { name: "Active",   value: core.active.length,   color: PALETTE.blue    },
                        { name: "Overdue",  value: core.overdue.length,  color: PALETTE.red     },
                        { name: "Returned", value: core.returned.length, color: PALETTE.emerald },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                        {[PALETTE.blue,PALETTE.red,PALETTE.emerald].map((c,i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip content={<CT />} />
                      <Legend formatter={(v,e) => <span className="text-xs text-gray-600">{v} — {e.payload.value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </Section>

                {/* DOW */}
                <Section title="Activity by Weekday" sub="Issues and returns">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dowData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="issued"   name="Issued"   fill={PALETTE.blue}    radius={[3,3,0,0]} />
                      <Bar dataKey="returned" name="Returned" fill={PALETTE.emerald} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              <Section title="Volume Over Time" sub="Monthly checkout trend">
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={monthlyData} margin={{ top:4, right:16, left:-16, bottom:0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.blue} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={PALETTE.red} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={PALETTE.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CT />} />
                    <Legend formatter={v => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
                    <Area type="monotone" dataKey="issued"  name="Issued"  stroke={PALETTE.blue} strokeWidth={2.5} fill="url(#g1)" dot={false} activeDot={{ r:4 }} />
                    <Area type="monotone" dataKey="overdue" name="Overdue" stroke={PALETTE.red}  strokeWidth={2}   fill="url(#g2)" dot={false} activeDot={{ r:4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>
            </>
          )}

          {/* ═══════════════════════ OVERDUE ANALYSIS ══════════════════════════ */}
          {section === "overdue" && (
            <>
              <div className="flex flex-wrap gap-2 mb-1">
                {[
                  { label: "Total overdue",     v: core.overdue.length,              c: "bg-red-50 text-red-700 border border-red-200" },
                  { label: "Avg days late",      v: `${core.avgOverdueDays}d`,        c: "bg-orange-50 text-orange-700 border border-orange-200" },
                  { label: "Outstanding fines",  v: `₹${fineStats.totalOut.toFixed(0)}`, c: "bg-rose-50 text-rose-700 border border-rose-200" },
                ].map(p => (
                  <span key={p.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${p.c}`}>
                    <span className="font-normal opacity-70">{p.label}</span> {p.v}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Bucket chart */}
                <Section title="By Duration" sub="Click a bar or card to filter list"
                  actions={selectedOverdueBucket && (
                    <button onClick={() => setSelectedOverdueBucket(null)} className="text-xs text-blue-600 hover:underline">Clear</button>
                  )}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={overdueBuckets} margin={{ top:4, right:8, left:-20, bottom:0 }}
                      onClick={d => d?.activePayload && setSelectedOverdueBucket(
                        selectedOverdueBucket === d.activePayload[0]?.payload?.label ? null : d.activePayload[0]?.payload?.label
                      )}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="count" name="Books" radius={[4,4,0,0]} cursor="pointer">
                        {overdueBuckets.map((b,i) => (
                          <Cell key={i} fill={b.color} opacity={!selectedOverdueBucket || selectedOverdueBucket === b.label ? 1 : 0.25} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {overdueBuckets.map(b => (
                      <button key={b.label} onClick={() => setSelectedOverdueBucket(selectedOverdueBucket === b.label ? null : b.label)}
                        className={`p-3 rounded-xl border text-left transition ${selectedOverdueBucket === b.label ? "border-gray-400 bg-gray-50 ring-1 ring-gray-300" : "border-gray-100 hover:border-gray-200"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                          <span className="text-[11px] font-semibold text-gray-600">{b.label}</span>
                        </div>
                        <p className="text-2xl font-black text-gray-800">{b.count}</p>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Risk map */}
                <Section title="Risk Map" sub="Overdue exposure per borrower">
                  {core.overdue.length === 0
                    ? <p className="text-xs text-gray-300 text-center py-10">No overdue items</p>
                    : (() => {
                      const byB = {};
                      core.overdue.forEach(i => {
                        const id = i.borrower_id;
                        if (!byB[id]) byB[id] = { name: i.Borrower?.borrower_name || `#${id}`, items: [] };
                        byB[id].items.push({ ...i, daysOverdue: daysAgo(i.due_date) });
                      });
                      return (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {Object.values(byB).sort((a,b) => b.items.length - a.items.length).map((bwr, i) => {
                            const maxDays = Math.max(...bwr.items.map(it => it.daysOverdue));
                            return (
                              <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50/60">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{bwr.name}</p>
                                    <p className="text-[10px] text-gray-400">{bwr.items.length} book{bwr.items.length > 1 ? "s" : ""}</p>
                                  </div>
                                  <RiskBadge days={maxDays} />
                                </div>
                                {bwr.items.slice(0,3).map((it, j) => (
                                  <div key={j} className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                                    <span className="truncate max-w-[60%]">{it.Copy?.Book?.title || "Unknown"}</span>
                                    <span className="font-semibold text-red-500 ml-2 shrink-0">{it.daysOverdue}d</span>
                                  </div>
                                ))}
                                {bwr.items.length > 3 && <p className="text-[10px] text-gray-400 mt-0.5">+{bwr.items.length - 3} more</p>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  }
                </Section>
              </div>

              {/* Drill-down table */}
              <Section
                title={selectedOverdueBucket ? `${selectedOverdueBucket} — ${bucketItems.length} books` : `All Overdue — ${bucketItems.length} books`}
                sub="Sorted by days overdue">
                {bucketItems.length === 0
                  ? <p className="text-xs text-gray-300 text-center py-8">No items</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Book","Copy","Borrower","Due Date","Overdue","Fine"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {bucketItems.map((issue, i) => (
                            <tr key={i} className="hover:bg-red-50/30 transition">
                              <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[150px] truncate">{issue.Copy?.Book?.title || "—"}</td>
                              <td className="px-3 py-2.5"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{issue.Copy?.copy_code || "—"}</span></td>
                              <td className="px-3 py-2.5 font-medium text-gray-700">{issue.Borrower?.borrower_name || "—"}</td>
                              <td className="px-3 py-2.5 text-red-500 font-semibold whitespace-nowrap">{fmt(issue.due_date)}</td>
                              <td className="px-3 py-2.5"><RiskBadge days={issue.daysOverdue} /></td>
                              <td className="px-3 py-2.5 font-bold text-red-600">{Number(issue.fine) > 0 ? `₹${issue.fine}` : <span className="text-gray-300">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </Section>
            </>
          )}

          {/* ═══════════════════════ DUE SOON ══════════════════════════════════ */}
          {section === "duesoon" && (
            <>
              <div className="grid grid-cols-3 lg:grid-cols-7 gap-3">
                {[0,1,2,3,4,5,6].map(d => {
                  const count = dueSoon.filter(i => i.daysLeft === d).length;
                  const labels = ["Today","Tomorrow","In 2d","In 3d","In 4d","In 5d","In 6d"];
                  return (
                    <div key={d} className={`rounded-xl border p-3 text-center ${count > 0 ? d === 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
                      <p className={`text-[11px] font-semibold mb-1 ${count > 0 ? d === 0 ? "text-red-500" : "text-amber-600" : "text-gray-400"}`}>{labels[d]}</p>
                      <p className={`text-2xl font-black ${count > 0 ? d === 0 ? "text-red-600" : "text-amber-700" : "text-gray-200"}`}>{count}</p>
                    </div>
                  );
                })}
              </div>

              <Section title="All Due Soon" sub="Books due within 7 days — send reminders early">
                {dueSoon.length === 0
                  ? <p className="text-xs text-center text-gray-300 py-10">No books due soon</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Book","Copy","Borrower","Due Date","Days Left"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dueSoon.map((issue, i) => (
                            <tr key={i} className="hover:bg-amber-50/30 transition">
                              <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[160px] truncate">{issue.Copy?.Book?.title || "—"}</td>
                              <td className="px-3 py-2.5"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{issue.Copy?.copy_code || "—"}</span></td>
                              <td className="px-3 py-2.5 font-medium text-gray-700">{issue.Borrower?.borrower_name || "—"}</td>
                              <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{fmt(issue.due_date)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${issue.daysLeft <= 0 ? "bg-red-100 text-red-600" : issue.daysLeft <= 2 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                                  {issue.daysLeft <= 0 ? "Today" : `${issue.daysLeft}d`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </Section>
            </>
          )}

          {/* ═══════════════════════ TRENDS ════════════════════════════════════ */}
          {section === "trends" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Section title="Monthly Issue Volume" sub="Checkouts over selected range">
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={monthlyData} margin={{ top:4, right:16, left:-16, bottom:0 }}>
                      <defs>
                        <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PALETTE.indigo} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={PALETTE.indigo} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <Area type="monotone" dataKey="issued" name="Issued" stroke={PALETTE.indigo} strokeWidth={2.5} fill="url(#tg1)" dot={{ fill:PALETTE.indigo, r:3 }} activeDot={{ r:5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Returns vs Overdue" sub="Monthly comparison">
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={monthlyData} margin={{ top:4, right:16, left:-16, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <Legend formatter={v => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
                      <Line type="monotone" dataKey="returned" name="Returned" stroke={PALETTE.emerald} strokeWidth={2.5} dot={{ fill:PALETTE.emerald, r:3 }} activeDot={{ r:5 }} />
                      <Line type="monotone" dataKey="overdue"  name="Overdue"  stroke={PALETTE.red}     strokeWidth={2} strokeDasharray="5 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Monthly Fines Generated" sub="₹ accumulated per month">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData} margin={{ top:4, right:8, left:-8, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="fines" name="Fines (₹)" fill={PALETTE.rose} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Day of Week Patterns" sub="When activity peaks">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dowData} margin={{ top:4, right:8, left:-16, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CT />} />
                      <Legend formatter={v => <span className="text-xs text-gray-600 capitalize">{v}</span>} />
                      <Bar dataKey="issued"   name="Issued"   fill={PALETTE.blue}    radius={[3,3,0,0]} />
                      <Bar dataKey="returned" name="Returned" fill={PALETTE.emerald} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              {/* Monthly table */}
              <Section title="Month-by-Month Breakdown">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Month","Issued","Returned","Overdue","Return Rate","Fines"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...monthlyData].reverse().map((m, i) => {
                        const rr = m.issued ? Math.round((m.returned/m.issued)*100) : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            <td className="px-3 py-2.5 font-semibold text-gray-700">{m.label}</td>
                            <td className="px-3 py-2.5 font-bold text-blue-600">{m.issued}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-600">{m.returned}</td>
                            <td className="px-3 py-2.5 font-bold text-red-500">{m.overdue || <span className="text-gray-300">0</span>}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.issued===0?"bg-gray-100 text-gray-400":rr>=80?"bg-emerald-100 text-emerald-600":rr>=50?"bg-amber-100 text-amber-600":"bg-red-100 text-red-500"}`}>
                                {m.issued > 0 ? `${rr}%` : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-rose-600">{m.fines > 0 ? `₹${m.fines.toFixed(0)}` : <span className="text-gray-300">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}

          {/* ═══════════════════════ BORROWER INSIGHTS ═════════════════════════ */}
          {section === "borrowers" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI label="Total Borrowers" value={borrowerStats.length}                              sub="in range"           bg="bg-indigo-50"  color="text-indigo-600"  icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                <KPI label="At Risk"          value={borrowerStats.filter(b=>b.overdue>0).length}       sub="have overdue"       bg="bg-red-50"     color="text-red-600"     icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                <KPI label="Power Users"     value={borrowerStats.filter(b=>b.total>=5).length}         sub="5+ issues"          bg="bg-violet-50"  color="text-violet-600"  icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                <KPI label="Avg Issues"      value={(core.total/(borrowerStats.length||1)).toFixed(1)}   sub="per borrower"       bg="bg-teal-50"    color="text-teal-600"    icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Section title="Borrower Segments" sub="Activity classification">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={segments} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                        {segments.map((s,i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip content={<CT />} />
                      <Legend formatter={(v,e) => <span className="text-xs text-gray-600">{v} — {e.payload.value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Reliability Chart" sub="Return rate per top 10 borrower">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={borrowerStats.slice(0,10)} layout="vertical" margin={{ top:4, right:24, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:"#94a3b8" }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="reliabilityRate" name="Return Rate %" radius={[0,4,4,0]}>
                        {borrowerStats.slice(0,10).map((b,i) => (
                          <Cell key={i} fill={b.reliabilityRate >= 80 ? PALETTE.emerald : b.reliabilityRate >= 50 ? PALETTE.amber : PALETTE.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              <Section title="Top Borrowers" sub="Click a row to expand details">
                <div className="space-y-1.5">
                  {borrowerStats.slice(0, 15).map((b, i) => (
                    <div key={i}
                      onClick={() => setSelectedBorrowerId(selectedBorrowerId === b.id ? null : b.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${selectedBorrowerId === b.id ? "border-blue-300 bg-blue-50/60" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${i===0?"bg-amber-100 text-amber-700":i===1?"bg-gray-200 text-gray-600":i===2?"bg-orange-100 text-orange-700":"bg-gray-100 text-gray-400"}`}>{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-bold text-gray-800 truncate">{b.name}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              {b.overdue > 0 && <span className="text-[10px] font-bold text-red-500">{b.overdue} overdue</span>}
                              {b.fines > 0   && <span className="text-[10px] font-bold text-rose-500">₹{b.fines.toFixed(0)}</span>}
                              <span className="text-xs font-black text-gray-800">{b.total}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${(b.total/b._max)*100}%`, background: TOP_COLORS[i % TOP_COLORS.length] }} />
                          </div>
                        </div>
                      </div>
                      {selectedBorrowerId === b.id && (
                        <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-4 gap-3">
                          {[
                            { label:"Total",    value: b.total,                color:"text-blue-700"    },
                            { label:"Returned", value: b.returned,             color:"text-emerald-600" },
                            { label:"Overdue",  value: b.overdue,              color: b.overdue>0?"text-red-500":"text-gray-400" },
                            { label:"Return %", value:`${b.reliabilityRate}%`, color: b.reliabilityRate>=80?"text-emerald-600":b.reliabilityRate>=50?"text-amber-600":"text-red-500" },
                          ].map(s => (
                            <div key={s.label} className="text-center">
                              <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                              <p className="text-[10px] text-gray-400">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ═══════════════════════ BOOK PERFORMANCE ══════════════════════════ */}
          {section === "books" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI label="Unique Titles"   value={bookStats.length}                                  sub="in circulation"   bg="bg-teal-50"   color="text-teal-600"   icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5" />
                <KPI label="Most Issued"     value={bookStats[0]?.count || 0}                          sub={bookStats[0]?.name || "—"} bg="bg-indigo-50" color="text-indigo-600" icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674" />
                <KPI label="Total Checkouts" value={core.total}                                        sub="across all books" bg="bg-blue-50"   color="text-blue-600"   icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10" />
                <KPI label="Avg / Title"     value={(core.total/(bookStats.length||1)).toFixed(1)}     sub="checkouts"        bg="bg-violet-50" color="text-violet-600" icon="M9 19v-6a2 2 0 00-2-2H5" />
              </div>

              <Section title="Top Books" sub="Most checked-out titles in range">
                <ResponsiveContainer width="100%" height={Math.max(220, bookStats.slice(0,10).length * 38)}>
                  <BarChart data={bookStats.slice(0,10)} layout="vertical" margin={{ top:4, right:32, left:8, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:"#94a3b8" }} axisLine={false} tickLine={false} width={190} />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="count" name="Checkouts" radius={[0,4,4,0]}>
                      {bookStats.slice(0,10).map((_,i) => <Cell key={i} fill={TOP_COLORS[i%TOP_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Full Performance Table" sub="With return rate and overdue stats">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["#","Title","Checkouts","Returned","Overdue","Return Rate","Copies"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookStats.map((b, i) => {
                        const rr = b.count ? Math.round((b.returned/b.count)*100) : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition">
                            <td className="px-3 py-2.5">
                              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${i===0?"bg-amber-100 text-amber-700":i===1?"bg-gray-200 text-gray-600":i===2?"bg-orange-100 text-orange-700":"bg-gray-100 text-gray-400"}`}>{i+1}</span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[200px] truncate">{b.name}</td>
                            <td className="px-3 py-2.5 font-black text-blue-600">{b.count}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-600">{b.returned}</td>
                            <td className="px-3 py-2.5">{b.overdue > 0 ? <span className="font-bold text-red-500">{b.overdue}</span> : <span className="text-gray-300">0</span>}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width:`${rr}%`, background: rr>=80?PALETTE.emerald:rr>=50?PALETTE.amber:PALETTE.red }} />
                                </div>
                                <span className={`text-[10px] font-bold ${rr>=80?"text-emerald-600":rr>=50?"text-amber-600":"text-red-500"}`}>{rr}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500">{b.copies}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}

          {/* ═══════════════════════ FINE ANALYTICS ════════════════════════════ */}
          {section === "fines" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPI label="Total Fines"    value={`₹${core.totalFine.toFixed(0)}`}                    sub="generated"              bg="bg-rose-50"    color="text-rose-600"    icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2" />
                <KPI label="Outstanding"   value={`₹${fineStats.totalOut.toFixed(0)}`}                 sub={`${fineStats.outstanding.length} unpaid`} bg="bg-red-50" color="text-red-600" icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0" />
                <KPI label="Collected"     value={`₹${(core.totalFine - fineStats.totalOut).toFixed(0)}`} sub="recovered"            bg="bg-emerald-50" color="text-emerald-600"  icon="M5 13l4 4L19 7" />
                <KPI label="Collection Rate" value={core.totalFine>0?`${Math.round(((core.totalFine-fineStats.totalOut)/core.totalFine)*100)}%`:"—"} sub="of total" bg="bg-violet-50" color="text-violet-600" icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Section title="Fine Status Split" sub="Collected vs outstanding">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={[
                        { name:"Collected",   value: parseFloat((core.totalFine - fineStats.totalOut).toFixed(2)), color: PALETTE.emerald },
                        { name:"Outstanding", value: parseFloat(fineStats.totalOut.toFixed(2)),                    color: PALETTE.red     },
                      ].filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                        {[PALETTE.emerald,PALETTE.red].map((c,i)=><Cell key={i} fill={c}/>)}
                      </Pie>
                      <Tooltip content={<CT />} />
                      <Legend formatter={(v,e)=><span className="text-xs text-gray-600">{v} — ₹{e.payload.value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Monthly Fine Trend" sub="₹ generated per month">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData} margin={{ top:4, right:16, left:-8, bottom:0 }}>
                      <defs>
                        <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={PALETTE.rose} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={PALETTE.rose} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                      <Tooltip content={<CT />} />
                      <Area type="monotone" dataKey="fines" name="Fines (₹)" stroke={PALETTE.rose} strokeWidth={2.5} fill="url(#fg)" dot={{ fill:PALETTE.rose, r:3 }} activeDot={{ r:5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Section>
              </div>

              <Section title="Top Outstanding Debtors" sub="Borrowers with highest unpaid fines">
                {fineStats.debtors.length === 0
                  ? <p className="text-xs text-center text-gray-300 py-8">No outstanding fines</p>
                  : <div className="space-y-3">{fineStats.debtors.map((b,i) => (
                    <ProgressBar key={i} value={b.total} max={b._max} color={TOP_COLORS[i%TOP_COLORS.length]}
                      label={b.name} sublabel={`₹${b.total.toFixed(2)} · ${b.count} fine${b.count>1?"s":""}`} />
                  ))}</div>
                }
              </Section>

              <Section title="All Outstanding Fines" sub="Full unpaid list — sorted by amount">
                {fineStats.outstanding.length === 0
                  ? <p className="text-xs text-center text-gray-300 py-8">No outstanding fines 🎉</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Book","Copy","Borrower","Due","Status","Fine"].map(h=>(
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {fineStats.outstanding.sort((a,b)=>Number(b.fine)-Number(a.fine)).map((issue,i)=>{
                            const od = issue.status === "issued" && new Date(issue.due_date) < new Date();
                            return (
                              <tr key={i} className="hover:bg-rose-50/20 transition">
                                <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[150px] truncate">{issue.Copy?.Book?.title||"—"}</td>
                                <td className="px-3 py-2.5"><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{issue.Copy?.copy_code||"—"}</span></td>
                                <td className="px-3 py-2.5 font-medium text-gray-700">{issue.Borrower?.borrower_name||"—"}</td>
                                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(issue.due_date)}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${od?"bg-red-100 text-red-600":"bg-amber-100 text-amber-600"}`}>
                                    {od?"Overdue":"Returned"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 font-black text-red-600">₹{issue.fine}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </Section>
            </>
          )}

        </main>
      </div>
    </div>
  );
}