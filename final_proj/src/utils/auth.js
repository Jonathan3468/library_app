//utils/auth.js
// Get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

// Get user role
export const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

// Get borrower_id
export const getBorrowerId = () => {
  const user = getCurrentUser();
  return user?.borrower_id || null;
};

// Get user id
export const getUserId = () => {
  const user = getCurrentUser();
  return user?.id || null;
};

// Check if user is admin
export const isAdmin = () => {
  return getUserRole() === "admin";
};

// Check if user is librarian or admin
export const isLibrarian = () => {
  const role = getUserRole();
  return role === "admin" || role === "librarian";
};

// Check if user is member
export const isMember = () => {
  return getUserRole() === "member";
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

// Update user in localStorage
export const updateStoredUser = (userData) => {
  localStorage.setItem("user", JSON.stringify(userData));
};

// Logout
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};