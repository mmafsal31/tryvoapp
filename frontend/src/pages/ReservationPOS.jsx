import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth } from "../utils/auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import CartSection from "../components/pos/CartSection";
import ProductGrid from "../components/pos/ProductGrid";
import CustomerPanel from "../components/pos/CustomerPanel";

export default function ReservationPOS() {
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reservationData = location.state?.reservationData;

  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    outstanding_credit: 0,
  });

  const [checkoutCode, setCheckoutCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [discount, setDiscount] = useState(0);

  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [customCreditAmount, setCustomCreditAmount] = useState(0);

  // Load reservation into cart
  useEffect(() => {
    if (!reservationData) return;

    const product = reservationData.product;
    if (product?.id) {
      const label =
        reservationData.size_label ||
        product.sizes?.[0]?.size_label ||
        "Default";

      const matchedSize =
        product.sizes?.find((s) => s.size_label === label) || {
          size_label: label,
          price: product.price || 0,
        };

      setCart([
        {
          id: product.id,
          name: product.name,
          sizes: [matchedSize],
          quantity: reservationData.quantity || 1,
        },
      ]);
    }

    setCustomer((prev) => ({
      ...prev,
      name: reservationData.customer_name || prev.name,
      phone: reservationData.customer_phone || prev.phone,
    }));
  }, [reservationData]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("products/my_products/", {
          headers: { Authorization: `Bearer ${auth.access}` },
        });

        setProducts(
          Array.isArray(res.data) ? res.data : res.data.results || []
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, [auth.access]);

  // Cart logic
  const addToCart = (product) => {
    if (!product.selectedSize)
      return toast.error("Select a size first.");

    const size = product.selectedSize;

    setCart((prev) => {
      const existing = prev.find(
        (it) =>
          it.id === product.id &&
          it.sizes?.[0]?.size_label === size.size_label
      );

      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > size.quantity) {
          toast.error("Not enough stock.");
          return prev;
        }
        return prev.map((it) =>
          it.id === product.id &&
          it.sizes?.[0]?.size_label === size.size_label
            ? { ...it, quantity: newQty }
            : it
        );
      }

      return [
        ...prev,
        { id: product.id, name: product.name, sizes: [size], quantity: 1 },
      ];
    });
  };

  const updateQuantity = (id, sizeLabel, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.sizes?.[0]?.size_label === sizeLabel
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const removeFromCart = (id, sizeLabel) => {
    setCart((prev) =>
      prev.filter(
        (it) =>
          !(
            it.id === id &&
            it.sizes?.[0]?.size_label === sizeLabel
          )
      )
    );
  };

  // Reservation verification
  const verifyReservation = async () => {
    if (!checkoutCode.trim())
      return toast.error("Enter reservation code");

    if (!reservationData?.id)
      return toast.error("Invalid reservation ID");

    setVerifying(true);
    try {
      const res = await API.post(
        `reservations/verify-code/${reservationData.id}/`,
        { code: checkoutCode },
        {
          headers: { Authorization: `Bearer ${auth.access}` },
        }
      );

      if (res.data?.success) {
        setDiscount(res.data.advance_amount);
        setVerified(true);

        toast.success(
          `Reservation verified — ₹${res.data.advance_amount} discount applied`
        );
      } else {
        toast.error(res.data?.message || "Invalid reservation code");
      }
    } catch (err) {
      toast.error("Verification failed");
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  // Totals
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.quantity * (item.sizes[0]?.price || 0),
    0
  );

  const total = Math.max(subtotal - discount, 0);

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0)
      return toast.error("Cart is empty");

    if (!verified)
      return toast.error("Verify reservation before checkout");

    // Payment split
    let paid_amount = 0;
    let credit_amount = 0;

    if (paymentMode === "credit") {
      credit_amount = total;
    } else if (paymentMode === "mixed") {
      const creditPart = Number(customCreditAmount) || 0;

      if (creditPart <= 0 || creditPart >= total)
        return toast.error("Enter valid credit portion.");

      credit_amount = creditPart;
      paid_amount = total - creditPart;
    } else {
      paid_amount = Number(paidAmount) || total;
      credit_amount = Math.max(total - paid_amount, 0);
    }

    const formattedCart = cart.map((item) => ({
      product_id: item.id,
      size_label: item.sizes?.[0]?.size_label || "Default",
      quantity: item.quantity,
      unit_price: item.sizes?.[0]?.price || 0,
    }));

    const payload = {
      cart: formattedCart,
      subtotal,
      discount,
      total,
      reservation_id: reservationData.id,
      customer,
      payment: {
        mode: paymentMode,
        paid_amount,
        credit_amount,
      },
    };

    setLoading(true);
    try {
      const res = await API.post("create_reservation_sale/", payload, {
        headers: { Authorization: `Bearer ${auth.access}` },
      });

      if (res.data?.success) {
        toast.success(
          `✅ Sale successful (Invoice: ${res.data.invoice}) — ₹${res.data.total}`
        );

        setCart([]);
        setDiscount(0);
        setVerified(false);
        setPaidAmount(0);
        setCustomCreditAmount(0);

        navigate("/store/dashboard");
      } else {
        toast.error(res.data?.message || "Sale failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-yellow-600">
        🧾 Reservation Checkout
      </h2>

      {/* Reservation Verification */}
      <div className="border p-4 rounded bg-gray-50">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter Reservation Code"
            value={checkoutCode}
            onChange={(e) => setCheckoutCode(e.target.value)}
            className="border p-2 rounded w-64"
          />

          <button
            onClick={verifyReservation}
            disabled={verifying}
            className={`px-4 py-2 rounded text-white ${
              verifying ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </div>

        {verified && (
          <div className="text-green-600 mt-2 font-semibold">
            ✅ Reservation verified — Advance ₹{discount} credited
          </div>
        )}
      </div>

      {/* Customer Panel */}
      <CustomerPanel
        customer={customer}
        setCustomer={setCustomer}
      />

      {/* Products */}
      <ProductGrid
        products={products}
        setProducts={setProducts}
        addToCart={addToCart}
        search={""}
        setSearch={() => {}}
      />

      {/* Cart */}
      <CartSection
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        subtotal={subtotal}
        discount={discount}
        total={total}
      />

      {/* Payment Section */}
      <div className="border p-4 rounded bg-white">
        <div className="flex items-center gap-4 flex-wrap">
          {["cash", "card", "gpay", "credit", "mixed"].map(
            (mode) => (
              <label
                key={mode}
                className="flex items-center gap-2"
              >
                <input
                  type="radio"
                  name="paymode"
                  value={mode}
                  checked={paymentMode === mode}
                  onChange={() => setPaymentMode(mode)}
                />
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </label>
            )
          )}
        </div>

        {paymentMode === "mixed" && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              value={customCreditAmount}
              onChange={(e) =>
                setCustomCreditAmount(Number(e.target.value))
              }
              placeholder="Credit portion (₹)"
              className="border p-2 rounded w-48"
            />
            <div className="text-sm text-gray-600">
              Cash to collect: ₹
              {Math.max(
                total -
                  (Number(customCreditAmount) || 0),
                0
              ).toFixed(2)}
            </div>
          </div>
        )}

        {paymentMode !== "credit" &&
          paymentMode !== "mixed" && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                value={paidAmount}
                onChange={(e) =>
                  setPaidAmount(Number(e.target.value))
                }
                placeholder={`Paid amount (default ₹${total.toFixed(
                  2
                )})`}
                className="border p-2 rounded w-48"
              />
              <div className="text-sm text-gray-600">
                Remaining credit: ₹
                {Math.max(
                  total - (Number(paidAmount) || 0),
                  0
                ).toFixed(2)}
              </div>
            </div>
          )}

        <div className="mt-4 text-right">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={`px-6 py-2 rounded text-white ${
              loading
                ? "bg-gray-400"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading
              ? "Processing..."
              : `Checkout • ₹${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
