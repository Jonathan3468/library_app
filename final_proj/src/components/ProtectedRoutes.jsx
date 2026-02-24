import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, getUserRole, getBorrowerId } from "../utils/auth";

export default function ProtectedRoute({ children, allowedRoles, allowOwner = false }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = getUserRole();

  // Case 1: no roles specified → any authenticated user allowed
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Case 2: role-based access
  if (allowedRoles.includes(userRole)) {
    return children;
  }

  // Case 3: owner access
  if (allowOwner) {
    const borrowerId = getBorrowerId();
    if (borrowerId) {
      const pathParts = location.pathname.split('/');
      const resourceId = pathParts[pathParts.length - 1];
      
      // Allow if the borrower_id matches
      if (resourceId === borrowerId.toString()) {
        return children;
      }
    }
  }

  // Unauthorized
  return (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
      <p className="text-gray-600">You don't have permission to access this page.</p>
    </div>
  );
}