"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2, ArrowLeft, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ParcelSelectionPage() {
  const [availableTokens, setAvailableTokens] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await fetch(`${apiUrl}/sessions/available-parcels`);
        if (res.ok) {
          const data = await res.json();
          setAvailableTokens(data.parcels);
        }
      } catch (err) {
        console.error("Failed to load parcels", err);
      } finally {
        setLoading(false);
      }
    };

    fetchParcels();
    const interval = setInterval(fetchParcels, 3000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const selectToken = (tokenNumber: number) => {
    localStorage.removeItem("restaurant_sessionId");
    localStorage.setItem("restaurant_table", tokenNumber.toString());
    router.push(`/customer/menu?table=${tokenNumber}`);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 p-4 sm:p-6 flex flex-col items-center pt-8 sm:pt-14 font-sans selection:bg-orange-500/20">
      
      {/* Back button */}
      <div className="w-full max-w-md flex justify-start mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-stone-200/80 hover:bg-stone-50 transition shadow-2xs text-xs font-bold text-stone-700"
        >
          <ArrowLeft size={16} />
          <span>Home</span>
        </Link>
      </div>

      <div className="w-20 h-20 bg-linear-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-5 text-white shadow-lg shadow-purple-500/20">
        <ShoppingBag size={36} />
      </div>

      <div className="text-center max-w-md mb-8">
        <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
          <Sparkles size={12} />
          <span>Fast Takeaway Counter</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 leading-tight">
          Select Parcel Token
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm font-medium mt-1.5 leading-relaxed max-w-xs mx-auto">
          Choose an open token number below to customize your takeaway order and track your packaging.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="animate-spin text-purple-600" size={36} />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Checking live token slots...
          </p>
        </div>
      ) : availableTokens.length === 0 ? (
        <div className="bg-white border border-rose-200 p-8 rounded-3xl shadow-sm w-full max-w-md text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock size={24} />
          </div>
          <h3 className="text-base font-black text-stone-900 mb-1">All Parcel Tokens Busy</h3>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            All takeaway counters are currently occupied. Tokens update automatically every few seconds.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition"
          >
            Refresh Slots
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Available Tokens ({availableTokens.length})
            </span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {availableTokens.map((token) => (
              <button
                key={token}
                onClick={() => selectToken(token)}
                className="bg-white py-6 sm:py-7 rounded-3xl border-2 border-stone-200/80 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group cursor-pointer"
              >
                <span className="text-[10px] font-black text-stone-400 group-hover:text-purple-600 uppercase tracking-widest transition-colors">
                  Token
                </span>
                <span className="text-3xl sm:text-4xl font-black text-stone-900 group-hover:scale-105 transition-transform">
                  {token - 100}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                  Ready
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-white rounded-2xl border border-stone-200/70 shadow-2xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-[11px] text-stone-600 leading-snug font-medium">
              After selecting a token, your order will be packed and called out by your chosen token number.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
