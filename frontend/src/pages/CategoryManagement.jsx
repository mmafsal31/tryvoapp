import React, { useEffect, useState } from "react";
import API from "../api/axios";

import AddCategoryModal from "../components/category/AddCategoryModal";
import EditCategoryModal from "../components/category/EditCategoryModal";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  async function loadCategories() {
    try {
      const res = await API.get("/stores/categories/"); // ✅ FIXED ENDPOINT
      setCategories(res.data);
    } catch (err) {
      console.error("Category fetch error:", err);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-4">Manage Categories</h2>

      <button
        className="bg-black text-white px-4 py-2 rounded"
        onClick={() => setShowAdd(true)}
      >
        + Add Category
      </button>

      <div className="mt-4 space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between bg-white p-3 rounded shadow"
          >
            <div className="flex items-center gap-3">
              {cat.dp_image && (
                <img
                  src={cat.dp_image}
                  alt="dp"
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <span className="font-semibold">{cat.name}</span>
            </div>

            <button
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={() => setEditCategory(cat)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddCategoryModal
          onClose={() => {
            setShowAdd(false);
            loadCategories();
          }}
        />
      )}

      {editCategory && (
        <EditCategoryModal
          category={editCategory}
          onClose={() => {
            setEditCategory(null);
            loadCategories();
          }}
        />
      )}
    </div>
  );
}
