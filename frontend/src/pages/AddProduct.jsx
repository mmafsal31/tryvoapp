import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { getUser } from "../utils/auth";

export default function AddProduct() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("clothing");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [sizes, setSizes] = useState([{ size_label: "", price: "", quantity: "" }]);
  const navigate = useNavigate();
  const user = getUser();

  const handleSizeChange = (index, field, value) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };

  const addSizeField = () => {
    setSizes([...sizes, { size_label: "", price: "", quantity: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("keywords", keywords);
    if (mainImage) formData.append("main_image", mainImage);
    formData.append("sizes", JSON.stringify(sizes));

    try {
      await API.post("products/", formData, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("✅ Product added successfully!");
      navigate("/store/dashboard");
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold text-yellow-600 mb-6">Add New Product</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="clothing">Clothing</option>
          <option value="footwear">Footwear</option>
        </select>
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Keywords (comma separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="file"
          onChange={(e) => setMainImage(e.target.files[0])}
          className="w-full border p-2 rounded"
        />

        <div>
          <h3 className="font-semibold mb-2">Sizes</h3>
          {sizes.map((size, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Size"
                value={size.size_label}
                onChange={(e) => handleSizeChange(index, "size_label", e.target.value)}
                className="border p-2 flex-1 rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={size.price}
                onChange={(e) => handleSizeChange(index, "price", e.target.value)}
                className="border p-2 flex-1 rounded"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={size.quantity}
                onChange={(e) => handleSizeChange(index, "quantity", e.target.value)}
                className="border p-2 flex-1 rounded"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addSizeField}
            className="text-yellow-600 font-semibold hover:underline"
          >
            + Add Another Size
          </button>
        </div>

        <button
          type="submit"
          className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold hover:bg-yellow-600 transition"
        >
          Add Product
        </button>
      </form>
    </div>
  );
}
