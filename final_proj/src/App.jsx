import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoutes";
import FineDetails from "./pages/FineDetails";
import Requests from "./pages/Requests";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import UserManagement from "./pages/UserManagement";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AddCategory from "./pages/Addcategory";
import AddGenre from "./pages/Addgenre";
import Settings from "./pages/Settings";
import AuditLog from "./pages/Auditlog";
import Publications from "./pages/Publications";
import AddPublication from "./pages/AddPublication";
import PublicationDetails from "./pages/PublicationDetails";
import Dashboard from "./pages/Dashboard";
import ScanAndRenew from "./pages/ScanAndRenew";
import Borrowers from "./pages/Borrowers";
import BorrowerDetails from "./pages/BorrowerDetails";
import AddBorrower from "./pages/AddBorrower";
import Books from "./pages/Books";
import bookRoutes from "./routes/bookRoutes";
import Authors from "./pages/Authors";
import AddAuthor from "./pages/AddAuthor";
import AuthorDetails from "./pages/AuthorDetails";
import Issues from "./pages/Issues";
import IssueStats from "./pages/IssueStats";   // NEW
import Notifications from "./pages/Notifications";
import Fines from "./pages/Fines";
import Search from "./pages/Search";
import PopularBooks from "./pages/PopularBooks";
import CustomFineDetails from "./components/CustomFineDetails";
import AuthPage from "./pages/AuthPage";

function App() {

  // UNIVERSAL AXIOS POPUP INTERCEPTOR
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        if (response.data?.message) {
          toast.success(response.data.message);
        }
        return response;
      },
      (error) => {
        const message =
          error.response?.data?.message ||
          error.message ||
          "Something went wrong";
        toast.error(message);
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <>
      <Toaster richColors position="top-right" />

      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            localStorage.getItem("token")
              ? <Navigate to="/dashboard" replace />
              : <AuthPage />
          }
        />
        <Route
          path="/register"
          element={
            localStorage.getItem("token")
              ? <Navigate to="/dashboard" replace />
              : <AuthPage />
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Books */}
          <Route path="books" element={<Books />} />
          {bookRoutes}

          {/* Popular / Search */}
          <Route path="popular" element={<PopularBooks />} />
          <Route path="search" element={<Search />} />

          {/* Settings — all users */}
          <Route path="settings" element={<Settings />} />

          {/* Borrowers */}
          <Route
            path="borrowers"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <Borrowers />
              </ProtectedRoute>
            }
          />
          <Route
            path="borrowers/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <AddBorrower />
              </ProtectedRoute>
            }
          />
          <Route
            path="borrowers/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]} allowOwner={true}>
                <BorrowerDetails />
              </ProtectedRoute>
            }
          />

          {/* Fines */}
          <Route
            path="fines"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <Fines />
              </ProtectedRoute>
            }
          />
          <Route
            path="fines/:id"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]} allowOwner={true}>
                <FineDetails />
              </ProtectedRoute>
            }
          />
          <Route path="fines/custom/:id" element={<CustomFineDetails />} />

          {/* Authors */}
          <Route path="authors" element={<Authors />} />
          <Route
            path="authors/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <AddAuthor />
              </ProtectedRoute>
            }
          />
          <Route path="authors/:id" element={<AuthorDetails />} />

          {/* Publications */}
          <Route path="publications" element={<Publications />} />
          <Route
            path="publications/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <AddPublication />
              </ProtectedRoute>
            }
          />
          <Route path="publications/:id" element={<PublicationDetails />} />

          {/* Categories & Genres */}
          <Route
            path="categories/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <AddCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="genres/new"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <AddGenre />
              </ProtectedRoute>
            }
          />

          {/* Scan / Reports / Notifications / Requests */}
          <Route
            path="scan"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <ScanAndRenew />
              </ProtectedRoute>
            }
          />

          {/* Reports — stats MUST come before :id to avoid param collision */}
          <Route
            path="reports/stats"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <IssueStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <Issues />
              </ProtectedRoute>
            }
          />

          <Route
            path="notifications"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian"]}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="requests"
            element={
              <ProtectedRoute allowedRoles={["admin", "librarian", "member"]}>
                <Requests />
              </ProtectedRoute>
            }
          />

          {/* Admin Only */}
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audits"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AuditLog />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;