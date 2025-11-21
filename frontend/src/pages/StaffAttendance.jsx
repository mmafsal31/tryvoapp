import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // 🔹 import useNavigate
import API from "../api/axios";
import AddStaffModal from "../components/AddStaffModal";

export default function AttendancePage() {
  const navigate = useNavigate(); // 🔹 initialize navigate
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthSummary, setMonthSummary] = useState({ total: "0.00", attendances: [] });
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch staff list
  const fetchStaff = useCallback(async () => {
    try {
      const res = await API.get("staff/");
      setStaffList(res.data);
      if (res.data.length && !selectedStaff) setSelectedStaff(res.data[0].id);
    } catch (err) {
      console.error("Error loading staff:", err);
    }
  }, [selectedStaff]);

  // 🔹 Fetch monthly summary
  const fetchMonthSummary = useCallback(
    async (year, month, staffId) => {
      try {
        setLoading(true);
        const y = year || new Date().getFullYear();
        const m = month || new Date().getMonth() + 1;
        const params = { year: y, month: m };
        if (staffId) params.staff = staffId;
        const res = await API.get("attendance/by-month/", { params });
        setMonthSummary(res.data);
      } catch (err) {
        console.error("Error loading summary:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (selectedStaff) {
      fetchMonthSummary(new Date(date).getFullYear(), new Date(date).getMonth() + 1, selectedStaff);
    }
  }, [selectedStaff, date, fetchMonthSummary]);

  // 🔹 Mark attendance
  const markAttendance = async (status) => {
    if (!selectedStaff) return alert("Choose a staff first");
    try {
      await API.post("attendance/", { staff: selectedStaff, date, status });
      await fetchMonthSummary(new Date(date).getFullYear(), new Date(date).getMonth() + 1, selectedStaff);
      alert("Attendance marked successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error marking attendance");
    }
  };

  // 🔹 Checkout salary
  const checkoutSalary = async () => {
    if (!selectedStaff) return alert("Choose a staff first");
    const y = new Date(date).getFullYear();
    const m = new Date(date).getMonth() + 1;
    try {
      const res = await API.post("attendance/checkout/", { staff: selectedStaff, year: y, month: m });
      alert(`Salary checked out successfully! ₹${res.data.total_amount}`);
      await fetchMonthSummary(y, m, selectedStaff);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Checkout error");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Attendance</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddStaff(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            + Add Staff
          </button>

          {/* 🔹 Navigate to Salary Summary page */}
          <button
            onClick={() => navigate("/salary-summary")}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            View Salary Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">Staff</label>
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">-- Select Staff --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.position} — ₹{s.salary_per_day}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => markAttendance("FULL")}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Full Day
        </button>
        <button
          onClick={() => markAttendance("HALF")}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Half Day
        </button>
        <button
          onClick={() => markAttendance("ABSENT")}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Absent
        </button>
        <button
          onClick={checkoutSalary}
          className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Checkout Salary
        </button>
      </div>

      <section className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Monthly Summary</h3>
          {loading && <span className="text-sm text-gray-500">Loading...</span>}
        </div>
        <div className="mb-3 text-gray-700 font-medium">
          Total Salary: ₹{monthSummary.total}
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border p-2">Date</th>
              <th className="border p-2">Staff</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {monthSummary.attendances?.length ? (
              monthSummary.attendances.map((a) => (
                <tr key={a.id}>
                  <td className="border p-2">{a.date}</td>
                  <td className="border p-2">{a.staff_name}</td>
                  <td className="border p-2">{a.status}</td>
                  <td className="border p-2">₹{a.amount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No records found for this month
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {showAddStaff && (
        <AddStaffModal
          onClose={() => {
            setShowAddStaff(false);
            fetchStaff();
          }}
        />
      )}
    </div>
  );
}
