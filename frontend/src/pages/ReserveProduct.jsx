// src/pages/ReserveProduct.jsx
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import API from "../api/axios";

export default function ReserveProduct() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1); // 👈 New
  const ADVANCE_PER_ITEM = 150;
  const advance = quantity * ADVANCE_PER_ITEM;
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [reservationCode, setReservationCode] = useState(null);

  const preselected = location.state?.selectedSize;

  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/400x600?text=No+Image";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000/media/${path}`;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await API.get(`products/${id}/`);
        setProduct(res.data);
        if (preselected?.id) setSelectedSize(preselected.id);
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, preselected]);

  const handleReserve = async () => {
    if (!selectedSize) return alert("Please select a size");
    if (quantity <= 0) return alert("Quantity must be at least 1");

    try {
      setReserving(true);
      const reservedUntil = new Date(Date.now() + duration * 60000).toISOString();

      const res = await API.post("reservations/", {
        product: id,
        size: selectedSize,
        quantity, // 👈 send quantity
        advance_amount: advance,
        reserved_until: reservedUntil,
      });

      setReservationCode(res.data.unique_code);
    } catch (error) {
      console.error("Reservation failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setReserving(false);
    }
  };

  if (loading)
    return <p className="text-center mt-10 text-yellow-600 font-semibold">Loading...</p>;

  if (!product)
    return <p className="text-center mt-10 text-red-600 font-semibold">Product not found.</p>;

  const selectedObj = product.sizes.find((s) => s.id === Number(selectedSize));
  const totalPrice = selectedObj ? selectedObj.price * quantity : 0;
  const remaining = totalPrice - advance;

  if (reservationCode) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center border border-gray-200">
          <h2 className="text-2xl font-bold text-green-600 mb-3">
            🎉 Reservation Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Your reservation for <b>{product.name}</b> has been confirmed.
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg py-4 mb-5">
            <p className="text-sm text-gray-700">Your unique code:</p>
            <p className="text-3xl font-bold text-yellow-600">{reservationCode}</p>
          </div>
          <button
            onClick={() => navigate("/reservations")}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold"
          >
            View My Reservations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <div className="flex gap-5 mb-6">
        <img
          src={getImageUrl(product.main_image)}
          alt={product.name}
          className="w-32 h-32 object-cover rounded-lg border"
        />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
          <p className="text-gray-500 text-sm mb-1">{product.category}</p>
          <p className="text-gray-400 text-sm">Store: {product.store_name}</p>
        </div>
      </div>

      {/* Size Selection */}
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Select Size:
      </label>
      <select
        value={selectedSize}
        onChange={(e) => setSelectedSize(e.target.value)}
        className="w-full border border-gray-300 p-2 rounded mb-5 focus:ring-2 focus:ring-yellow-400 outline-none"
      >
        <option value="">Choose size</option>
        {product.sizes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.size_label} — ₹{s.price} (Stock: {s.quantity})
          </option>
        ))}
      </select>

      {/* Quantity */}
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Quantity:
      </label>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="w-full border border-gray-300 p-2 rounded mb-5 focus:ring-2 focus:ring-yellow-400 outline-none"
      />

      {/* Duration */}
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        Reservation Duration:
      </label>
      <select
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        className="w-full border border-gray-300 p-2 rounded mb-5 focus:ring-2 focus:ring-yellow-400 outline-none"
      >
        <option value={30}>30 Minutes</option>
        <option value={45}>45 Minutes</option>
        <option value={60}>1 Hour</option>
      </select>

      {/* Summary */}
      {selectedSize && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between mb-2">
            <span>Total Price:</span>
            <span className="font-medium text-gray-800">₹{totalPrice}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Advance Payment:</span>
            <span className="font-medium text-yellow-600">₹{advance}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Pay at Pickup:</span>
            <span>₹{remaining > 0 ? remaining : 0}</span>
          </div>
        </div>
      )}
      {selectedObj && (
        <p className="text-sm text-gray-500 mb-4">
          Available Stock: <span className="font-semibold">{selectedObj.quantity}</span>
        </p>
      )}
      <button
        onClick={handleReserve}
        disabled={reserving}
        className={`w-full py-3 rounded-lg font-semibold transition ${
          reserving
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-yellow-500 hover:bg-yellow-600 text-white"
        }`}
      >
        {reserving
          ? "Processing..."
          : selectedSize
          ? `Pay ₹${advance} & Reserve`
          : "Select Size to Reserve"}
      </button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        ⏰ Your reservation will be held for the selected duration. After that, the product may be released.
      </p>
    </div>
  );
}
