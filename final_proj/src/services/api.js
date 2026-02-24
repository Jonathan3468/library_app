import axios from "axios";
import { toast } from "sonner";

const API = axios.create({
  baseURL: "http://localhost:3000",
});

// ================= REQUEST INTERCEPTOR =================
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================= RESPONSE INTERCEPTOR =================
API.interceptors.response.use(
  (response) => {
    const method = response.config.method;

    // ✅ Only show success popup for POST, PUT, DELETE
    if (
      ["post", "put", "delete"].includes(method) &&
      response.data?.message
    ) {
      toast.success(response.data.message);
    }

    return response;
  },
  (error) => {
    const method = error.config?.method;
    const url = error.config?.url || "";

    // 🔐 Handle Unauthorized — but skip routes that use 401 for validation
    if (error.response?.status === 401) {
      const skipLogoutRoutes = ["/auth/change-password"];
      const shouldLogout = !skipLogoutRoutes.some((route) => url.includes(route));

      if (shouldLogout) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // ❌ Show error popup only for POST, PUT, DELETE
    if (["post", "put", "delete"].includes(method)) {
      const message =
        error.response?.data?.message || "Something went wrong";
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default API;