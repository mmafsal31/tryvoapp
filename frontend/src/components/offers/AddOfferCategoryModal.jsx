import React, { useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";

export default function OfferCategoryModal({ offer, onClose }) {
  const isEdit = !!offer;

  const [title, setTitle] = useState(offer?.title || "");
  const [start, setStart] = useState(offer?.start_date || "");
  const [end, setEnd] = useState(offer?.end_date || "");
  const [image, setImage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", title);
    fd.append("start_date", start);   // NO toISOString()
    fd.append("end_date", end);
    if (image) fd.append("banner_image", image);

    try {
      if (isEdit) {
        await API.put(`/offer-category/${offer.id}/update/`, fd);
        toast.success("Offer updated!");
      } else {
        await API.post("/offer-category/add/", fd);
        toast.success("Offer created!");
      }

      onClose();
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <div className="modal">
      <div className="modal-box">
        <h3>{isEdit ? "Edit Offer Category" : "Add Offer Category"}</h3>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Offer Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label>Start Date</label>
          <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} />

          <label>End Date</label>
          <input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />

          <input type="file" onChange={(e) => setImage(e.target.files[0])} />

          <button className="btn-primary mt-3">{isEdit ? "Update" : "Create"}</button>
          <button className="btn mt-2" onClick={onClose}>Close</button>
        </form>
      </div>
    </div>
  );
}
