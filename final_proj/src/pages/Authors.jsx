import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian, isAdmin } from "../utils/auth";
import { toast } from "sonner";
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

  .author-card-outer {
    position: relative;
    border-radius: 16px;
    padding: 1px;
    background: #e9e9ef;
    overflow: hidden;
    animation: float 5s ease-in-out infinite;
  }

  .author-card-outer:nth-child(2) { animation-delay: 0.4s; }
  .author-card-outer:nth-child(3) { animation-delay: 0.8s; }
  .author-card-outer:nth-child(4) { animation-delay: 1.2s; }
  .author-card-outer:nth-child(5) { animation-delay: 1.6s; }
  .author-card-outer:nth-child(6) { animation-delay: 2.0s; }

  .author-card-outer::before {
    content: '';
    position: absolute;
    inset: -120%;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      transparent 30%,
      #a78bfa 50%,
      #7c3aed 55%,
      transparent 70%
    );
    opacity: 0;
    transform-origin: center;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .author-card-outer:hover::before {
    opacity: 1;
    animation: border-spin 0.8s linear forwards;
  }

  .author-card-inner {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 15px;
    padding: 24px;
  }
`;

export default function Authors() {
  const navigate = useNavigate();
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    try {
      const res = await API.get("/authors");
      setAuthors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch authors:", err);
      setError("Failed to load authors");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (authorId, authorName) => {
    toast(`Delete ${authorName}?`, {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await API.delete(`/authors/${authorId}`);
            fetchAuthors();
          } catch (err) {
            console.error("Failed to delete author:", err);
          }
        },
      },
      cancel: { label: "Cancel" },
    });
  };

  return (
    <>
      <style>{styles}</style>

      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Authors</h2>
              <p className="text-sm text-gray-400 mt-0.5">{authors.length} total</p>
            </div>
            {isLibrarian() && (
              <button
                onClick={() => navigate("/authors/new")}
                className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Author
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : authors.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No authors found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {authors.map((author) => {
                const photo = loadImage("author", author.author_id);
                return (
                  <div key={author.author_id} className="author-card-outer">
                    <div className="author-card-inner">
                      <div className="flex flex-col items-center mb-5">
                        <div className="w-20 h-20 mb-3 rounded-full overflow-hidden bg-violet-50 flex items-center justify-center border border-violet-100">
                          {photo ? (
                            <img src={photo} alt={author.author_name} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-9 h-9 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 text-center leading-tight">
                          {author.author_name}
                        </h3>
                        <span className="text-xs text-gray-400 mt-1">#{author.author_id}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/authors/${author.author_id}`)}
                          className="flex-1 bg-gray-50 hover:bg-violet-50 text-gray-700 hover:text-violet-700 border border-gray-200 hover:border-violet-200 py-2 rounded-lg text-xs font-medium transition-all"
                        >
                          Details
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => handleDelete(author.author_id, author.author_name)}
                            className="bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg text-xs transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}