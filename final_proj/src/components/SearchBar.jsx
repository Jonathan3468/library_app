import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";

const TYPE_CONFIG = {
  book:      { icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "bg-blue-100 text-blue-600",   label: "Book" },
  author:    { icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",                                                                                                                                                                                                                                                   color: "bg-purple-100 text-purple-600", label: "Author" },
  borrower:  { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",                                                                                                                                                                                                                                                                               color: "bg-green-100 text-green-600",  label: "Borrower" },
  publisher: { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",                                                                                                                                                                                                     color: "bg-orange-100 text-orange-600", label: "Publisher" },
};

function TypeIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", color: "bg-gray-100 text-gray-500" };
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
      </svg>
    </div>
  );
}

export default function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  // Fetch suggestions
  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target)) {
        close();
      }
    };
    if (expanded) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") close(); };
    if (expanded) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded]);

  const open = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const close = () => {
    setExpanded(false);
    setSuggestions([]);
  };

  const fetchSuggestions = async () => {
    try {
      const res = await API.get(`/search/suggestions?q=${query}`);
      setSuggestions(res.data.suggestions || []);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      close();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    close();
    if (suggestion.type === "book" && suggestion.id) {
      navigate(`/books/${suggestion.id}`);
    } else if (suggestion.type === "borrower" && suggestion.id && isLibrarian()) {
      navigate(`/borrowers/${suggestion.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => !(s.type === "borrower" && !isLibrarian())
  );

  return (
    <>
      {/* ── Collapsed trigger button in navbar ── */}
      <button
        onClick={open}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm text-gray-500 transition-all w-64"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search books, authors…</span>
        <span className="ml-auto text-[10px] font-semibold bg-gray-200 text-gray-400 px-1.5 py-0.5 rounded">⌘K</span>
      </button>

      {/* ── Expanded overlay ── */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
        >
          {/* Panel slides down from top */}
          <div
            ref={overlayRef}
            className="w-full max-w-2xl mx-4 mt-16 animate-[slideDown_0.2s_ease-out]"
            style={{ animation: "slideDown 0.2s ease-out" }}
          >
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-20px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Search input */}
            <form onSubmit={handleSearch} className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books, authors, publishers…"
                className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-16 py-4 text-base text-gray-800 placeholder-gray-400 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Go
              </button>
            </form>

            {/* Suggestions dropdown */}
            {filteredSuggestions.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                  >
                    <TypeIcon type={suggestion.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{suggestion.text}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {TYPE_CONFIG[suggestion.type]?.label || suggestion.type}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {/* Hint */}
            <p className="text-center text-xs text-white/60 mt-3">
              Press <kbd className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[11px] font-mono">Enter</kbd> to search all results &nbsp;·&nbsp; <kbd className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[11px] font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}