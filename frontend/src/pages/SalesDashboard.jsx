import React, { useEffect, useState } from "react";
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    if (!auth?.user?.is_store) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await API.get("pos/sales-dashboard/", {
          headers: { Authorization: `Bearer ${auth.access}` },
        });
        setData(res.data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth, navigate]);

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

  return (
    <div className="p-6 bg-linear-to-br from-yellow-50 to-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          {data.store_name} —{" "}
          <span className="text-yellow-600">Sales Analytics Dashboard</span>
        </h2>
        <p className="text-gray-500 text-sm">Live session analytics</p>
      </div>

      {/* KPIs Section */}
      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <KpiCard
          title="Total POS Sales"
          value={data.total_sales || 0}
          subtitle="Transactions completed"
          color="from-yellow-400 to-yellow-600"
        />
        <KpiCard
          title="Total Reservation Sales"
          value={data.total_reservations || 0}
          subtitle="Reserved orders confirmed"
          color="from-indigo-400 to-indigo-600"
        />
        <KpiCard
          title="Total Revenue"
          value={`₹${data.total_revenue || 0}`}
          subtitle="POS + Reservation"
          color="from-green-400 to-green-600"
        />
        <KpiCard
          title="Avg Order Value"
          value={`₹${data.avg_order_value || 0}`}
          subtitle="Revenue per order"
          color="from-blue-400 to-blue-600"
        />
        <KpiCard
          title="Returning Customers"
          value={`${data.returning_customers || 0}`}
          subtitle="Repeat Buyers"
          color="from-purple-400 to-purple-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Weekly Combined Revenue */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <span className="text-yellow-500 text-xl mr-2">📊</span>
            Weekly POS + Reservation Revenue
          </h3>
          {data.daily_sales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.daily_sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pos_total"
                  stroke="#facc15"
                  fill="#fef08a"
                  strokeWidth={3}
                  name="POS Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="reservation_total"
                  stroke="#a78bfa"
                  fill="#ddd6fe"
                  strokeWidth={3}
                  name="Reservation Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400">No weekly trend data.</p>
          )}
        </div>

        {/* Reservation Conversion Trend */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <span className="text-indigo-500 text-xl mr-2">📦</span>
            Reservation Conversion Trend
          </h3>
          {data.daily_sales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.daily_sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="reservation_total"
                  stroke="#a78bfa"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name="Reservation Value"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400">
              No reservation trend data.
            </p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mt-10">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <span className="text-green-500 text-xl mr-2">🥧</span>
          Category Revenue Distribution
        </h3>
        {data.category_sales?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.category_sales}
                dataKey="revenue"
                nameKey="category"
                outerRadius={110}
                label
              >
                {data.category_sales.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400">No category data.</p>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mt-10">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <span className="text-blue-500 text-xl mr-2">🏆</span>
          Top Performing Products
        </h3>
        {data.top_products?.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.top_products}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              />
              <Bar
                dataKey="quantity"
                fill="#facc15"
                radius={[6, 6, 0, 0]}
                name="POS Sales"
              />
              <Bar
                dataKey="reservation_quantity"
                fill="#a78bfa"
                radius={[6, 6, 0, 0]}
                name="Reservations"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400">No top products yet.</p>
        )}
      </div>

      {/* Conversion KPI Mini Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-10">
        <StatCard
          label="Total Reservations"
          value={data.total_reservations || 0}
          color="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          label="Converted to Sales"
          value={data.converted_reservations || 0}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          label="Conversion Rate"
          value={
            data.reservation_conversion_rate
              ? `${data.reservation_conversion_rate}%`
              : "0%"
          }
          color="text-yellow-600 bg-yellow-50"
        />
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-10">
        © {new Date().getFullYear()} Adovert POS — Unified Sales & Reservation
        Insights
      </p>
    </div>
  );
}

/* KPI CARD COMPONENT */
function KpiCard({ title, value, subtitle, color }) {
  return (
    <div
      className={`bg-linear-to-br ${color} text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-transform duration-300 transform hover:-translate-y-1`}
    >
      <h3 className="text-sm font-medium opacity-90">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs opacity-80 mt-1">{subtitle}</p>
    </div>
  );
}

/* SMALL STAT CARD COMPONENT */
function StatCard({ label, value, color }) {
  return (
    <div
      className={`p-4 rounded-xl border text-center font-medium ${color} border-opacity-30`}
    >
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
