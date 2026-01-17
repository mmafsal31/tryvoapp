import React, { useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";

export default function EditCategoryModal({ category, onClose }) {
  const [name, setName] = useState(category.name);
  const [image, setImage] = useState(null);

  const handleUpdate = async () => {
    const fd = new FormData();
    fd.append("name", name);
    if (image) fd.append("dp_image", image);

    try {
      await API.put(`/category/${category.id}/update/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Category Updated!");
      onClose();
    } catch (err) {
      console.log(err.response?.data);
      toast.error("Failed to update category");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-96 shadow">
        <h2 className="text-lg font-semibold mb-3">Edit Category</h2>

        <input
          className="border p-2 rounded w-full mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {category.dp_image && (
          <img src={category.dp_image} className="h-16 rounded mb-3" alt="" />
        )}

        <input type="file" onChange={(e) => setImage(e.target.files[0])} />

        <button
          onClick={handleUpdate}
          className="bg-blue-600 text-white w-full rounded py-2 mt-4"
        >
          Update
        </button>

        <button className="w-full mt-2" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
