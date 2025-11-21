import React, { useState } from "react";
import API from "../../api/axios";
import { getAuth } from "../../utils/auth";

export default function CustomerPanel({ customer, setCustomer, onSettle }) {
  const [phoneInput, setPhoneInput] = useState(customer?.phone || "");
  const [nameInput, setNameInput] = useState(customer?.name || "");
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const fetchCustomer = async () => {
    if (!phoneInput.trim() || phoneInput.length < 4) {
      alert("Enter at least 4 digits of phone to lookup.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.get(
        `pos/get-customer-info/?phone=${encodeURIComponent(phoneInput)}`,
        { headers: { Authorization: `Bearer ${auth.access}` } }
      );
      if (res.data?.success) {
        const d = res.data.data || {};
        setCustomer({
          name: d.name || nameInput,
          phone: d.phone || phoneInput,
          outstanding_credit: parseFloat(d.outstanding_credit || 0),
          settle_credit: 0,
        });
        setNameInput(d.name || nameInput);
        alert(
          `Customer loaded: ${d.name || "-"} (Outstanding ₹${d.outstanding_credit})`
        );
      } else {
        setCustomer({
          name: nameInput,
          phone: phoneInput,
          outstanding_credit: 0,
          settle_credit: 0,
        });
        alert("Customer not found — will be created during sale.");
      }
    } catch (err) {
      console.error("fetchCustomer error:", err);
      alert("Failed to fetch customer info.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettleClick = async () => {
    const amtStr = prompt(
      "Enter amount to settle (₹):",
      `${customer?.outstanding_credit || 0}`
    );
    const amount = Number(amtStr || 0);
    if (!amount || amount <= 0) {
      return alert("Enter valid amount.");
    }
    const pm = prompt("Enter payment mode (Cash / UPI / Card):", "Cash") || "Cash";
    if (typeof onSettle === "function") {
      await onSettle(amount, pm);
    } else {
      alert("Settle handler not available.");
    }
  };

  return (
    <div className="border p-4 rounded bg-white shadow-sm space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="Customer phone"
          className="border p-2 rounded w-full"
        />
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Customer name"
          className="border p-2 rounded w-full"
        />

        <div className="flex items-center gap-2">
          <div className="text-sm">Outstanding:</div>
          <div className="font-semibold text-red-600">
            ₹{Number(customer?.outstanding_credit || 0).toFixed(2)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomer}
            disabled={loading}
            className={`px-3 py-2 rounded text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Loading..." : "Fetch"}
          </button>
          <button
            onClick={() =>
              setCustomer({
                name: nameInput,
                phone: phoneInput,
                outstanding_credit: customer?.outstanding_credit || 0,
                settle_credit: 0,
              })
            }
            className="px-3 py-2 border rounded hover:bg-gray-100"
          >
            Save
          </button>
        </div>
      </div>

      {Number(customer?.outstanding_credit || 0) > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSettleClick}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Settle Credit
          </button>
          <span className="text-sm text-gray-600">
            You can settle outstanding credit now.
          </span>
        </div>
      )}
    </div>
  );
}
