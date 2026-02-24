// ImageUpload.jsx — reusable image upload component with client-side compression
import { useRef, useState } from "react";

export default function ImageUpload({ value, onChange, hidePreview = false }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, WEBP, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > height && width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else if (height > width && height > MAX) {
          width = Math.round((width * MAX) / height);
          height = MAX;
        } else if (width > MAX) {
          width = MAX;
          height = MAX;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        onChange(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  // When hidePreview=true the parent renders its own preview (book cover, author photo, etc.)
  // so we always show the dropzone here — whether or not a value exists.
  const showDropzone = !value || hidePreview;

  return (
    <div className="space-y-3">
      {/* Internal preview — only when NOT using an external preview */}
      {value && !hidePreview && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-48 w-32 object-cover rounded-lg border-2 border-gray-200 shadow"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow"
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Dropzone — always visible when no value, or when parent owns the preview */}
      {showDropzone && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors p-6
            ${dragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
            }`}
        >
          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-semibold text-gray-600">
            {value && hidePreview ? "Change image" : "Click to upload or drag & drop"}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 10MB</p>
        </div>
      )}

      {/* Change / Remove links — only for internal preview mode */}
      {value && !hidePreview && (
        <div className="flex gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} className="text-sm text-blue-600 hover:underline font-semibold">
            Change image
          </button>
          <button type="button" onClick={handleClear} className="text-sm text-red-500 hover:underline font-semibold">
            Remove
          </button>
        </div>
      )}

      {/* Remove link for external preview mode */}
      {value && hidePreview && (
        <button type="button" onClick={handleClear} className="text-sm text-red-500 hover:underline font-semibold">
          Remove image
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
    </div>
  );
}