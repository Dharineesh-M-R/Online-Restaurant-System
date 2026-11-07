"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  Lock,
  ArrowRight,
  Store,
  Eye,
  EyeOff,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          pin: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // --- 8-HOUR SHIFT TIMER LOGIC ---
      const SHIFT_DURATION_MS = 8 * 60 * 60 * 1000;
      const expiryTime = new Date().getTime() + SHIFT_DURATION_MS;

      localStorage.setItem("staff_role", data.role);
      localStorage.setItem("staff_id", data.employeeId);
      localStorage.setItem("staff_db_id", data.id || data.staffId || "");
      localStorage.setItem("staff_name", data.name);
      localStorage.setItem("staff_expiry", expiryTime.toString());

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

  const fillQuickPreset = (id: string, pin: string) => {
    setEmployeeId(id);
    setPassword(pin);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative selection:bg-orange-500/20">
      
      {/* Top Return Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-stone-200/80 hover:bg-stone-50 transition shadow-2xs text-xs font-bold text-stone-700"
        >
          <ArrowLeft size={15} />
          <span>Customer Site</span>
        </Link>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 mb-3">
          <Store size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 leading-tight">
          Foodie Delight POS
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm font-medium mt-0.5">
          Staff Operational Access Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-200/50 border border-stone-200/80">
        
        {/* Quick Role Fill Presets for Instant Testing */}
        <div className="mb-6 pb-5 border-b border-stone-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 text-center">
            Quick Fill Demo Credentials
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuickPreset("WAI001", "1234")}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                employeeId === "WAI001"
                  ? "bg-orange-50 border-orange-500 text-orange-700"
                  : "bg-[#faf9f6] border-stone-200 hover:border-stone-300 text-stone-700"
              }`}
            >
              <UtensilsCrossed size={16} className="mx-auto mb-1 text-orange-600" />
              <span className="text-[11px] font-black block leading-none">Waiter</span>
              <span className="text-[9px] text-stone-400 block mt-0.5 font-bold">WAI001</span>
            </button>

            <button
              type="button"
              onClick={() => fillQuickPreset("CHF001", "1234")}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                employeeId === "CHF001"
                  ? "bg-amber-50 border-amber-500 text-amber-700"
                  : "bg-[#faf9f6] border-stone-200 hover:border-stone-300 text-stone-700"
              }`}
            >
              <ChefHat size={16} className="mx-auto mb-1 text-amber-600" />
              <span className="text-[11px] font-black block leading-none">Kitchen</span>
              <span className="text-[9px] text-stone-400 block mt-0.5 font-bold">CHF001</span>
            </button>

            <button
              type="button"
              onClick={() => fillQuickPreset("BIL001", "1234")}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                employeeId === "BIL001"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-[#faf9f6] border-stone-200 hover:border-stone-300 text-stone-700"
              }`}
            >
              <Receipt size={16} className="mx-auto mb-1 text-emerald-600" />
              <span className="text-[11px] font-black block leading-none">Cashier</span>
              <span className="text-[9px] text-stone-400 block mt-0.5 font-bold">BIL001</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Employee ID Input */}
          <div>
            <label className="block text-xs font-black text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
              Employee ID
            </label>
            <div className="relative">
              <UserCircle
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                size={18}
              />
              <input
                type="text"
                required
                placeholder="e.g. WAI001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#faf9f6] border border-stone-200 focus:border-orange-500 focus:bg-white outline-none transition text-stone-900 font-bold uppercase placeholder:normal-case placeholder:font-normal text-sm"
              />
            </div>
          </div>

          {/* Password / PIN Input */}
          <div>
            <label className="block text-xs font-black text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
              Secret PIN / Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter 4-digit PIN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-[#faf9f6] border border-stone-200 focus:border-orange-500 focus:bg-white outline-none transition text-stone-900 font-bold text-sm tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold animate-in fade-in">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-md active:scale-98 disabled:opacity-70 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-bold">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Active 8-Hour Session Lock Protected</span>
        </div>

      </div>

    </div>
  );
}
