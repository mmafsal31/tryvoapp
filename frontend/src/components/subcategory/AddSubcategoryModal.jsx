import React, { useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";

export default function AddSubcategoryModal({ categories, onClose }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [image, setImage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!categoryId) return toast.error("Please select a category");

    const fd = new FormData();
    fd.append("name", name);
    fd.append("category", categoryId);
    if (image) fd.append("dp_image", image);

    try {
      await API.post("/subcategory/add/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Subcategory added!");
      onClose();
    } catch (err) {
      console.log(err.response?.data);
      toast.error("Failed to add subcategory");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-96 shadow">
        <h2 className="text-lg font-semibold mb-3">Add Subcategory</h2>

        <select
          className="border p-2 rounded w-full mb-3"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Subcategory name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="file"
          className="mb-2"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <button
          onClick={handleSubmit}
          className="bg-black text-white w-full rounded py-2 mt-4"
        >
          Add
        </button>

        <button className="w-full mt-2" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
