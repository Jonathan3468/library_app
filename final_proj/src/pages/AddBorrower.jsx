import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "sonner";

export default function AddBorrower() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    borrower_name: "",
    email: "",
    phone: "",
    address: "",
    rf_id: ""
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case "borrower_name":
        if (!value.trim()) return "Borrower name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.trim().length > 100) return "Name must not exceed 100 characters";
        if (!/^[a-zA-Z\s.'-]+$/.test(value)) return "Name can only contain letters, spaces, and basic punctuation";
        return "";

      case "email":
  if (!value.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value)) return "Please enter a valid email address";
  if (value.length > 100) return "Email must not exceed 100 characters";
  return "";
      case "phone":
        if (!value.trim()) return "";
        const cleanPhone = value.replace(/[\s\-()]/g, "");
        if (!/^\+?1?\d{10}$/.test(cleanPhone)) return "Please enter a valid 10-digit phone number";
        return "";

      case "rf_id":
        if (!value.trim()) return "";
        if (value.length > 50) return "RF ID must not exceed 50 characters";
        if (!/^[a-zA-Z0-9\-_]+$/.test(value)) return "RF ID can only contain letters, numbers, hyphens, and underscores";
        return "";

      case "address":
        if (value.length > 500) return "Address must not exceed 500 characters";
        return "";

      default:
        return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    try {
      setLoading(true);
      const cleanedForm = {
        borrower_name: form.borrower_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        rf_id: form.rf_id.trim() || null
      };
      await API.post("/borrowers", cleanedForm);
      toast.success("Borrower added successfully!");
      navigate("/borrowers");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "";
      if (errorMsg.toLowerCase().includes("email") && errorMsg.toLowerCase().includes("exist")) {
        setErrors(prev => ({ ...prev, email: "This email is already registered" }));
        toast.error("Email already exists");
      } else if (errorMsg.toLowerCase().includes("rf_id") && errorMsg.toLowerCase().includes("exist")) {
        setErrors(prev => ({ ...prev, rf_id: "This RF ID is already registered" }));
        toast.error("RF ID already exists");
      } else {
        toast.error(errorMsg || "Failed to add borrower. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasActiveErrors = Object.values(errors).some(e => e);

  const getFieldClass = (name) => {
    const base = "w-full border-2 p-3 rounded-lg focus:outline-none transition-all text-sm";
    if (touched[name] && errors[name]) return `${base} border-red-400 focus:border-red-500 bg-red-50`;
    if (touched[name] && !errors[name] && form[name]) return `${base} border-green-400 focus:border-green-500 bg-green-50`;
    return `${base} border-gray-200 focus:border-blue-400`;
  };

  const FieldError = ({ name }) =>
    touched[name] && errors[name] ? (
      <p className="mt-1 flex items-center gap-1 text-red-600 text-xs">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {errors[name]}
      </p>
    ) : null;

  const InfoHint = ({ icon, text }) => (
    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
      {icon}
      {text}
    </p>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/borrowers")} className="text-gray-400 hover:text-gray-700 text-sm">← Back</button>
          <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">Add New Borrower</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text" name="borrower_name" value={form.borrower_name}
              onChange={handleChange} onBlur={() => handleBlur("borrower_name")}
              className={getFieldClass("borrower_name")} placeholder="Enter full name"
            />
            <FieldError name="borrower_name" />
          </div>

          {/* RF ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">RF ID / Card Number</label>
            <input
              type="text" name="rf_id" value={form.rf_id}
              onChange={handleChange} onBlur={() => handleBlur("rf_id")}
              className={getFieldClass("rf_id")} placeholder="Scan or enter RF ID card"
            />
            <FieldError name="rf_id" />
            {!(touched.rf_id && errors.rf_id) && (
              <InfoHint
                icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                text="Scan RF card or enter ID manually — used for quick borrower identification"
              />
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} onBlur={() => handleBlur("email")}
              className={getFieldClass("email")} placeholder="borrower@example.com"
            />
            <FieldError name="email" />
            {!(touched.email && errors.email) && (
              <InfoHint
                icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                text="Required for automated overdue notifications"
              />
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <input
              type="tel" name="phone" value={form.phone}
              onChange={handleChange} onBlur={() => handleBlur("phone")}
              className={getFieldClass("phone")} placeholder="1234567890"
            />
            <FieldError name="phone" />
            {!(touched.phone && errors.phone) && (
              <InfoHint icon={null} text="Enter a 10-digit phone number (with or without country code)" />
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <textarea
              name="address" value={form.address}
              onChange={handleChange} onBlur={() => handleBlur("address")}
              className={getFieldClass("address")} rows="3" placeholder="Enter full address"
            />
            <FieldError name="address" />
            <p className="text-xs text-gray-400 mt-1">{form.address.length}/500 characters</p>
          </div>

          {/* Error summary — only shown if there are real errors after touching */}
          {hasActiveErrors && Object.keys(touched).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Please fix the following errors:</p>
                  <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                    {Object.entries(errors)
                      .filter(([, err]) => err)
                      .map(([field, err]) => (
                        <li key={field}>{err}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </span>
              ) : "Add Borrower"}
            </button>
            <button type="button" onClick={() => navigate("/borrowers")}
              className="px-5 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}