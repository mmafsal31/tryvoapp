import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth, setAuth, clearAuthData } from "../utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [auth, setAuthState] = useState(getAuth());
  const [user, setUser] = useState(auth?.user ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Fetch user profile from backend
  useEffect(() => {
    const loadUser = async () => {
      const authLocal = getAuth();
      if (!authLocal?.access) {
        clearAuthData();
        navigate("/login");
        return;
      }

      try {
        const res = await API.get("user/");
        setUser(res.data);
        const updated = { ...authLocal, user: res.data };
        setAuth(updated);
        setAuthState(updated);
      } catch (err) {
        console.error("fetch user failed", err);
        if (err.response?.status === 401) {
          clearAuthData();
          navigate("/login");
        } else {
          setError("Failed to load profile. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  // Handle switch to store logic
  const handleSwitchToStore = () => {
    if (!auth?.access) {
      clearAuthData();
      navigate("/switch-store");
      return;
    }

    if (user?.is_store && user.store) {
      setInfo("✅ You already have a store — redirecting to dashboard...");
      setTimeout(() => navigate("/switch-store"), 1500);
    } else {
      // No store yet → take user to store creation page
      navigate("/switch-store");
    }
  };

  if (loading) return <div className="p-6 text-gray-700">Loading profile...</div>;
  if (!user) return null;

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-2xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold mb-5 text-gray-800">Profile</h2>

      {error && (
        <div className="mb-3 text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
          {info}
        </div>
      )}

      <div className="space-y-2 text-gray-700">
        <p>
          <strong>Username:</strong> {user.username}
        </p>
        <p>
          <strong>Email:</strong> {user.email || "N/A"}
        </p>
        <p>
          <strong>Account Type:</strong>{" "}
          {user.is_store ? "Store Owner" : "Customer"}
        </p>

        {user.is_store && user.store && (
          <div className="mt-3 border-t pt-3 border-gray-200">
            <p>
              <strong>Store Name:</strong> {user.store.store_name}
            </p>
            <p>
              <strong>Place:</strong> {user.store.place}
            </p>
            <p>
              <strong>Category:</strong> {user.store.category}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        {user.is_store ? (
          <button
            onClick={() => navigate("/store/dashboard")}
            className="bg-yellow-500 hover:bg-yellow-600 transition text-white px-4 py-2 rounded-md w-full"
          >
            Go to Store Dashboard
          </button>
        ) : (
          <button
            onClick={handleSwitchToStore}
            className="bg-yellow-500 hover:bg-yellow-600 transition text-white px-4 py-2 rounded-md w-full"
          >
            Switch to Store Account
          </button>
        )}
      </div>
    </div>
  );
}
