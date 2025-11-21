import React, { useState } from "react";
import API from "../api/axios";
import { getUser } from "../utils/auth";

export default function StoreSwitchModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    store_name: "",
    place: "",
    category: "clothing",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const auth = getUser();

  if (!isOpen) return null;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await API.post("switch-to-store/", form, {
        headers: { Authorization: `Bearer ${auth?.access}` },
      });

      // ✅ Display success message with store name
      setMessage(`🎉 Store "${res.data.store_name}" created successfully! Please re-login.`);
      
      // ✅ Optional callback (e.g., refresh parent UI)
      if (onSuccess) onSuccess(res.data);

      // ✅ Fade out + close modal after 2 seconds
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error switching to store:", err);
      setError(
        err.response?.data?.detail ||
          "⚠️ Failed to switch to store. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✖
        </button>

        <h2 className="text-2xl font-bold text-yellow-600 mb-4 text-center">
          Create Your Store
        </h2>

        {error && (
          <p className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm text-center">
            {error}
          </p>
        )}
        {message && (
          <p className="bg-green-100 text-green-600 p-2 rounded mb-3 text-sm text-center transition-opacity duration-500">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="store_name"
            placeholder="Store Name"
            value={form.store_name}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <input
            name="place"
            placeholder="Place"
            value={form.place}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          >
            <option value="clothing">Clothing</option>
            <option value="footwear">Footwear</option>
            <option value="electronics">Electronics</option>
            <option value="home">Home Essentials</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded font-semibold text-white transition-all ${
              loading
                ? "bg-yellow-400 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {loading ? "Creating Store..." : "Register Store"}
          </button>
        </form>
      </div>
    </div>
  );
}
