import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function AddProduct() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  const [mainImage, setMainImage] = useState(null);
  const [mainPreview, setMainPreview] = useState(null);

  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryPreview, setGalleryPreview] = useState([]);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [offerCategories, setOfferCategories] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedOfferCategory, setSelectedOfferCategory] = useState("");

  const [sizes, setSizes] = useState([]);

  // ==========================================
  // LOAD CATEGORIES & OFFER CATEGORIES
  // ==========================================
  useEffect(() => {
    API.get("/stores/categories/")
      .then((res) => setCategories(res.data))
      .catch(() => toast.error("Failed to load categories"));

    API.get("/stores/offer-categories/")
      .then((res) => setOfferCategories(res.data))
      .catch(() => toast.error("Failed to load offers"));
  }, []);

  // ==========================================
  // LOAD SUBCATEGORIES
  // ==========================================
  const handleCategoryChange = (id) => {
    setSelectedCategory(id);
    setSelectedSubcategory("");

    if (!id) return setSubcategories([]);

    API.get(`/stores/subcategories/${id}/`)
      .then((res) => setSubcategories(res.data))
      .catch(() => toast.error("Failed to load subcategories"));
  };

  // ==========================================
  // MAIN IMAGE PREVIEW
  // ==========================================
  const handleMainImage = (e) => {
    const file = e.target.files[0];
    setMainImage(file);
    setMainPreview(URL.createObjectURL(file));
  };

  // ==========================================
  // GALLERY IMAGES PREVIEW
  // ==========================================
  const handleGalleryImages = (e) => {
    const files = [...e.target.files];
    setGalleryImages(files);
    setGalleryPreview(files.map((f) => URL.createObjectURL(f)));
  };

  // ==========================================
  // SIZE SYSTEM
  // ==========================================
  const addSize = () =>
    setSizes([...sizes, { size_label: "", price: "", quantity: "" }]);

  const updateSize = (index, field, value) => {
    const updated = [...sizes];
    updated[index][field] = value;
    setSizes(updated);
  };

  const removeSize = (index) =>
    setSizes(sizes.filter((_, i) => i !== index));

  // ==========================================
  // SUBMIT PRODUCT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Product name required");

    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    fd.append("keywords", keywords);

    if (mainImage) fd.append("main_image", mainImage);

    if (selectedCategory) fd.append("store_category_id", selectedCategory);
    if (selectedSubcategory) fd.append("store_subcategory_id", selectedSubcategory);
    if (selectedOfferCategory) fd.append("offer_category_id", selectedOfferCategory);

    // Sizes JSON
    fd.append("sizes", JSON.stringify(sizes));

    // Gallery images
    galleryImages.forEach((img) => fd.append("images", img));

    try {
      await API.post("/products/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Product Added Successfully!");

      // RESET FORM
      setName("");
      setDescription("");
      setKeywords("");
      setMainImage(null);
      setMainPreview(null);
      setGalleryImages([]);
      setGalleryPreview([]);
      setSizes([]);
      setSelectedCategory("");
      setSelectedSubcategory("");
      setSelectedOfferCategory("");
    } catch (err) {
      console.log("Error:", err.response?.data);
      toast.error("Failed to add product");
    }
  };

  return (
    <div className="add-product-container">
      <style>{`
        .add-product-container {
          max-width: 700px;
          margin: auto;
          background: white;
          padding: 24px;
          border-radius: 10px;
        }
        label { font-weight: 600; margin-top: 15px; display: block; }
        input,select,textarea {
          width: 100%; 
          padding: 10px;
          margin-top: 6px;
          border-radius: 8px;
          border: 1px solid #ccc;
        }
        .size-row { display:flex; gap:10px; margin-top:10px; }
        .submit-btn { background:black; color:white; padding:10px; margin-top:20px; width:100%; }
        .preview-main { width: 180px; margin-top: 10px; border-radius: 6px; }
        .gallery-preview { display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
        .preview-thumb { width:90px; height:90px; border-radius:6px; object-fit:cover; border:1px solid #ccc; }
        .manage-buttons button {
          padding: 8px 14px;
          border-radius: 6px;
          color: white;
          font-weight: 600;
        }
      `}</style>

      {/* ================================
          MANAGEMENT BUTTONS
      ================================= */}
      <div className="manage-buttons flex gap-3 mb-5">
        <button
          type="button"
          style={{ background: "#2563eb" }}
          onClick={() => navigate("/store/categories")}
        >
          Manage Categories
        </button>

        <button
          type="button"
          style={{ background: "#7c3aed" }}
          onClick={() => navigate("/store/subcategories")}
        >
          Manage Subcategories
        </button>

        <button
          type="button"
          style={{ background: "#059669" }}
          onClick={() => navigate("/manage/offers")}
        >
          Manage Offers
        </button>
      </div>

      <h2>Add New Product</h2>

      <form onSubmit={handleSubmit}>
        <label>Product Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

        <label>Keywords</label>
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />

        <label>Main Image</label>
        <input type="file" onChange={handleMainImage} />
        {mainPreview && <img src={mainPreview} className="preview-main" />}

        <label>Category</label>
        <select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
          <option value="">-- Select --</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label>Subcategory</label>
        <select value={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)}>
          <option value="">-- Select --</option>
          {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label>Offer Category</label>
        <select value={selectedOfferCategory} onChange={(e) => setSelectedOfferCategory(e.target.value)}>
          <option value="">-- No offer --</option>
          {offerCategories.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>

        {/* Sizes */}
        <div className="sizes-section">
          <h3>Sizes</h3>
          <button type="button" onClick={addSize}>+ Add Size</button>

          {sizes.map((size, i) => (
            <div className="size-row" key={i}>
              <input
                placeholder="Size"
                value={size.size_label}
                onChange={(e) => updateSize(i, "size_label", e.target.value)}
              />
              <input
                placeholder="Price"
                value={size.price}
                type="number"
                onChange={(e) => updateSize(i, "price", e.target.value)}
              />
              <input
                placeholder="Qty"
                value={size.quantity}
                type="number"
                onChange={(e) => updateSize(i, "quantity", e.target.value)}
              />
              <button type="button" onClick={() => removeSize(i)}>X</button>
            </div>
          ))}
        </div>

        <label>Gallery Images</label>
        <input type="file" multiple onChange={handleGalleryImages} />

        <div className="gallery-preview">
          {galleryPreview.map((src, i) => (
            <img key={i} src={src} className="preview-thumb" />
          ))}
        </div>

        <button className="submit-btn" type="submit">Add Product</button>
      </form>
    </div>
  );
}
