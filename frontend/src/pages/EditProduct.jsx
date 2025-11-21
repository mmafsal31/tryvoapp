import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import { getAuth } from "../utils/auth";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [sizes, setSizes] = useState([]);

  // ✅ Fetch existing product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await API.get(`products/${id}/`, {
          headers: { Authorization: `Bearer ${auth.access}` },
        });
        const data = res.data;
        setProduct(data);
        setName(data.name);
        setCategory(data.category);
        setDescription(data.description || "");
        setKeywords(data.keywords || "");
        setSizes(data.sizes || []);
      } catch (err) {
        console.error("Error fetching product:", err);
        alert("Failed to load product details.");
        navigate("/store/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate, auth.access]);

  // ✅ Handle size change
  const handleSizeChange = (index, field, value) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };

  const addSizeField = () => {
    setSizes([...sizes, { size_label: "", price: "", quantity: "" }]);
  };

  // ✅ Handle form submit (update)
  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("keywords", keywords);
    formData.append("sizes", JSON.stringify(sizes));
    if (mainImage) formData.append("main_image", mainImage);

    try {
      await API.patch(`products/${id}/`, formData, {
        headers: {
          Authorization: `Bearer ${auth.access}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("✅ Product updated successfully!");
      navigate("/store/dashboard");
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update the product. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80 text-yellow-600 font-semibold">
        Loading product details...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold text-yellow-600 mb-6">
        Edit Product – {product?.name}
      </h2>
      <form onSubmit={handleUpdate} className="space-y-4">
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

        <div>
          <p className="font-medium mb-1 text-gray-700">Current Image:</p>
          {product?.main_image ? (
            <img
              src={product.main_image}
              alt={product.name}
              className="h-40 w-full object-cover rounded-md mb-2"
            />
          ) : (
            <div className="h-40 bg-gray-100 flex items-center justify-center rounded-md text-gray-400 text-sm">
              No Image
            </div>
          )}
          <input
            type="file"
            onChange={(e) => setMainImage(e.target.files[0])}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Sizes</h3>
          {sizes.map((size, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Size"
                value={size.size_label}
                onChange={(e) =>
                  handleSizeChange(index, "size_label", e.target.value)
                }
                className="border p-2 flex-1 rounded"
              />
              <input
                type="number"
                placeholder="Price"
                value={size.price}
                onChange={(e) =>
                  handleSizeChange(index, "price", e.target.value)
                }
                className="border p-2 flex-1 rounded"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={size.quantity}
                onChange={(e) =>
                  handleSizeChange(index, "quantity", e.target.value)
                }
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
          Save Changes
        </button>
      </form>
    </div>
  );
}
