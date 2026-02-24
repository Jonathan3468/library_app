import { useState } from "react";
import API from "../services/api";

export default function Renew() {
  const [rfId, setRfId] = useState("");      // changed from borrowerId
  const [copyCode, setCopyCode] = useState(""); // changed from copyId
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRenew = async (override = false) => {
    if (!rfId || !copyCode) {
      setResult({ error: "Please enter RF ID and Copy Code" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const res = await API.post("/issues/renew", {
        rf_id: rfId,           // send rf_id instead of borrower_id
        copy_code: copyCode,   // send copy_code instead of copy_id
        override,
      });

      setResult({
        success: true,
        message: override
          ? "Renewed successfully with override"
          : "Book renewed successfully",
        new_due_date: res.data.new_due_date,
        warnings: res.data.warnings || [],
      });
    } catch (err) {
      const data = err.response?.data;

      // If override required
      if (data?.requires_override) {
        const confirmOverride = window.confirm(
          data.warnings.join("\n") + "\n\nDo you want to override?"
        );

        if (confirmOverride) {
          handleRenew(true);
        } else {
          setResult({
            warning: true,
            warnings: data.warnings,
          });
        }
      } else {
        setResult({
          error: data?.error || "Renewal failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🔁 Renew Book
      </h2>

      <input
        type="text"
        placeholder="Scan RF ID or enter manually"
        className="w-full border p-3 mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        value={rfId}
        onChange={(e) => setRfId(e.target.value)}
      />

      <input
        type="text"
        placeholder="Scan Book Barcode (Copy Code)"
        className="w-full border p-3 mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        value={copyCode}
        onChange={(e) => setCopyCode(e.target.value)}
      />

      <button
        onClick={() => handleRenew()}
        disabled={loading}
        className={`w-full py-3 rounded-lg text-white font-semibold transition ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading ? "Processing..." : "Renew"}
      </button>

      {/* RESULT SECTION */}
      {result && (
        <div className="mt-6 p-4 rounded-lg border bg-gray-50">
          {result.success && (
            <div className="text-green-600 font-semibold">
              ✅ {result.message}
              {result.new_due_date && (
                <p className="text-sm text-gray-600 mt-1">
                  New Due Date: {new Date(result.new_due_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {result.warning && (
            <div className="text-yellow-600 font-semibold">
              ⚠ Renewal has warnings:
              <ul className="text-sm mt-2 list-disc list-inside">
                {result.warnings.map((w, index) => (
                  <li key={index}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.error && (
            <div className="text-red-600 font-semibold">
              ❌ {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
