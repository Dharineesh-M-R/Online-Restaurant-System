"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Lock, ArrowRight, Store } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${apiUrl}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employeeId: employeeId.trim(), 
          pin: password 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // --- 8-HOUR SHIFT TIMER LOGIC ---
      const SHIFT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const expiryTime = new Date().getTime() + SHIFT_DURATION_MS;

      // Save the real credentials AND the expiry time to LocalStorage
      localStorage.setItem("staff_role", data.role);
      localStorage.setItem("staff_id", data.employeeId);
      localStorage.setItem("staff_name", data.name);
      localStorage.setItem("staff_expiry", expiryTime.toString());

      // Route them dynamically based on what the database told us!
      if (data.role === "waiter") router.push("/waiter");
      else if (data.role === "kitchen") router.push("/kitchen");
      else if (data.role === "billing") router.push("/billing");
      else setError("Unrecognized role assigned to this user.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-orange-100 p-4 rounded-3xl shadow-sm border border-orange-200/50 mb-4">
          <Store size={36} className="text-orange-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Foodie Delight</h1>
        <p className="text-gray-500 font-medium mt-1">Staff Portal Login</p>
      </div>

      {/* Login Card */}
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Employee ID Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Employee ID
            </label>
            <div className="relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                required
                placeholder="e.g., WAI001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#F8F9FB] border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-gray-900 font-bold uppercase placeholder:font-medium placeholder:normal-case"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
              PIN / Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                placeholder="Enter your PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#F8F9FB] border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none transition-all text-gray-900 font-bold"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg shadow-[0_8px_30px_rgb(234,88,12,0.3)] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Login to Dashboard <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Helper Text for Testing */}
      <div className="mt-8 text-center text-xs text-gray-400 font-medium">
        <p>Mock IDs: <span className="font-bold text-gray-600">WAI001</span> (Waiter), <span className="font-bold text-gray-600">CHF001</span> (Kitchen), <span className="font-bold text-gray-600">BIL001</span> (Billing)</p>
        <p className="mt-1">Mock Password: <span className="font-bold text-gray-600">1234</span></p>
      </div>
    </div>
  );
}