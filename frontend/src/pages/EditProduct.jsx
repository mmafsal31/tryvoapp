import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { toast } from "react-toastify";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

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

  // -----------------------------------------
  // Load product details + categories
  // -----------------------------------------
  useEffect(() => {
    async function loadAll() {
      try {
        const [prod, cats, offers] = await Promise.all([
          API.get(`/products/${id}/`),
          API.get("/stores/categories/"),
          API.get("/stores/offer-categories/"),
        ]);

        const p = prod.data;

        setName(p.name);
        setDescription(p.description || "");
        setKeywords(p.keywords || "");

        setMainPreview(p.main_image || null);

        // Sizes
        setSizes(p.sizes || []);

        // Preselect category/subcategory/offer
        setSelectedCategory(p.store_category_id || "");
        setSelectedSubcategory(p.store_subcategory_id || "");
        setSelectedOfferCategory(p.offer_category_id || "");

        setCategories(cats.data);
        setOfferCategories(offers.data);

        // Load subcategories after category selection
        if (p.store_category_id) {
          const s = await API.get(`/stores/subcategories/${p.store_category_id}/`);
          setSubcategories(s.data);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load product");
        navigate("/store/dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [id, navigate]);

  // -----------------------------------------
  // Category change → load subcategories
  // -----------------------------------------
  const handleCategoryChange = async (id) => {
    setSelectedCategory(id);
    setSelectedSubcategory("");

    try {
      if (!id) return setSubcategories([]);

      const res = await API.get(`/stores/subcategories/${id}/`);
      setSubcategories(res.data);
    } catch {
      toast.error("Failed to load subcategories");
    }
  };

  // -----------------------------------------
  // Main image preview
  // -----------------------------------------
  const handleMainImage = (e) => {
    const file = e.target.files[0];
    setMainImage(file);
    setMainPreview(URL.createObjectURL(file));
  };

  // -----------------------------------------
  // Gallery images preview
  // -----------------------------------------
  const handleGalleryImages = (e) => {
    const files = [...e.target.files];
    setGalleryImages(files);
    setGalleryPreview(files.map((f) => URL.createObjectURL(f)));
  };

  // -----------------------------------------
  // Size system
  // -----------------------------------------
  const addSize = () =>
    setSizes([...sizes, { size_label: "", price: "", quantity: "" }]);

  const updateSize = (index, field, value) => {
    const updated = [...sizes];
    updated[index][field] = value;
    setSizes(updated);
  };

  const removeSize = (index) =>
    setSizes(sizes.filter((_, i) => i !== index));

  // -----------------------------------------
  // Submit update
  // -----------------------------------------
  const handleUpdate = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    fd.append("keywords", keywords);

    if (mainImage) fd.append("main_image", mainImage);

    if (selectedCategory) fd.append("store_category_id", selectedCategory);
    if (selectedSubcategory) fd.append("store_subcategory_id", selectedSubcategory);
    if (selectedOfferCategory) fd.append("offer_category_id", selectedOfferCategory);

    fd.append("sizes", JSON.stringify(sizes));

    galleryImages.forEach((img) => fd.append("images", img));

    try {
      await API.patch(`/products/${id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Product updated!");
      navigate("/store/dashboard");
    } catch (err) {
      console.log("Update error:", err.response?.data);
      toast.error("Failed to update product");
    }
  };

  if (loading) return <p className="text-center py-10">Loading...</p>;

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
      `}</style>

      <h2>Edit Product</h2>

      <form onSubmit={handleUpdate}>

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
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label>Subcategory</label>
        <select
          value={selectedSubcategory}
          onChange={(e) => setSelectedSubcategory(e.target.value)}
        >
          <option value="">-- Select --</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label>Offer Category</label>
        <select
          value={selectedOfferCategory}
          onChange={(e) => setSelectedOfferCategory(e.target.value)}
        >
          <option value="">-- No offer --</option>
          {offerCategories.map((o) => (
            <option key={o.id} value={o.id}>{o.title}</option>
          ))}
        </select>

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
                type="number"
                value={size.price}
                onChange={(e) => updateSize(i, "price", e.target.value)}
              />
              <input
                placeholder="Qty"
                type="number"
                value={size.quantity}
                onChange={(e) => updateSize(i, "quantity", e.target.value)}
              />
              <button type="button" onClick={() => removeSize(i)}>X</button>
            </div>
          ))}
        </div>

        <label>Gallery Images (Add More)</label>
        <input type="file" multiple onChange={handleGalleryImages} />

        <div className="gallery-preview">
          {galleryPreview.map((src, i) => (
            <img key={i} src={src} className="preview-thumb" />
          ))}
        </div>

        <button className="submit-btn" type="submit">Save Changes</button>
      </form>
    </div>
  );
}
