import { useState } from "react";
import API from "../services/api";

export default function Scan() {
  const [borrowerId, setBorrowerId] = useState("");
  const [copyCode, setCopyCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!borrowerId || !copyCode) {
      setResult({ error: "Please enter Borrower ID and Copy Code" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const res = await API.post("/scan", {
        borrower_id: borrowerId,
        copy_code: copyCode,
      });

      setResult(res.data);
    } catch (err) {
      setResult(
        err.response?.data || { error: "Something went wrong" }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        📚 Scan Book
      </h2>

      <input
        type="number"
        placeholder="Borrower ID"
        className="w-full border p-3 mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={borrowerId}
        onChange={(e) => setBorrowerId(e.target.value)}
      />

      <input
        type="text"
        placeholder="Copy Code"
        className="w-full border p-3 mb-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={copyCode}
        onChange={(e) => setCopyCode(e.target.value)}
      />

      <button
        onClick={handleScan}
        disabled={loading}
        className={`w-full py-3 rounded-lg text-white font-semibold transition ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Processing..." : "Scan"}
      </button>

      {/* RESULT DISPLAY */}
      {result && (
        <div className="mt-6 p-4 rounded-lg border bg-gray-50">
          {/* ISSUE SUCCESS */}
          {result.action === "ISSUED" && (
            <div className="text-green-600 font-semibold">
              ✅ Book Issued Successfully
              <p className="text-sm text-gray-600 mt-1">
                Due Date:{" "}
                {new Date(result.due_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* RETURN SUCCESS */}
          {result.action === "RETURNED" && (
            <div className="text-blue-600 font-semibold">
              📥 Book Returned Successfully
              <p className="text-sm text-gray-600 mt-1">
                Fine: ₹{result.fine}
              </p>
            </div>
          )}

          {/* REQUEST CREATED */}
          {result.action === "REQUEST_CREATED" && (
            <div className="text-yellow-600 font-semibold">
              📌 Reservation Created Successfully
            </div>
          )}

          {/* ERROR DISPLAY */}
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
