export default function ScanModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-slate-900 text-white w-full max-w-md p-6 rounded-xl shadow-2xl relative">

        <h2 className="text-lg font-semibold mb-4">
          Issue / Return Book
        </h2>

        <input
          type="text"
          placeholder="Scan or Enter Book Barcode"
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            Process
          </button>
        </div>
      </div>
    </div>
  );
}
