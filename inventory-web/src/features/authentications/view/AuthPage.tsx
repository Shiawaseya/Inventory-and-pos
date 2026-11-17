"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Login";
import Signup from "../components/Signup";
import ResetPassword from "../components/ResetPassword";
import { loginApi } from "../api";
import logo from "@/assets/SAND_logo.webp";

function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (loginApi.isAuthenticated()) {
      navigate("/authenticated", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex font-sans">
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ backgroundColor: "#3F3FF3" }}
      >
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <div className="flex items-center">
            <img
              src={logo}
              alt="S and J Marketing logo"
              className="h-10 w-10 mr-3 rounded-lg bg-white object-contain"
            />
            <h1 className="text-xl font-semibold text-white">
              S and J Marketing
            </h1>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl text-white mb-6 leading-tight">
              Control stock, purchasing, and branch flow in one place.
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Log in to access your inventory management workspace.
            </p>
          </div>

          <div className="flex justify-between items-center text-white/70 text-sm">
            <span>Copyright © 2026 S and J Marketing.</span>
            <span className="cursor-pointer hover:text-white/90">
              Privacy Policy
            </span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <Login />
          <Signup />
          <ResetPassword />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
