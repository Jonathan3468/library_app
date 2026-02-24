import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <h3 className="text-base font-bold text-gray-800">{label}</h3>
      <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}

// ─── Icon paths ────────────────────────────────────────────────────────────────
const ICONS = {
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  author: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  publisher: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  borrower: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  chevron: "M9 5l7 7-7 7",
};

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q");

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query) performSearch();
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.results);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Empty query ──────────────────────────────────────────────────────────────
  if (!query) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.search} />
          </svg>
          <p className="text-gray-500 font-medium">Enter a search query to get started</p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 text-sm">Searching for "{query}"…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      </div>
    );
  }

  if (!results) return null;

  const totalResults =
    results.books.length +
    results.authors.length +
    (isLibrarian() ? results.borrowers.length : 0) +
    (results.publishers?.length || 0);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Search Results</h2>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{totalResults}</span> results for{" "}
            <span className="font-medium text-blue-600">"{query}"</span>
          </p>
        </div>

        {/* Zero results */}
        {totalResults === 0 && (
          <div className="bg-white rounded-xl shadow-md text-center py-16 px-6">
            <svg className="w-14 h-14 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.search} />
            </svg>
            <p className="text-lg font-semibold text-gray-700 mb-1">No results found</p>
            <p className="text-sm text-gray-500">Try different keywords or check your spelling</p>
          </div>
        )}

        {/* ── Books ── */}
        {results.books.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon={ICONS.book} label="Books" count={results.books.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.books.map((book) => (
                <div
                  key={book.book_id}
                  onClick={() => navigate(`/books/${book.book_id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
                >
                  {/* Color accent */}
                  <div className="h-1 bg-blue-500" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                          {book.title}
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {book.isbn && (
                            <span className="inline-flex items-center text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">
                              ISBN: {book.isbn}
                            </span>
                          )}
                          {book.publication_year && (
                            <span className="inline-flex items-center text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                              {book.publication_year}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.chevron} />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Authors ── */}
        {results.authors.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon={ICONS.author} label="Authors" count={results.authors.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.authors.map((author) => (
                <div
                  key={author.author_id}
                  onClick={() => navigate(`/authors/${author.author_id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
                >
                  <div className="h-1 bg-purple-500" />
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                      {author.author_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate group-hover:text-purple-600 transition-colors">
                        {author.author_name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {author.author_id}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.chevron} />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Publishers ── */}
        {results.publishers?.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon={ICONS.publisher} label="Publishers" count={results.publishers.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.publishers.map((publisher) => (
                <div
                  key={publisher.publication_id}
                  onClick={() => navigate(`/publications/${publisher.publication_id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
                >
                  <div className="h-1 bg-orange-500" />
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-orange-600 font-bold text-sm">
                      {publisher.publication_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                        {publisher.publication_name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {publisher.publication_id}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-orange-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.chevron} />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Borrowers (librarian only) ── */}
        {isLibrarian() && results.borrowers.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon={ICONS.borrower} label="Borrowers" count={results.borrowers.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.borrowers.map((borrower) => (
                <div
                  key={borrower.borrower_id}
                  onClick={() => navigate(`/borrowers/${borrower.borrower_id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 overflow-hidden group"
                >
                  <div className="h-1 bg-green-500" />
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600 font-bold text-sm">
                      {borrower.borrower_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate group-hover:text-green-600 transition-colors">
                        {borrower.borrower_name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">{borrower.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {borrower.borrower_id}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-green-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS.chevron} />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}