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
          {cart.map((item, idx) => {
            // NEW: consistent size label fallback
            const sizeLabel =
              item.size_label ||
              item.size ||
              item.sizes?.[0]?.size_label ||
              "N/A";

            const price =
              item.unit_price ||
              item.price ||
              item.sizes?.[0]?.price ||
              0;

            return (
              <div
                key={`${item.product_id || item.id}-${idx}`}
                className="flex items-center justify-between border-b py-2"
              >
                {/* PRODUCT NAME + SIZE */}
                <div className="w-1/3">
                  <div className="font-medium">{item.product || item.name}</div>
                  <div className="text-xs text-gray-500">{sizeLabel}</div>
                </div>

                {/* QUANTITY INPUT */}
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQty = Number(e.target.value) || 1;
                    updateQuantity(item.id || item.product_id, sizeLabel, newQty);
                  }}
                  className="border p-1 w-16 text-center rounded"
                />

                {/* PRICE */}
                <div className="w-1/4 text-right font-medium">
                  ₹{(price * item.quantity).toFixed(2)}
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      removeFromCart(item.id || item.product_id, sizeLabel)
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
            );
          })}

          {/* TOTALS SECTION */}
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
