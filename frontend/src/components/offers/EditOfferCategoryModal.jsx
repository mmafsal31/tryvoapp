import React, { useState } from "react";
import API from "../../api/axios";

export default function EditOfferCategoryModal({ offer, onClose }) {
  const [title, setTitle] = useState(offer.title);
  const [banner, setBanner] = useState(null);
  const [start, setStart] = useState(offer.start_date);
  const [end, setEnd] = useState(offer.end_date);

  const update = async () => {
    const form = new FormData();
    form.append("title", title);
    form.append("start_date", start);
    form.append("end_date", end);
    if (banner) form.append("banner_image", banner);

    try {
      await API.put(`offer-category/${offer.id}/update/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Offer updated!");
      onClose();
    } catch (err) {
      console.log(err.response?.data);
      alert("Error updating offer category");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-5 rounded w-96 shadow">
        <h2 className="text-lg font-semibold mb-3">Edit Offer Category</h2>

        <input
          className="border p-2 rounded w-full mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label>Start Date</label>
        <input
          type="datetime-local"
          className="border p-2 rounded w-full mb-3"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />

        <label>End Date</label>
        <input
          type="datetime-local"
          className="border p-2 rounded w-full mb-3"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />

        {offer.banner_image && (
          <img src={offer.banner_image} className="h-20 mt-2 rounded" />
        )}

        <input
          type="file"
          className="mt-2"
          onChange={(e) => setBanner(e.target.files[0])}
        />

        <button
          onClick={update}
          className="bg-black text-white w-full rounded py-2 mt-4"
        >
          Update Offer
        </button>

        <button className="w-full mt-2" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
