import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";
import ImageUpload from "./Imageupload";
import { saveImage } from "../utils/imageStorage";

export default function AddBook() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [bookId, setBookId] = useState(null);

  const [form, setForm] = useState({
    title: "", isbn: "", publication_year: "", category_id: "",
    publication_id: "", authorIds: [], genreIds: [], image_url: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  // ISBN autofill
  const [fetchingIsbn, setFetchingIsbn] = useState(false);
  const [autofillResult, setAutofillResult] = useState(null);
  const isbnDebounceRef = useRef(null);

  const [copies, setCopies] = useState([]);
  const [newCopyBarcode, setNewCopyBarcode] = useState("");
  const [addingCopy, setAddingCopy] = useState(false);

  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [publications, setPublications] = useState([]);

  const [authorSearch, setAuthorSearch] = useState("");
  const [publicationSearch, setPublicationSearch] = useState("");
  const [genreSearch, setGenreSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [showAddAuthorModal, setShowAddAuthorModal] = useState(false);
  const [showAddPublicationModal, setShowAddPublicationModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddGenreModal, setShowAddGenreModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newPublicationName, setNewPublicationName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newGenreName, setNewGenreName] = useState("");
  const [addingAuthor, setAddingAuthor] = useState(false);
  const [addingPublication, setAddingPublication] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingGenre, setAddingGenre] = useState(false);

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    try {
      const [authorsRes, genresRes, categoriesRes, pubsRes] = await Promise.all([
        API.get("/authors"), API.get("/genres"), API.get("/categories"), API.get("/publications"),
      ]);
      const toArray = (res, keys) => {
        if (Array.isArray(res.data)) return res.data;
        for (const key of keys) { if (Array.isArray(res.data?.[key])) return res.data[key]; }
        return [];
      };
      setAuthors(toArray(authorsRes, ["authors", "data"]));
      setGenres(toArray(genresRes, ["genres", "data"]));
      setCategories(toArray(categoriesRes, ["categories", "data"]));
      setPublications(toArray(pubsRes, ["publications", "data"]));
    } catch {
      setError("Failed to load form options");
    }
  };

  // ─── ISBN Autofill (Google Books API) ────────────────────────────────────
  const resolveAuthor = async (name, list) => {
    const existing = list.find(a => a.author_name.toLowerCase() === name.toLowerCase());
    if (existing) return { id: existing.author_id, item: existing, created: false };
    const res = await API.post("/authors", { author_name: name });
    const item = res.data.author || res.data;
    return { id: item.author_id, item, created: true };
  };

  const resolvePublication = async (name, list) => {
    const existing = list.find(p => p.publication_name.toLowerCase() === name.toLowerCase());
    if (existing) return { id: existing.publication_id, item: existing, created: false };
    const res = await API.post("/publications", { publication_name: name });
    const item = res.data.publication || res.data;
    return { id: item.publication_id, item, created: true };
  };

  const resolveGenre = async (name, list) => {
    const existing = list.find(g => g.genre_name?.toLowerCase() === name.toLowerCase());
    if (existing) return { id: existing.genre_id, item: existing, created: false };
    const res = await API.post("/genres", { name });
    // Backend returns { success: true, genre: { genre_id, genre_name, ... } }
    const item = res.data.genre || res.data;
    // Normalize: ensure genre_name and genre_id are present on the local item
    const normalized = {
      ...item,
      genre_id:   item.genre_id   ?? item.id,
      genre_name: item.genre_name ?? item.name ?? name,
    };
    return { id: normalized.genre_id, item: normalized, created: true };
  };

  const resolveCategory = async (name, list) => {
    const existing = list.find(c => (c.category_name || c.name || "").toLowerCase() === name.toLowerCase());
    if (existing) return { id: existing.category_id || existing.id, item: existing, created: false };
    const res = await API.post("/categories", { name });
    const item = res.data.category || res.data;
    return { id: item.category_id || item.id, item, created: true };
  };

  // Fetch an external image URL and convert it to a base64 data URL.
  // This ensures ImageUpload + imageStorage always receive a data URL,
  // not an external link that can break due to CORS / referrer policies.
  const fetchImageAsBase64 = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return url; // fallback: return the raw URL if fetch fails
    }
  };

  const handleIsbnLookup = async (isbnValue) => {
    const clean = isbnValue.replace(/[\s\-]/g, "");
    if (!/^\d{10}(\d{3})?$/.test(clean)) return;

    try {
      setFetchingIsbn(true);
      setAutofillResult(null);

      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`
      );
      const data = await res.json();

      if (!data.items?.length) {
        toast.error("No book found for this ISBN");
        return;
      }

      const info = data.items[0].volumeInfo;
      const filled = [];
      const updates = {};

      // Snapshot current lists so we can chain creates
      let latestAuthors      = [...authors];
      let latestGenres       = [...genres];
      let latestCategories   = [...categories];
      let latestPublications = [...publications];

      // Title
      if (info.title) {
        updates.title = info.title;
        filled.push("Title");
      }

      // Publication year
      if (info.publishedDate) {
        const year = info.publishedDate.split("-")[0];
        if (year?.length === 4) { updates.publication_year = year; filled.push("Year"); }
      }

      // Cover image — fetch and convert to base64 so ImageUpload + imageStorage
      // always receive a data URL (external Google URLs can fail due to referrer/CORS)
      if (info.imageLinks?.thumbnail) {
        const rawUrl = info.imageLinks.thumbnail
          .replace("http://", "https://")
          .replace("zoom=1", "zoom=0");
        updates.image_url = await fetchImageAsBase64(rawUrl);
        filled.push("Cover");
      }

      // Authors — find or create each
      if (info.authors?.length) {
        const ids = [];
        for (const name of info.authors) {
          const { id, item, created } = await resolveAuthor(name, latestAuthors);
          if (created) latestAuthors = [...latestAuthors, item];
          if (!ids.includes(id)) ids.push(id);
        }
        setAuthors(latestAuthors);
        updates.authorIds = ids;
        filled.push("Author" + (info.authors.length > 1 ? "s" : ""));
      }

      // Publisher — find or create
      if (info.publisher) {
        const { id, item, created } = await resolvePublication(info.publisher, latestPublications);
        if (created) {
          latestPublications = [...latestPublications, item];
          setPublications(latestPublications);
        }
        updates.publication_id = id;
        filled.push("Publisher");
      }

      // ─── Categories & Genres ───────────────────────────────────────────────
      // Google Books rarely returns more than one category, and almost never
      // uses slashes. So the old code (segments.slice(1) for genres) always
      // produced an empty array.
      //
      // New approach:
      //   • Split every category string on "/" or "," → flat list of segments
      //   • First segment  → Category field
      //   • ALL segments   → Genres  (Google's "Fiction" IS the genre)
      // ──────────────────────────────────────────────────────────────────────
      if (info.categories?.length) {
        const segments = info.categories
          .flatMap(c => c.split(/[\/,]/).map(s => s.trim()).filter(Boolean));

        // First segment → Category
        if (segments[0]) {
          const { id, item, created } = await resolveCategory(segments[0], latestCategories);
          if (created) {
            latestCategories = [...latestCategories, item];
            setCategories(latestCategories);
          }
          updates.category_id = id;
          filled.push("Category");
        }

        // ALL segments → Genres
        // (covers both the single-value case like ["Fiction"]
        //  and multi-value like ["Fiction / Science Fiction"])
        const genreIds = [];
        for (const name of segments) {
          const { id, item, created } = await resolveGenre(name, latestGenres);
          if (created) latestGenres = [...latestGenres, item];
          if (!genreIds.includes(id)) genreIds.push(id);
        }
        setGenres(latestGenres);
        updates.genreIds = genreIds;
        filled.push("Genres");
      }

      setForm(prev => ({ ...prev, ...updates }));

      // Mark text fields as touched + valid so they show green
      const nowTouched = {};
      if (updates.title)            nowTouched.title = true;
      if (updates.publication_year) nowTouched.publication_year = true;
      setTouched(prev => ({ ...prev, ...nowTouched }));
      setFieldErrors(prev => ({ ...prev, title: "", publication_year: "" }));

      setAutofillResult({ filled });
      toast.success(`Autofilled from Google Books`);
    } catch (err) {
      console.error("ISBN lookup error:", err);
      toast.error("Failed to fetch book details");
    } finally {
      setFetchingIsbn(false);
    }
  };

  // Auto-trigger lookup when a complete ISBN is typed (debounced)
  const handleIsbnChange = (e) => {
    handleChange(e);
    setAutofillResult(null);
    clearTimeout(isbnDebounceRef.current);
    const clean = e.target.value.replace(/[\s\-]/g, "");
    if (/^\d{10}(\d{3})?$/.test(clean)) {
      isbnDebounceRef.current = setTimeout(() => handleIsbnLookup(e.target.value), 600);
    }
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateField = (name, value) => {
    switch (name) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.length > 255) return "Title must not exceed 255 characters";
        return "";
      case "isbn":
        if (!value.trim()) return "ISBN is required";
        if (!/^\d{10}(\d{3})?$/.test(value.replace(/[\s\-]/g, ""))) return "ISBN must be 10 or 13 digits";
        return "";
      case "publication_year":
        if (!value) return "Publication year is required";
        const year = parseInt(value);
        if (isNaN(year) || year < 1000 || year > new Date().getFullYear() + 1)
          return `Year must be between 1000 and ${new Date().getFullYear() + 1}`;
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name]) setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, form[name]) }));
  };

  const FieldError = ({ name }) =>
    touched[name] && fieldErrors[name] ? (
      <p className="mt-1 flex items-center gap-1 text-red-500 text-xs">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {fieldErrors[name]}
      </p>
    ) : null;

  const getFieldClass = (name) => {
    const base = "w-full border p-3 rounded-lg text-sm focus:outline-none transition-all";
    if (touched[name] && fieldErrors[name]) return `${base} border-red-400 focus:border-red-400 bg-red-50 focus:ring-2 focus:ring-red-50`;
    if (touched[name] && !fieldErrors[name] && form[name]) return `${base} border-green-400 focus:border-green-400 bg-green-50`;
    return `${base} border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50`;
  };

  // ─── Dropdowns ────────────────────────────────────────────────────────────
  const filteredAuthors      = authors.filter(a => a.author_name.toLowerCase().includes(authorSearch.toLowerCase()));
  const filteredPublications = publications.filter(p => p.publication_name.toLowerCase().includes(publicationSearch.toLowerCase()));
  const filteredGenres       = genres.filter(g => g.genre_name.toLowerCase().includes(genreSearch.toLowerCase()));
  const filteredCategories   = categories.filter(c => (c.category_name || c.name || "").toLowerCase().includes(categorySearch.toLowerCase()));

  const getSelectedAuthors    = () => authors.filter(a => form.authorIds.some(id => id == a.author_id)).map(a => ({ id: a.author_id, name: a.author_name }));
  const getSelectedPublication = () => { const p = publications.find(p => p.publication_id == form.publication_id); return p ? p.publication_name : ""; };
  const getSelectedCategory   = () => { const c = categories.find(c => c.category_id == form.category_id); return c ? (c.category_name || c.name) : ""; };
  const getSelectedGenres     = () => genres.filter(g => form.genreIds.some(id => id == g.genre_id)).map(g => ({ id: g.genre_id, name: g.genre_name }));

  const addAuthor       = (id) => { if (!form.authorIds.some(x => x == id)) setForm(p => ({ ...p, authorIds: [...p.authorIds, id] })); setAuthorSearch(""); setShowAuthorDropdown(false); };
  const removeAuthor    = (id) => setForm(p => ({ ...p, authorIds: p.authorIds.filter(x => x != id) }));
  const addGenre        = (id) => { if (!form.genreIds.some(x => x == id)) setForm(p => ({ ...p, genreIds: [...p.genreIds, id] })); setGenreSearch(""); setShowGenreDropdown(false); };
  const removeGenre     = (id) => setForm(p => ({ ...p, genreIds: p.genreIds.filter(x => x != id) }));
  const selectPublication = (id) => { setForm(p => ({ ...p, publication_id: id })); setPublicationSearch(""); setShowPublicationDropdown(false); };
  const selectCategory    = (id) => { setForm(p => ({ ...p, category_id: id })); setCategorySearch(""); setShowCategoryDropdown(false); };

  // ─── Add new helpers ──────────────────────────────────────────────────────
  const handleAddNewAuthor = async () => {
    if (!newAuthorName.trim()) { toast.error("Please enter an author name"); return; }
    try {
      setAddingAuthor(true);
      const res = await API.post("/authors", { author_name: newAuthorName });
      const a = res.data.author || res.data;
      setAuthors(p => [...p, a]); addAuthor(a.author_id);
      setShowAddAuthorModal(false); setNewAuthorName("");
    } catch { toast.error("Failed to add author"); } finally { setAddingAuthor(false); }
  };

  const handleAddNewPublication = async () => {
    if (!newPublicationName.trim()) { toast.error("Please enter a publication name"); return; }
    try {
      setAddingPublication(true);
      const res = await API.post("/publications", { publication_name: newPublicationName });
      const p = res.data.publication || res.data;
      setPublications(prev => [...prev, p]); selectPublication(p.publication_id);
      setShowAddPublicationModal(false); setNewPublicationName("");
    } catch { toast.error("Failed to add publisher"); } finally { setAddingPublication(false); }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) { toast.error("Please enter a category name"); return; }
    try {
      setAddingCategory(true);
      const res = await API.post("/categories", { name: newCategoryName });
      const c = res.data.category || res.data;
      setCategories(prev => [...prev, c]); selectCategory(c.category_id || c.id);
      setShowAddCategoryModal(false); setNewCategoryName("");
      toast.success("Category added!");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to add category"); } finally { setAddingCategory(false); }
  };

  const handleAddNewGenre = async () => {
    if (!newGenreName.trim()) { toast.error("Please enter a genre name"); return; }
    try {
      setAddingGenre(true);
      const res = await API.post("/genres", { name: newGenreName });
      const g = res.data.genre || res.data;
      setGenres(prev => [...prev, g]); addGenre(g.genre_id || g.id);
      setShowAddGenreModal(false); setNewGenreName("");
      toast.success("Genre added!");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to add genre"); } finally { setAddingGenre(false); }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmitBook = async (e) => {
    e.preventDefault();
    const requiredFields = ["title", "isbn", "publication_year"];
    const allTouched = requiredFields.reduce((acc, k) => ({ ...acc, [k]: true }), {});
    setTouched(prev => ({ ...prev, ...allTouched }));
    const newErrors = requiredFields.reduce((acc, k) => {
      const err = validateField(k, form[k]); if (err) acc[k] = err; return acc;
    }, {});
    setFieldErrors(prev => ({ ...prev, ...newErrors }));
    if (Object.keys(newErrors).length > 0) { setError("Please fix the errors before submitting"); return; }
    if (form.authorIds.length === 0) { setError("Please select at least one author"); return; }
    try {
      setLoading(true); setError(null);
      const { image_url, ...apiForm } = form;
      const res = await API.post("/books", apiForm);
      const createdBookId = res.data.book?.book_id || res.data.bookId;
      if (createdBookId && image_url) saveImage("book", createdBookId, image_url);
      setBookId(createdBookId); setStep(2);
    } catch (err) { setError(err.response?.data?.message || "Failed to add book"); } finally { setLoading(false); }
  };

  // ─── Copy actions ─────────────────────────────────────────────────────────
  const handleAddCopy = async () => {
    if (!newCopyBarcode.trim()) { toast.error("Please enter a barcode"); return; }
    try {
      setAddingCopy(true);
      await API.post("/copies", { book_id: bookId, copy_code: newCopyBarcode, status: "available" });
      setCopies([...copies, { copy_code: newCopyBarcode, status: "available" }]);
      setNewCopyBarcode("");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add copy"); } finally { setAddingCopy(false); }
  };

  const handleFinish = () => { toast.success(`Book added with ${copies.length} copies!`); navigate("/books"); };
  const handleSkipCopies = () => {
    toast("Skip adding copies?", {
      description: "You can add copies later from the book details page.",
      action: { label: "Skip", onClick: () => navigate("/books") },
      cancel: { label: "Cancel" },
    });
  };

  // ─── Modal ────────────────────────────────────────────────────────────────
  const Modal = ({ title, value, setValue, onAdd, loading: l, onClose, placeholder, color = "blue" }) => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-800 mb-4">{title}</h3>
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className={`w-full border-2 p-3 rounded-lg text-sm focus:outline-none focus:border-${color}-400 mb-4`}
          placeholder={placeholder} autoFocus />
        <div className="flex gap-2">
          <button onClick={onAdd} disabled={l} className={`flex-1 bg-${color}-600 text-white py-2 rounded-lg hover:bg-${color}-700 disabled:opacity-50 text-sm font-medium`}>
            {l ? "Adding..." : "Add"}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );

  // ─── Step 2: Add Copies ───────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Add Copies</h2>
          <p className="text-sm text-gray-400 mb-6">"{form.title}" created! Now add physical copies.</p>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-5">
            <div className="flex gap-3 mb-4">
              <input type="text" value={newCopyBarcode} onChange={(e) => setNewCopyBarcode(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddCopy()}
                className="flex-1 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                placeholder="Scan or enter barcode" autoFocus />
              <button onClick={handleAddCopy} disabled={addingCopy}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {addingCopy ? "Adding..." : "Add Copy"}
              </button>
            </div>
            {copies.length > 0 && (
              <div className="space-y-2">
                {copies.map((copy, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
                    <span className="font-mono text-sm text-gray-700">{copy.copy_code}</span>
                    <span className="text-xs text-green-500 ml-auto">✓ Available</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleFinish} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
              Finish {copies.length > 0 && `(${copies.length} added)`}
            </button>
            <button onClick={handleSkipCopies} className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 1: Book Info ────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/books")} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
          <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Add New Book</h2>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmitBook} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Book Cover</label>
            <ImageUpload value={form.image_url} onChange={(url) => setForm(prev => ({ ...prev, image_url: url }))} />
          </div>

          {/* ── ISBN + Lookup ── moved to top so autofill fills the fields below */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ISBN <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text" name="isbn" value={form.isbn}
                onChange={handleIsbnChange} onBlur={() => handleBlur("isbn")}
                className={getFieldClass("isbn") + " flex-1"}
                placeholder="Enter ISBN-10 or ISBN-13"
              />
              <button
                type="button"
                onClick={() => handleIsbnLookup(form.isbn)}
                disabled={fetchingIsbn || !form.isbn.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all shrink-0"
              >
                {fetchingIsbn ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Looking up...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Lookup
                  </>
                )}
              </button>
            </div>
            <FieldError name="isbn" />

            {/* Autofill success banner */}
            {autofillResult && (
              <div className="mt-2 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs text-indigo-700 flex-1">
                  <span className="font-semibold">Autofilled from Google Books:</span> {autofillResult.filled.join(", ")}
                </p>
                <button type="button" onClick={() => setAutofillResult(null)} className="text-indigo-300 hover:text-indigo-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {!autofillResult && !fetchingIsbn && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Enter a valid ISBN to auto-fill title, author, cover and more
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input type="text" name="title" value={form.title}
              onChange={handleChange} onBlur={() => handleBlur("title")}
              className={getFieldClass("title")} placeholder="Book title" />
            <FieldError name="title" />
          </div>

          {/* Publication Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publication Year <span className="text-red-400">*</span>
            </label>
            <input type="number" name="publication_year" value={form.publication_year}
              onChange={handleChange} onBlur={() => handleBlur("publication_year")}
              className={getFieldClass("publication_year")}
              min="1000" max={new Date().getFullYear() + 1} placeholder="e.g. 2023" />
            <FieldError name="publication_year" />
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input type="text" placeholder="Search and select category..."
              value={showCategoryDropdown ? categorySearch : getSelectedCategory()}
              onChange={(e) => { setCategorySearch(e.target.value); setShowCategoryDropdown(true); }}
              onFocus={() => setShowCategoryDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showCategoryDropdown && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                <div onClick={() => { setNewCategoryName(categorySearch); setShowAddCategoryModal(true); setShowCategoryDropdown(false); }}
                  className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer border-b border-blue-100 flex items-center gap-2 text-blue-700 text-sm font-medium sticky top-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add New Category{categorySearch ? ` "${categorySearch}"` : ""}
                </div>
                {filteredCategories.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No categories found</div>
                  : filteredCategories.map(cat => (
                    <div key={cat.category_id || cat.id} onClick={() => selectCategory(cat.category_id || cat.id)}
                      className={`p-3 hover:bg-blue-50 cursor-pointer text-sm ${form.category_id == (cat.category_id || cat.id) ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}>
                      {cat.category_name || cat.name}
                    </div>
                  ))}
              </div>
            )}
            {form.category_id && (
              <button type="button" onClick={() => { setForm(p => ({ ...p, category_id: "" })); setCategorySearch(""); }}
                className="text-xs text-red-500 hover:underline mt-1">Clear</button>
            )}
          </div>

          {/* Publisher */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
            <input type="text" placeholder="Search and select publisher..."
              value={showPublicationDropdown ? publicationSearch : getSelectedPublication()}
              onChange={(e) => { setPublicationSearch(e.target.value); setShowPublicationDropdown(true); }}
              onFocus={() => setShowPublicationDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showPublicationDropdown && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                <div onClick={() => { setShowAddPublicationModal(true); setShowPublicationDropdown(false); }}
                  className="p-3 bg-orange-50 hover:bg-orange-100 cursor-pointer border-b border-orange-100 flex items-center gap-2 text-orange-700 text-sm font-medium sticky top-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add New Publisher
                </div>
                {filteredPublications.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No publishers found</div>
                  : filteredPublications.map(pub => (
                    <div key={pub.publication_id} onClick={() => selectPublication(pub.publication_id)}
                      className={`p-3 hover:bg-orange-50 cursor-pointer text-sm ${form.publication_id == pub.publication_id ? "bg-orange-100 text-orange-700" : "text-gray-700"}`}>
                      {pub.publication_name}
                    </div>
                  ))}
              </div>
            )}
            {form.publication_id && (
              <button type="button" onClick={() => { setForm(p => ({ ...p, publication_id: "" })); setPublicationSearch(""); }}
                className="text-xs text-red-500 hover:underline mt-1">Clear</button>
            )}
          </div>

          {/* Authors */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Authors <span className="text-red-400">*</span></label>
            {form.authorIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {getSelectedAuthors().map(({ id, name }) => (
                  <span key={id} className="bg-violet-100 text-violet-800 border border-violet-200 px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                    {name}
                    <button type="button" onClick={() => removeAuthor(id)} className="text-violet-500 hover:text-violet-800 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" placeholder="Search and add authors..." value={authorSearch}
              onChange={(e) => { setAuthorSearch(e.target.value); setShowAuthorDropdown(true); }}
              onFocus={() => setShowAuthorDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
            {showAuthorDropdown && authorSearch && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                <div onClick={() => { setShowAddAuthorModal(true); setShowAuthorDropdown(false); }}
                  className="p-3 bg-violet-50 hover:bg-violet-100 cursor-pointer border-b border-violet-100 flex items-center gap-2 text-violet-700 text-sm font-medium sticky top-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add New Author
                </div>
                {filteredAuthors.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No authors found</div>
                  : filteredAuthors.map(a => (
                    <div key={a.author_id} onClick={() => addAuthor(a.author_id)}
                      className={`p-3 hover:bg-violet-50 cursor-pointer text-sm ${form.authorIds.some(id => id == a.author_id) ? "bg-violet-100 text-violet-800" : "text-gray-700"}`}>
                      {a.author_name} {form.authorIds.some(id => id == a.author_id) && <span className="text-xs ml-1">✓</span>}
                    </div>
                  ))}
              </div>
            )}
            {touched.authorIds && form.authorIds.length === 0 && (
              <p className="mt-1 flex items-center gap-1 text-red-500 text-xs">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Please select at least one author
              </p>
            )}
          </div>

          {/* Genres */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Genres</label>
            {form.genreIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {getSelectedGenres().map(({ id, name }) => (
                  <span key={id} className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                    {name}
                    <button type="button" onClick={() => removeGenre(id)} className="text-blue-500 hover:text-blue-800 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" placeholder="Search and add genres..." value={genreSearch}
              onChange={(e) => { setGenreSearch(e.target.value); setShowGenreDropdown(true); }}
              onFocus={() => setShowGenreDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showGenreDropdown && genreSearch && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                <div onClick={() => { setNewGenreName(genreSearch); setShowAddGenreModal(true); setShowGenreDropdown(false); }}
                  className="p-3 bg-blue-50 hover:bg-blue-100 cursor-pointer border-b border-blue-100 flex items-center gap-2 text-blue-700 text-sm font-medium sticky top-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add New Genre{genreSearch ? ` "${genreSearch}"` : ""}
                </div>
                {filteredGenres.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No genres found</div>
                  : filteredGenres.map(g => (
                    <div key={g.genre_id} onClick={() => addGenre(g.genre_id)}
                      className={`p-3 hover:bg-blue-50 cursor-pointer text-sm ${form.genreIds.some(id => id == g.genre_id) ? "bg-blue-100 text-blue-800" : "text-gray-700"}`}>
                      {g.genre_name} {form.genreIds.some(id => id == g.genre_id) && <span className="text-xs ml-1">✓</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all">
              {loading ? "Creating..." : "Create Book & Add Copies"}
            </button>
            <button type="button" onClick={() => navigate("/books")}
              className="px-5 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">Cancel</button>
          </div>
        </form>
      </div>

      {(showAuthorDropdown || showPublicationDropdown || showGenreDropdown || showCategoryDropdown) && (
        <div className="fixed inset-0 z-40" onClick={() => {
          setShowAuthorDropdown(false); setShowPublicationDropdown(false);
          setShowGenreDropdown(false); setShowCategoryDropdown(false);
        }} />
      )}

      {showAddAuthorModal     && <Modal title="Add New Author"      value={newAuthorName}      setValue={setNewAuthorName}      onAdd={handleAddNewAuthor}      loading={addingAuthor}      onClose={() => { setShowAddAuthorModal(false);      setNewAuthorName("");      }} placeholder="Author name"      color="violet" />}
      {showAddPublicationModal && <Modal title="Add New Publisher"   value={newPublicationName}  setValue={setNewPublicationName}  onAdd={handleAddNewPublication}  loading={addingPublication}  onClose={() => { setShowAddPublicationModal(false); setNewPublicationName("");  }} placeholder="Publisher name"   color="orange" />}
      {showAddCategoryModal   && <Modal title="Add New Category"    value={newCategoryName}    setValue={setNewCategoryName}    onAdd={handleAddNewCategory}    loading={addingCategory}    onClose={() => { setShowAddCategoryModal(false);   setNewCategoryName("");    }} placeholder="Category name"    color="blue"   />}
      {showAddGenreModal      && <Modal title="Add New Genre"       value={newGenreName}       setValue={setNewGenreName}       onAdd={handleAddNewGenre}       loading={addingGenre}       onClose={() => { setShowAddGenreModal(false);      setNewGenreName("");       }} placeholder="Genre name"       color="indigo" />}
    </div>
  );
}