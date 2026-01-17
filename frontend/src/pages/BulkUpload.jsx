import React, { useState } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";

export default function BulkUpload() {
  const [csv, setCsv] = useState(null);
  const [zip, setZip] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (setter) => (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Basic validation
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Maximum 20MB allowed.");
      return;
    }

    setter(file);
  };

  const resetForm = () => {
    setCsv(null);
    setZip(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!csv) return toast.error("CSV file is required");
    if (!zip) return toast.error("ZIP images file is required");

    const fd = new FormData();
    fd.append("csv", csv);
    fd.append("zip", zip);

    try {
      setLoading(true);

      const res = await API.post("/products/bulk-upload/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`🎉 Uploaded ${res.data.created_count} products successfully!`);
      resetForm();
    } catch (err) {
      console.error("Bulk Upload Error:", err.response?.data);
      toast.error(err.response?.data?.error || "Upload failed. Check CSV/ZIP and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-2xl shadow-md">
      <h2 className="text-3xl font-bold mb-4">📦 Bulk Upload Products</h2>
      <p className="text-gray-600 mb-6">
        Upload a <b>CSV file</b> and a <b>ZIP file containing images</b>.  
        Products will be created automatically with images, categories, sizes, and more.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* CSV Upload */}
        <div>
          <label className="block font-semibold mb-1">CSV File</label>

          <input
            type="file"
            accept=".csv"
            className="w-full border p-2 rounded cursor-pointer"
            onChange={handleFile(setCsv)}
          />

          {csv && (
            <p className="mt-2 text-sm text-green-600">
              ✔ Selected: <b>{csv.name}</b>
            </p>
          )}
        </div>

        {/* ZIP Upload */}
        <div>
          <label className="block font-semibold mb-1">ZIP Images File</label>

          <input
            type="file"
            accept=".zip"
            className="w-full border p-2 rounded cursor-pointer"
            onChange={handleFile(setZip)}
          />

          {zip && (
            <p className="mt-2 text-sm text-green-600">
              ✔ Selected: <b>{zip.name}</b>
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-black font-medium"
            disabled={loading}
          >
            Reset
          </button>

          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-900"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Now"}
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      {loading && (
        <div className="mt-4 text-center">
          <div className="animate-spin w-6 h-6 border-4 border-gray-300 border-t-black rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-2">Processing files... Please wait</p>
        </div>
      )}
    </div>
  );
}
