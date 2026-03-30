"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Role-based redirect
      if (data.role === "admin") router.push("/dashboard");
      else if (data.role === "waiter") router.push("/waiter");
      else if (data.role === "kitchen") router.push("/kitchen");

    } catch (err) {
      setError("Something went wrong. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[320px]">
        
        {/* Logo / Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">FoodieDelight</h1>
          <p className="text-sm text-gray-500">Smart Dining OS</p>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-center mb-5 text-gray-700">
          Staff Login
        </h2>

        {/* Email */}
        <input
          type="text"
          placeholder="Email"
          className="w-full p-2 border border-gray-500 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-black-300  placeholder:text-gray-500 text-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full p-2 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-black-300  placeholder:text-gray-500 text-gray-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Toggle Button */}
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 cursor-pointer text-sm text-gray-500"
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition transform hover:scale-105 shadow-md disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </div>
    </div>
  );
}