import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../api/axios";
import ProductCard from "../components/ProductCard";
import { ArrowRight, Search, Filter, ChevronDown } from "lucide-react";

/**
 * Normalize API responses (DRF pagination safe)
 */
const normalizeArray = (data) =>
  Array.isArray(data) ? data : data?.results || [];

export default function Home() {
  const [ads, setAds] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState(["all"]);
  const [loading, setLoading] = useState(true);

  const discoverRef = useRef(null);

  // Scroll to discover section
  const handleScrollToDiscover = () => {
    discoverRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch Ads
  const fetchAds = useCallback(async () => {
    try {
      const res = await API.get("ads/");
      setAds(normalizeArray(res.data));
    } catch (err) {
      console.error("Error loading ads:", err);
      setAds([]);
    }
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("products/all/");
      const data = normalizeArray(res.data);

      setProducts(data);

      const uniqueCats = [
        "all",
        ...new Set(data.map((p) => p.category || "Uncategorized")),
      ];
      setCategories(uniqueCats);
    } catch (err) {
      console.error("Error loading products:", err);
      setProducts([]);
      setCategories(["all"]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Stores (used only for search matching)
  const fetchStores = useCallback(async () => {
    try {
      const res = await API.get("stores/");
      setStores(normalizeArray(res.data));
    } catch (err) {
      console.error("Error loading stores:", err);
      setStores([]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchAds();
    fetchStores();
  }, [fetchProducts, fetchAds, fetchStores]);

  // Auto banner slider
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setActiveBanner((prev) => (prev + 1) % ads.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [ads]);

  const query = search.toLowerCase();
  const safeProducts = Array.isArray(products) ? products : [];
  const safeStores = Array.isArray(stores) ? stores : [];

  // Filter products
  const filteredProducts = safeProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(query) ||
      p.keywords?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.store_name?.toLowerCase().includes(query);

    const matchesCategory = category === "all" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // Filter stores only for search relevance (not rendered separately)
  const storeMatch = safeStores.some(
    (s) =>
      s.store_name?.toLowerCase().includes(query) ||
      s.owner?.toLowerCase().includes(query)
  );

  const activeAd = ads[activeBanner];

  return (
    <div className="min-h-screen bg-white text-[#111] font-[Inter] scroll-smooth">
      {/* HERO BANNER */}
      <section className="relative w-full h-[90vh] overflow-hidden">
        {activeAd ? (
          <>
            {activeAd.media_type === "video" ? (
              <video
                src={activeAd.video_url}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={activeAd.image_url}
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
            />

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
                    className="text-[4rem] md:text-[6rem] leading-none font-black uppercase"
                    style={{
                      fontFamily: `"Playfair Display", serif`,
                      textShadow: "0 4px 30px rgba(0,0,0,0.4)",
                    }}
                  >
                    {word}
                  </h1>
                ))}
              </div>

              {activeAd.subtitle && (
                <p className="text-lg md:text-2xl max-w-2xl mt-6 opacity-90">
                  {activeAd.subtitle}
                </p>
              )}

              {activeAd.link && (
                <a
                  href={activeAd.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-10 inline-flex items-center gap-3 bg-[#DDF247] text-black font-semibold px-10 py-4 rounded-full"
                >
                  Explore Now <ArrowRight size={22} />
                </a>
              )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <button
                onClick={handleScrollToDiscover}
                className="flex flex-col items-center text-white animate-bounce"
              >
                <span className="text-sm font-medium mb-1">Scroll Down</span>
                <ChevronDown size={26} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-full">
            No active ads
          </div>
        )}
      </section>

      {/* SEARCH + FILTER */}
      <div
        ref={discoverRef}
        className="flex flex-col md:flex-row gap-4 p-6 mt-12 mx-6 border rounded-2xl"
      >
        <div className="flex items-center gap-3 w-full md:w-1/2">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, stores, categories..."
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-1/3">
          <Filter size={18} />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="p-8">
        <h2 className="text-3xl font-extrabold mb-6">
          {search || storeMatch ? "Search Results" : "Trending on Tryvo"}
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            Loading products...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="text-center py-10">
        © {new Date().getFullYear()} Tryvo — Next Generation Commerce 🌍
      </footer>
    </div>
  );
}
