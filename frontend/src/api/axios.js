import axios from "axios";
import { getToken, logout } from "../utils/auth";

// 🔹 Base URL from Vite env (local / prod safe)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/",
  withCredentials: false,
  timeout: 15000,
});

// 🔐 Attach JWT token if available
API.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Handle auth & backend errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Debug helper (VERY useful)
    if (import.meta.env.DEV) {
      console.error(
        "API ERROR:",
        status,
        error.response?.data || error.message
      );
    }

    // Auto logout on token expiry
    if (status === 401) {
      logout();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;
