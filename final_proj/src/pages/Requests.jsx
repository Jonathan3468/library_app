import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { isLibrarian, isMember, getBorrowerId } from "../utils/auth";
import { toast } from "sonner";

// ── Reusable confirm modal ────────────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", confirmClass = "bg-blue-600 hover:bg-blue-700", icon, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {icon && (
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 border border-gray-100 mx-auto mb-4">
              {icon}
            </div>
          )}
          <h3 className="text-base font-bold text-gray-800 text-center mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-500 text-center">{description}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmClass}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Working...
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const Spinner = ({ size = 4 }) => (
  <svg className={`animate-spin h-${size} w-${size}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function Requests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");

  const [copyCode, setCopyCode] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [borrowers, setBorrowers] = useState([]);
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [isSearchingBorrower, setIsSearchingBorrower] = useState(false);

  const [bookSearch, setBookSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isSearchingBook, setIsSearchingBook] = useState(false);

  const [copies, setCopies] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [loadingCopies, setLoadingCopies] = useState(false);

  const [requests, setRequests] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [notifyingIds, setNotifyingIds] = useState(new Set());

  // Modal state
  const [modal, setModal] = useState({ open: false, type: null, requestId: null, meta: null });
  const [modalLoading, setModalLoading] = useState(false);

  const openModal = (type, requestId = null, meta = null) => setModal({ open: true, type, requestId, meta });
  const closeModal = () => { if (!modalLoading) setModal({ open: false, type: null, requestId: null, meta: null }); };

  useEffect(() => {
    if (isMember()) {
      const borrowerId = getBorrowerId();
      if (borrowerId) {
        API.get(`/borrowers/${borrowerId}`)
          .then(res => setSelectedBorrower(res.data.borrower || res.data))
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => { if (activeTab === "view") fetchRequests(); }, [activeTab, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (borrowerSearch.length >= 2) {
        if (/^\d+$/.test(borrowerSearch)) lookupByRfId(borrowerSearch);
        else searchBorrowers();
      } else { setBorrowers([]); setShowBorrowerDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [borrowerSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (bookSearch.length >= 2) searchBooks();
      else { setBooks([]); setShowBookDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [bookSearch]);

  const lookupByRfId = async (rfId) => {
    setIsSearchingBorrower(true);
    try {
      const res = await API.get(`/borrowers/rf/${rfId}`);
      if (res.data.borrower) { handleSelectBorrower(res.data.borrower); setBorrowerSearch(rfId); }
      else searchBorrowers();
    } catch { searchBorrowers(); } finally { setIsSearchingBorrower(false); }
  };

  const searchBorrowers = async () => {
    setIsSearchingBorrower(true);
    try {
      const res = await API.get(`/borrowers/search?q=${borrowerSearch}`);
      setBorrowers(res.data.borrowers || []); setShowBorrowerDropdown(true);
    } catch { setBorrowers([]); } finally { setIsSearchingBorrower(false); }
  };

  const searchBooks = async () => {
    setIsSearchingBook(true);
    try {
      const res = await API.get(`/search?q=${encodeURIComponent(bookSearch)}`);
      setBooks(res.data.results?.books || []); setShowBookDropdown(true);
    } catch { setBooks([]); } finally { setIsSearchingBook(false); }
  };

  const handleSelectBorrower = (borrower) => {
    setSelectedBorrower(borrower);
    setBorrowerSearch(`${borrower.borrower_name} (${borrower.rf_id ? "RF: " + borrower.rf_id : "ID: " + borrower.borrower_id})`);
    setShowBorrowerDropdown(false); setBorrowers([]);
  };

  const handleSelectBook = async (book) => {
    setSelectedBook(book); setBookSearch(book.title);
    setShowBookDropdown(false); setBooks([]); setSelectedCopy(null);
    await fetchCopies(book.book_id);
  };

  const fetchCopies = async (bookId) => {
    setLoadingCopies(true);
    try {
      const res = await API.get(`/books/${bookId}/copies`);
      setCopies(res.data.copies || []);
    } catch { setCopies([]); } finally { setLoadingCopies(false); }
  };

  const fetchRequests = async () => {
    setViewLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await API.get("/requests", { params });
      setRequests(res.data.requests || []);
    } catch { } finally { setViewLoading(false); }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!selectedBorrower) { toast.error("Please select a borrower"); return; }
    if (!selectedCopy && !copyCode) { toast.error("Please select a copy or enter a barcode"); return; }
    setCreateLoading(true); setCreateResult(null);
    try {
      const res = await API.post("/requests", {
        rf_id: selectedBorrower.rf_id || selectedBorrower.borrower_id.toString(),
        copy_code: selectedCopy ? selectedCopy.copy_code : copyCode
      });
      setCreateResult({ success: true, message: res.data.message, book_title: res.data.book_title, expiry_date: res.data.expiry_date });
      setTimeout(() => {
        setBookSearch(""); setSelectedBook(null); setCopyCode(""); setSelectedCopy(null); setCopies([]); setBooks([]);
        if (!isMember()) { setBorrowerSearch(""); setSelectedBorrower(null); setBorrowers([]); }
        setCreateResult(null);
      }, 2000);
    } catch (err) {
      setCreateResult({ success: false, message: err.response?.data?.error || "Failed to create request" });
    } finally { setCreateLoading(false); }
  };

  const handleClearForm = () => {
    setBookSearch(""); setSelectedBook(null); setCopyCode(""); setSelectedCopy(null); setCopies([]); setBooks([]);
    if (!isMember()) { setBorrowerSearch(""); setSelectedBorrower(null); setBorrowers([]); }
  };

  // ── Confirmed actions ──────────────────────────────────────────────────────
  const handleConfirmAction = async () => {
    const { type, requestId } = modal;
    setModalLoading(true);
    try {
      if (type === "cancel") {
        await API.delete(`/requests/${requestId}`);
        toast.success("Request cancelled");
        fetchRequests();
      } else if (type === "fulfill") {
        const res = await API.post(`/requests/${requestId}/fulfill`);
        toast.success(`${res.data.message} · Due: ${new Date(res.data.due_date).toLocaleDateString()}`);
        fetchRequests();
      } else if (type === "notify") {
        setNotifyingIds(prev => new Set(prev).add(requestId));
        const res = await API.post(`/notifications/send-request-available/${requestId}`);
        res.data.sent ? toast.success("Notification sent!") : toast.error(res.data.message || "Failed to send");
        setNotifyingIds(prev => { const s = new Set(prev); s.delete(requestId); return s; });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Action failed");
    } finally {
      setModalLoading(false);
      closeModal();
    }
  };

  const MODAL_CONFIG = {
    cancel: {
      title: "Cancel Request?",
      description: "This request will be permanently cancelled and the reservation released.",
      confirmLabel: "Yes, Cancel",
      confirmClass: "bg-red-600 hover:bg-red-700",
      icon: <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    },
    fulfill: {
      title: "Fulfill Request?",
      description: "This will issue the book to the requesting borrower and mark the request as fulfilled.",
      confirmLabel: "Issue Book",
      confirmClass: "bg-emerald-600 hover:bg-emerald-700",
      icon: <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    },
    notify: {
      title: "Notify Borrower?",
      description: "An availability email will be sent to the borrower letting them know the book is ready.",
      confirmLabel: "Send Notification",
      confirmClass: "bg-blue-600 hover:bg-blue-700",
      icon: <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
  };

  const statusBadge = (status) => ({
    pending:   "bg-amber-50 text-amber-700 border-amber-200",
    fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    expired:   "bg-gray-100 text-gray-500 border-gray-200",
  }[status] || "bg-gray-100 text-gray-500 border-gray-200");

  const cfg = modal.type ? MODAL_CONFIG[modal.type] : {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Book Requests</h2>
          <p className="text-sm text-gray-400 mt-0.5">Reserve and manage book requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "create" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Create Request
          </button>
          {!isMember() && (
            <button
              onClick={() => setActiveTab("view")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "view" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              View Requests
            </button>
          )}
        </div>

        {/* ── Create Tab ── */}
        {activeTab === "create" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Request a Book</h3>
            <p className="text-sm text-gray-400 mb-6">Create a reservation for a currently issued book</p>

            <form onSubmit={handleCreateRequest} className="space-y-6">

              {/* Borrower */}
              {isMember() ? (
                selectedBorrower && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">Requesting as</p>
                    <p className="font-semibold text-blue-900">{selectedBorrower.borrower_name}</p>
                    {selectedBorrower.rf_id && <p className="text-xs text-blue-600 mt-0.5">RF ID: {selectedBorrower.rf_id}</p>}
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Borrower <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input
                      type="text" value={borrowerSearch}
                      onChange={e => { setBorrowerSearch(e.target.value); if (selectedBorrower) setSelectedBorrower(null); }}
                      onFocus={() => borrowers.length > 0 && setShowBorrowerDropdown(true)}
                      placeholder="Scan RF ID or search by name..."
                      className="w-full border border-gray-200 p-3 pr-10 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingBorrower ? <Spinner /> : selectedBorrower ? (
                        <button type="button" onClick={() => { setSelectedBorrower(null); setBorrowerSearch(""); }} className="text-gray-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                    </div>
                    {showBorrowerDropdown && borrowers.length > 0 && !selectedBorrower && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {borrowers.map(b => (
                          <div key={b.borrower_id} onClick={() => handleSelectBorrower(b)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition">
                            <p className="text-sm font-medium text-gray-800">{b.borrower_name}</p>
                            <p className="text-xs text-gray-400">ID: {b.borrower_id}{b.rf_id && ` · RF: ${b.rf_id}`}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedBorrower && (
                    <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <div>
                        <p className="text-sm font-medium text-emerald-800">{selectedBorrower.borrower_name}</p>
                        <p className="text-xs text-emerald-600">ID: {selectedBorrower.borrower_id}{selectedBorrower.rf_id && ` · RF: ${selectedBorrower.rf_id}`}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Book Search */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-4">Select Book & Copy</p>

                <div className="relative mb-4">
                  <label className="block text-xs text-gray-500 mb-1.5">Search by title or ISBN</label>
                  <div className="relative">
                    <input
                      type="text" value={bookSearch}
                      onChange={e => { setBookSearch(e.target.value); if (selectedBook) { setSelectedBook(null); setCopies([]); setSelectedCopy(null); } }}
                      onFocus={() => books.length > 0 && setShowBookDropdown(true)}
                      placeholder="Start typing..."
                      className="w-full border border-gray-200 p-3 pr-10 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingBook ? <Spinner /> : selectedBook ? (
                        <button type="button" onClick={() => { setSelectedBook(null); setBookSearch(""); setCopies([]); setSelectedCopy(null); }} className="text-gray-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                    </div>
                    {showBookDropdown && books.length > 0 && !selectedBook && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                        {books.map(b => (
                          <div key={b.book_id} onClick={() => handleSelectBook(b)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition">
                            <p className="text-sm font-medium text-gray-800">{b.title}</p>
                            <p className="text-xs text-gray-400">ISBN: {b.isbn} · {b.publication_year}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedBook && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-800">{selectedBook.title}</p>
                      {loadingCopies && <Spinner size={4} />}
                    </div>
                    {copies.length === 0 && !loadingCopies ? (
                      <p className="text-xs text-red-500">No copies available for this book</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 mb-2">Select an issued copy to reserve:</p>
                        {copies.map(copy => (
                          <div
                            key={copy.copy_id}
                            onClick={() => copy.status === "Issued" && setSelectedCopy(copy)}
                            className={`p-3 rounded-lg border transition ${
                              selectedCopy?.copy_id === copy.copy_id ? "bg-blue-50 border-blue-300"
                              : copy.status === "Issued" ? "bg-white border-gray-200 hover:border-blue-200 cursor-pointer"
                              : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Copy: <span className="font-mono">{copy.copy_code}</span></p>
                                <p className={`text-xs mt-0.5 ${copy.status === "Issued" ? "text-orange-500" : "text-emerald-500"}`}>{copy.status}</p>
                                {copy.borrower?.due_date && (
                                  <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(copy.borrower.due_date).toLocaleDateString()}</p>
                                )}
                              </div>
                              {selectedCopy?.copy_id === copy.copy_id && (
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">OR</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Scan barcode directly</label>
                  <input
                    type="text" value={copyCode}
                    onChange={e => { setCopyCode(e.target.value); if (e.target.value) { setSelectedBook(null); setSelectedCopy(null); setBookSearch(""); } }}
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                    placeholder="Scan copy barcode..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createLoading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2 transition">
                  {createLoading ? <><Spinner size={4} />Processing...</> : "Create Request"}
                </button>
                {(selectedBook || copyCode) && (
                  <button type="button" onClick={handleClearForm}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm text-gray-500 transition">
                    Clear
                  </button>
                )}
              </div>
            </form>

            {createResult && (
              <div className={`mt-5 p-4 rounded-xl border ${createResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                <p className={`text-sm font-semibold ${createResult.success ? "text-emerald-800" : "text-red-700"}`}>
                  {createResult.success ? "Request Created!" : "Error"}
                </p>
                <p className={`text-xs mt-1 ${createResult.success ? "text-emerald-600" : "text-red-500"}`}>{createResult.message}</p>
                {createResult.success && createResult.expiry_date && (
                  <p className="text-xs text-emerald-500 mt-0.5">Expires: {new Date(createResult.expiry_date).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── View Tab ── */}
        {activeTab === "view" && !isMember() && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-semibold text-gray-800">All Requests</h3>
                <p className="text-xs text-gray-400 mt-0.5">{requests.length} records</p>
              </div>
              {/* Status filter pills */}
              <div className="flex gap-1.5 flex-wrap">
                {[["","All"], ["pending","Pending"], ["fulfilled","Fulfilled"], ["cancelled","Cancelled"], ["expired","Expired"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      statusFilter === val
                        ? val === "pending"   ? "bg-amber-100 border-amber-300 text-amber-700"
                          : val === "fulfilled" ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                          : val === "cancelled" ? "bg-red-100 border-red-300 text-red-700"
                          : val === "expired"   ? "bg-gray-200 border-gray-300 text-gray-600"
                          : "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {viewLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                <Spinner size={4} /> Loading...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No requests found</div>
            ) : (
              <div className="space-y-2.5">
                {requests.map(req => (
                  <div key={req.request_id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${statusBadge(req.status)}`}>
                            {req.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">#{req.request_id}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{req.Copy?.Book?.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Copy: <span className="font-mono bg-gray-100 px-1 rounded">{req.Copy?.copy_code}</span></p>
                        <div className="flex items-end justify-between mt-2">
                          <div>
                            <p className="text-xs text-gray-600 font-medium">{req.Borrower?.borrower_name}</p>
                            <p className="text-xs text-gray-400">{req.Borrower?.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Requested {new Date(req.request_date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">Expires {new Date(req.expiry_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {isLibrarian() && req.status === "pending" && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => openModal("fulfill", req.request_id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition"
                          >
                            Fulfill
                          </button>
                          <button
                            onClick={() => openModal("notify", req.request_id)}
                            disabled={notifyingIds.has(req.request_id)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium transition disabled:opacity-50 flex items-center gap-1 justify-center"
                          >
                            {notifyingIds.has(req.request_id) ? <><Spinner size={3} />Sending...</> : "Notify"}
                          </button>
                          <button
                            onClick={() => openModal("cancel", req.request_id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={modal.open}
        onClose={closeModal}
        onConfirm={handleConfirmAction}
        loading={modalLoading}
        title={cfg.title}
        description={cfg.description}
        confirmLabel={cfg.confirmLabel}
        confirmClass={cfg.confirmClass}
        icon={cfg.icon}
      />
    </div>
  );
}