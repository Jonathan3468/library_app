import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";
import { toast } from "sonner";
import ImageUpload from "./Imageupload";
import { saveImage, loadImage } from "../utils/imageStorage";

export default function AuthorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState(null);
  const [authorName, setAuthorName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAuthor();
  }, [id]);

  const fetchAuthor = async () => {
    try {
      const res = await API.get(`/authors/${id}`);
      const data = res.data.author || res.data;
      setAuthor(data);
      setAuthorName(data.author_name);
      setPhotoUrl(loadImage("author", id));
    } catch (err) {
      console.error("Failed to fetch author:", err);
      setError("Failed to load author details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      saveImage("author", id, photoUrl);
      await API.put(`/authors/${id}`, { author_name: authorName });
      toast.success("✅ Author updated successfully!");
      setIsEditing(false);
      fetchAuthor(); // Refresh data
    } catch (err) {
      console.error("Failed to update author:", err);
      toast.error(err.response?.data?.error || "Failed to update author");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAuthorName(author.author_name);
    setPhotoUrl(loadImage("author", id));
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (error) return <div className="p-6"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>;
  if (!author) return <div className="p-6 text-center">Author not found</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/authors")} className="text-gray-600 hover:text-gray-800">← Back</button>
            <h2 className="text-3xl font-bold">Author Details</h2>
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
                <label className="block text-sm font-semibold mb-3">Author Photo</label>
                <div className="flex gap-5 items-start">
                  <div
                    className="flex-shrink-0 rounded-full overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-slate-100 to-slate-200"
                    style={{ width: "100px", height: "100px" }}
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt={author.author_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <ImageUpload value={photoUrl} onChange={setPhotoUrl} hidePreview />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Author Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full border-2 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                <label className="block text-sm font-semibold mb-3 text-gray-600">Author Photo</label>
                <div
                  className="rounded-full overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-slate-100 to-slate-200"
                  style={{ width: "100px", height: "100px" }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt={author.author_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-600">Author Name</label>
                <p className="text-lg font-medium text-gray-800">{author.author_name}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-600">Author ID</label>
                <p className="text-gray-700">{author.author_id}</p>
              </div>
            </div>
          )}
        </div>

        {/* Books by this author */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Books by {author.author_name}</h3>
          {author.Books && author.Books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {author.Books.map((book) => {
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No books found for this author</p>
          )}
        </div>
      </div>
    </div>
  );
}