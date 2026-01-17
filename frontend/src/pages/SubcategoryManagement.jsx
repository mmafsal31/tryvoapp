import React, { useEffect, useState } from "react";
import API from "../api/axios";

import AddSubcategoryModal from "../components/subcategory/AddSubcategoryModal";
import EditSubcategoryModal from "../components/subcategory/EditSubcategoryModal";

export default function SubcategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [subcategories, setSubcategories] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState(null);

  // Load categories on start
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await API.get("/stores/categories/");
      setCategories(res.data);
    } catch (err) {
      console.error("Category load error:", err);
    }
  }

  // Load subcategories for selected category
  async function loadSubcategories(id) {
    try {
      const res = await API.get(`/stores/subcategories/${id}/`);
      setSubcategories(res.data);
    } catch (err) {
      console.error("Subcategory load error:", err);
    }
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Subcategories</h2>

      {/* CATEGORY SELECTOR */}
      <div className="mb-4">
        <label className="font-semibold">Select Category</label>
        <select
          className="border p-2 rounded w-full mt-1"
          value={selectedCat}
          onChange={(e) => {
            setSelectedCat(e.target.value);
            loadSubcategories(e.target.value);
          }}
        >
          <option value="">-- Choose Category --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        className="bg-black text-white px-4 py-2 rounded mb-4"
        onClick={() => setShowAdd(true)}
      >
        + Add Subcategory
      </button>

      {/* SUBCATEGORY LIST GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subcategories.map((sc) => (
          <div
            key={sc.id}
            className="p-4 bg-white shadow rounded flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {sc.dp_image_url ? (
                <img
                  src={sc.dp_image_url}
                  alt="sub"
                  className="w-14 h-14 object-cover rounded border"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                  No Img
                </div>
              )}

              <div>
                <p className="font-semibold text-lg">{sc.name}</p>
              </div>
            </div>

            <button
              onClick={() => setEditSub(sc)}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* ADD MODAL */}
      {showAdd && (
        <AddSubcategoryModal
          categories={categories}
          onClose={() => {
            setShowAdd(false);
            if (selectedCat) loadSubcategories(selectedCat);
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editSub && (
        <EditSubcategoryModal
          subcategory={editSub}
          onClose={() => {
            setEditSub(null);
            if (selectedCat) loadSubcategories(selectedCat);
          }}
        />
      )}
    </div>
  );
}
