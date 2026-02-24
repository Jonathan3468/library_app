import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

export default function AddCategory() {
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetchExistingCategories();
  }, []);

  const fetchExistingCategories = async () => {
    try {
      const res = await API.get("/categories");
      setExistingCategories(Array.isArray(res.data) ? res.data : res.data.categories ?? []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateName = (name) => {
    if (!name.trim()) return "Category name is required";
    if (name.trim().length < 2) return "Category name must be at least 2 characters";
    if (name.trim().length > 100) return "Category name must not exceed 100 characters";
    const isDuplicate = existingCategories.some(
      (c) => (c.category_name || c.name)?.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicate) return "This category already exists";
    return "";
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setCategoryName(value);
    if (touched) setErrors({ name: validateName(value) });
  };

  const handleBlur = () => {
    setTouched(true);
    setErrors({ name: validateName(categoryName) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const error = validateName(categoryName);
    if (error) { setErrors({ name: error }); toast.error("Please fix the errors before submitting"); return; }
    setLoading(true);
    try {
      await API.post("/categories", { name: categoryName.trim() });
      toast.success("Category added successfully!");
      navigate("/books");
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg?.toLowerCase().includes("exists")) {
        setErrors({ name: "This category already exists" });
        toast.error("Category already exists");
      } else {
        toast.error(msg || "Failed to add category");
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = categoryName.trim().length > 0
    ? existingCategories.filter((c) =>
        (c.category_name || c.name)?.toLowerCase().includes(categoryName.toLowerCase())
      )
    : [];

  const getFieldClass = () => {
    const base = "w-full border-2 p-3 rounded-lg focus:outline-none transition-all text-sm";
    if (errors.name && touched) return `${base} border-red-400 bg-red-50`;
    if (touched && !errors.name && categoryName.trim()) return `${base} border-green-400 bg-green-50`;
    return `${base} border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50`;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition text-sm">
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Add Category</h2>
            <p className="text-sm text-gray-400 mt-0.5">Create a new book category</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={getFieldClass()}
                placeholder="e.g., Science Fiction, Biography..."
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
              {touched && !errors.name && categoryName.trim() && (
                <p className="mt-1.5 text-xs text-green-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Looks good!
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{categoryName.length}/100</p>

              {/* Similar existing categories */}
              {!categoriesLoading && filtered.length > 0 && (
                <div className="mt-3 border border-blue-100 rounded-xl overflow-hidden">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-400 bg-blue-50">
                    Similar existing categories
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {filtered.map((cat) => (
                      <div key={cat.category_id || cat.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition">
                        <span className="text-sm text-gray-700">{cat.category_name || cat.name}</span>
                        <span className="text-xs text-gray-400">#{cat.category_id || cat.id}</span>
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
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
              >
                {loading ? "Adding..." : "Add Category"}
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