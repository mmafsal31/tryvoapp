import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { getAuth } from "../utils/auth";
import { Loader2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StoreProfileEdit() {
  const navigate = useNavigate();
  const { access } = getAuth() || {};
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [store, setStore] = useState(null);
  const [formData, setFormData] = useState({
    store_name: "",
    phone: "",
    place: "",
    category: "",
    bio: "",
    logo: null,
    cover_image: null,
  });

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await API.get("store/my_store/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        setStore(res.data);
        setFormData({
          store_name: res.data.store_name || "",
          phone: res.data.phone || "",
          place: res.data.place || "",
          category: res.data.category || "",
          bio: res.data.bio || "",
          logo: null,
          cover_image: null,
        });
      } catch (err) {
        console.error("Failed to load store:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [access]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) payload.append(key, value);
    });

    try {
      const res = await API.patch("store/update/", payload, {
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("✅ Store profile updated successfully!");
      navigate(`/store/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update store profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading Store Data...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Edit Store Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 🖼 Cover Image */}
        <div>
          <label className="block font-medium mb-2">Banner Image</label>
          {store.cover_image && (
            <img
              src={store.cover_image}
              alt="Cover"
              className="w-full h-48 object-cover rounded-xl mb-3"
            />
          )}
          <input
            type="file"
            name="cover_image"
            accept="image/*"
            onChange={handleFileChange}
            className="border border-gray-300 rounded-md p-2 w-full"
          />
        </div>

        {/* 🧑‍💼 Logo / DP */}
        <div>
          <label className="block font-medium mb-2">Store Logo (DP)</label>
          {store.logo && (
            <img
              src={store.logo}
              alt="Logo"
              className="h-24 w-24 object-cover rounded-full mb-3"
            />
          )}
          <input
            type="file"
            name="logo"
            accept="image/*"
            onChange={handleFileChange}
            className="border border-gray-300 rounded-md p-2 w-full"
          />
        </div>

        {/* 🏬 Store Name */}
        <div>
          <label className="block font-medium mb-1">Store Name</label>
          <input
            type="text"
            name="store_name"
            value={formData.store_name}
            onChange={handleChange}
            className="border border-gray-300 rounded-md p-2 w-full"
            required
          />
        </div>

        {/* 📍 Place */}
        <div>
          <label className="block font-medium mb-1">Place</label>
          <input
            type="text"
            name="place"
            value={formData.place}
            onChange={handleChange}
            className="border border-gray-300 rounded-md p-2 w-full"
          />
        </div>

        {/* 📞 Phone */}
        <div>
          <label className="block font-medium mb-1">Phone</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="border border-gray-300 rounded-md p-2 w-full"
          />
        </div>

        {/* 🧭 Category */}
        <div>
          <label className="block font-medium mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="border border-gray-300 rounded-md p-2 w-full"
          >
            <option value="clothing">Clothing</option>
            <option value="footwear">Footwear</option>
          </select>
        </div>

        {/* 📝 Bio */}
        <div>
          <label className="block font-medium mb-1">Bio / About</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={3}
            className="border border-gray-300 rounded-md p-2 w-full"
            placeholder="Tell customers about your store..."
          />
        </div>

        <button
          type="submit"
          disabled={updating}
          className="w-full bg-green-900 hover:bg-green-600 text-white py-3 rounded-md font-semibold flex justify-center items-center"
        >
          {updating ? (
            <>
              <Loader2 className="animate-spin mr-2" /> Updating...
            </>
          ) : (
            <>
              <Upload className="mr-2" /> Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
