// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { setAuthData } from "../utils/auth";

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("login/", form);
      const data = res.data;

      setAuthData(data);
      window.dispatchEvent(new Event("userChanged")); // 🔥 ensures useAuth updates immediately

      const user = data.user;
      if (user?.is_store) {
        navigate("/store/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-600 mb-4 text-center">Login</h2>

      {error && (
        <p className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 text-white py-2 rounded font-semibold hover:bg-yellow-600 transition"
        >
          Login
        </button>
      </form>

      <p className="text-center text-gray-600 mt-4">
        Don’t have an account?{" "}
        <Link to="/register" className="text-yellow-600 font-semibold">
          Register
        </Link>
      </p>
    </div>
  );
}
