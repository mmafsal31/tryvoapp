import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axios";

export default function SalarySummary() {
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.year) params.year = filters.year;
      if (filters.month) params.month = filters.month;
      const res = await API.get("salary-records/", { params });
      setRecords(res.data);
    } catch (err) {
      console.error("Error loading salary records:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const markAsPaid = async (id) => {
    if (!window.confirm("Mark this salary as paid?")) return;
    try {
      setUpdating(id);
      await API.patch(`salary-records/${id}/`, { is_paid: true });
      await fetchRecords();
      alert("Salary marked as paid!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error updating salary record");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Salary Summary</h2>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="number"
          value={filters.year}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          className="p-2 border rounded w-24"
        />
        <input
          type="number"
          value={filters.month}
          min="1"
          max="12"
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          className="p-2 border rounded w-20"
        />
        <button
          onClick={fetchRecords}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>

        {/* 🔹 Add export button */}
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          Export / Print
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Staff</th>
              <th className="border p-2">Year</th>
              <th className="border p-2">Month</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Paid</th>
              <th className="border p-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.staff_name}</td>
                  <td className="border p-2">{r.year}</td>
                  <td className="border p-2">{r.month}</td>
                  <td className="border p-2">₹{r.total_amount}</td>
                  <td className="border p-2">{r.is_paid ? "✅ Yes" : "❌ No"}</td>
                  <td className="border p-2 text-center">
                    {!r.is_paid ? (
                      <button
                        onClick={() => markAsPaid(r.id)}
                        disabled={updating === r.id}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {updating === r.id ? "..." : "Mark Paid"}
                      </button>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 p-4">
                  No salary records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
