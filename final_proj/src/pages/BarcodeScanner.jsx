// BarcodeScanner.jsx — camera barcode scanner modal using ZXing
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef        = useRef(null);
  const readerRef       = useRef(null);
  const controlsRef     = useRef(null);

  const [cameras, setCameras]       = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [error, setError]           = useState(null);
  const [scanning, setScanning]     = useState(false);
  const [lastScan, setLastScan]     = useState(null);
  const cooldownRef                 = useRef(false);

  // ── Init ZXing + enumerate cameras ───────────────────────────────────────
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        if (!devices.length) { setError("No camera found on this device."); return; }
        setCameras(devices);
        // Prefer rear camera on mobile
        const rear = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        );
        setSelectedCamera((rear || devices[0]).deviceId);
      })
      .catch(() => setError("Could not access camera. Check browser permissions."));

    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  // ── Start scanning when camera is chosen ─────────────────────────────────
  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    // Stop any existing stream first
    controlsRef.current?.stop();
    setScanning(true);
    setError(null);

    readerRef.current
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err, controls) => {
        controlsRef.current = controls;
        if (result) {
          if (cooldownRef.current) return; // debounce repeated scans
          cooldownRef.current = true;
          const text = result.getText();
          setLastScan(text);
          // Flash feedback then callback
          setTimeout(() => {
            onScan(text);
            cooldownRef.current = false;
          }, 400);
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException fires constantly while no barcode in frame — that's normal
          console.warn("Scanner error:", err);
        }
      })
      .catch(err => {
        setError("Could not start camera: " + (err.message || "unknown error"));
        setScanning(false);
      });
  }, [selectedCamera]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800">Scan Barcode</h3>
            <p className="text-xs text-gray-400 mt-0.5">Point camera at the book barcode</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera selector — only show if multiple cameras */}
        {cameras.length > 1 && (
          <div className="px-5 pt-3">
            <select
              value={selectedCamera || ""}
              onChange={e => setSelectedCamera(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              {cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video feed */}
        <div className="relative mx-5 my-4 rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Scanning overlay */}
          {scanning && !error && (
            <>
              {/* Corner brackets */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-24">
                  {/* Top-left */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                  {/* Top-right */}
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                  {/* Bottom-left */}
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                  {/* Bottom-right */}
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                  {/* Scan line */}
                  <div className="absolute left-0 right-0 h-px bg-red-400 opacity-80 animate-scan-line" />
                </div>
              </div>
            </>
          )}

          {/* Last scan flash */}
          {lastScan && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-fade-in">
                ✓ {lastScan}
              </span>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mx-5 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Scan line animation */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 10%; }
          50%  { top: 90%; }
          100% { top: 10%; }
        }
        .animate-scan-line {
          animation: scan-line 1.8s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}