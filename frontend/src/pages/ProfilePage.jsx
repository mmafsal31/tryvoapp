import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth, setAuth, clearAuthData } from "../utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [auth, setAuthState] = useState(getAuth());
  const [user, setUser] = useState(auth?.user ?? null);

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);

  // Function to convert media path to full URL
  const getImageUrl = (url) => {
    if (!url) return "https://raw.githubusercontent.com/mmafsal31/static-resources/main/no-image.png";

    if (url.startsWith("http")) return url;
    return `http://127.0.0.1:8000${url}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const authLocal = getAuth();
        if (!authLocal?.access) {
          clearAuthData();
          navigate("/login");
          return;
        }

        // 1️⃣ Load user
        const resUser = await API.get("user/");
        setUser(resUser.data);
        setAuthState({ ...authLocal, user: resUser.data });
        setAuth({ ...authLocal, user: resUser.data });

        // 2️⃣ Load user's reservations
        const resReservations = await API.get("reservations/");
        setReservations(resReservations.data);

        // 3️⃣ Load user's Buy Now orders
        const resOrders = await API.get("buy-now-orders/");
        setOrders(resOrders.data);

      } catch (err) {
        console.error("Profile load failed", err);
        if (err.response?.status === 401) {
          clearAuthData();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  if (loading) return <div className="p-6 text-gray-700">Loading profile...</div>;
  if (!user) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* ---------- USER INFO ---------- */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>

        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email || "N/A"}</p>
        <p><strong>Account Type:</strong> {user.is_store ? "Store Owner" : "Customer"}</p>

        {user.is_store && user.store && (
          <div className="mt-4 border-t pt-3">
            <p><strong>Store:</strong> {user.store.store_name}</p>
            <p><strong>Place:</strong> {user.store.place}</p>
            <p><strong>Category:</strong> {user.store.category}</p>
          </div>
        )}

        <button
          onClick={() =>
            user.is_store ? navigate("/store/dashboard") : navigate("/switch-store")
          }
          className="mt-5 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md w-full transition"
        >
          {user.is_store ? "Go to Store Dashboard" : "Switch to Store Account"}
        </button>
      </div>

      {/* =====================================================
            RESERVATIONS LIST
      ===================================================== */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Your Reservations</h2>

        {reservations.length === 0 ? (
          <p className="text-gray-500">No reservations made yet.</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="border p-4 rounded-xl shadow-sm bg-gray-50 flex gap-4">

                {/* 🖼 PRODUCT IMAGE */}
                <img
                  src={getImageUrl(r.product_image)}
                  alt="product"
                  className="w-20 h-20 rounded-lg object-cover border"
                />

                {/* DETAILS */}
                <div>
                  <p><strong>Product:</strong> {r.product_name}</p>
                  <p><strong>Size:</strong> {r.size_label}</p>
                  <p><strong>Quantity:</strong> {r.quantity}</p>

                  {/* ⭐ RESERVATION CODE */}
                  <p className="text-blue-600 font-semibold">
                    <strong>Reservation Code:</strong> {r.unique_code}
                  </p>

                  <p><strong>Status:</strong> {r.status}</p>
                  <p><strong>Date:</strong> {new Date(r.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
            BUY-NOW ORDERS LIST
      ===================================================== */}
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4">Your Buy Now Orders</h2>

        {orders.length === 0 ? (
          <p className="text-gray-500">No online orders placed yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="border p-4 rounded-xl shadow-sm bg-gray-50 flex gap-4">

                {/* 🖼 PRODUCT IMAGE 
                    o.product_main_image might exist depending on serializer
                    fallback → show placeholder
                */}
                <img
                  src={getImageUrl(o.product_main_image)}
                  alt="product"
                  className="w-20 h-20 rounded-lg object-cover border"
                />

                {/* DETAILS */}
                <div>
                  <p><strong>Product:</strong> {o.product_name}</p>
                  <p><strong>Size:</strong> {o.size_label}</p>
                  <p><strong>Quantity:</strong> {o.quantity}</p>
                  <p><strong>Total:</strong> ₹{o.total_price}</p>
                  <p><strong>Status:</strong> {o.status}</p>
                  <p><strong>Date:</strong> {new Date(o.created_at).toLocaleString()}</p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
