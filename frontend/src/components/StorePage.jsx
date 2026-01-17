import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import ProductCard from "./ProductCard";

export default function StorePage() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("categories");
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);

  const [activeOffer, setActiveOffer] = useState(null);

  const shareUrl = `${window.location.origin}/store/${id}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: store.store_name,
          text: "Check out this store!",
          url: shareUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Store link copied!");
    }
  };

  useEffect(() => {
    setLoading(true);
    API.get(`/store/${id}/`)
      .then((res) => setStore(res.data))
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return <div className="text-center py-10 text-gray-400">Loading...</div>;

  if (!store)
    return <div className="text-center py-10 text-red-500">Store not found</div>;

  const categories = store.category_blocks || [];
  const subcategories = store.subcategory_blocks || {};
  const products = store.category_groups || {};

  const offers = store.offer_blocks || [];
  const offerGroups = store.offer_groups || {};

  // ⏳ TIME LEFT CALCULATOR
  const getTimeLeft = (offer) => {
    if (!offer.end_date) return "";

    const now = new Date();
    const end = new Date(offer.end_date);
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} left`;

    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} mins left`;
  };

  const allProducts = Object.values(products)
    .flatMap((cat) => Object.values(cat).flat())
    .flat();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* SHARE BUTTON */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleShare}
          className="px-4 py-2 bg-white/70 backdrop-blur-xl border border-gray-300 shadow-md rounded-xl hover:bg-white transition flex items-center gap-2"
        >
          🔗 Share Store
        </button>
      </div>

      {/* HEADER */}
      <div className="relative mb-20">
        <div
          className="w-full h-56 rounded-3xl bg-cover bg-center shadow-xl"
          style={{ backgroundImage: `url(${store.cover_image})` }}
        ></div>

        <div className="absolute inset-x-0 -bottom-10 flex justify-center">
          <div className="backdrop-blur-xl bg-white/40 border border-white/60 shadow-2xl rounded-2xl px-10 py-6 text-center">
            <img
              src={store.logo}
              alt={store.store_name}
              className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover mx-auto -mt-16"
            />
            <h1 className="text-3xl font-bold text-gray-900 mt-3">
              {store.store_name}
            </h1>
            <p className="text-gray-600">{store.place}</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex justify-around py-3 mb-10 bg-white/60 backdrop-blur-xl rounded-xl shadow-lg border border-white/70">
        <button
          onClick={() => {
            setActiveTab("categories");
            setActiveCategory(null);
            setActiveSubCategory(null);
            setActiveOffer(null);
          }}
          className={`px-6 py-2 rounded-xl font-medium ${
            activeTab === "categories"
              ? "bg-white border shadow text-gray-900"
              : "text-gray-500"
          }`}
        >
          📂 Categories
        </button>

        <button
          onClick={() => {
            setActiveTab("offers");
            setActiveOffer(null);
          }}
          className={`px-6 py-2 rounded-xl font-medium ${
            activeTab === "offers"
              ? "bg-white border shadow text-gray-900"
              : "text-gray-500"
          }`}
        >
          🎁 Offers
        </button>

        <button
          onClick={() => {
            setActiveTab("all");
            setActiveOffer(null);
          }}
          className={`px-6 py-2 rounded-xl font-medium ${
            activeTab === "all"
              ? "bg-white border shadow text-gray-900"
              : "text-gray-500"
          }`}
        >
          🏷 All Products
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 2: OFFERS */}
      {/* ============================================================= */}
      {activeTab === "offers" && (
        <>
          {/* OFFER LIST */}
          {!activeOffer && (
            <>
              <h2 className="text-2xl font-bold mb-6">Special Offers</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-7">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() =>
                      setActiveOffer({
                        ...offer,
                        timeLeft: getTimeLeft(offer),
                        products: offerGroups?.[offer.title] || [],
                      })
                    }
                    className="cursor-pointer rounded-3xl bg-white border shadow hover:-translate-y-1 transition overflow-hidden relative"
                  >
                    <div
                      className="relative w-full"
                      style={{ paddingTop: "56.25%" }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${offer.banner_image})` }}
                      ></div>

                      {/* OFFER TITLE OVERLAY */}
                      <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                        <div>
                          <p className="text-white font-bold text-lg">
                            {offer.title}
                          </p>

                          {/* TIME LEFT */}
                          <p className="text-yellow-300 text-sm">
                            {getTimeLeft(offer)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* OFFER PRODUCT LIST */}
          {activeOffer && (
            <>
              <button
                onClick={() => setActiveOffer(null)}
                className="text-blue-600 underline mb-4"
              >
                ← Back to Offers
              </button>

              <h2 className="text-2xl font-bold mb-1">{activeOffer.title}</h2>
              <p className="text-gray-600 mb-6">{activeOffer.timeLeft}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {activeOffer.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ============================================================= */}
      {/* TAB 1 & TAB 3 KEEP SAME */}
      {/* ============================================================= */}

      {/* CATEGORIES */}
      {activeTab === "categories" && (
        <>
          {!activeCategory && (
            <>
              <h2 className="text-2xl font-bold mb-6">Categories</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-7">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.name)}
                    className="cursor-pointer rounded-3xl bg-white border shadow hover:-translate-y-1 transition overflow-hidden"
                  >
                    <div
                      className="w-full h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${cat.dp_image})` }}
                    ></div>
                    <div className="p-3 text-center font-semibold">
                      {cat.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeCategory && !activeSubCategory && (
            <>
              <button
                onClick={() => setActiveCategory(null)}
                className="text-blue-600 underline mb-4"
              >
                ← Back to Categories
              </button>

              <h2 className="text-xl font-bold mb-4">{activeCategory}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-7">
                {(subcategories[activeCategory] || []).map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setActiveSubCategory(sub.name)}
                    className="cursor-pointer rounded-3xl bg-white border shadow hover:-translate-y-1 transition overflow-hidden"
                  >
                    <div
                      className="w-full h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${sub.dp_image})` }}
                    ></div>
                    <div className="p-3 text-center font-semibold">
                      {sub.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeCategory && activeSubCategory && (
            <>
              <button
                onClick={() => setActiveSubCategory(null)}
                className="text-blue-600 underline mb-4"
              >
                ← Back to {activeCategory}
              </button>

              <h2 className="text-xl font-bold mb-4">{activeSubCategory}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {(products[activeCategory]?.[activeSubCategory] || []).map(
                  (p) => (
                    <ProductCard key={p.id} product={p} />
                  )
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ALL PRODUCTS */}
      {activeTab === "all" && (
        <>
          <h2 className="text-2xl font-bold mb-6">All Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {allProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
