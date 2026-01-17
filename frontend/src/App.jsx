// src/App.jsx

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";

// Pages
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SwitchToStore from "./pages/SwitchToStore";
import StoreDashboard from "./pages/StoreDashboard";
import ReserveProduct from "./pages/ReserveProduct";
import ProfilePage from "./pages/ProfilePage";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import POS from "./pages/POS";
import SalesDashboard from "./pages/SalesDashboard";
import ProductDetail from "./pages/ProductDetail";
import StoreReservations from "./pages/StoreReservations";
import StorePage from "./components/StorePage";
import StoreProfileEdit from "./pages/StoreProfileEdit";
import ReservationPOS from "./pages/ReservationPOS";
import StaffAttendance from "./pages/StaffAttendance";
import SalarySummary from "./pages/SalarySummary";
import BuyNowPage from "./pages/BuyNowPage";
import OnlineOrdersPage from "./pages/OnlineOrdersPage";

import CategoryManagement from "./pages/CategoryManagement";
import SubcategoryManagement from "./pages/SubcategoryManagement";
import OfferManagement from "./pages/OfferManagement";
import BulkUpload from "./pages/BulkUpload";
import useAuth from "./hooks/useAuth";

// ================================
// Private Route Wrapper
// ================================
function PrivateRoute({ children }) {
  const user = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ================================
// Store Only Route Wrapper
// ================================
function StoreRoute({ children }) {
  const user = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_store) return <Navigate to="/switch-store" replace />;
  return children;
}

// ================================
// MAIN APPLICATION
// ================================
export default function App() {
  return (
    <>
      <Router>
        <Navbar />
        <div className="min-h-screen bg-gray-50">

          <Routes>

            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/store/pos" element={<POS />} />
            <Route path="/bulk-upload" element={<BulkUpload />} />

            <Route
              path="/buy-now/:id"
              element={
                <PrivateRoute>
                  <BuyNowPage />
                </PrivateRoute>
              }
            />

            {/* AUTH REQUIRED */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />

            <Route
              path="/switch-store"
              element={
                <PrivateRoute>
                  <SwitchToStore />
                </PrivateRoute>
              }
            />

            <Route
              path="/reserve/:id"
              element={
                <PrivateRoute>
                  <ReserveProduct />
                </PrivateRoute>
              }
            />

            {/* PRODUCT MANAGEMENT */}
            <Route path="/store/edit-product/:id" element={<EditProduct />} />
            <Route path="/product/:id" element={<ProductDetail />} />

            {/* STORE-ONLY ROUTES */}
            <Route
              path="/store/dashboard"
              element={
                <StoreRoute>
                  <StoreDashboard />
                </StoreRoute>
              }
            />

            <Route
              path="/store/add-product"
              element={
                <StoreRoute>
                  <AddProduct />
                </StoreRoute>
              }
            />

            <Route path="/store/sales-dashboard" element={<SalesDashboard />} />


            <Route
              path="/store/reservations"
              element={
                <StoreRoute>
                  <StoreReservations />
                </StoreRoute>
              }
            />

            <Route
              path="/store/online-orders"
              element={
                <StoreRoute>
                  <OnlineOrdersPage />
                </StoreRoute>
              }
            />

            {/* CATEGORY MANAGEMENT */}
            <Route
              path="/store/categories"
              element={
                <StoreRoute>
                  <CategoryManagement />
                </StoreRoute>
              }
            />

            {/* SUBCATEGORY MANAGEMENT */}
            <Route
              path="/store/subcategories"
              element={
                <StoreRoute>
                  <SubcategoryManagement />
                </StoreRoute>
              }
            />

            {/* ATTENDANCE */}
            <Route path="/attendance" element={<StaffAttendance />} />
            <Route path="/salary-summary" element={<SalarySummary />} />

            {/* STORE PAGE & PROFILE */}
            <Route path="/store/:id" element={<StorePage />} />
            <Route path="/store/edit" element={<StoreProfileEdit />} />

            {/* RESERVATION POS */}
            <Route path="/pos/reservation" element={<ReservationPOS />} />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/manage/offers" element={<OfferManagement />} />
          </Routes>

        </div>
      </Router>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}
