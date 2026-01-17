import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getAuth, clearAuthData } from "../utils/auth";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Bell,
  CreditCard,
  UserCog,
  Clock,
  DollarSign,
  LogOut,
  Search,
  Filter,
  X,
} from "lucide-react";

export default function StoreDashboard() {
  const [products, setProducts] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedAd, setSelectedAd] = useState(null);

  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth?.user;

  // ✅ Fetch Products + Ads
  useEffect(() => {
    if (!auth || !user) {
      clearAuthData();
      navigate("/login");
      return;
    }
    if (!user.is_store) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [productsRes, adsRes] = await Promise.all([
          API.get("products/my_products/", {
            headers: { Authorization: `Bearer ${auth.access}` },
          }),
          API.get("ads/", {
            headers: { Authorization: `Bearer ${auth.access}` },
          }),
        ]);
        setProducts(productsRes.data);
        setAds(adsRes.data || []);
      } catch (err) {
        console.error("Error fetching store data:", err);
        setError("⚠️ Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, auth, user]);

  // ✅ Delete Product
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await API.delete(`products/${id}/`, {
        headers: { Authorization: `Bearer ${auth.access}` },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product. Please try again.");
    }
  };

  // ✅ Filter Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "all" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-[80vh] text-[#111111] font-medium">
        Loading your dashboard...
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-500 mt-20 font-medium">{error}</div>
    );

  return (
    <div className="min-h-screen bg-white text-[#111111] font-[Inter] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F9F9F9] border-r border-[#EAEAEA] p-6 flex flex-col justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] mb-8 flex items-center gap-2">
            <LayoutDashboard size={22} /> Dashboard
          </h1>

          <nav className="flex flex-col gap-3">
            <SidebarLink to="/store/add-product" icon={<PlusCircle />} label="Add Product" />
            <SidebarLink to="/store/bulk-upload" icon={<PlusCircle />} label="Bulk Upload" />
            <SidebarLink to="/store/pos" icon={<CreditCard />} label="POS" />
            <SidebarLink to="/store/sales-dashboard" icon={<BarChart3 />} label="Sales" />
            <SidebarLink to="/store/online-orders" icon={<Bell />} label="Online Orders" />
            <SidebarLink to="/store/reservations" icon={<Bell />} label="Reservations" />
            <SidebarLink to="/attendance" icon={<Clock />} label="Attendance" />
            <SidebarLink to="/store/edit" icon={<UserCog />} label="Edit Store Profile" />
            <SidebarLink to="/salary-summary" icon={<DollarSign />} label="Salary Summary" />
          </nav>
        </div>

        <div className="border-t border-[#EAEAEA] pt-4">
          <button
            onClick={() => {
              clearAuthData();
              navigate("/login");
            }}
            className="flex items-center gap-2 text-red-500 font-semibold hover:text-red-600 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10">
          <h2 className="text-4xl font-bold mb-1" style={{ fontFamily: `"Poppins", sans-serif` }}>
            🏪 {user.store_name || "My Store"}
          </h2>
          <p className="text-[#5A5A5A]">Manage your inventory, ads, and store operations seamlessly.</p>
        </header>

        {/* Ads Section */}
        {ads.length > 0 && (
          <div className="mb-10">
            <div className="flex overflow-x-auto gap-4 scrollbar-hide snap-x snap-mandatory">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => setSelectedAd(ad)}
                  className="relative snap-start aspect-video h-40 rounded-2xl overflow-hidden border border-[#EAEAEA] hover:shadow-lg transition cursor-pointer bg-[#FDFDFD]"
                >
                  {ad.video ? (
                    <video src={ad.video} autoPlay loop muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={ad.image} alt={ad.title} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute bottom-2 left-2 text-sm bg-white/70 px-3 py-1 rounded-lg backdrop-blur-sm">
                    <p className="font-semibold">{ad.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ad Full View */}
        {selectedAd && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="relative w-[90%] max-w-[1920px]">
              <button
                onClick={() => setSelectedAd(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
              >
                <X size={22} />
              </button>
              {selectedAd.video ? (
                <video src={selectedAd.video} controls autoPlay className="w-full rounded-xl" />
              ) : (
                <img src={selectedAd.image} alt={selectedAd.title} className="w-full rounded-xl" />
              )}
              {selectedAd.link && (
                <div className="text-center mt-4">
                  <a
                    href={selectedAd.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-[#DDF247] hover:bg-[#c7e63f] text-[#111111] font-semibold px-6 py-2 rounded-full transition"
                  >
                    Visit Ad →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4 bg-[#FDFDFD] border border-[#EAEAEA] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search size={18} className="text-[#111111]" />
            <input
              type="text"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border border-[#EAEAEA] rounded-lg p-2 text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#DDF247]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#111111]" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-[#EAEAEA] bg-transparent rounded-lg p-2 text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#DDF247]"
            >
              <option value="all">All Categories</option>
              <option value="clothing">Clothing</option>
              <option value="footwear">Footwear</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center text-[#5A5A5A] mt-20">
            <p className="text-lg font-medium mb-3">No matching products found.</p>
            <Link to="/store/add-product" className="text-[#DDF247] font-semibold hover:underline">
              Add a new product →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((p) => {
              const totalQty = p.sizes?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
              return (
                <div
                  key={p.id}
                  className="bg-[#FDFDFD] border border-[#EAEAEA] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="relative h-52 overflow-hidden">
                    {p.main_image ? (
                      <img
                        src={p.main_image}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="h-full bg-[#F9F9F9] flex items-center justify-center text-[#777] text-sm">
                        No Image
                      </div>
                    )}
                    {totalQty <= 5 && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        Low Stock
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1 truncate">{p.name}</h3>
                      <p className="text-sm text-[#5A5A5A] mb-3 capitalize">
                        {p.category || "Uncategorized"}
                      </p>

                      {/* ✅ Show Sizes + Quantity like S - 2 pcs, M - 10 pcs */}
                      {p.sizes && p.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {p.sizes.map((s) => (
                            <div
                              key={s.id}
                              className={`px-3 py-1 rounded-full border text-xs font-medium ${
                                s.quantity > 5
                                  ? "border-green-500 text-green-600 bg-green-50"
                                  : s.quantity > 0
                                  ? "border-orange-400 text-orange-500 bg-orange-50"
                                  : "border-red-400 text-red-500 bg-red-50"
                              }`}
                            >
                              {s.size_label || s.size} - {s.quantity} pcs
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ✅ Total & Price */}
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={`font-medium ${
                            totalQty > 0 ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {totalQty > 0 ? `Total: ${totalQty}` : "Out of stock"}
                        </span>
                        <span className="text-[#111111] font-semibold">
                          ₹{p.sizes?.[0]?.price || p.price || 0}
                        </span>
                      </div>
                    </div>

                    {/* ✅ Edit / Delete */}
                    <div className="flex justify-between items-center mt-4 border-t border-[#EAEAEA] pt-3">
                      <Link
                        to={`/store/edit-product/${p.id}`}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 font-medium hover:underline"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="text-center text-sm text-[#5A5A5A] py-10 mt-12 border-t border-[#EAEAEA]">
          © {new Date().getFullYear()}{" "}
          <span className="font-semibold text-[#111111]">Adovert</span> — Empowering Local Stores 🌍
        </footer>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#111111] font-medium hover:bg-[#DDF247] hover:text-[#111111] transition"
    >
      {icon}
      {label}
    </Link>
  );
}
