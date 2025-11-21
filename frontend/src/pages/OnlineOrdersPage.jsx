// src/pages/OnlineOrdersPage.jsx
import React, { useEffect, useState } from "react";
import API from "../api/axios";

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const res = await API.get("buy-now-orders/");
    setOrders(res.data);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatus = async (id, status) => {
    await API.patch(`buy-now-orders/${id}/`, { status });
    fetchOrders();
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Online Orders</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Customer</th>
            <th className="p-3">Product</th>
            <th className="p-3">Size</th>
            <th className="p-3">Qty</th>
            <th className="p-3">Total</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-3">{o.customer_name}</td>
              <td className="p-3">{o.product_name}</td>
              <td className="p-3">{o.size_label}</td>
              <td className="p-3">{o.quantity}</td>
              <td className="p-3">₹{o.total_price}</td>
              <td className="p-3 font-medium">{o.status}</td>
              <td className="p-3">
                {o.status === "pending" && (
                  <button
                    onClick={() => handleStatus(o.id, "confirmed")}
                    className="bg-[#DDF247] px-4 py-1 rounded-lg hover:bg-[#c7e63f]"
                  >
                    Confirm
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
