"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Loader2 } from "lucide-react";

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
    
    // Fetch immediately on load
    fetchParcels();
    
    // 🔥 FIX: Poll every 3 seconds so tokens disappear instantly for other customers
    const interval = setInterval(fetchParcels, 3000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const selectToken = (tokenNumber: number) => {
    // Clear any old table data and set the new token
    localStorage.removeItem("restaurant_sessionId");
    localStorage.setItem("restaurant_table", tokenNumber.toString());
    router.push(`/customer/menu?table=${tokenNumber}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 flex flex-col items-center pt-12 font-sans">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <ShoppingBag size={36} className="text-orange-600" />
      </div>
      
      <h1 className="text-3xl font-black tracking-tight text-center leading-tight mb-2">Takeaway Order</h1>
      <p className="text-stone-500 text-center font-medium mb-10 max-w-xs">
        Please select an available Token Number below to start your order.
      </p>

      {loading ? (
        <Loader2 className="animate-spin text-orange-500 mt-10" size={40} />
      ) : availableTokens.length === 0 ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl font-bold text-center border border-red-100 shadow-sm w-full max-w-sm animate-in fade-in">
          All parcel tokens are currently busy. Please wait a moment and refresh.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 w-full max-w-md animate-in fade-in">
          {availableTokens.map((token) => (
            <button
              key={token}
              onClick={() => selectToken(token)}
              className="bg-white py-6 rounded-3xl shadow-sm border-2 border-stone-100 hover:border-orange-500 hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Token</span>
              <span className="text-3xl font-black text-stone-800">{token - 100}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}