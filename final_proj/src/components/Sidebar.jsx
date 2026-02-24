import { NavLink } from "react-router-dom";
import {
  getCurrentUser,
  isAdmin,
  isLibrarian,
  isMember,
  getBorrowerId,
  logout,
} from "../utils/auth";

const Icon = ({ path }) => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
  </svg>
);

const icons = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  book:      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  fire:      "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  users:     "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  user:      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  pen:       "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  building:  "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  scan:      "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3a2 2 0 00-2 2v10a2 2 0 002 2h3.5",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  coin:      "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bell:      "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  inbox:     "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
  shield:    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  settings:  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  x:         "M6 18L18 6M6 6l12 12",
  audit: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
};

const ROLE_BADGE = {
  admin:     { label: "Administrator", color: "bg-red-500 text-white",   avatar: "bg-red-500 text-white"   },
  librarian: { label: "Librarian",     color: "bg-blue-500 text-white",  avatar: "bg-blue-500 text-white"  },
  member:    { label: "Member",        color: "bg-green-500 text-white", avatar: "bg-green-500 text-white" },
};

function NavItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
          isActive
            ? "bg-blue-50 text-blue-600 font-medium border border-blue-200"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`
      }
    >
      <Icon path={icons[icon]} />
      <span>{label}</span>
    </NavLink>
  );
}

function SectionLabel({ label }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 select-none">
      {label}
    </p>
  );
}

function ScanNavItem({ onClick }) {
  return (
    <>
      <style>{`
        @keyframes scanGlow {
          0%   { box-shadow: 0 2px 8px rgba(37,99,235,0.3), 0 0 0px rgba(34,197,94,0.2); }
          50%  { box-shadow: 0 4px 20px rgba(37,99,235,0.55), 0 4px 24px rgba(34,197,94,0.45); }
          100% { box-shadow: 0 2px 8px rgba(37,99,235,0.3), 0 0 0px rgba(34,197,94,0.2); }
        }
        @keyframes scanShine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .scan-item { animation: scanGlow 2.5s ease-in-out infinite; position: relative; overflow: hidden; }
        .scan-item::after {
          content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: scanShine 3s ease-in-out infinite;
          pointer-events: none; border-radius: inherit;
        }
      `}</style>
      <NavLink
        to="/scan"
        onClick={onClick}
        className={({ isActive }) =>
          `scan-item flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all ${
            isActive ? "text-white border border-blue-700" : "text-blue-700 border border-blue-200 hover:border-blue-300"
          }`
        }
        style={({ isActive }) => ({
          background: isActive
            ? "linear-gradient(135deg, #2563eb, #16a34a)"
            : "linear-gradient(135deg, #eff6ff, #f0fdf4)",
        })}
      >
        <Icon path={icons.scan} />
        <span>Scan — Issue / Return</span>
      </NavLink>
    </>
  );
}

export default function Sidebar({ onClose }) {
  const user = getCurrentUser();
  if (!user) return null;

  const borrowerId = getBorrowerId();
  const badge = ROLE_BADGE[user.role] || ROLE_BADGE.member;

  // Close sidebar on nav (mobile)
  const handleNav = () => { if (onClose) onClose(); };

  return (
    <div className="w-60 h-full bg-white border-r border-gray-200 flex flex-col shadow-sm">

      {/* Brand + mobile close button */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Icon path={icons.book} />
            </div>
            <span className="text-gray-900 font-bold text-base tracking-tight">SmartLib</span>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close menu"
          >
            <Icon path={icons.x} />
          </button>
        </div>

        {/* User card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-3 mb-2.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${badge.avatar}`}>
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className={`w-full text-center text-xs font-semibold py-1 rounded-lg ${badge.color}`}>
            {badge.label}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <SectionLabel label="Overview" />
        <NavItem to="/dashboard" icon="dashboard" label="Dashboard"     onClick={handleNav} />
        <NavItem to="/books"     icon="book"      label="Books"         onClick={handleNav} />
        <NavItem to="/popular"   icon="fire"      label="Popular Books" onClick={handleNav} />

        {isMember() && borrowerId && (
          <>
            <SectionLabel label="My Account" />
            <NavItem to={`/borrowers/${borrowerId}`} icon="user"  label="My Profile"   onClick={handleNav} />
            <NavItem to="/requests"                  icon="inbox" label="My Requests"  onClick={handleNav} />
          </>
        )}

        {(isLibrarian() || isAdmin()) && (
          <>
            <SectionLabel label="Catalog" />
            <NavItem to="/authors"      icon="pen"      label="Authors"      onClick={handleNav} />
            <NavItem to="/publications" icon="building" label="Publications" onClick={handleNav} />

            <SectionLabel label="Operations" />
            <ScanNavItem onClick={handleNav} />
            <NavItem to="/borrowers"    icon="users"     label="Borrowers"      onClick={handleNav} />
            <NavItem to="/reports"      icon="clipboard" label="Reports"         onClick={handleNav} />
            <NavItem to="/fines"        icon="coin"      label="Fines"           onClick={handleNav} />

            <SectionLabel label="Communication" />
            <NavItem to="/notifications" icon="bell"  label="Notifications" onClick={handleNav} />
            <NavItem to="/requests"      icon="inbox" label="Requests"      onClick={handleNav} />
          </>
        )}

        {isAdmin() && (
          <>
            <SectionLabel label="Administration" />
            <NavItem to="/users" icon="shield" label="User Management" onClick={handleNav} />
          </>
        )}
      </nav>
      
        {isAdmin() && (
  <>
    <SectionLabel label="Administration" />
    <NavItem to="/users"   icon="shield" label="User Management" onClick={handleNav} />
    <NavItem to="/audits"  icon="audit"  label="Audit Log"       onClick={handleNav} />
  </>
)}

      {/* Settings + Logout */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-0.5">
        <NavItem to="/settings" icon="settings" label="Settings" onClick={handleNav} />
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <Icon path={icons.logout} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}