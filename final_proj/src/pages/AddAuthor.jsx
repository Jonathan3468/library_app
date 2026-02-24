import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";
import ImageUpload from "./Imageupload";
import { saveImage, loadImage } from "../utils/imageStorage";

export default function AddAuthor() {
  const navigate = useNavigate();
  const [authorName, setAuthorName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingAuthors, setExistingAuthors] = useState([]);
  const [authorsLoading, setAuthorsLoading] = useState(true);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetchExistingAuthors();
  }, []);

  const fetchExistingAuthors = async () => {
    try {
      const res = await API.get("/authors");
      setExistingAuthors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch authors:", err);
    } finally {
      setAuthorsLoading(false);
    }
  };

  const validateAuthorName = (name) => {
    if (!name.trim()) return "Author name is required";
    if (name.trim().length < 2) return "Author name must be at least 2 characters";
    if (name.trim().length > 100) return "Author name must not exceed 100 characters";
    if (!/^[a-zA-Z\s.'-]+$/.test(name.trim()))
      return "Author name can only contain letters, spaces, and basic punctuation (. ' -)";
    const isDuplicate = existingAuthors.some(
      (a) => a.author_name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicate) return "This author already exists";
    return "";
  };

  const handleAuthorNameChange = (e) => {
    const value = e.target.value;
    setAuthorName(value);
    if (touched) {
      setErrors((prev) => ({ ...prev, authorName: validateAuthorName(value) }));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setErrors({ authorName: validateAuthorName(authorName) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const error = validateAuthorName(authorName);
    if (error) {
      setErrors({ authorName: error });
      toast.error("Please fix the errors before submitting");
      return;
    }
    setLoading(true);
    try {
      const cleanedName = authorName.trim();
      const res = await API.post("/authors", { author_name: cleanedName });
      const newId = res.data.author?.author_id || res.data.author_id || res.data.id;
      if (newId && photoUrl) saveImage("author", newId, photoUrl);
      toast.success("✅ Author added successfully!");
      navigate("/authors");
    } catch (err) {
      console.error("Failed to add author:", err);
      const errorMsg = err.response?.data?.error;
      if (errorMsg?.toLowerCase().includes("duplicate") || errorMsg?.toLowerCase().includes("exists")) {
        setErrors({ authorName: "This author already exists" });
        toast.error("Author already exists");
      } else {
        toast.error(errorMsg || "Failed to add author. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Live filtered list — only show when there's input
  const filtered = authorName.trim().length > 0
    ? existingAuthors.filter((a) =>
        a.author_name.toLowerCase().includes(authorName.toLowerCase())
      )
    : [];

  const getFieldClassName = () => {
    const base = "w-full border-2 p-3 rounded-lg focus:outline-none transition-all";
    if (errors.authorName && touched) return `${base} border-red-500 focus:border-red-500 bg-red-50`;
    if (touched && !errors.authorName && authorName.trim()) return `${base} border-green-500 focus:border-green-500 bg-green-50`;
    return `${base} border-gray-300 focus:ring-2 focus:ring-purple-500`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/authors")} className="text-gray-600 hover:text-gray-800 transition">
            ← Back
          </button>
          <h2 className="text-3xl font-bold">Add New Author</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-5 text-gray-700">Author Details</h3>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-semibold mb-3">Author Photo</label>
              <div className="flex gap-5 items-start">
                <div
                  className="flex-shrink-0 rounded-full overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-slate-100 to-slate-200"
                  style={{ width: "100px", height: "100px" }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Author preview" className="w-full h-full object-cover" />
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
                  <p className="text-xs text-gray-500 mt-2">Optional - Upload a photo of the author</p>
                </div>
              </div>
            </div>

            {/* Name input + live search results below */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Author Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={authorName}
                onChange={handleAuthorNameChange}
                onBlur={handleBlur}
                className={getFieldClassName()}
                placeholder="Enter author name (e.g., J.K. Rowling)"
                autoComplete="off"
              />

              {/* Inline validation feedback */}
              {errors.authorName && touched && (
                <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.authorName}</span>
                </div>
              )}
              {authorName.trim() && !errors.authorName && touched && (
                <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Looks good!</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">{authorName.length}/100 characters</p>

              {/* Live search results */}
              {!authorsLoading && filtered.length > 0 && (
                <div className="mt-2 border-2 border-purple-100 rounded-lg overflow-hidden">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-purple-400 bg-purple-50">
                    Similar existing authors
                  </p>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {filtered.map((author) => {
                      const photo = loadImage("author", author.author_id);
                      return (
                        <div
                          key={author.author_id}
                          onClick={() => navigate(`/authors/${author.author_id}`)}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 cursor-pointer transition"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 flex-shrink-0 flex items-center justify-center">
                            {photo ? (
                              <img src={photo} alt={author.author_name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{author.author_name}</p>
                            <p className="text-xs text-gray-400">ID: {author.author_id}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Error summary */}
            {errors.authorName && touched && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-800">Cannot submit</p>
                    <p className="text-sm text-red-700">{errors.authorName}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading || (touched && !!errors.authorName)}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </span>
                ) : (
                  "Add Author"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/authors")}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}