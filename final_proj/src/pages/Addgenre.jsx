import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

export default function AddGenre() {
  const navigate = useNavigate();
  const [genreName, setGenreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingGenres, setExistingGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetchExistingGenres();
  }, []);

  const fetchExistingGenres = async () => {
    try {
      const res = await API.get("/genres");
      setExistingGenres(Array.isArray(res.data) ? res.data : res.data.genres ?? []);
    } catch (err) {
      console.error("Failed to fetch genres:", err);
    } finally {
      setGenresLoading(false);
    }
  };

  const validateName = (name) => {
    if (!name.trim()) return "Genre name is required";
    if (name.trim().length < 2) return "Genre name must be at least 2 characters";
    if (name.trim().length > 100) return "Genre name must not exceed 100 characters";
    const isDuplicate = existingGenres.some(
      (g) => (g.genre_name || g.name)?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicate) return "This genre already exists";
    return "";
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setGenreName(value);
    if (touched) setErrors({ name: validateName(value) });
  };

  const handleBlur = () => {
    setTouched(true);
    setErrors({ name: validateName(genreName) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const error = validateName(genreName);
    if (error) { setErrors({ name: error }); toast.error("Please fix the errors before submitting"); return; }
    setLoading(true);
    try {
      await API.post("/genres", { name: genreName.trim() });
      toast.success("Genre added successfully!");
      navigate("/books");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      if (msg?.toLowerCase().includes("exists")) {
        setErrors({ name: "This genre already exists" });
        toast.error("Genre already exists");
      } else {
        toast.error(msg || "Failed to add genre");
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = genreName.trim().length > 0
    ? existingGenres.filter((g) =>
        (g.genre_name || g.name)?.toLowerCase().includes(genreName.toLowerCase())
      )
    : [];

  const getFieldClass = () => {
    const base = "w-full border-2 p-3 rounded-lg focus:outline-none transition-all text-sm";
    if (errors.name && touched) return `${base} border-red-400 bg-red-50`;
    if (touched && !errors.name && genreName.trim()) return `${base} border-green-400 bg-green-50`;
    return `${base} border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition text-sm">
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Add Genre</h2>
            <p className="text-sm text-gray-400 mt-0.5">Create a new book genre</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={genreName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getFieldClass()}
                placeholder="e.g., Mystery, Romance, Thriller..."
                autoComplete="off"
              />

              {errors.name && touched && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
              {touched && !errors.name && genreName.trim() && (
                <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Looks good!
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{genreName.length}/100</p>

              {/* Similar existing genres */}
              {!genresLoading && filtered.length > 0 && (
                <div className="mt-3 border border-indigo-100 rounded-xl overflow-hidden">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-400 bg-indigo-50">
                    Similar existing genres
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {filtered.map((genre) => (
                      <div key={genre.genre_id || genre.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 transition">
                        <span className="text-sm text-gray-700">{genre.genre_name || genre.name}</span>
                        <span className="text-xs text-gray-400">#{genre.genre_id || genre.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || (touched && !!errors.name)}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
              >
                {loading ? "Adding..." : "Add Genre"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 transition"
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