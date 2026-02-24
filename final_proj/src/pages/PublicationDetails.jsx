import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";
import { toast } from "sonner";
import ImageUpload from "./Imageupload";
import { saveImage, loadImage } from "../utils/imageStorage";

export default function PublicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [publication, setPublication] = useState(null);
  const [publicationName, setPublicationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchPublication();
  }, [id]);

  const fetchPublication = async () => {
    try {
      const res = await API.get(`/publications/${id}`);
      const data = res.data.publication || res.data;
      setPublication(data);
      setPublicationName(data.publication_name);
      setLogoUrl(loadImage("publication", id));
    } catch (err) {
      console.error("Failed to fetch publication:", err);
      setError("Failed to load publication details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      saveImage("publication", id, logoUrl);
      await API.put(`/publications/${id}`, { publication_name: publicationName });
      toast.success("✅ Publication updated successfully!");
      setIsEditing(false);
      fetchPublication(); // Refresh data
    } catch (err) {
      console.error("Failed to update publication:", err);
      toast.error(err.response?.data?.error || "Failed to update publication");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPublicationName(publication.publication_name);
    setLogoUrl(loadImage("publication", id));
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>;
  if (!publication) return <div className="p-6 text-center">Publication not found</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/publications")} className="text-gray-600 hover:text-gray-800">← Back</button>
            <h2 className="text-3xl font-bold">Publication Details</h2>
          </div>
          {isLibrarian() && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Edit
            </button>
          )}
        </div>

        {/* View/Edit Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          {isEditing ? (
            /* Edit Mode */
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-3">Publisher Logo</label>
                <div className="flex gap-5 items-start">
                  <div
                    className="flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-orange-50 to-orange-100"
                    style={{ width: "100px", height: "100px" }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt={publication.publication_name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-orange-300">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <ImageUpload value={logoUrl} onChange={setLogoUrl} hidePreview />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Publication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={publicationName}
                  onChange={(e) => setPublicationName(e.target.value)}
                  className="w-full border-2 p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={handleCancel} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-600">Publisher Logo</label>
                <div
                  className="rounded-xl overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-orange-50 to-orange-100"
                  style={{ width: "100px", height: "100px" }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={publication.publication_name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-orange-300">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-600">Publication Name</label>
                <p className="text-lg font-medium text-gray-800">{publication.publication_name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-600">Publication ID</label>
                <p className="text-gray-700">{publication.publication_id}</p>
              </div>
            </div>
          )}
        </div>

        {/* Books by this publication */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Books by {publication.publication_name}</h3>
          {publication.Books && publication.Books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publication.Books.map((book) => {
                const bookCover = loadImage("book", book.book_id);
                return (
                  <div
                    key={book.book_id}
                    onClick={() => navigate(`/books/${book.book_id}`)}
                    className="flex items-center gap-3 border p-4 rounded-lg hover:shadow-lg cursor-pointer transition"
                  >
                    <div
                      className="flex-shrink-0 rounded overflow-hidden bg-slate-100 border border-gray-200"
                      style={{ width: "40px", height: "58px" }}
                    >
                      {bookCover ? (
                        <img src={bookCover} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{book.title}</h4>
                      <p className="text-sm text-gray-500">Year: {book.publication_year || "N/A"}</p>
                      <p className="text-sm text-gray-500">ISBN: {book.isbn || "N/A"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No books found for this publication</p>
          )}
        </div>
      </div>
    </div>
  );
}