import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";

import AddOfferCategoryModal from "../components/offers/AddOfferCategoryModal";
import EditOfferCategoryModal from "../components/offers/EditOfferCategoryModal";

export default function OfferManagement() {
  const [offers, setOffers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editOffer, setEditOffer] = useState(null);

  async function loadOffers() {
    try {
      const res = await API.get("stores/offer-categories/");
      setOffers(res.data);
    } catch (err) {
      console.error("Offer fetch error:", err);
      toast.error("Failed to load offers");
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  async function deleteOffer(id) {
    if (!window.confirm("Delete this offer category?")) return;

    try {
      await API.delete(`/offer-category/${id}/delete/`);
      toast.success("Offer deleted!");
      loadOffers();
    } catch (err) {
        console.error(err);
      toast.error("Failed to delete offer");
    }
  }

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-4">Manage Offer Categories</h2>

      <button
        className="px-4 py-2 bg-green-600 text-white rounded"
        onClick={() => setShowAdd(true)}
      >
        + Add Offer Category
      </button>

      <div className="mt-5 space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="p-4 bg-white shadow rounded flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{offer.title}</h3>
              <p className="text-sm text-gray-600">
                {offer.start_date.substring(0, 16)} → {offer.end_date.substring(0, 16)}
              </p>

              {offer.banner_image && (
                <img
                  src={offer.banner_image}
                  alt=""
                  className="h-20 mt-2 rounded"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => setEditOffer(offer)}
              >
                Edit
              </button>

              <button
                className="px-3 py-1 bg-red-600 text-white rounded"
                onClick={() => deleteOffer(offer.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddOfferCategoryModal
          onClose={() => {
            setShowAdd(false);
            loadOffers();
          }}
        />
      )}

      {editOffer && (
        <EditOfferCategoryModal
          offer={editOffer}
          onClose={() => {
            setEditOffer(null);
            loadOffers();
          }}
        />
      )}
    </div>
  );
}
