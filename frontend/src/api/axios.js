// frontend/src/api/axios.js
import axios from "axios";
import { getToken, logout } from "../utils/auth";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
});

API.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;
