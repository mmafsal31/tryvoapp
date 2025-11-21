// src/components/AddStaffModal.jsx
import React, { useState } from "react";
import API from "../api/axios";

export default function AddStaffModal({ onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", position: "", salary_per_day: "" });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await API.post("staff/", {
        name: form.name,
        phone: form.phone,
        position: form.position,
        salary_per_day: form.salary_per_day
      });
      onClose();
    } catch (err) {
      alert(err.response?.data || "Error creating staff");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-6 rounded w-96">
        <h3 className="font-semibold mb-4">Add Staff</h3>
        <input placeholder="Name" required className="w-full mb-2 p-2 border" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input placeholder="Phone" className="w-full mb-2 p-2 border" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
        <input placeholder="Position" className="w-full mb-2 p-2 border" value={form.position} onChange={e=>setForm({...form, position:e.target.value})} />
        <input placeholder="Salary per day" type="number" step="0.01" required className="w-full mb-4 p-2 border" value={form.salary_per_day} onChange={e=>setForm({...form, salary_per_day:e.target.value})} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">Cancel</button>
          <button className="btn-primary">Create</button>
        </div>
      </form>
    </div>
  );
}
