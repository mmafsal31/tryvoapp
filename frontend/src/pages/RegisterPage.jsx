import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    place_text: "",
    password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    try {
      const { data } = await API.post("register/", {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        place_text: formData.place_text,
        password: formData.password,
        password2: formData.confirm_password,
      });

      console.log("✅ Registration success:", data);

      // Optionally auto-login after registration:
      try {
        const loginResponse = await API.post("auth/login/", {
          username: formData.username,
          password: formData.password,
        });

        localStorage.setItem("access", loginResponse.data.access);
        localStorage.setItem("refresh", loginResponse.data.refresh);
      } catch (loginErr) {
        console.error("Auto-login failed:", loginErr);
      }

      // ✅ Redirect directly to home
      setSuccess("Welcome to YellowSpace! Redirecting to your home...");
      setTimeout(() => navigate("/", { replace: true }), 1200);
    } catch (err) {
      console.error("❌ Registration error:", err.response?.data || err.message);
      if (err.response?.data) {
        const firstError = Object.values(err.response.data)[0];
        setError(firstError);
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-yellow-600">
          Create Your YellowSpace Account
        </h1>

        {error && (
          <p className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4 text-center">
            {error}
          </p>
        )}
        {success && (
          <p className="bg-green-100 text-green-700 text-sm p-2 rounded mb-4 text-center">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Location (City, District, State)
            </label>
            <input
              type="text"
              name="place_text"
              value={formData.place_text}
              onChange={handleChange}
              placeholder="e.g. Pattambi, Palakkad, Kerala"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-md font-semibold transition-colors"
          >
            Register
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-yellow-600 font-semibold hover:underline"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
