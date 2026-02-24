import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian, getCurrentUser } from "../utils/auth";

// ── Notice type config ────────────────────────────────────────────────────────
const NOTICE_TYPES = {
  info:    { label: "Info",    bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-800",  subtext: "text-blue-500",  dot: "bg-blue-400",  icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  warning: { label: "Warning", bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800", subtext: "text-amber-500", dot: "bg-amber-400", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  closed:  { label: "Closed",  bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800",   subtext: "text-red-400",   dot: "bg-red-500",   icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  event:   { label: "Event",   bg: "bg-purple-50", border: "border-purple-200",text: "text-purple-800",subtext: "text-purple-400",dot: "bg-purple-400",icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
};

function NoticeBoard({ user }) {
  const [notices, setNotices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm]         = useState({ message: "", type: "info" });
  const [posting, setPosting]   = useState(false);

  useEffect(() => { fetchNotices(); }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await API.get("/notices");
      setNotices(res.data.notices || []);
    } catch { setNotices([]); } finally { setLoading(false); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setPosting(true);
    try {
      await API.post("/notices", { message: form.message.trim(), type: form.type });
      setForm({ message: "", type: "info" });
      setShowForm(false);
      fetchNotices();
    } catch { } finally { setPosting(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/notices/${id}`);
      fetchNotices();
    } catch { } finally { setDeleting(null); }
  };

  const fmtTime = (d) => {
    const date = new Date(d);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Notice Board</p>
            <p className="text-xs text-gray-400">{notices.length} active notice{notices.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {isLibrarian() && (
          <button
            onClick={() => setShowForm(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              showForm
                ? "bg-gray-100 text-gray-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {showForm ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post Notice
              </>
            )}
          </button>
        )}
      </div>

      {/* Post form */}
      {showForm && isLibrarian() && (
        <form onSubmit={handlePost} className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div className="flex gap-2">
            {Object.entries(NOTICE_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: key }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  form.type === key
                    ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </div>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder='e.g. "Library will be closed on Monday for a public holiday."'
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-white"
            rows={3}
            required
            autoFocus
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Posted as <span className="font-semibold text-gray-600">{user.name}</span></p>
            <button
              type="submit"
              disabled={posting || !form.message.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {posting ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Posting...
                </>
              ) : "Post Notice"}
            </button>
          </div>
        </form>
      )}

      {/* Notices list */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          <div className="py-10 flex items-center justify-center text-gray-400 text-sm gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading notices...
          </div>
        ) : notices.length === 0 ? (
          <div className="py-10 text-center">
            <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <p className="text-sm text-gray-400">No notices posted yet</p>
          </div>
        ) : (
          notices.map(notice => {
            const cfg = NOTICE_TYPES[notice.type] || NOTICE_TYPES.info;
            return (
              <div key={notice.id} className={`px-5 py-4 ${cfg.bg} flex gap-4 items-start group`}>
                {/* Icon */}
                <div className={`w-8 h-8 rounded-xl border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                  <svg className={`w-4 h-4 ${cfg.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={cfg.icon} />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                    <span className={`text-xs ${cfg.subtext}`}>·</span>
                    <span className={`text-xs ${cfg.subtext}`}>{fmtTime(notice.createdAt)}</span>
                  </div>
                  <p className={`text-sm font-medium ${cfg.text} leading-relaxed`}>{notice.message}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-4 h-4 rounded-full bg-white/70 border border-white flex items-center justify-center">
                      <svg className={`w-2.5 h-2.5 ${cfg.subtext}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className={`text-xs ${cfg.subtext}`}>
                      Posted by <span className="font-semibold">{notice.posted_by_name || "Staff"}</span>
                    </p>
                  </div>
                </div>

                {/* Delete */}
                {isLibrarian() && (
                  <button
                    onClick={() => handleDelete(notice.id)}
                    disabled={deleting === notice.id}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/60 ${cfg.subtext} hover:text-red-500 disabled:opacity-50 shrink-0`}
                    title="Delete notice"
                  >
                    {deleting === notice.id ? (
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const user     = getCurrentUser();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [dashRes, fineRes] = await Promise.all([
        API.get("/dashboard"),
        isLibrarian() ? API.get("/fines/stats") : Promise.resolve({ data: { stats: null } }),
      ]);
      setStats({ ...dashRes.data, fineStats: fineRes.data.stats });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          Error loading dashboard. Please try again.
        </div>
      </div>
    );
  }

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const STAT_ICON = {
    book:      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    copy:      "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2",
    borrowers: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    check:     "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    fine:      "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  const statCards = [
    { title: "Total Books",      value: stats.totalBooks,    iconPath: STAT_ICON.book,      color: "blue"   },
    { title: "Total Copies",     value: stats.totalCopies,   iconPath: STAT_ICON.copy,      color: "purple" },
    ...(isLibrarian() ? [
      { title: "Total Borrowers",  value: stats.totalBorrowers, iconPath: STAT_ICON.borrowers, color: "emerald" },
      { title: "Currently Issued", value: stats.issuedBooks,    iconPath: STAT_ICON.check,     color: "amber"  },
      { title: "Total Returned",   value: stats.returnedBooks,  iconPath: STAT_ICON.check,     color: "gray"   },
      ...(stats.fineStats ? [{
        title: "Outstanding Fines",
        value: `₹${stats.fineStats.total_outstanding || 0}`,
        iconPath: STAT_ICON.fine,
        color: "red",
      }] : []),
    ] : []),
  ];

  const COLOR = {
    blue:   { bg: "bg-blue-50",    icon: "text-blue-500",    bar: "bg-blue-500"   },
    purple: { bg: "bg-purple-50",  icon: "text-purple-500",  bar: "bg-purple-500" },
    emerald:{ bg: "bg-emerald-50", icon: "text-emerald-500", bar: "bg-emerald-500"},
    amber:  { bg: "bg-amber-50",   icon: "text-amber-500",   bar: "bg-amber-500"  },
    gray:   { bg: "bg-gray-100",   icon: "text-gray-500",    bar: "bg-gray-400"   },
    red:    { bg: "bg-red-50",     icon: "text-red-500",     bar: "bg-red-500"    },
  };

  // ── Quick actions ─────────────────────────────────────────────────────────────
  const quickActions = [
    { label: "Scan Book",  sub: "Issue / Return",   path: "/scan",      color: "bg-blue-500",   iconPath: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3a2 2 0 00-2 2v10a2 2 0 002 2h3.5" },
    { label: "Borrowers",  sub: "View members",     path: "/borrowers", color: "bg-emerald-500",iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { label: "Fines",      sub: "Manage payments",  path: "/fines",     color: "bg-red-500",    iconPath: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Reports",    sub: "View issues",      path: "/reports",   color: "bg-purple-500", iconPath: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Welcome back, <span className="font-semibold text-gray-600">{user.name}</span>
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          {statCards.map((card, i) => {
            const c = COLOR[card.color] || COLOR.blue;
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center`}>
                      <svg className={`w-4.5 h-4.5 ${c.icon}`} style={{width:"1.125rem",height:"1.125rem"}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={card.iconPath} />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                </div>
                <div className={`h-1 ${c.bar}`} />
              </div>
            );
          })}
        </div>

        {/* Notice Board + Quick Actions — side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Notice board — takes 2/3 */}
          <div className="lg:col-span-2">
            <NoticeBoard user={user} />
          </div>

          {/* Quick Actions — takes 1/3 */}
          {isLibrarian() && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map(action => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition group"
                  >
                    <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.iconPath} />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-700">{action.label}</p>
                      <p className="text-[10px] text-gray-400">{action.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}