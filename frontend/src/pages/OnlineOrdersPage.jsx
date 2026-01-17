// src/pages/OnlineOrdersPage.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await API.get("buy-now-orders/");
      setOrders(res.data);
    } catch (err) {
      console.log("Order fetch error:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatus = async (id, status) => {
    try {
      await API.patch(`buy-now-orders/${id}/`, { status });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (err) {
      toast.error("Failed to update status");
      console.log(err);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center mt-10 text-lg font-medium text-gray-600">
        Loading orders...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold mb-6">Online Orders</h2>

      {/* ======================= ORDERS TABLE ======================= */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Customer</th>
            <th className="p-3">Product</th>
            <th className="p-3">Size</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Total</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t hover:bg-gray-50 transition">
              <td className="p-3 font-medium">{o.customer_name}</td>
              <td className="p-3">{o.product_name}</td>
              <td className="p-3">{o.size_label}</td>
              <td className="p-3">{o.quantity}</td>
              <td className="p-3 font-semibold">₹{o.total_price}</td>

              <td className="p-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    o.status === "pending"
                      ? "bg-yellow-200 text-yellow-800"
                      : o.status === "confirmed"
                      ? "bg-blue-200 text-blue-800"
                      : o.status === "delivered"
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {o.status.toUpperCase()}
                </span>
              </td>

              <td className="p-3 flex gap-2 justify-center">
                <button
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  onClick={() => setSelectedOrder(o)}
                >
                  View
                </button>

                {/* ---- STATUS BUTTONS ---- */}
                {o.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleStatus(o.id, "confirmed")}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleStatus(o.id, "cancelled")}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {o.status === "confirmed" && (
                  <button
                    onClick={() => handleStatus(o.id, "delivered")}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Deliver
                  </button>
                )}

                {o.status === "delivered" && (
                  <span className="text-green-700 font-medium">Delivered</span>
                )}

                {o.status === "cancelled" && (
                  <span className="text-red-600 font-medium">Cancelled</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ======================= ORDER DETAILS MODAL ======================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Order Details</h3>

            <div className="space-y-2">
              <p><strong>Customer:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Phone:</strong> {selectedOrder.phone}</p>
              <p><strong>Address:</strong> {selectedOrder.address}</p>
              <p><strong>Landmark:</strong> {selectedOrder.landmark || "—"}</p>
              <p><strong>Pincode:</strong> {selectedOrder.pincode}</p>
              <p><strong>District:</strong> {selectedOrder.district}</p>
              <p><strong>State:</strong> {selectedOrder.state}</p>
              <p><strong>Country:</strong> {selectedOrder.country}</p>
            </div>

            <div className="my-4 border-t pt-3 space-y-1">
              <p><strong>Product:</strong> {selectedOrder.product_name}</p>
              <p><strong>Size:</strong> {selectedOrder.size_label}</p>
              <p><strong>Quantity:</strong> {selectedOrder.quantity}</p>
              <p><strong>Total Price:</strong> ₹{selectedOrder.total_price}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
            </div>

            <button
              className="bg-red-500 text-white px-4 py-2 rounded w-full"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
