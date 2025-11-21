import React, { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Star } from "lucide-react";

export default function FlipProductCardPremium({ product }) {
  const navigate = useNavigate();

  // ✅ Filter only available sizes
  const availableSizes = useMemo(
    () => product.sizes?.filter((s) => s.quantity > 0) || [],
    [product.sizes]
  );

  // ✅ Image resolver
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/400x600?text=No+Image";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/media")) return `http://127.0.0.1:8000${path}`;
    return `http://127.0.0.1:8000/media/${path}`;
  };
  const imageUrl = getImageUrl(product.main_image);

  const price = availableSizes[0]?.price ?? "—";
  const storeName =
    product.store_name || product.store?.store_name || "Unknown Store";
  const storeId =
    product.store?.id || product.store_id || product.store || null;

  const description =
    product.description?.slice(0, 100) ||
    "High-quality product to elevate your style.";

  return (
    <div className="group perspective w-72 h-96 cursor-pointer mx-auto">
      <div className="relative w-full h-full transition-transform duration-700 transform-style preserve-3d group-hover:rotate-y-180">

        {/* FRONT SIDE */}
        <div className="absolute w-full h-full backface-hidden rounded-3xl overflow-hidden shadow-2xl bg-gray-900">
          <div className="relative w-full h-full">
            <img
              src={imageUrl}
              alt={product.name}
              onClick={() => navigate(`/product/${product.id}`)}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40"></div>

            {/* Price & Rating */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className="bg-black/80 text-white px-3 py-1 rounded-full font-bold shadow-sm text-sm tracking-wide">
                ₹{price}
              </span>
              <span className="bg-black/80 text-yellow-400 px-3 py-1 rounded-full font-medium text-sm flex items-center gap-1 shadow-sm">
                <Star className="w-4 h-4 text-yellow-400" />{" "}
                {(product.rating || 4.5).toFixed(1)}
              </span>
            </div>

            {/* Product Name */}
            <div className="absolute bottom-0 w-full bg-linear-to-t from-black/90 to-transparent p-4 text-center">
              <h3 className="text-lg font-bold text-white line-clamp-1 tracking-wide">
                {product.name}
              </h3>
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-3xl overflow-hidden shadow-2xl">
          {/* Dimmed background */}
          <div className="absolute w-full h-full">
            <img src={imageUrl} alt={product.name} className="object-cover w-full h-full" />
            <div className="absolute inset-0 bg-black/75"></div>
          </div>

          {/* Overlay Content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-5">
            {/* UPPER: Left aligned text */}
            <div className="flex flex-col text-left gap-2">
              {/* 🏬 Store Name */}
              {storeId ? (
                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/store/${storeId}`);
                  }}
                  className="text-[#DDF247] text-sm font-medium uppercase tracking-wider cursor-pointer hover:underline hover:text-[#e4ff5b] transition"
                >
                  {storeName}
                </p>
              ) : (
                <p className="text-gray-500 text-sm italic">{storeName}</p>
              )}

              {/* Product Name */}
              <h3 className="text-lg font-semibold text-gray-100 tracking-wide">
                {product.name}
              </h3>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-snug line-clamp-3 mt-1 max-w-xs">
                {description}
              </p>
            </div>

            {/* CENTER: Price + Sizes */}
            <div className="flex flex-col items-center text-center gap-3">
              {/* Centered Price */}
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                ₹{price}
              </h2>

              {/* Sizes */}
              {availableSizes.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {availableSizes.map((s) => (
                    <span
                      key={s.size_label}
                      className="px-3 py-1 border border-gray-600 rounded-full text-sm font-medium text-gray-200 hover:border-[#DDF247] hover:text-[#DDF247] transition-colors"
                    >
                      {s.size_label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-red-400 text-xs italic mt-1">Out of Stock</p>
              )}
            </div>

            {/* BOTTOM: Buttons aligned side-by-side */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => navigate(`/product/${product.id}`)}
                className="w-36 py-2 rounded-xl bg-[#DDF247] text-[#111111] font-semibold hover:bg-[#c7e63f] transition-all shadow-md"
              >
                View Product
              </button>

              {availableSizes.length > 0 ? (
                <Link
                  to={`/reserve/${product.id}`}
                  className="w-36 py-2 rounded-xl text-center bg-transparent border border-[#DDF247] text-[#DDF247] font-semibold hover:bg-[#DDF247] hover:text-[#111111] transition-all"
                >
                  Reserve
                </Link>
              ) : (
                <button
                  disabled
                  className="w-36 py-2 rounded-xl bg-gray-800 text-gray-500 font-semibold cursor-not-allowed"
                >
                  Reserve Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Flip CSS */}
      <style>{`
        .perspective {
          perspective: 1000px;
        }
        .transform-style {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
