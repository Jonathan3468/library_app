import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

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
                Sending...
              </>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Modal state
  const [modal, setModal] = useState({ open: false, type: null });

  const openModal = (type) => setModal({ open: true, type });
  const closeModal = () => setModal({ open: false, type: null });

  const sendOverdueNotifications = async () => {
    closeModal();
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await API.post("/notifications/send-overdue");
      setResult(res.data.results);
    } catch { setError("Failed to send notifications. Please try again."); }
    finally { setLoading(false); }
  };

  const sendReminderNotifications = async () => {
    closeModal();
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await API.post("/notifications/send-reminders", { daysBeforeDue: 2 });
      setResult(res.data.results);
    } catch { setError("Failed to send reminders. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Notification Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">Send email alerts to borrowers</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Automated Notifications</p>
              <p className="text-xs text-blue-700">The system automatically sends notifications daily:</p>
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-blue-700"><span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-800">8:00 AM</span> — Reminder emails for books due in 2 days</p>
                <p className="text-xs text-blue-700"><span className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-800">9:00 AM</span> — Overdue notifications for all overdue books</p>
              </div>
              <p className="text-xs text-blue-700 mt-2">You can also trigger them manually below.</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex justify-between">
            {error}
            <button onClick={() => setError(null)} className="underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Notifications sent successfully</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {result.emailsSent ?? result.sent} email{(result.emailsSent ?? result.sent) !== 1 ? "s" : ""} sent
                  {result.total ? ` out of ${result.total} issues` : ""}
                  {result.failed > 0 && <span className="text-red-500 ml-1">· {result.failed} failed</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Overdue */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Overdue Notifications</h3>
                <p className="text-xs text-gray-400">For all overdue books</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Sends an email to every borrower who has books past their due date, reminding them to return or renew.
            </p>
            <button
              onClick={() => openModal("overdue")}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Send Overdue Notifications
            </button>
          </div>

          {/* Reminders */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Due Soon Reminders</h3>
                <p className="text-xs text-gray-400">Books due in 2 days</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Sends a friendly reminder to borrowers whose books are due within the next 2 days so they can plan ahead.
            </p>
            <button
              onClick={() => openModal("reminder")}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Send Reminder Notifications
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="mt-5 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex gap-3 items-start">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-xs text-gray-500">
              Notifications are only sent to borrowers with valid email addresses. Make sure contact information is up to date for effective delivery.
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        open={modal.open && modal.type === "overdue"}
        onClose={closeModal}
        onConfirm={sendOverdueNotifications}
        loading={loading}
        title="Send Overdue Notifications?"
        description="An email will be sent to every borrower with books past their due date. This cannot be undone."
        confirmLabel="Send Now"
        confirmClass="bg-red-600 hover:bg-red-700"
        icon={
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <ConfirmModal
        open={modal.open && modal.type === "reminder"}
        onClose={closeModal}
        onConfirm={sendReminderNotifications}
        loading={loading}
        title="Send Due Soon Reminders?"
        description="A reminder email will be sent to all borrowers with books due within 2 days."
        confirmLabel="Send Now"
        confirmClass="bg-blue-600 hover:bg-blue-700"
        icon={
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      />
    </div>
  );
}