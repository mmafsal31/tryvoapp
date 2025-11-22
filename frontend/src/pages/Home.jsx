import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../api/axios";
import ProductCard from "../components/ProductCard";
import { ArrowRight, Search, Filter, ChevronDown } from "lucide-react";

export default function Home() {
  const [ads, setAds] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const discoverRef = useRef(null);

  // -------------------------------
  // ✅ FIXED — Production Image Helper
  // -------------------------------
  const BASE_URL = "https://tryvobackend.onrender.com";

  const getImageUrl = (path) => {
    if (!path) return "/placeholder-store.png";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
  };

  // Scroll to discover section
  const handleScrollToDiscover = () => {
    discoverRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Fetch ads
  const fetchAds = useCallback(async () => {
    try {
      const res = await API.get("ads/");
      setAds(res.data);
    } catch (err) {
      console.error("Error loading ads:", err);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("products/all/");
      setProducts(res.data);

      const uniqueCats = [
        "all",
        ...new Set(res.data.map((p) => p.category || "Uncategorized")),
      ];
      setCategories(uniqueCats);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stores
  const fetchStores = useCallback(async () => {
    try {
      const res = await API.get("stores/");
      setStores(res.data);
    } catch (err) {
      console.error("Error loading stores:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchAds();
    fetchStores();
  }, [fetchProducts, fetchAds, fetchStores]);

  // Auto change banner
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setActiveBanner((prev) => (prev + 1) % ads.length);
      }, 7000);

      return () => clearInterval(interval);
    }
  }, [ads]);

  // Filtering
  const query = search.toLowerCase();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(query) ||
      p.keywords?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.store_name?.toLowerCase().includes(query);

    const matchesCategory = category === "all" || p.category === category;

    return matchesSearch && matchesCategory;
  });

  const filteredStores = stores.filter(
    (s) =>
      s.name?.toLowerCase().includes(query) ||
      s.username?.toLowerCase().includes(query)
  );

  const activeAd = ads[activeBanner];

  return (
    <div className="min-h-screen bg-white text-[#111] font-[Inter] scroll-smooth">
      {/* 🖼 Hero Section */}
      <section className="relative w-full h-[90vh] overflow-hidden">
        {activeAd ? (
          <>
            {activeAd.media_type === "video" ? (
              <video
                src={getImageUrl(activeAd.video)}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={getImageUrl(activeAd.image)}
                alt={activeAd.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <div
              className={`absolute inset-0 ${
                {
                  light: "bg-white/10",
                  dark: "bg-black/50",
                  golden: "bg-amber-500/10",
                  rose: "bg-rose-400/40",
                  aqua: "bg-cyan-400/40",
                  smoke: "bg-gray-700/40",
                  midnight: "bg-indigo-900/50",
                  emerald: "bg-emerald-500/40",
                }[activeAd.overlay_style] || "bg-black/40"
              }`}
            ></div>

            <div
              className={`absolute inset-0 flex flex-col justify-center px-10 md:px-20 text-white z-20 ${
                activeAd.text_position === "left"
                  ? "items-start text-left"
                  : activeAd.text_position === "center"
                  ? "items-center text-center"
                  : "items-end text-right"
              }`}
            >
              <div className="space-y-2">
                {activeAd.title?.split(" ").map((word, idx) => (
                  <h1
                    key={idx}
                    className="text-[4rem] md:text-[6rem] leading-none font-black uppercase tracking-tight"
                    style={{
                      fontFamily: `"Playfair Display", serif`,
                      textShadow: "0 4px 30px rgba(0,0,0,0.4)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {word}
                  </h1>
                ))}
              </div>

              {activeAd.subtitle && (
                <p className="text-lg md:text-2xl max-w-2xl mt-6 opacity-90 font-light tracking-wide drop-shadow-lg">
                  {activeAd.subtitle}
                </p>
              )}

              {activeAd.link && (
                <a
                  href={activeAd.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-10 inline-flex items-center gap-3 bg-[#DDF247] hover:bg-[#c7e63f] text-black font-semibold px-10 py-4 rounded-full transition-all duration-300 shadow-lg"
                >
                  Explore Now <ArrowRight size={22} />
                </a>
              )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
              <button
                onClick={handleScrollToDiscover}
                className="flex flex-col items-center text-white hover:text-[#DDF247] transition-all duration-300 animate-bounce"
              >
                <span className="text-sm font-medium tracking-widest mb-1">
                  Scroll Down
                </span>
                <ChevronDown size={26} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-full text-gray-600">
            <p>No active ads</p>
          </div>
        )}
      </section>

      {/* 🔍 Search + Filter */}
      <div
        ref={discoverRef}
        className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 mt-12 bg-[#FDFDFD] rounded-2xl mx-6 border border-[#EAEAEA] shadow-sm"
      >
        <div className="flex items-center gap-3 w-full md:w-1/2">
          <Search size={18} className="text-[#111]" />
          <input
            type="text"
            placeholder="Search products, categories, or stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border border-[#EAEAEA] rounded-lg p-2 text-[#111] placeholder-[#777] focus:outline-none focus:ring-2 focus:ring-[#DDF247]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-1/3">
          <Filter size={18} className="text-[#111]" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-transparent border border-[#EAEAEA] rounded-lg p-2 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#DDF247]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="text-black">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🧭 Search Results */}
      {search ? (
        <div className="p-8">
          <h2
            className="text-3xl font-extrabold mb-6 text-[#111]"
            style={{ fontFamily: `"Playfair Display", serif` }}
          >
            Search Results
          </h2>

          {/* 🏪 Stores Section */}
          {filteredStores.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-semibold mb-4 text-[#111]">Stores</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex flex-col items-center text-center bg-white border border-[#EAEAEA] rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedStore(store);
                      setShowModal(true);
                    }}
                  >
                    <img
                      src={getImageUrl(store.logo)}
                      alt={store.name}
                      className="w-20 h-20 rounded-full object-cover mb-3"
                    />
                    <h4 className="font-semibold text-[#111] text-sm truncate w-full">
                      {store.name}
                    </h4>
                    <p className="text-xs text-[#777]">@{store.username}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🛍️ Products Section */}
          {filteredProducts.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-[#111]">
                Products
              </h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {filteredStores.length === 0 &&
            filteredProducts.length === 0 && (
              <div className="flex justify-center items-center h-40">
                <p className="text-[#5A5A5A]">No results found.</p>
              </div>
            )}
        </div>
      ) : (
        <div className="p-8">
          <h2
            className="text-3xl font-extrabold mb-6 text-[#111]"
            style={{ fontFamily: `"Playfair Display", serif` }}
          >
            Trending on Tryvo
          </h2>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-[#5A5A5A] animate-pulse">
                Loading products...
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-[#5A5A5A]">No products found.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🪟 Store Preview Modal */}
      {showModal && selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-6 relative animate-fadeIn">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center">
              <img
                src={getImageUrl(selectedStore.logo)}
                alt={selectedStore.name}
                className="w-24 h-24 rounded-full object-cover mb-3"
              />
              <h2 className="text-xl font-semibold text-[#111]">
                {selectedStore.name}
              </h2>
              <p className="text-sm text-[#777] mb-2">@{selectedStore.username}</p>

              {selectedStore.description && (
                <p className="text-sm text-[#555] mb-4">
                  {selectedStore.description}
                </p>
              )}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[#111] mb-2">
                Featured Products
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {products
                  .filter((p) => p.store_name === selectedStore.name)
                  .slice(0, 4)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg overflow-hidden border border-[#EEE]"
                    >
                      <img
                        src={getImageUrl(p.image)}
                        alt={p.name}
                        className="object-cover w-full h-24 hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}

                {products.filter((p) => p.store_name === selectedStore.name)
                  .length === 0 && (
                  <p className="text-xs text-[#777] col-span-2 text-center">
                    No products yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() =>
                  (window.location.href = `/store/${selectedStore.id}`)
                }
                className="bg-[#DDF247] hover:bg-[#c7e63f] text-black font-semibold px-6 py-2 rounded-full transition-all duration-300 shadow-md"
              >
                Visit Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Footer */}
      <footer className="text-center py-10 mt-12 text-[#5A5A5A] text-sm border-t border-[#EAEAEA]">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="text-[#111] font-semibold">Tryvo.</span> — Next
          Generation Commerce 🌍
        </p>
      </footer>
    </div>
  );
}
