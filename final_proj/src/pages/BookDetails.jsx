import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian } from "../utils/auth";
import { toast } from "sonner";
import ImageUpload from "./ImageUpload";
import { saveImage, loadImage } from "../utils/imageStorage";

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => { if (!isLibrarian()) navigate(`/books/${id}`); }, []);

  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [newCopyBarcode, setNewCopyBarcode] = useState("");
  const [addingCopy, setAddingCopy] = useState(false);

  // Lost book modal state
  const [lostModal, setLostModal] = useState(null); // copy object or null
  const [lostNotes, setLostNotes] = useState("");
  const [markingLost, setMarkingLost] = useState(false);

  // Searchable dropdown states
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [publicationSearch, setPublicationSearch] = useState("");
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  const [form, setForm] = useState({
    title: "", isbn: "", publication_year: "",
    category_id: "", publication_id: "",
    authorIds: [], genreIds: [], image_url: "",
  });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const [bookRes, authorsRes, genresRes, categoriesRes, pubsRes, copiesRes] = await Promise.all([
        API.get(`/books/${id}`), API.get("/authors"), API.get("/genres"),
        API.get("/categories"), API.get("/publications"), API.get(`/books/${id}/copies`),
      ]);
      const bookData = bookRes.data.book || bookRes.data;
      setBook(bookData);
      setAuthors(Array.isArray(authorsRes.data) ? authorsRes.data : (authorsRes.data.authors || []));
      setGenres(Array.isArray(genresRes.data) ? genresRes.data : (genresRes.data.genres || []));
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data.categories || []));
      setPublications(Array.isArray(pubsRes.data) ? pubsRes.data : (pubsRes.data.publications || []));
      setCopies(Array.isArray(copiesRes.data) ? copiesRes.data : (copiesRes.data.copies || []));
      setForm({
        title: bookData.title || "", isbn: bookData.isbn || "",
        publication_year: bookData.publication_year || "",
        category_id: bookData.category_id || "", publication_id: bookData.publication_id || "",
        authorIds: bookData.Authors ? bookData.Authors.map(a => a.author_id) : [],
        genreIds: bookData.Genres ? bookData.Genres.map(g => g.genre_id) : [],
        image_url: loadImage("book", id),
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load book details");
    } finally { setLoading(false); }
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleId = (field, toggledId) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(toggledId)
        ? prev[field].filter(x => x !== toggledId)
        : [...prev[field], toggledId],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      saveImage("book", id, form.image_url);
      const { image_url, ...apiForm } = form;
      await API.put(`/books/${id}`, apiForm);
      navigate("/books");
    } catch { toast.error("Failed to save book"); } finally { setSaving(false); }
  };

  const handleAddCopy = async () => {
    if (!newCopyBarcode.trim()) { toast.error("Please enter a barcode"); return; }
    try {
      setAddingCopy(true);
      await API.post("/copies", { book_id: id, copy_code: newCopyBarcode, status: "available" });
      setNewCopyBarcode(""); setShowAddCopyModal(false); fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add copy");
    } finally { setAddingCopy(false); }
  };

  const handleDeleteCopy = (copyId) => {
    toast("Delete this copy?", {
      description: "This action cannot be undone.",
      action: { label: "Delete", onClick: async () => {
        try { await API.delete(`/copies/${copyId}`); fetchData(); }
        catch (err) { toast.error(err.response?.data?.error || "Failed to delete copy"); }
      }},
      cancel: { label: "Cancel" },
    });
  };

  const handleMarkLost = async () => {
    if (!lostModal) return;
    try {
      setMarkingLost(true);
      const res = await API.post(`/copies/${lostModal.copy_id}/mark-lost`, { notes: lostNotes });
      toast.success(res.data.message);
      setLostModal(null); setLostNotes("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark copy as lost");
    } finally { setMarkingLost(false); }
  };

  const handleRestoreCopy = (copyId) => {
    toast("Restore this copy to available?", {
      action: { label: "Restore", onClick: async () => {
        try { await API.post(`/copies/${copyId}/restore`); fetchData(); toast.success("Copy restored"); }
        catch (err) { toast.error(err.response?.data?.error || "Failed to restore copy"); }
      }},
      cancel: { label: "Cancel" },
    });
  };

  // Derived display values
  const selectedCategory   = categories.find(c => c.category_id == form.category_id);
  const selectedPublication = publications.find(p => p.publication_id == form.publication_id);
  const selectedAuthors    = authors.filter(a => form.authorIds.some(i => i == a.author_id));
  const selectedGenres     = genres.filter(g => form.genreIds.some(i => i == g.genre_id));

  const filteredCategories   = categories.filter(c => (c.category_name || c.name || "").toLowerCase().includes(categorySearch.toLowerCase()));
  const filteredPublications = publications.filter(p => p.publication_name.toLowerCase().includes(publicationSearch.toLowerCase()));
  const filteredAuthors      = authors.filter(a => a.author_name.toLowerCase().includes(authorSearch.toLowerCase()));
  const filteredGenres       = genres.filter(g => g.genre_name.toLowerCase().includes(genreSearch.toLowerCase()));

  const copyStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "available") return "bg-green-50 text-green-700 border-green-200";
    if (s === "issued")    return "bg-orange-50 text-orange-700 border-orange-200";
    if (s === "lost")      return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  if (loading) return (
    <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );

  if (error || !book) return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-sm text-gray-500 mb-4">{error || "Book not found"}</p>
        <button onClick={() => navigate("/books")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">← Back to Books</button>
      </div>
    </div>
  );

  const currentImage = loadImage("book", id);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/books")} className="text-gray-400 hover:text-gray-700 text-sm transition">← Back</button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Edit Book</h2>
            <p className="text-sm text-gray-400 mt-0.5">{book.title}</p>
          </div>
        </div>

        {/* Current info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-4 items-center">
          {currentImage && (
            <img src={currentImage} alt="Cover" className="h-20 w-14 object-cover rounded-lg border border-blue-200 flex-shrink-0" />
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-sm flex-1">
            <div><span className="text-blue-400 text-xs">ISBN</span><p className="font-medium text-blue-900 text-xs">{book.isbn || "—"}</p></div>
            <div><span className="text-blue-400 text-xs">Year</span><p className="font-medium text-blue-900 text-xs">{book.publication_year || "—"}</p></div>
            <div><span className="text-blue-400 text-xs">Category</span><p className="font-medium text-blue-900 text-xs">{book.Category?.category_name || "—"}</p></div>
            <div><span className="text-blue-400 text-xs">Publisher</span><p className="font-medium text-blue-900 text-xs">{book.Publication?.publication_name || "—"}</p></div>
            <div className="md:col-span-2"><span className="text-blue-400 text-xs">Authors</span><p className="font-medium text-blue-900 text-xs">{book.Authors?.map(a => a.author_name).join(", ") || "—"}</p></div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 mb-5">

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Book Cover</label>
            <div className="flex gap-5 items-start">
              <div className="w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <ImageUpload value={form.image_url} onChange={(url) => setForm(prev => ({ ...prev, image_url: url }))} hidePreview />
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-400">*</span></label>
            <input type="text" name="title" value={form.title} onChange={handleChange}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ISBN</label>
              <input type="text" name="isbn" value={form.isbn} onChange={handleChange}
                className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Publication Year</label>
              <input type="number" name="publication_year" value={form.publication_year} onChange={handleChange}
                className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <input type="text" placeholder="Search category..."
              value={showCategoryDropdown ? categorySearch : (selectedCategory ? (selectedCategory.category_name || selectedCategory.name) : "")}
              onChange={(e) => { setCategorySearch(e.target.value); setShowCategoryDropdown(true); }}
              onFocus={() => setShowCategoryDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showCategoryDropdown && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-44 overflow-y-auto shadow-lg">
                <div onClick={() => { setShowCategoryDropdown(false); navigate("/categories/new"); }}
                  className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 cursor-pointer border-b border-blue-100 flex items-center gap-2 text-blue-700 text-sm font-medium sticky top-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add New Category
                </div>
                {filteredCategories.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No categories found</div>
                  : filteredCategories.map(cat => (
                    <div key={cat.category_id}
                      onClick={() => { setForm(prev => ({ ...prev, category_id: cat.category_id })); setCategorySearch(""); setShowCategoryDropdown(false); }}
                      className={`px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm ${form.category_id == cat.category_id ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}>
                      {cat.category_name || cat.name}
                    </div>
                  ))}
              </div>
            )}
            {form.category_id && (
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, category_id: "" })); setCategorySearch(""); }}
                className="text-xs text-red-400 hover:underline mt-1">Clear</button>
            )}
          </div>

          {/* Publisher */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
            <input type="text" placeholder="Search publisher..."
              value={showPublicationDropdown ? publicationSearch : (selectedPublication ? selectedPublication.publication_name : "")}
              onChange={(e) => { setPublicationSearch(e.target.value); setShowPublicationDropdown(true); }}
              onFocus={() => setShowPublicationDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showPublicationDropdown && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-44 overflow-y-auto shadow-lg">
                {filteredPublications.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No publishers found</div>
                  : filteredPublications.map(pub => (
                    <div key={pub.publication_id}
                      onClick={() => { setForm(prev => ({ ...prev, publication_id: pub.publication_id })); setPublicationSearch(""); setShowPublicationDropdown(false); }}
                      className={`px-3 py-2.5 hover:bg-orange-50 cursor-pointer text-sm ${form.publication_id == pub.publication_id ? "bg-orange-100 text-orange-700" : "text-gray-700"}`}>
                      {pub.publication_name}
                    </div>
                  ))}
              </div>
            )}
            {form.publication_id && (
              <button type="button" onClick={() => { setForm(prev => ({ ...prev, publication_id: "" })); setPublicationSearch(""); }}
                className="text-xs text-red-400 hover:underline mt-1">Clear</button>
            )}
          </div>

          {/* Authors */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Authors</label>
            {selectedAuthors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAuthors.map(a => (
                  <span key={a.author_id} className="flex items-center gap-1.5 bg-violet-100 text-violet-800 border border-violet-200 px-3 py-1 rounded-full text-xs">
                    {a.author_name}
                    <button type="button" onClick={() => toggleId("authorIds", a.author_id)} className="text-violet-400 hover:text-violet-800 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" placeholder="Search and add authors..."
              value={authorSearch}
              onChange={(e) => { setAuthorSearch(e.target.value); setShowAuthorDropdown(true); }}
              onFocus={() => setShowAuthorDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
            {showAuthorDropdown && authorSearch && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-44 overflow-y-auto shadow-lg">
                {filteredAuthors.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No authors found</div>
                  : filteredAuthors.map(a => (
                    <div key={a.author_id}
                      onClick={() => { toggleId("authorIds", a.author_id); setAuthorSearch(""); setShowAuthorDropdown(false); }}
                      className={`px-3 py-2.5 hover:bg-violet-50 cursor-pointer text-sm flex items-center justify-between ${form.authorIds.some(i => i == a.author_id) ? "bg-violet-100 text-violet-800" : "text-gray-700"}`}>
                      {a.author_name}
                      {form.authorIds.some(i => i == a.author_id) && (
                        <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Genres</label>
            {selectedGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedGenres.map(g => (
                  <span key={g.genre_id} className="flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs">
                    {g.genre_name}
                    <button type="button" onClick={() => toggleId("genreIds", g.genre_id)} className="text-blue-400 hover:text-blue-800 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" placeholder="Search and add genres..."
              value={genreSearch}
              onChange={(e) => { setGenreSearch(e.target.value); setShowGenreDropdown(true); }}
              onFocus={() => setShowGenreDropdown(true)}
              className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300" />
            {showGenreDropdown && genreSearch && (
              <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-44 overflow-y-auto shadow-lg">
                {filteredGenres.length === 0
                  ? <div className="p-3 text-gray-400 text-sm">No genres found</div>
                  : filteredGenres.map(g => (
                    <div key={g.genre_id}
                      onClick={() => { toggleId("genreIds", g.genre_id); setGenreSearch(""); setShowGenreDropdown(false); }}
                      className={`px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm flex items-center justify-between ${form.genreIds.some(i => i == g.genre_id) ? "bg-blue-100 text-blue-800" : "text-gray-700"}`}>
                      {g.genre_name}
                      {form.genreIds.some(i => i == g.genre_id) && (
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-all">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => navigate("/books")}
              className="px-5 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition">
              Cancel
            </button>
          </div>
        </div>

        {/* ── Copies ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Book Copies</h3>
              <p className="text-xs text-gray-400 mt-0.5">{copies.length} total</p>
            </div>
            <button onClick={() => setShowAddCopyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Copy
            </button>
          </div>

          {copies.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No copies yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["ID", "Barcode", "Status", "Borrower", "Due Date", ""].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {copies.map(c => {
                    const status = (c.status || "").toLowerCase();
                    const isAvailable = status === "available";
                    const isLost      = status === "lost";
                    return (
                      <tr key={c.copy_id} className={`transition ${isLost ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                        <td className="px-3 py-3 text-gray-500 text-xs">{c.copy_id}</td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{c.copy_code || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${copyStatusStyle(c.status)}`}>
                            {isLost && (
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs">{c.borrower?.borrower_name || "—"}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">
                          {c.borrower?.due_date ? new Date(c.borrower.due_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {/* Available: can delete or mark lost */}
                            {isAvailable && (
                              <>
                                <button
                                  onClick={() => { setLostModal(c); setLostNotes(""); }}
                                  className="text-xs text-orange-500 hover:text-orange-700 transition font-medium"
                                  title="Mark as lost"
                                >
                                  Mark Lost
                                </button>
                                <span className="text-gray-200">|</span>
                                <button onClick={() => handleDeleteCopy(c.copy_id)}
                                  className="text-xs text-red-400 hover:text-red-600 transition">
                                  Delete
                                </button>
                              </>
                            )}
                            {/* Issued: can mark lost */}
                            {status === "issued" && (
                              <button
                                onClick={() => { setLostModal(c); setLostNotes(""); }}
                                className="text-xs text-orange-500 hover:text-orange-700 transition font-medium"
                                title="Mark as lost — will close the issue and create a replacement fine"
                              >
                                Mark Lost
                              </button>
                            )}
                            {/* Lost: can restore */}
                            {isLost && (
                              <button
                                onClick={() => handleRestoreCopy(c.copy_id)}
                                className="text-xs text-emerald-600 hover:text-emerald-800 transition font-medium"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dropdown overlay */}
        {(showCategoryDropdown || showPublicationDropdown || showAuthorDropdown || showGenreDropdown) && (
          <div className="fixed inset-0 z-40" onClick={() => {
            setShowCategoryDropdown(false); setShowPublicationDropdown(false);
            setShowAuthorDropdown(false); setShowGenreDropdown(false);
          }} />
        )}

        {/* ── Add Copy Modal ─────────────────────────────────────────────────── */}
        {showAddCopyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Add New Copy</h3>
              <input
                type="text" value={newCopyBarcode}
                onChange={(e) => setNewCopyBarcode(e.target.value)}
                onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCopy(); } }}
                className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300 mb-4"
                placeholder="Scan or enter barcode" autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleAddCopy} disabled={addingCopy}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {addingCopy ? "Adding..." : "Add Copy"}
                </button>
                <button onClick={() => { setShowAddCopyModal(false); setNewCopyBarcode(""); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mark as Lost Modal ─────────────────────────────────────────────── */}
        {lostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              {/* Red header */}
              <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Mark Copy as Lost</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{lostModal.copy_code}</span>
                  </p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Warn if currently issued */}
                {(lostModal.status || "").toLowerCase() === "issued" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm text-amber-800 space-y-1">
                    <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Currently issued to {lostModal.borrower?.borrower_name || "a borrower"}
                    </p>
                    <p className="text-xs text-amber-700">The issue will be closed and a replacement fine will be automatically generated for this borrower.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Notes <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={lostNotes}
                    onChange={e => setLostNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                    rows={2}
                    placeholder="e.g. Reported lost by borrower on return"
                    autoFocus
                  />
                </div>

                <p className="text-xs text-gray-400">
                  Copy status will be set to <strong className="text-red-600">lost</strong> and will not be available for issue until restored.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleMarkLost}
                    disabled={markingLost}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {markingLost ? "Processing..." : "Mark as Lost"}
                  </button>
                  <button
                    onClick={() => { setLostModal(null); setLostNotes(""); }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}