import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearAuthData } from "../utils/auth";
import StoreSwitchModal from "./StoreSwitchModal";

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => {
    clearAuthData();
    navigate("/login");
  };

  return (
    <>
      <nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-3">
          {/* Brand */}
          <Link
            to="/"
            className="text-2xl font-extrabold text-[#111111] tracking-tight hover:text-[#DDF247] transition-all"
          >
            Tryvo.
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6 font-[Inter]">
            {user ? (
              <>
                {user.is_store ? (
                  <Link
                    to="/store/dashboard"
                    className="text-[#111111] hover:text-[#DDF247] font-medium transition"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-[#111111] hover:text-[#DDF247] font-medium transition"
                  >
                    Switch to Store
                  </button>
                )}

                <Link
                  to="/profile"
                  className="text-[#111111] hover:text-[#DDF247] font-medium transition"
                >
                  Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-[#E63946] hover:text-[#C52C3C] font-medium transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[#111111] hover:text-[#DDF247] font-medium transition"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="bg-[#DDF247] hover:bg-[#c7e63f] text-[#111111] px-5 py-2 rounded-full font-semibold shadow-sm transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Store registration modal */}
      <StoreSwitchModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
