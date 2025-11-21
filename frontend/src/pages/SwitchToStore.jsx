import React, { useState } from "react";
import API from "../api/axios";
import { getAuth, setAuthData } from "../utils/auth"; // unified getter
import { useNavigate } from "react-router-dom";

export default function SwitchToStore() {
  const [form, setForm] = useState({
    store_name: "",
    place: "",
    phone: "",
    category: "clothing",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await API.post("switch-to-store/", form, {
        headers: { Authorization: `Bearer ${auth?.access}` },
      });

      const updatedUser = { ...auth.user, is_store: true, store: res.data };
      setAuthData({ ...auth, user: updatedUser });

      setSuccess("🎉 You’re now a store owner! Redirecting...");
      setTimeout(() => navigate("/store/dashboard"), 1500);
    } catch (err) {
      console.error("Error switching to store:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Failed to switch to store. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-600 mb-4 text-center">
        Become a Store Owner
      </h2>

      {error && (
        <p className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm text-center">
          {error}
        </p>
      )}
      {success && (
        <p className="bg-green-100 text-green-600 p-2 rounded mb-3 text-sm text-center">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="store_name"
          placeholder="Store Name"
          value={form.store_name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="place"
          placeholder="Location / City"
          value={form.place}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="phone"
          placeholder="Contact Number"
          value={form.phone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="clothing">Clothing</option>
          <option value="footwear">Footwear</option>
          <option value="electronics">Electronics</option>
          <option value="home">Home Essentials</option>
          <option value="accessories">Accessories</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded font-semibold text-white transition ${
            loading
              ? "bg-yellow-400 cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-600"
          }`}
        >
          {loading ? "Converting..." : "Switch to Store"}
        </button>
      </form>
    </div>
  );
}
