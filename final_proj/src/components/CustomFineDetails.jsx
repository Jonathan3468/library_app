import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

export default function CustomFineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [fine, setFine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit states
  const [isEditingReason, setIsEditingReason] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editedReason, setEditedReason] = useState("");
  const [editedPaymentMethod, setEditedPaymentMethod] = useState("");

  useEffect(() => {
    fetchFineDetails();
  }, [id]);

  const fetchFineDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/fines/custom/${id}`);
      setFine(res.data.fine);
      setEditedReason(res.data.fine.reason || "");
      setEditedPaymentMethod(res.data.fine.payment_method || "cash");
    } catch (err) {
      console.error("Failed to fetch fine details:", err);
      setError("Failed to load fine details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReason = async () => {
    try {
      await API.put(`/fines/custom/${id}/reason`, { reason: editedReason });
      toast.success("Reason updated successfully!");
      setIsEditingReason(false);
      fetchFineDetails();
    } catch (err) {
      toast.error("Failed to update reason");
    }
  };

  const handleSavePaymentMethod = async () => {
    try {
      await API.put(`/fines/custom/${id}/payment-method`, { payment_method: editedPaymentMethod });
      toast.success("Payment method updated successfully!");
      setIsEditingPayment(false);
      fetchFineDetails();
    } catch (err) {
      toast.error("Failed to update payment method");
    }
  };

  const handleMarkAsPaid = async () => {
    if (!confirm("Mark this fine as paid?")) return;

    try {
      await API.post(`/fines/custom/${id}/mark-paid`);
      toast.success("Fine marked as paid!");
      fetchFineDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark as paid");
    }
  };

  const handleWaive = async () => {
    const reason = prompt("Enter reason for waiving this fine:");
    if (!reason) return;

    try {
      await API.post(`/fines/custom/${id}/waive`, { reason });
      toast.success("Fine waived successfully!");
      fetchFineDetails();
    } catch (err) {
      toast.error("Failed to waive fine");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (error || !fine) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/fines")}
            className="text-gray-600 hover:text-gray-800 mb-4"
          >
            ← Back to Fines
          </button>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || "Fine not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/fines")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <h2 className="text-3xl font-bold">Custom Fine Details</h2>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              fine.status === "paid" 
                ? "bg-green-100 text-green-800"
                : fine.status === "waived"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}>
              {fine.status === "paid" ? "✓ Paid" : fine.status === "waived" ? "Waived" : "⏳ Pending"}
            </span>
          </div>

          {/* Fine Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-500">Fine ID</label>
                <p className="text-lg">CF-{fine.payment_id}</p>
                <span className="inline-block mt-1 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                  Custom Fine
                </span>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-500">Borrower</label>
                <p className="text-lg font-semibold">{fine.borrower_name}</p>
                <p className="text-sm text-gray-500">ID: {fine.borrower_id}</p>
                {fine.rf_id && (
                  <p className="text-sm text-gray-500">RF ID: {fine.rf_id}</p>
                )}
              </div>

              {/* 🔥 Show book copy if linked */}
              {fine.copy_code && (
                <div>
                  <label className="text-sm font-semibold text-gray-500">Book Copy</label>
                  <p className="text-lg font-semibold">{fine.book_title || "Unknown Book"}</p>
                  <p className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                    {fine.copy_code}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-500">Amount</label>
                <p className="text-2xl font-bold text-red-600">₹{fine.amount}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {fine.payment_date && (
                <div>
                  <label className="text-sm font-semibold text-gray-500">
                    {fine.status === "waived" ? "Waived On" : "Paid On"}
                  </label>
                  <p className="text-lg">
                    {new Date(fine.payment_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reason Section */}
          <div className="border-t pt-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-500">Reason</label>
              {!isEditingReason && (
                <button
                  onClick={() => setIsEditingReason(true)}
                  className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
            
            {isEditingReason ? (
              <div className="space-y-2">
                <textarea
                  value={editedReason}
                  onChange={(e) => setEditedReason(e.target.value)}
                  className="w-full border-2 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                  rows="3"
                  placeholder="Enter reason..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveReason}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingReason(false);
                      setEditedReason(fine.reason);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-lg bg-gray-50 p-3 rounded border border-gray-200">
                {fine.reason}
              </p>
            )}
          </div>

          {/* Payment Method Section */}
          {(fine.payment_method || fine.status === "paid") && (
            <div className="border-t pt-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-500">Payment Method</label>
                {!isEditingPayment && fine.status !== "waived" && (
                  <button
                    onClick={() => setIsEditingPayment(true)}
                    className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingPayment ? (
                <div className="space-y-2">
                  <select
                    value={editedPaymentMethod}
                    onChange={(e) => setEditedPaymentMethod(e.target.value)}
                    className="w-full border-2 p-3 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                    <option value="online">🌐 Online Transfer</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePaymentMethod}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingPayment(false);
                        setEditedPaymentMethod(fine.payment_method || "cash");
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                  {fine.payment_method === "cash" && "💵"}
                  {fine.payment_method === "card" && "💳"}
                  {fine.payment_method === "upi" && "📱"}
                  {fine.payment_method === "online" && "🌐"}
                  <span className="text-lg capitalize">
                    {fine.payment_method || "Not specified"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {fine.status === "pending" && (
            <div className="border-t pt-6">
              <div className="flex gap-4">
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark as Paid
                </button>
                <button
                  onClick={handleWaive}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Waive Fine
                </button>
              </div>
            </div>
          )}

          {/* Info Message for Paid/Waived Fines */}
          {fine.status !== "pending" && (
            <div className={`border-t pt-6 ${
              fine.status === "paid" ? "bg-green-50" : "bg-yellow-50"
            } p-4 rounded-lg border ${
              fine.status === "paid" ? "border-green-200" : "border-yellow-200"
            }`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  fine.status === "paid" ? "text-green-600" : "text-yellow-600"
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`font-semibold ${
                    fine.status === "paid" ? "text-green-800" : "text-yellow-800"
                  }`}>
                    {fine.status === "paid" ? "Fine Paid" : "Fine Waived"}
                  </p>
                  <p className={`text-sm ${
                    fine.status === "paid" ? "text-green-700" : "text-yellow-700"
                  }`}>
                    You can still edit the reason and payment method if needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}