import React from "react";

export default function ProductGrid({
  products,
  setProducts,
  addToCart,
  search,
  setSearch,
}) {
  const filtered = (products || []).filter((p) =>
    (p.name || "").toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div className="border p-4 rounded bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="🔍 Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-1/2"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="border p-3 rounded-lg shadow-sm bg-white hover:shadow-md transition"
          >
            <img
              src={
                product.main_image ||
                product.images?.[0]?.image_url ||
                "https://via.placeholder.com/150"
              }
              alt={product.name}
              className="rounded w-full h-24 object-cover mb-2"
            />
            <div className="font-semibold text-sm truncate">
              {product.name || "Unnamed"}
            </div>

            <select
              className="border p-1 mt-2 rounded w-full text-sm"
              value={product.selectedSize?.size_label || ""}
              onChange={(e) => {
                const size =
                  product.sizes?.find(
                    (s) => s.size_label === e.target.value
                  ) || null;
                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === product.id ? { ...p, selectedSize: size } : p
                  )
                );
              }}
            >
              <option value="">-- Choose size --</option>
              {(product.sizes || []).map((s) => (
                <option
                  key={`${product.id}-${s.size_label}`}
                  value={s.size_label}
                >
                  {s.size_label} — ₹{s.price} ({s.quantity} left)
                </option>
              ))}
            </select>

            <button
              onClick={() => addToCart(product)}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 w-full text-sm mt-2"
            >
              ➕ Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
