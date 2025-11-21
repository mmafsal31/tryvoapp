import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import { MapPin, Share2, MessageCircle } from "lucide-react";
import ProductCard from "./ProductCard";

export default function StorePage() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/store/${id}/`)
      .then((res) => setStore(res.data))
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [id]);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000/media/${path}`;
  };

  if (loading)
    return <div className="text-center py-10">Loading store...</div>;

  if (!store)
    return (
      <div className="text-center py-10 text-red-500">Store not found.</div>
    );

  const coverImage = getImageUrl(store.cover_image);
  const logoImage = getImageUrl(store.logo);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 🏪 Store Header */}
      <div className="flex flex-col items-center mb-8">
        {/* Cover Image */}
        {coverImage ? (
          <div
            className="w-full h-48 bg-cover bg-center rounded-2xl mb-4"
            style={{ backgroundImage: `url(${coverImage})` }}
          ></div>
        ) : (
          <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4"></div>
        )}

        {/* Store Info */}
        <div className="flex flex-col items-center text-center -mt-12">
          <img
            src={logoImage || "https://via.placeholder.com/100x100?text=Logo"}
            alt={store.store_name}
            className="w-24 h-24 rounded-full border-4 border-white shadow-md mb-2 object-cover"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            {store.store_name}
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            @{store.store_name?.replace(/\s+/g, "").toLowerCase()}
          </p>
          {store.category && (
            <p className="text-gray-600 text-sm mb-4">
              Category: {store.category}
            </p>
          )}
          <div className="flex gap-3">
            <button className="bg-yellow-500 text-white px-5 py-2 rounded-full font-medium hover:bg-yellow-600 transition">
              Follow
            </button>
            <button className="border border-gray-300 text-gray-700 px-5 py-2 rounded-full font-medium flex items-center gap-2 hover:border-yellow-400 transition">
              <MessageCircle size={16} /> Message
            </button>
            <button className="border border-gray-300 text-gray-700 px-5 py-2 rounded-full font-medium flex items-center gap-2 hover:border-yellow-400 transition">
              <Share2 size={16} /> Share
            </button>
          </div>

          {store.place && (
            <div className="flex items-center gap-2 mt-3 text-gray-500">
              <MapPin size={16} /> {store.place}
            </div>
          )}
        </div>
      </div>

      {/* 🧺 Products Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Products</h2>
        {store.products && store.products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {store.products.map((product, index) => (
              <ProductCard
                key={`${product.id}-${index}`}
                // ✅ inject correct store info from backend
                product={{
                  ...product,
                  store_name: store.store_name,
                  store_id: store.id,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-10">
            No products available yet.
          </p>
        )}
      </div>
    </div>
  );
}
