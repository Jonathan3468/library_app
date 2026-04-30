import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";
import { loadImage } from "../utils/imageStorage";

const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }
  @keyframes border-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .book-card-outer {
    position: relative;
    border-radius: 16px;
    padding: 1px;
    background: #e9e9ef;
    overflow: hidden;
    animation: float 5s ease-in-out infinite;
    display: flex;
    flex-direction: column;
  }
  .book-card-outer:nth-child(2) { animation-delay: 0.3s; }
  .book-card-outer:nth-child(3) { animation-delay: 0.6s; }
  .book-card-outer:nth-child(4) { animation-delay: 0.9s; }
  .book-card-outer:nth-child(5) { animation-delay: 1.2s; }
  .book-card-outer:nth-child(6) { animation-delay: 1.5s; }
  .book-card-outer::before {
    content: '';
    position: absolute;
    inset: -120%;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      transparent 30%,
      #60a5fa 50%,
      #2563eb 55%,
      transparent 70%
    );
    opacity: 0;
    transform-origin: center;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .book-card-outer:hover::before {
    opacity: 1;
    animation: border-spin 0.8s linear forwards;
  }
  .book-card-inner {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 15px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex: 1;
    cursor: pointer;
  }
`;

const BOOK_CSV_COLUMNS = [
  { key: "title",            label: "title",            required: true  },
  { key: "isbn",             label: "isbn",             required: true  },
  { key: "publication_year", label: "publication_year", required: true  },
  { key: "author_name",      label: "author_name",      required: false },
  { key: "genre_name",       label: "genre_name",       required: false },
  { key: "category_name",    label: "category_name",    required: false },
  { key: "publication_name", label: "publication_name", required: false },
];
const BOOK_CSV_KEYS   = BOOK_CSV_COLUMNS.map(c => c.key);
const REQUIRED_KEYS   = BOOK_CSV_COLUMNS.filter(c => c.required).map(c => c.key);

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
  } catch {
    return { headers: [], rows: [], error: "Failed to read Excel file. Make sure it's a valid .xlsx or .xls file." };
  }
}

// ── Pill group (Categories / Genres) ────────────────────────────────────────
// Shows chips; if > PILL_THRESHOLD items, adds an inline search to narrow them.
const PILL_THRESHOLD = 8;

function PillFilterGroup({ label, items, selected, onToggle, idField, nameField, accentColor }) {
  const [q, setQ] = useState("");
  const getId   = item => item[idField]   || item.id;
  const getName = item => item[nameField] || item.name;

  const visible = q.trim()
    ? items.filter(i => getName(i).toLowerCase().includes(q.toLowerCase()))
    : items;

  const colors = {
    blue:   { active: "bg-blue-100 border-blue-300 text-blue-700",   idle: "bg-white border-gray-200 text-gray-600 hover:border-blue-200" },
    indigo: { active: "bg-indigo-100 border-indigo-300 text-indigo-700", idle: "bg-white border-gray-200 text-gray-600 hover:border-indigo-200" },
  };
  const c = colors[accentColor] || colors.blue;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {selected.length > 0 && (
          <span className="text-[10px] text-gray-400">{selected.length} selected</span>
        )}
      </div>

      {items.length > PILL_THRESHOLD && (
        <div className="relative mb-2">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {visible.length === 0 && <p className="text-xs text-gray-400 italic">No matches</p>}
        {visible.map(item => {
          const id = getId(item);
          const isActive = selected.includes(id);
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${isActive ? c.active : c.idle}`}
            >
              {getName(item)}{isActive && <span className="ml-1 opacity-60">×</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Searchable dropdown group (Authors / Publishers) ─────────────────────────
// Text input → filtered list with checkboxes; selected tags shown above input.
function SearchableFilterGroup({ label, items, selected, onToggle, idField, nameField, accentColor }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const getId   = item => item[idField]   || item.id;
  const getName = item => item[nameField] || item.name;

  const filtered = q.trim()
    ? items.filter(i => getName(i).toLowerCase().includes(q.toLowerCase()))
    : items;

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const colors = {
    violet: { tag: "bg-violet-100 text-violet-700 border-violet-200", check: "accent-violet-600" },
    orange: { tag: "bg-orange-100 text-orange-700 border-orange-200", check: "accent-orange-500" },
  };
  const c = colors[accentColor] || colors.violet;

  const selectedItems = items.filter(i => selected.includes(getId(i)));

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {selected.length > 0 && (
          <span className="text-[10px] text-gray-400">{selected.length} selected</span>
        )}
      </div>

      {/* Selected tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedItems.map(item => {
            const id = getId(item);
            return (
              <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.tag}`}>
                {getName(item)}
                <button onClick={() => onToggle(id)} className="hover:opacity-70 transition">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition bg-white"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto z-10 relative">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 italic text-center">No matches</p>
          ) : (
            filtered.map(item => {
              const id = getId(item);
              const isActive = selected.includes(id);
              return (
                <label
                  key={id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => onToggle(id)}
                    className={`w-3.5 h-3.5 rounded ${c.check} border-gray-300 cursor-pointer`}
                  />
                  <span className={`flex-1 truncate ${isActive ? "font-medium text-gray-800" : "text-gray-600"}`}>
                    {getName(item)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function Books() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [order, setOrder] = useState("ASC");
  const [categories, setCategories] = useState([]);
  const [genres, setGenres] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allGenres, setAllGenres] = useState([]);
  const [allAuthors, setAllAuthors] = useState([]);
  const [allPublishers, setAllPublishers] = useState([]);
  const [error, setError] = useState(null);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState("upload");
  const [importRows, setImportRows] = useState([]);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileType, setFileType] = useState("");
  const fileInputRef = useRef(null);

  const activeFilterCount = categories.length + genres.length + authors.length + publishers.length;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPage(1);
  }, [debouncedSearch, categories.length, genres.length, authors.length, publishers.length, sortBy, order]);

  useEffect(() => { fetchBooks(); }, [page, limit, debouncedSearch, sortBy, order, categories, genres, authors, publishers]);
  useEffect(() => { fetchFilters(); }, []);

  const fetchFilters = async () => {
    setFiltersLoading(true);
    try {
      const [cRes, gRes, aRes, pRes] = await Promise.all([
        API.get("/categories"), API.get("/genres"), API.get("/authors"), API.get("/publications")
      ]);
      setAllCategories(Array.isArray(cRes.data) ? cRes.data : cRes.data.categories ?? []);
      setAllGenres(Array.isArray(gRes.data) ? gRes.data : gRes.data.genres ?? []);
      setAllAuthors(Array.isArray(aRes.data) ? aRes.data : aRes.data.authors ?? []);
      setAllPublishers(Array.isArray(pRes.data) ? pRes.data : pRes.data.publications ?? []);
    } catch { setError("Failed to load filters."); }
    finally { setFiltersLoading(false); }
  };

  const fetchBooks = async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit, sortBy, order };
      if (debouncedSearch)    params.search      = debouncedSearch;
      if (categories.length)  params.category    = categories.join(",");
      if (genres.length)      params.genre       = genres.join(",");
      if (authors.length)     params.author      = authors.join(",");
      if (publishers.length)  params.publication = publishers.join(",");
      const res = await API.get("/books", { params });
      setBooks(Array.isArray(res.data.books) ? res.data.books : []);
      setTotalPages(res.data.totalPages || 1);
    } catch { setError("Failed to load books."); setBooks([]); }
    finally { setLoading(false); }
  };

  const toggleFilter = (id, list, setList) =>
    list.includes(id) ? setList(list.filter(x => x !== id)) : setList([...list, id]);

  const clearAllFilters = () => { setCategories([]); setGenres([]); setAuthors([]); setPublishers([]); };

  // ── Import handlers ────────────────────────────────────────────────────────
  const resetImport = () => {
    setImportStep("upload"); setImportRows([]); setImportHeaders([]);
    setImportError(""); setImportResult(null); setFileType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processParseResult = ({ headers, rows, error }) => {
    if (error) { setImportError(error); return; }
    const missingRequired = REQUIRED_KEYS.filter(k => !headers.includes(k));
    if (missingRequired.length > 0) {
      setImportError(`File is missing required column(s): ${missingRequired.join(", ")}. Found: ${headers.join(", ")}`);
      return;
    }
    setImportError(""); setImportHeaders(headers); setImportRows(rows); setImportStep("preview");
  };

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const isCSV   = name.endsWith(".csv");
    if (!isExcel && !isCSV) { setImportError("Please upload a .csv, .xlsx, or .xls file."); return; }
    setImportError("");
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
      const res = await API.post("/books/import", { books: importRows });
      setImportResult(res.data);
      setImportStep("result");
      if (res.data.created > 0) fetchBooks();
    } catch (err) {
      setImportError(err.response?.data?.error || "Import failed");
    } finally { setImporting(false); }
  };

  const downloadTemplate = (type = "csv") => {
    const headerRow  = BOOK_CSV_KEYS;
    const exampleRow = ["The Great Gatsby", "9780743273565", "1925", "F. Scott Fitzgerald", "Fiction", "Classic Literature", "Scribner"];
    if (type === "csv") {
      const blob = new Blob([`${headerRow.join(",")}\n${exampleRow.join(",")}\n`], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = "books_template.csv"; a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
      ws["!cols"] = headerRow.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Books");
      XLSX.writeFile(wb, "books_template.xlsx");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Books</h2>
              <p className="text-sm text-gray-400 mt-0.5">{books.length} shown</p>
            </div>
            {isLibrarian() && (
              <div className="flex gap-2">
                <button
                  onClick={() => { resetImport(); setShowImportModal(true); }}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:border-blue-300 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import
                </button>
                <button
                  onClick={() => navigate("/books/new")}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Book
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex justify-between">
              {error}
              <button onClick={() => setError(null)} className="underline">Dismiss</button>
            </div>
          )}

          {/* Search + Sort bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-300">
              <option value="title">Title</option>
              <option value="publication_year">Year</option>
            </select>
            <select value={order} onChange={(e) => setOrder(e.target.value)}
              className="border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-300">
              <option value="ASC">A → Z</option>
              <option value="DESC">Z → A</option>
            </select>
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                filtersOpen || activeFilterCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
              <svg className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* ── Collapsible filters ── */}
          {filtersOpen && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-gray-700">Filter by</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-red-500 hover:underline">
                    Clear all ({activeFilterCount})
                  </button>
                )}
              </div>

              {filtersLoading ? (
                <p className="text-sm text-gray-400">Loading filters…</p>
              ) : (
                // 2-column grid: left = pill groups, right = searchable groups
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">

                  {/* Categories — pills */}
                  {allCategories.length > 0 && (
                    <PillFilterGroup
                      label="Categories"
                      items={allCategories}
                      selected={categories}
                      onToggle={id => toggleFilter(id, categories, setCategories)}
                      idField="category_id"
                      nameField="category_name"
                      accentColor="blue"
                    />
                  )}

                  {/* Authors — searchable dropdown */}
                  {allAuthors.length > 0 && (
                    <SearchableFilterGroup
                      label="Authors"
                      items={allAuthors}
                      selected={authors}
                      onToggle={id => toggleFilter(id, authors, setAuthors)}
                      idField="author_id"
                      nameField="author_name"
                      accentColor="violet"
                    />
                  )}

                  {/* Genres — pills */}
                  {allGenres.length > 0 && (
                    <PillFilterGroup
                      label="Genres"
                      items={allGenres}
                      selected={genres}
                      onToggle={id => toggleFilter(id, genres, setGenres)}
                      idField="genre_id"
                      nameField="genre_name"
                      accentColor="indigo"
                    />
                  )}

                  {/* Publishers — searchable dropdown */}
                  {allPublishers.length > 0 && (
                    <SearchableFilterGroup
                      label="Publishers"
                      items={allPublishers}
                      selected={publishers}
                      onToggle={id => toggleFilter(id, publishers, setPublishers)}
                      idField="publication_id"
                      nameField="publication_name"
                      accentColor="orange"
                    />
                  )}

                </div>
              )}
            </div>
          )}

          {/* Books Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              No books found
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {books.map((book) => {
                const coverImage = loadImage("book", book.book_id);
                return (
                  <div key={book.book_id} className="book-card-outer">
                    <div className="book-card-inner" onClick={() => navigate(`/books/${book.book_id}`)}>
                      <div className="w-full bg-gradient-to-br from-slate-100 to-slate-200" style={{ height: "220px" }}>
                        {coverImage ? (
                          <img src={coverImage} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-xs">No Cover</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1">{book.title}</h3>
                        {book.Authors?.length > 0 && (
                          <p className="text-xs text-gray-400 truncate mb-2">{book.Authors.map(a => a.author_name).join(", ")}</p>
                        )}
                        <div className="mt-auto flex flex-wrap gap-1">
                          {book.Genres?.slice(0, 2).map(genre => (
                            <span key={genre.genre_id} className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {genre.genre_name}
                            </span>
                          ))}
                          {book.publication_year && (
                            <span className="text-[10px] text-gray-400 ml-auto self-end">{book.publication_year}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex gap-2 items-center justify-center">
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 font-medium text-gray-600 transition">
              ← Prev
            </button>
            <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 font-medium text-gray-600 transition">
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Import Modal ───────────────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Bulk Import Books</h3>
                  <p className="text-xs text-gray-400">Upload a CSV or Excel file to add multiple books at once</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); resetImport(); }} className="text-gray-300 hover:text-gray-500 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 pt-4 shrink-0">
              <div className="flex items-center gap-2 text-xs mb-5">
                {[["upload", "1. Upload"], ["preview", "2. Preview"], ["result", "3. Result"]].map(([step, label], i) => (
                  <div key={step} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    <span className={`px-3 py-1 rounded-full font-medium transition ${importStep === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6">

              {importStep === "upload" && (
                <div className="space-y-5">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                    className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-10 text-center cursor-pointer transition group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center mx-auto mb-3 transition">
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Drop your file here</p>
                    <p className="text-xs text-gray-400 mb-3">or click to browse</p>
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">CSV</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-200">Excel (.xlsx / .xls)</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {importError}
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600">Expected format</p>
                      <div className="flex gap-2">
                        <button onClick={() => downloadTemplate("csv")} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          CSV template
                        </button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => downloadTemplate("excel")} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Excel template
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {BOOK_CSV_COLUMNS.map(col => (
                              <th key={col.key} className={`px-2 py-1.5 text-left font-semibold whitespace-nowrap ${col.required ? "text-red-600" : "text-gray-500"}`}>
                                {col.label}{col.required && " *"}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {["The Great Gatsby", "9780743273565", "1925", "F. Scott Fitzgerald", "Fiction", "Classic", "Scribner"].map((v, i) => (
                              <td key={i} className="px-2 py-1.5 text-gray-400 whitespace-nowrap">{v}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      <span className="text-red-500">*</span> title, isbn, publication_year are required. Authors/genres/categories are matched by name and created if they don't exist.
                    </p>
                  </div>
                </div>
              )}

              {importStep === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
                        <strong className="text-gray-800">{importRows.length}</strong> books ready to import
                      </p>
                      {fileType === "excel" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-200">Excel</span>
                      )}
                      {fileType === "csv" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">CSV</span>
                      )}
                    </div>
                    <button onClick={() => { setImportStep("upload"); setImportRows([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-xs text-gray-400 hover:text-gray-600">← Choose different file</button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                            {BOOK_CSV_COLUMNS.filter(c => importHeaders.includes(c.key)).map(col => (
                              <th key={col.key} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importRows.map((row, i) => {
                            const missingRequired = REQUIRED_KEYS.some(k => importHeaders.includes(k) && !row[k]);
                            return (
                              <tr key={i} className={missingRequired ? "bg-red-50" : "hover:bg-gray-50"}>
                                <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                                {BOOK_CSV_COLUMNS.filter(c => importHeaders.includes(c.key)).map(col => (
                                  <td key={col.key} className={`px-3 py-2 ${col.required && !row[col.key] ? "text-red-500 font-semibold" : "text-gray-700"}`}>
                                    {row[col.key] || (col.required ? "⚠ Missing" : <span className="text-gray-300">—</span>)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                    Authors, genres, categories and publishers will be created automatically if they don't already exist. Duplicate ISBNs will be skipped.
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {importError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={handleImportSubmit} disabled={importing}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                      {importing ? "Importing..." : `Import ${importRows.length} Books`}
                    </button>
                    <button onClick={() => { setShowImportModal(false); resetImport(); }}
                      className="px-5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                  </div>
                </div>
              )}

              {importStep === "result" && importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{importResult.created}</p>
                      <p className="text-xs text-blue-600 mt-0.5 font-medium">Created</p>
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
    </>
  );
}