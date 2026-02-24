import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";
import ImageUpload from "./Imageupload";
import { saveImage, loadImage } from "../utils/imageStorage";

export default function AddPublication() {
  const navigate = useNavigate();
  const [publicationName, setPublicationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingPublications, setExistingPublications] = useState([]);
  const [pubsLoading, setPubsLoading] = useState(true);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetchExistingPublications();
  }, []);

  const fetchExistingPublications = async () => {
    try {
      const res = await API.get("/publications");
      setExistingPublications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch publications:", err);
    } finally {
      setPubsLoading(false);
    }
  };

  const validatePublicationName = (name) => {
    if (!name.trim()) return "Publication name is required";
    if (name.trim().length < 2) return "Publication name must be at least 2 characters";
    if (name.trim().length > 150) return "Publication name must not exceed 150 characters";
    const isDuplicate = existingPublications.some(
      (p) => p.publication_name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicate) return "This publication already exists";
    return "";
  };

  const handlePublicationNameChange = (e) => {
    const value = e.target.value;
    setPublicationName(value);
    if (touched) {
      setErrors((prev) => ({ ...prev, publicationName: validatePublicationName(value) }));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setErrors({ publicationName: validatePublicationName(publicationName) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const error = validatePublicationName(publicationName);
    if (error) {
      setErrors({ publicationName: error });
      toast.error("Please fix the errors before submitting");
      return;
    }
    setLoading(true);
    try {
      const cleanedName = publicationName.trim();
      const res = await API.post("/publications", { publication_name: cleanedName });
      const newId = res.data.publication?.publication_id || res.data.publication_id || res.data.id;
      if (newId && logoUrl) saveImage("publication", newId, logoUrl);
      toast.success("✅ Publication added successfully!");
      navigate("/publications");
    } catch (err) {
      console.error("Failed to add publication:", err);
      const errorMsg = err.response?.data?.error;
      if (errorMsg?.toLowerCase().includes("duplicate") || errorMsg?.toLowerCase().includes("exists")) {
        setErrors({ publicationName: "This publication already exists" });
        toast.error("Publication already exists");
      } else {
        toast.error(errorMsg || "Failed to add publication. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Live filtered list — only show when there's input
  const filtered = publicationName.trim().length > 0
    ? existingPublications.filter((p) =>
        p.publication_name.toLowerCase().includes(publicationName.toLowerCase())
      )
    : [];

  const getFieldClassName = () => {
    const base = "w-full border-2 p-3 rounded-lg focus:outline-none transition-all";
    if (errors.publicationName && touched) return `${base} border-red-500 focus:border-red-500 bg-red-50`;
    if (touched && !errors.publicationName && publicationName.trim()) return `${base} border-green-500 focus:border-green-500 bg-green-50`;
    return `${base} border-gray-300 focus:ring-2 focus:ring-orange-500`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/publications")} className="text-gray-600 hover:text-gray-800 transition">
            ← Back
          </button>
          <h2 className="text-3xl font-bold">Add New Publication</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-5 text-gray-700">Publication Details</h3>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-semibold mb-3">Publisher Logo</label>
              <div className="flex gap-5 items-start">
                <div
                  className="flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-200 shadow bg-gradient-to-br from-orange-50 to-orange-100"
                  style={{ width: "100px", height: "100px" }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
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
                  <p className="text-xs text-gray-500 mt-2">Optional - Upload publisher's logo</p>
                </div>
              </div>
            </div>

            {/* Name input + live search results below */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Publication Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={publicationName}
                onChange={handlePublicationNameChange}
                onBlur={handleBlur}
                className={getFieldClassName()}
                placeholder="Enter publication name (e.g., Penguin Random House)"
                autoComplete="off"
              />

              {/* Inline validation feedback */}
              {errors.publicationName && touched && (
                <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.publicationName}</span>
                </div>
              )}
              {publicationName.trim() && !errors.publicationName && touched && (
                <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Looks good!</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">{publicationName.length}/150 characters</p>

              {/* Live search results */}
              {!pubsLoading && filtered.length > 0 && (
                <div className="mt-2 border-2 border-orange-100 rounded-lg overflow-hidden">
                  <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-400 bg-orange-50">
                    Similar existing publications
                  </p>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {filtered.map((pub) => {
                      const logo = loadImage("publication", pub.publication_id);
                      return (
                        <div
                          key={pub.publication_id}
                          onClick={() => navigate(`/publications/${pub.publication_id}`)}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 cursor-pointer transition"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                            {logo ? (
                              <img src={logo} alt={pub.publication_name} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{pub.publication_name}</p>
                            <p className="text-xs text-gray-400">ID: {pub.publication_id}</p>
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
            {errors.publicationName && touched && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-800">Cannot submit</p>
                    <p className="text-sm text-red-700">{errors.publicationName}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading || (touched && !!errors.publicationName)}
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
                  "Add Publication"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/publications")}
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