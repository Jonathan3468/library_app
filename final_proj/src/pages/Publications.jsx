import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";
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

  .pub-card-outer {
    position: relative;
    border-radius: 14px;
    padding: 1px;
    background: #e9e9ef;
    overflow: hidden;
    animation: float 5s ease-in-out infinite;
  }

  .pub-card-outer:nth-child(2) { animation-delay: 0.3s; }
  .pub-card-outer:nth-child(3) { animation-delay: 0.6s; }
  .pub-card-outer:nth-child(4) { animation-delay: 0.9s; }
  .pub-card-outer:nth-child(5) { animation-delay: 1.2s; }
  .pub-card-outer:nth-child(6) { animation-delay: 1.5s; }

  .pub-card-outer::before {
    content: '';
    position: absolute;
    inset: -120%;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      transparent 30%,
      #fb923c 50%,
      #ea580c 55%,
      transparent 70%
    );
    opacity: 0;
    transform-origin: center;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .pub-card-outer:hover::before {
    opacity: 1;
    animation: border-spin 0.8s linear forwards;
  }

  .pub-card-inner {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 13px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

export default function Publications() {
  const navigate = useNavigate();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const res = await API.get("/publications");
      setPublications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch publications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this publication?")) return;
    try {
      await API.delete(`/publications/${id}`);
      toast.success("Publication deleted successfully");
      fetchPublications();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete publication");
    }
  };

  const filtered = publications.filter((p) =>
    p.publication_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{styles}</style>

      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Publications</h2>
              <p className="text-sm text-gray-400 mt-0.5">{filtered.length} found</p>
            </div>
            {isLibrarian() && (
              <button
                onClick={() => navigate("/publications/new")}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Publication
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search publications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 bg-white pl-9 pr-4 py-2.5 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No publications found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((pub) => {
                const logo = loadImage("publication", pub.publication_id);
                return (
                  <div key={pub.publication_id} className="pub-card-outer">
                    <div className="pub-card-inner">
                      {/* Logo + Name */}
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => navigate(`/publications/${pub.publication_id}`)}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center">
                          {logo ? (
                            <img src={logo} alt={pub.publication_name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <svg className="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{pub.publication_name}</p>
                          <p className="text-xs text-gray-400">#{pub.publication_id}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {isLibrarian() && (
                        <div className="flex gap-1.5 ml-3 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/publications/${pub.publication_id}`)}
                            className="text-xs text-gray-400 hover:text-orange-500 border border-gray-200 hover:border-orange-200 bg-gray-50 hover:bg-orange-50 px-2.5 py-1.5 rounded-md transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(pub.publication_id)}
                            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-all"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
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