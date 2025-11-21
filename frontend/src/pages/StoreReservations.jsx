import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth, clearAuthData } from "../utils/auth";

export default function StoreReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth?.user;

  // 🔄 Fetch reservations for the store owner
  const fetchReservations = useCallback(async () => {
    try {
      const res = await API.get("store/my_store_reservations/", {
        headers: { Authorization: `Bearer ${auth.access}` },
      });
      setReservations(res.data);
    } catch {
      setError("⚠️ Failed to load reservations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth || !user) {
      clearAuthData();
      navigate("/login");
      return;
    }
    if (!user.is_store) {
      navigate("/");
      return;
    }
    fetchReservations();
  }, [auth, user, navigate, fetchReservations]);

  // ✅ Handle reservation status changes
  const handleStatusChange = async (id, newStatus, reservation = null) => {
    try {
      // 🟢 If completing, redirect to POS with proper product structure
      if (newStatus === "completed" && reservation) {
        const reservationData = {
          ...reservation,
          product: {
            id: reservation.product_id || reservation.product?.id,
            name: reservation.product_name,
            main_image: reservation.product_image,
            sizes: [
              {
                size_label: reservation.size_label,
                price: reservation.price,
                quantity:
                  reservation.available_quantity ||
                  reservation.quantity ||
                  1,
              },
            ],
          },
        };
        navigate("/pos/reservation", { state: { reservationData } });
        return;
      }

      // 🟡 Otherwise, update status normally
      await API.patch(
        `reservations/${id}/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${auth.access}` } }
      );

      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch {
      alert("Failed to update reservation status.");
    }
  };

  // 🕓 Loading state
  if (loading)
    return (
      <div className="flex justify-center items-center h-80 text-yellow-600 font-semibold">
        Loading reservations...
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-600 font-medium mt-10">{error}</div>
    );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-yellow-600 mb-6">
        🛎 Reservation Notifications
      </h2>

      {reservations.length === 0 ? (
        <div className="text-center text-gray-600 mt-10">
          <p className="text-lg font-medium">No reservations yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="border rounded-xl p-4 shadow-md hover:shadow-lg transition bg-white"
            >
              {/* Product Title */}
              <h3 className="text-lg font-semibold text-gray-800">
                {r.product_name || "Unknown Product"}
              </h3>

              {/* Product Image */}
              {r.product_image && (
                <img
                  src={r.product_image}
                  alt={r.product_name}
                  className="mt-2 w-full h-40 object-cover rounded-lg"
                />
              )}

              {/* Reservation Details */}
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                <p>
                  Size:{" "}
                  <span className="font-medium text-gray-800">
                    {r.size_label || "N/A"}
                  </span>
                </p>
                <p>
                  Quantity:{" "}
                  <span className="font-medium text-gray-800">
                    {r.quantity ?? "N/A"}
                  </span>
                </p>
                <p>
                  Price:{" "}
                  <span className="font-medium text-yellow-600">
                    ₹{r.price ?? "N/A"}
                  </span>
                </p>
                <p>
                  Advance:{" "}
                  <span className="font-medium text-gray-800">
                    ₹{r.advance_amount ?? 0}
                  </span>
                </p>
              </div>

              {/* Customer Info */}
              <p className="text-sm text-gray-600 mt-2">
                Customer:{" "}
                <span className="font-medium text-gray-800">
                  {r.customer_name || "N/A"}
                </span>
              </p>

              {/* Meta Info */}
              <p className="text-sm text-gray-600">
                Reserved At:{" "}
                <span className="font-medium">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </p>

              <p className="text-sm text-gray-600 mt-1">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    r.status === "reserved"
                      ? "text-yellow-600"
                      : r.status === "completed"
                      ? "text-green-600"
                      : r.status === "cancelled"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {r.status}
                </span>
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleStatusChange(r.id, "completed", r)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  ✅ Complete
                </button>
                <button
                  onClick={() => handleStatusChange(r.id, "cancelled")}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={() => handleStatusChange(r.id, "expired")}
                  className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
                >
                  ⏰ Expire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
