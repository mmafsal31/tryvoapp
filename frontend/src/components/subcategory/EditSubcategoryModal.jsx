import React, { useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";

export default function EditSubcategoryModal({ subcategory, onClose }) {
  const [name, setName] = useState(subcategory.name);
  const [image, setImage] = useState(null);

  async function handleUpdate() {
    const fd = new FormData();
    fd.append("name", name);
    if (image) fd.append("dp_image", image);

    try {
      await API.put(`/subcategory/${subcategory.id}/update/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Subcategory updated!");
      onClose();
    } catch (err) {
      console.log(err.response?.data);
      toast.error("Update failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-96 shadow">
        <h2 className="text-lg font-semibold mb-3">Edit Subcategory</h2>

        {subcategory.dp_image_url && (
          <img src={subcategory.dp_image_url} className="h-20 mb-3 rounded" />
        )}

        <input
          className="border p-2 rounded w-full mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input type="file" className="mb-2" onChange={(e) => setImage(e.target.files[0])} />

        <button
          onClick={handleUpdate}
          className="bg-black text-white w-full rounded py-2 mt-4"
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
