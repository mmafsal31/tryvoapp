import React from "react";

export default function CartSection({
  cart,
  updateQuantity,
  removeFromCart,
  processReturn,
  subtotal,
  discount,
  total,
  invoiceNo,
}) {
  const onProcessReturn = async (item) => {
    const qtyStr = prompt("Return quantity:", "1");
    const q = Number(qtyStr || 0);
    if (!q || q <= 0) return;
    await processReturn(item, q);
  };

  return (
    <div className="border p-4 rounded bg-white shadow-sm">
      <h3 className="text-xl font-semibold mb-2">🛒 Cart Summary</h3>

      {cart.length === 0 ? (
        <p className="text-gray-500">Cart is empty.</p>
      ) : (
        <>
          {cart.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center justify-between border-b py-2"
            >
              <div className="w-1/3">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.sizes?.[0]?.size_label || "N/A"}
                </div>
              </div>

              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const newQty = Number(e.target.value) || 1;
                  updateQuantity(item.id, item.sizes?.[0]?.size_label, newQty);
                }}
                className="border p-1 w-16 text-center rounded"
              />

              <div className="w-1/4 text-right font-medium">
                ₹{(item.sizes?.[0]?.price * item.quantity).toFixed(2)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    removeFromCart(item.id, item.sizes?.[0]?.size_label)
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  ✖
                </button>
                <button
                  onClick={() => onProcessReturn(item)}
                  className="text-sm px-2 py-1 border rounded bg-gray-100 hover:bg-gray-200"
                >
                  ↩ Return
                </button>
              </div>
            </div>
          ))}

          <div className="mt-3 text-right space-y-1">
            <p className="text-sm">
              Subtotal: <strong>₹{subtotal.toFixed(2)}</strong>
            </p>
            {discount > 0 && (
              <p className="text-sm text-green-600">
                Discount: -₹{discount.toFixed(2)}
              </p>
            )}
            <p className="font-bold text-lg text-gray-800">
              Total Payable: ₹{total.toFixed(2)}
            </p>
            {invoiceNo && (
              <p className="text-xs text-gray-600 mt-1">
                Last invoice: <strong>{invoiceNo}</strong>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
