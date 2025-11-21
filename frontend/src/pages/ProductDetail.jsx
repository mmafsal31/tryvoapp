import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth } from "../utils/auth";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);

  const getImageUrl = useMemo(
    () => (path) => {
      if (!path) return "https://via.placeholder.com/400x600?text=No+Image";
      if (path.startsWith("http")) return path;
      if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
      return `http://127.0.0.1:8000/media/${path}`;
    },
    []
  );

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const config = auth?.access
          ? { headers: { Authorization: `Bearer ${auth.access}` } }
          : {};
        const res = await API.get(`products/${id}/`, config);
        const data = res.data;
        const availableSizes = data.sizes?.filter((s) => s.quantity > 0) || [];
        setProduct({ ...data, sizes: availableSizes });
        setSelectedSize(availableSizes[0] || null);
        setMainImage(getImageUrl(data.main_image));
      } catch (err) {
        console.error("Error fetching product:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, auth?.access, getImageUrl]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-[#DDF247] font-semibold text-lg">
        Loading product details...
      </div>
    );

  if (!product)
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Product not found or unavailable.
      </div>
    );

  const isStoreOwner = auth?.user?.is_store;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleReserve = () => {
    if (!selectedSize) {
      alert("Please select a size before reserving.");
      return;
    }
    navigate(`/reserve/${id}`, { state: { selectedSize } });
  };

  const handleEdit = () => navigate(`/edit-product/${id}`);

  const handleStoreClick = () => {
    if (product.store) navigate(`/store/${product.store}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-8 bg-white">
      <div className="grid md:grid-cols-2 gap-10">
        {/* 🖼️ Product Images */}
        <div>
          <div className="border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm">
            <img
              src={mainImage}
              alt={product.name}
              onError={(e) =>
                (e.target.src =
                  "https://via.placeholder.com/400x600?text=Image+Unavailable")
              }
              className="w-full h-[420px] object-cover"
            />
          </div>

          {product.images?.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
              {product.images.map((img) => {
                const imgUrl = getImageUrl(img.image);
                return (
                  <img
                    key={img.id}
                    src={imgUrl}
                    alt="thumbnail"
                    onClick={() => setMainImage(imgUrl)}
                    className={`h-100 w-50 object-cover rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                      mainImage === imgUrl
                        ? "border-[#DDF247] ring-2 ring-[#DDF247]/40"
                        : "border-[#E0E0E0] hover:border-[#DDF247]"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 🧾 Product Info */}
        <div className="flex flex-col justify-start">
          <h1 className="text-4xl font-extrabold text-[#111111] mb-2 tracking-tight">
            {product.name}
          </h1>

          {/* 🏬 Store Name */}
          {product.store && (
            <button
              onClick={handleStoreClick}
              className="text-sm text-[#333333] hover:text-[#DDF247] font-medium mb-3 transition"
            >
              @{product.store_name || "Store"}
            </button>
          )}

          <p className="text-[#777777] mb-3 font-medium uppercase tracking-wide text-sm">
            {product.category || "Uncategorized"}
          </p>

          <p className="text-[#333333] mb-5 leading-relaxed">
            {product.description ||
              "No description provided for this product."}
          </p>

          {/* 📏 Sizes */}
          {product.sizes?.length > 0 ? (
            <div className="mb-6">
              <h3 className="font-semibold text-[#111111] mb-2">
                Select Size
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSize(s)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                      selectedSize?.id === s.id
                        ? "bg-[#DDF247] border-[#DDF247] text-[#111111]"
                        : "border-[#E0E0E0] text-[#333] hover:border-[#DDF247]"
                    }`}
                  >
                    {s.size_label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-red-500 font-semibold mb-4">
              Out of stock — all sizes unavailable.
            </p>
          )}

          {/* 💰 Price & Stock */}
          {selectedSize && (
            <div className="mb-5">
              <p className="text-2xl font-bold text-[#111111]">
                ₹{selectedSize.price}
                <span className="text-[#777777] text-sm ml-2">
                  ({selectedSize.quantity} in stock)
                </span>
              </p>
            </div>
          )}

          {/* 🔢 Quantity Selector */}
          {selectedSize && (
            <div className="flex items-center gap-3 mb-8">
              <button
                className="bg-[#F2F2F2] px-4 py-1.5 rounded-lg text-lg hover:bg-[#EAEAEA] transition"
                onClick={() => handleQuantityChange(-1)}
              >
                −
              </button>
              <span className="text-lg font-semibold text-[#111111]">
                {quantity}
              </span>
              <button
                className="bg-[#F2F2F2] px-4 py-1.5 rounded-lg text-lg hover:bg-[#EAEAEA] transition"
                onClick={() => handleQuantityChange(1)}
              >
                +
              </button>
            </div>
          )}

          {/* ⚡ Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleReserve}
              disabled={!selectedSize}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedSize
                  ? "bg-[#DDF247] hover:bg-[#c7e63f] text-[#111111] shadow-sm"
                  : "bg-[#E0E0E0] text-[#999] cursor-not-allowed"
              }`}
            >
              🔒 Reserve Now
            </button>

            {/* 🛒 Buy Now Button */}
            <button
              onClick={() =>
                navigate(`/buy-now/${id}`, { state: { selectedSize, quantity } })
              }
              disabled={!selectedSize}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedSize
                  ? "bg-[#111111] text-white hover:bg-[#222]"
                  : "bg-[#E0E0E0] text-[#999] cursor-not-allowed"
              }`}
            >
              🛒 Buy Now
            </button>

            {isStoreOwner && (
              <button
                onClick={handleEdit}
                className="border border-[#111111] text-[#111111] px-8 py-3 rounded-xl font-semibold hover:bg-[#111111] hover:text-white transition-all duration-300"
              >
                ✏️ Edit Product
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
