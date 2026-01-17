import React, { useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";

export default function AddCategoryModal({ onClose }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("name", name);
    if (image) fd.append("dp_image", image);

    try {
      await API.post("/category/add/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Category Added!");
      onClose();
    } catch (err) {
      console.log(err.response?.data);
      toast.error("Failed to add category");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded shadow w-96">
        <h2 className="text-lg font-semibold mb-3">Add Category</h2>

        <form onSubmit={handleSubmit}>
          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="block mb-1">Category Image</label>
          <input
            type="file"
            className="mb-3"
            onChange={(e) => setImage(e.target.files[0])}
          />

          <button
            type="submit"
            className="bg-black text-white w-full rounded py-2 mt-2"
          >
            Add Category
          </button>

          <button className="w-full mt-2" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
