import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian, isMember } from "../utils/auth";
import { loadImage } from "../utils/imageStorage";

export default function BookView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const fetchBookDetails = async () => {
    try {
      const [bookRes, copiesRes] = await Promise.all([
        API.get(`/books/${id}`),
        API.get(`/books/${id}/copies`)
      ]);
      setBook(bookRes.data.book || bookRes.data);
      setCopies(copiesRes.data.copies || copiesRes.data || []);
    } catch (err) {
      console.error("Failed to fetch book:", err);
      setError("Failed to load book details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h3 className="font-bold mb-2">Error Loading Book</h3>
            <p>{error}</p>
            <button onClick={() => navigate("/books")} className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              ← Back to Books
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Book not found</p>
          <button onClick={() => navigate("/books")} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            ← Back to Books
          </button>
        </div>
      </div>
    );
  }

  const coverImage = loadImage("book", id);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/books")} className="text-gray-600 hover:text-gray-800">
              ← Back
            </button>
            <h2 className="text-3xl font-bold">Book Details</h2>
          </div>
          {isLibrarian() && (
            <button
              onClick={() => navigate(`/books/${id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Book
            </button>
          )}
        </div>

        {/* Book Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Cover + details side by side */}
          <div className="flex gap-6 mb-6">
            {/* Book cover */}
            <div
              className="flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-slate-100 to-slate-200"
              style={{ width: "120px", height: "180px" }}
            >
              {coverImage ? (
                <img src={coverImage} alt={`Cover of ${book.title}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-xs">No Cover</span>
                </div>
              )}
            </div>

            {/* Title + metadata */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-4">{book.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ISBN</p>
                  <p className="font-semibold">{book.isbn || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Publication Year</p>
                  <p className="font-semibold">{book.publication_year || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-semibold">{book.Category?.category_name || book.category_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Publisher</p>
                  <p className="font-semibold">{book.Publication?.publication_name || book.publication_name || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Authors & Genres — full width below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500 mb-2">Authors</p>
              <div className="flex flex-wrap gap-2">
                {book.Authors && book.Authors.length > 0 ? (
                  book.Authors.map(author => (
                    <span key={author.author_id} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {author.author_name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No authors listed</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Genres</p>
              <div className="flex flex-wrap gap-2">
                {book.Genres && book.Genres.length > 0 ? (
                  book.Genres.map(genre => (
                    <span key={genre.genre_id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {genre.genre_name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No genres listed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Copies Section */}
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
    <h3 className="text-sm font-bold text-gray-800">Copies</h3>
    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{copies.length} total</span>
  </div>
  {copies.length === 0 ? (
    <div className="px-6 py-10 text-center text-sm text-gray-400">No copies registered</div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Copy ID</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Barcode</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
            {!isMember() && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Borrower</th>}
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Due Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {copies.map(c => {
            const isAvailable = c.status === "Available" || c.status === "available";
            return (
              <tr key={c.copy_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">#{c.copy_id}</td>
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {c.copy_code || "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    isAvailable
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-orange-400"}`} />
                    {c.status}
                  </span>
                </td>
                {!isMember() && (
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {c.borrower?.borrower_name || <span className="text-gray-300">—</span>}
                  </td>
                )}
                <td className="px-5 py-3.5 text-sm text-gray-500">
                  {c.borrower?.due_date
                    ? new Date(c.borrower.due_date).toLocaleDateString()
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
      </div>
    </div>
  );
}