import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../api/axios";
import { getAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#facc15", "#34d399", "#60a5fa", "#f87171", "#a78bfa"];

export default function SalesDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();

  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    start_date: today,
    end_date: today,
    category: "",
    product: "",
    customer: "",
    customer_name: "",
    sale_type: "",
    reservation_status: "",
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstLoad = useRef(true);

  /* -------------------------------------------------------
      Load analytics
  ------------------------------------------------------- */
  const loadAnalytics = useCallback(
    async (params) => {
      try {
        setLoading(true);
        const query = new URLSearchParams(params).toString();

        const res = await API.get(`pos/sales-dashboard/?${query}`, {
          headers: { Authorization: `Bearer ${auth.access}` },
        });

        setData(res.data);
      } catch (error) {
        console.error("Dashboard loading error:", error);
      } finally {
        setLoading(false);
      }
    },
    [auth.access]
  );

  /* -------------------------------------------------------
      Initial Load
  ------------------------------------------------------- */
  useEffect(() => {
    if (!firstLoad.current) return;

    if (!auth?.user?.is_store) {
      navigate("/");
      return;
    }

    loadAnalytics(filters);
    firstLoad.current = false;
  }, [auth?.user?.is_store, navigate, loadAnalytics]);

  /* -------------------------------------------------------
      Handle filters
  ------------------------------------------------------- */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    loadAnalytics(filters);
  };

  /* -------------------------------------------------------
      Loading states
  ------------------------------------------------------- */
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-yellow-600 text-lg font-semibold">
        Loading Sales Dashboard...
      </div>
    );

  if (!data)
    return (
      <div className="text-center text-red-600 mt-10">
        Failed to load sales data.
      </div>
    );

  /* -------------------------------------------------------
      UI
  ------------------------------------------------------- */
  return (
    <div className="p-6 min-h-screen bg-gray-50">

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid md:grid-cols-3 lg:grid-cols-7 gap-4">

        <input type="date" name="start_date" value={filters.start_date}
          onChange={handleFilterChange} className="p-2 border rounded" />

        <input type="date" name="end_date" value={filters.end_date}
          onChange={handleFilterChange} className="p-2 border rounded" />

        <input type="text" name="product" placeholder="Product Name"
          value={filters.product} onChange={handleFilterChange} className="p-2 border rounded" />

        <input type="text" name="customer" placeholder="Customer Phone"
          value={filters.customer} onChange={handleFilterChange} className="p-2 border rounded" />

        <input type="text" name="customer_name" placeholder="Customer Name"
          value={filters.customer_name} onChange={handleFilterChange} className="p-2 border rounded" />

        <select name="sale_type" value={filters.sale_type}
          onChange={handleFilterChange} className="p-2 border rounded">
          <option value="">All Sale Types</option>
          <option value="pos">POS Only</option>
          <option value="reservation">Reservations Only</option>
        </select>

        <select name="reservation_status" value={filters.reservation_status}
          onChange={handleFilterChange} className="p-2 border rounded">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={applyFilters}
          className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 col-span-7"
        >
          Apply Filters
        </button>
      </div>

      {/* HEADER */}
      <h2 className="text-3xl font-bold mb-4 text-gray-800">
        {data.store_name} — <span className="text-yellow-600">Analytics Dashboard</span>
      </h2>

      {/* KPI CARDS */}
      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <KpiCard title="Total POS Sales" value={data.total_sales} subtitle="Transactions" color="from-yellow-400 to-yellow-600" />
        <KpiCard title="Total Reservations" value={data.total_reservations} subtitle="Reserved Orders" color="from-indigo-400 to-indigo-600" />
        <KpiCard title="Total Revenue" value={`₹${data.total_revenue}`} subtitle="POS + Reservation" color="from-green-400 to-green-600" />
        <KpiCard title="Avg Order Value" value={`₹${data.avg_order_value}`} subtitle="Revenue Per Order" color="from-blue-400 to-blue-600" />
        <KpiCard title="Converted Reservations" value={data.converted_reservations} subtitle="Completed" color="from-purple-400 to-purple-600" />
      </div>

      {/* GRAPHS */}
      <div className="grid lg:grid-cols-2 gap-8">
        <ChartWrapper title="Weekly POS + Reservation Revenue" icon="📊">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.daily_sales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="pos_total" stroke="#facc15" fill="#fef08a" />
              <Area type="monotone" dataKey="reservation_total" stroke="#a78bfa" fill="#ddd6fe" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Reservation Conversion Trend" icon="📦">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily_sales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="reservation_total" stroke="#a78bfa" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* PIE CHART */}
      <ChartWrapper title="Category Revenue Breakdown" icon="🥧" full>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data.category_sales} dataKey="revenue" nameKey="category"
              outerRadius={110} label>
              {data.category_sales.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* TOP PRODUCTS */}
      <ChartWrapper title="Top Performing Products" icon="🏆" full>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.top_products}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-10} textAnchor="end" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="quantity" fill="#facc15" />
            <Bar dataKey="reservation_quantity" fill="#a78bfa" />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* CUSTOMER ORDERS TABLE */}
      <DataTable
        title="Customer Orders"
        data={data.customer_orders}
        columns={[
          "name",
          "phone",
          "order_id",
          "type",
          "items",
          "amount",
          "date",
          "status",
        ]}
      />

      {/* CUSTOMER SUMMARY TABLE */}
      <DataTable
        title="Customer Analytics"
        data={data.customers}
        columns={[
          "name",
          "phone",
          "total_orders",
          "total_spent",
          "pos_orders",
          "reservations",
          "last_purchase",
        ]}
      />

      {/* PRODUCT INVENTORY */}
      <DataTable
        title="Product Inventory Overview"
        data={data.products}
        columns={[
          "name",
          "stock_left",
          "top_size",
          "total_sales",
          "reservation_sales",
        ]}
      />

      <p className="text-center text-xs text-gray-400 mt-10">
        © {new Date().getFullYear()} Adovert POS — Unified Sales & Reservation Insights
      </p>
    </div>
  );
}

/* -------------------------------------------------------
   Reusable components
------------------------------------------------------- */

function KpiCard({ title, value, subtitle, color }) {
  return (
    <div className={`bg-linear-to-br ${color} text-white rounded-xl p-5 shadow`}>
      <h3 className="text-sm opacity-90">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{subtitle}</p>
    </div>
  );
}

function ChartWrapper({ title, icon, children, full }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow border ${full ? "mt-10" : ""}`}>
      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
        <span className="mr-2 text-xl">{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function DataTable({ title, data, columns }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border mt-10 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 text-left capitalize border">
                {col.replace("_", " ")}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2">
                  {row[col] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
