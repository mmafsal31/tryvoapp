import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import API from "../api/axios";
import { getAuth } from "../utils/auth";
import ProductGrid from "../components/pos/ProductGrid";
import CartSection from "../components/pos/CartSection";
import CustomerPanel from "../components/pos/CustomerPanel";

export default function POS() {
  const auth = getAuth();
  const location = useLocation();
  const reservationData = location.state?.reservationData || null;

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    outstanding_credit: 0,
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkoutCode, setCheckoutCode] = useState("");
  const [verifiedReservation, setVerifiedReservation] = useState(false);
  const [reservationId, setReservationId] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState("");

  const [paymentMode, setPaymentMode] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [customCreditAmount, setCustomCreditAmount] = useState(0);

  // 🧾 Prefill reservation if data passed
  useEffect(() => {
    if (!reservationData) return;

    // ✅ Updated to handle proper reservation item structure
    if (Array.isArray(reservationData.items)) {
      setCart(
        reservationData.items.map((item) => ({
          id: item.product?.id || item.product_id,
          product_id: item.product?.id || item.product_id,
          name: item.product?.name || "Unknown Product",
          sizes: [
            {
              size_label: item.size_label,
              price: item.price,
            },
          ],
          quantity: item.quantity,
        }))
      );
    } else if (reservationData.product) {
      // fallback for single product reservations
      const product = reservationData.product;
      const label =
        reservationData.size_label ||
        reservationData.size ||
        product.sizes?.[0]?.size_label ||
        "Default";

      const matched =
        product.sizes?.find((s) => s.size_label === label) || {
          size_label: label,
          price: product.price || 0,
          quantity: reservationData.quantity || 1,
        };

      setCart([
        {
          id: product.id,
          product_id: product.id,
          name: product.name,
          sizes: [matched],
          quantity: reservationData.quantity || 1,
        },
      ]);
    }

    setCustomer((c) => ({
      ...c,
      name: reservationData.customer_name || c.name,
    }));
    setReservationId(reservationData.id || null);
  }, [reservationData]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await API.get("products/my_products/", {
          headers: { Authorization: `Bearer ${auth.access}` },
        });
        setProducts(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        console.error("Product fetch failed:", err);
      }
    };
    fetchProducts();
  }, [auth.access]);

  // Add to cart handler
  const addToCart = useCallback((product) => {
    if (!product.selectedSize) return alert("Please select a size first.");
    const size = product.selectedSize;
    if (size.quantity <= 0) return alert("Out of stock.");

    setCart((prev) => {
      const existing = prev.find(
        (it) =>
          it.id === product.id &&
          it.sizes?.[0]?.size_label === size.size_label
      );
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > size.quantity) {
          alert("Not enough stock.");
          return prev;
        }
        return prev.map((it) =>
          it.id === product.id &&
          it.sizes?.[0]?.size_label === size.size_label
            ? { ...it, quantity: newQty }
            : it
        );
      }
      return [...prev, { id: product.id, name: product.name, sizes: [size], quantity: 1 }];
    });
  }, []);

  // Quantity and removal logic
  const updateQuantity = useCallback((id, sizeLabel, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.sizes?.[0]?.size_label === sizeLabel
          ? { ...item, quantity: qty }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((id, sizeLabel) => {
    setCart((prev) =>
      prev.filter(
        (it) => !(it.id === id && it.sizes?.[0]?.size_label === sizeLabel)
      )
    );
  }, []);

  // Verify reservation
  const verifyReservationCode = async () => {
    if (!checkoutCode.trim()) return alert("Enter reservation code.");
    if (!reservationId) return alert("Reservation not available.");

    setVerifying(true);
    try {
      const res = await API.post(
        `reservations/verify-code/${reservationId}/`,
        { code: checkoutCode },
        { headers: { Authorization: `Bearer ${auth.access}` } }
      );
      if (res.data?.success) {
        setVerifiedReservation(true);
        setDiscount(150);
        alert("Reservation verified — ₹150 discount applied.");
      } else {
        alert(res.data?.message || "Invalid code.");
      }
    } catch (err) {
      console.error("Verify error:", err);
      alert("Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  // Totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * (item.sizes?.[0]?.price || 0),
    0
  );
  const total = Math.max(subtotal - discount, 0);

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    if (reservationData && !verifiedReservation)
      return alert("Verify reservation first.");

    let paid_amount = 0;
    let credit_amount = 0;
    const settle_credit_amount = Number(customer?.settle_credit || 0) || 0;

    if (paymentMode === "credit") {
      credit_amount = total;
    } else if (paymentMode === "mixed") {
      const creditPart = Number(customCreditAmount) || 0;
      if (creditPart <= 0 || creditPart >= total)
        return alert("Enter valid credit portion.");
      credit_amount = creditPart;
      paid_amount = total - creditPart;
    } else {
      paid_amount = Number(paidAmount) || total - settle_credit_amount;
      credit_amount = Math.max(total - paid_amount, 0);
    }

    const formattedCart = cart.map((item) => ({
      id: item.id,
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
      reservation_id: reservationId,
      customer: {
        name: customer?.name || null,
        phone: customer?.phone || null,
      },
      payment: {
        mode: paymentMode,
        paid_amount,
        credit_amount,
        settle_credit_amount,
      },
    };

    console.log("🧾 Final Sale Payload:", payload);

    setLoading(true);
    try {
      const res = await API.post("pos/create-sale/", payload, {
        headers: { Authorization: `Bearer ${auth.access}` },
      });

      if (res.data?.success) {
        const data = res.data.data || {};
        setInvoiceNo(data.invoice_no || "");
        alert(
          `✅ Sale successful!\nInvoice: ${data.invoice_no || "-"}\nSubtotal: ₹${subtotal.toFixed(
            2
          )}\nDiscount: ₹${discount}\nTotal: ₹${total.toFixed(2)}`
        );

        setCart([]);
        setDiscount(0);
        setReservationId(null);
        setVerifiedReservation(false);
        setPaidAmount(0);
        setCustomCreditAmount(0);

        if (customer?.phone) {
          const r2 = await API.get(
            `pos/get-customer-info/?phone=${encodeURIComponent(customer.phone)}`,
            { headers: { Authorization: `Bearer ${auth.access}` } }
          );
          if (r2.data?.success) {
            setCustomer((c) => ({
              ...c,
              outstanding_credit: parseFloat(r2.data.data.outstanding_credit || 0),
            }));
          }
        }
      } else {
        alert(res.data?.message || "Sale failed.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Failed to complete sale. Please review payload or backend response.");
    } finally {
      setLoading(false);
    }
  };

  // Settle customer credit
  const settleCustomerCredit = async (amount, payment_mode = "Cash") => {
    if (!customer?.phone) return alert("Enter/select customer phone first.");
    const amt = Number(amount) || 0;
    if (amt <= 0) return alert("Enter valid amount.");

    try {
      const res = await API.post(
        "settle-credit/",
        { phone: customer.phone, amount: amt, payment_mode },
        { headers: { Authorization: `Bearer ${auth.access}` } }
      );
      if (res.data?.success) {
        alert(res.data.message || "Credit settled successfully.");
        setCustomer((c) => ({
          ...c,
          outstanding_credit: parseFloat(res.data.remaining_credit || 0),
          settle_credit: 0,
        }));
      } else {
        alert(res.data.message || "Unable to settle credit.");
      }
    } catch (err) {
      console.error("Settle credit error:", err);
      alert("Failed to settle credit.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold text-yellow-600">💳 Point of Sale</h2>

      {reservationData && (
        <div className="border p-4 rounded bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold">{reservationData.customer_name}</div>
              <div className="text-sm text-gray-600">
                {reservationData.product?.name}
              </div>
              <div className="text-xs text-gray-500">
                Qty: {reservationData.quantity}
              </div>
            </div>
            <div className="text-right">
              Status:&nbsp;
              <span
                className={
                  verifiedReservation
                    ? "text-green-600 font-semibold"
                    : "text-orange-600 font-semibold"
                }
              >
                {verifiedReservation ? "Verified" : "Pending verification"}
              </span>
            </div>
          </div>

          {!verifiedReservation && (
            <div className="mt-3 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Reservation code"
                value={checkoutCode}
                onChange={(e) => setCheckoutCode(e.target.value)}
                className="border p-2 rounded w-48"
              />
              <button
                onClick={verifyReservationCode}
                disabled={verifying}
                className={`px-4 py-2 rounded text-white ${
                  verifying ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}
          {verifiedReservation && (
            <div className="text-green-600 mt-2 font-semibold">
              ₹150 reservation discount applied
            </div>
          )}
        </div>
      )}

      <CustomerPanel
        customer={customer}
        setCustomer={setCustomer}
        onSettle={settleCustomerCredit}
      />

      <ProductGrid
        products={products}
        setProducts={setProducts}
        addToCart={addToCart}
        search={search}
        setSearch={setSearch}
      />

      <CartSection
        cart={cart}
        setCart={setCart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        subtotal={subtotal}
        discount={discount}
        total={total}
        invoiceNo={invoiceNo}
      />

      {/* Payment Section */}
      <div className="border p-4 rounded bg-white">
        <div className="flex items-center gap-4 flex-wrap">
          {["cash", "card", "gpay", "credit", "mixed"].map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="paymode"
                value={mode}
                checked={paymentMode === mode}
                onChange={() => setPaymentMode(mode)}
              />
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </label>
          ))}
        </div>

        {paymentMode === "mixed" && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              value={customCreditAmount}
              onChange={(e) => setCustomCreditAmount(Number(e.target.value))}
              placeholder="Credit portion (₹)"
              className="border p-2 rounded w-48"
            />
            <div className="text-sm text-gray-600">
              Cash to collect: ₹
              {Math.max(total - (Number(customCreditAmount) || 0), 0).toFixed(2)}
            </div>
          </div>
        )}

        {paymentMode !== "credit" && paymentMode !== "mixed" && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              placeholder={`Paid amount (default ₹${total.toFixed(2)})`}
              className="border p-2 rounded w-48"
            />
            <div className="text-sm text-gray-600">
              Remaining credit: ₹
              {Math.max(total - (Number(paidAmount) || 0), 0).toFixed(2)}
            </div>
          </div>
        )}

        <div className="mt-4 text-right">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={`px-6 py-2 rounded text-white ${
              loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Processing..." : `Checkout • ₹${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
