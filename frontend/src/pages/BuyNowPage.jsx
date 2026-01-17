// src/pages/BuyNowPage.jsx
import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth } from "../utils/auth";
import { toast } from "react-toastify";

export default function BuyNowPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const { selectedSize, quantity = 1 } = state || {};

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    pincode: "",
    landmark: "",
    district: "",
    state: "Kerala",
    country: "India",
  });

  // Calculate total dynamically
  const totalPrice = useMemo(() => {
    if (!selectedSize?.price) return 0;
    return (selectedSize.price * quantity).toFixed(2);
  }, [selectedSize, quantity]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSize?.id) {
      toast.error("Please select a size before proceeding.");
      return;
    }

    try {
      const payload = {
        ...form,
        size: selectedSize.id,
        quantity,
      };

      await API.post("/buy-now-orders/", payload, {
        headers: { Authorization: `Bearer ${auth.access}` },
      });

      toast.success("Order placed successfully!");
      navigate("/");
    } catch (error) {
      console.error("Buy Now Error:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to place order.");
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 mt-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Checkout — Buy Now</h2>

      {/* Order Summary */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6">
        <h3 className="text-lg font-semibold mb-2">Order Summary</h3>

        {selectedSize ? (
          <div className="text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Product:</span>{" "}
              {selectedSize.product_name ||
                selectedSize.product?.name ||
                "Product"}
            </p>

            <p>
              <span className="font-medium">Size:</span>{" "}
              {selectedSize.size_label}
            </p>

            <p>
              <span className="font-medium">Price (unit):</span> ₹
              {selectedSize.price}
            </p>

            <p>
              <span className="font-medium">Quantity:</span> {quantity}
            </p>

            <hr className="my-2" />

            <p className="text-lg font-bold">Total: ₹{totalPrice}</p>
          </div>
        ) : (
          <p className="text-gray-500 italic">No product selected.</p>
        )}
      </div>

      {/* Checkout Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          "customer_name",
          "phone",
          "address",
          "pincode",
          "landmark",
          "district",
        ].map((f) => (
          <input
            key={f}
            type="text"
            name={f}
            placeholder={f.replace("_", " ").toUpperCase()}
            value={form[f]}
            onChange={handleChange}
            className="border p-3 rounded-lg focus:outline-none focus:border-[#DDF247]"
            required={f !== "landmark"}
          />
        ))}

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="state"
            value={form.state}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />
        </div>

        <button
          type="submit"
          className="mt-4 bg-[#DDF247] text-[#111] py-3 rounded-xl font-semibold hover:bg-[#c7e63f] transition"
        >
          Confirm Order
        </button>
      </form>
    </div>
  );
}
