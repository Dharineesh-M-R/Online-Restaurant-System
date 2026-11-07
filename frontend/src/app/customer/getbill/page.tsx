"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  UtensilsCrossed,
  IndianRupee,
  CreditCard,
  Smartphone,
  Clock,
  ShoppingBag,
  Sparkles,
  Flame,
  Check,
  AlertTriangle,
  X,
  AlertCircle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function BillPage() {
  const { placedServes, isLoaded, tableNumber, sessionId, sessionStatus } = useCart();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isRequestingLocal, setIsRequestingLocal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
            Loading bill details...
          </p>
        </div>
      </div>
    );
  }

  const isParcel = Number(tableNumber) > 100;

  const isServerBilled = sessionStatus?.startsWith("billed");
  const serverPaymentMethod = sessionStatus?.includes("_") ? sessionStatus.split("_")[1] : null;

  const subtotal = placedServes.reduce((acc, serve) => acc + serve.serveTotal, 0);
  const gst = Math.round(subtotal * 0.05);
  const platformFee = subtotal > 0 ? 15 : 0;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  const allItems = placedServes.flatMap((serve) => serve.items);
  const hasItems = allItems.length > 0;
  const allReadyOrServed =
    hasItems &&
    allItems.every(
      (item) => (item as any).status === "ready" || (item as any).status === "served"
    );

  const handleRequestBill = async (method: string) => {
    if (isRequestingLocal || isServerBilled || !sessionId) return;
    setIsRequestingLocal(true);
    setShowPaymentModal(false);

    try {
      const res = await fetch(`${apiUrl}/sessions/${sessionId}/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      });

      if (!res.ok) throw new Error("Failed to request bill on backend");
    } catch (err) {
      console.error("Error requesting bill:", err);
      alert("Failed to request bill. Please check your connection.");
    } finally {
      setIsRequestingLocal(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    switch (status) {
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-black uppercase">
            <AlertTriangle size={10} className="text-rose-500" /> Out of Stock (Removed)
          </span>
        );
      case "waiting_confirmation":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-black uppercase">
            <Clock size={10} /> Queued
          </span>
        );
      case "pending":
      case "preparing":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-black uppercase">
            <Flame size={10} className="text-amber-500 animate-pulse" /> Cooking
          </span>
        );
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-black uppercase animate-pulse">
            <Sparkles size={10} className="text-emerald-500" /> Ready
          </span>
        );
      case "served":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-black uppercase">
            <Check size={10} /> Served
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans relative selection:bg-orange-500/20">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#faf9f6]/90 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between border-b border-stone-200/60">
        {!isParcel ? (
          <Link
            href={`/customer/menu?table=${tableNumber}`}
            className="p-2 bg-white rounded-xl border border-stone-200 hover:bg-stone-50 transition shadow-2xs"
          >
            <ArrowLeft size={18} className="text-stone-800" />
          </Link>
        ) : (
          <div className="w-9" />
        )}

        <div className="flex flex-col items-center">
          <h1 className="text-base font-black text-stone-900 leading-none">Dining Receipt</h1>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
              isParcel ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {isParcel ? `Token #${Number(tableNumber) - 100}` : `Table #${tableNumber}`}
          </span>
        </div>

        <div className="w-9" />
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full pb-44">
        
        {placedServes.length === 0 && !isServerBilled ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mb-4 text-stone-400">
              <Receipt size={36} />
            </div>
            <h2 className="text-lg font-black text-stone-800">No active orders yet</h2>
            <p className="text-stone-500 text-xs mt-1.5 max-w-xs leading-relaxed">
              Place an order from the menu to view and track your kitchen bill here.
            </p>
            {!isParcel && (
              <Link href={`/customer/menu?table=${tableNumber}`} className="mt-6">
                <button className="bg-orange-600 hover:bg-orange-700 text-white py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 active:scale-95 transition-all">
                  Go to Menu
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Server Billed Alert Banner */}
            {isServerBilled && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-2xs animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 leading-tight">
                      Bill Requested Successfully!
                    </h3>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                      Selected Payment: {serverPaymentMethod || "Pending"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 mt-3 bg-white/70 p-3 rounded-2xl leading-relaxed">
                  {isParcel
                    ? "Please head to the cashier desk to complete payment and collect your fresh takeaway order."
                    : "The billing desk has been notified. A waiter will arrive at your table shortly with the bill and payment terminal."}
                </p>
              </div>
            )}

            {/* Receipt Card */}
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden">
              
              {/* Receipt Header */}
              <div className="p-6 text-center border-b border-dashed border-stone-200 bg-[#faf9f6]">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">
                  {isParcel ? <ShoppingBag size={24} /> : <UtensilsCrossed size={24} />}
                </div>
                <h2 className="text-lg font-black text-stone-900">Foodie Delight</h2>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                  Live Table Summary
                </p>
              </div>

              {/* Items Breakdown by Serve Round */}
              <div className="p-6 border-b border-dashed border-stone-200 space-y-6">
                {placedServes.map((serve) => (
                  <div key={serve.serveNumber} className="space-y-3">
                    <div className="flex justify-between items-center pb-1.5 border-b border-stone-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                        {isParcel ? `Takeaway Round ${serve.serveNumber}` : `Round #${serve.serveNumber}`}
                      </span>
                      <span className="text-[10px] font-bold text-stone-500">
                        ₹{serve.serveTotal}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {serve.items.map((item) => {
                        const isOOS = item.status === "out_of_stock" || item.isOutOfStock;
                        return (
                          <div key={item.id} className="flex justify-between items-start gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <span className={isOOS ? "text-xs font-black text-stone-400 w-5 line-through" : "text-xs font-black text-stone-900 w-5"}>
                                {item.quantity}×
                              </span>
                              <div>
                                <p className={isOOS ? "text-xs font-bold text-rose-500 line-through leading-snug" : "text-xs font-bold text-stone-800 leading-snug"}>
                                  {item.name}
                                </p>
                                <div className="mt-1">{getStatusBadge(isOOS ? "out_of_stock" : (item as any).status)}</div>
                              </div>
                            </div>
                            <span className={isOOS ? "text-xs font-bold text-stone-400 line-through shrink-0" : "text-xs font-bold text-stone-900 shrink-0"}>
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mathematical Totals */}
              <div className="p-6 space-y-2.5 bg-white">
                <div className="flex justify-between text-xs text-stone-500 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 font-medium">
                  <span>GST (5%)</span>
                  <span>₹{gst}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500 font-medium pb-2 border-b border-dashed border-stone-200">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-stone-900">Total Payable</span>
                  <span className="text-2xl font-black text-orange-600">₹{grandTotal}</span>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Sticky Bottom Action */}
      {placedServes.length > 0 && !isServerBilled && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-4 border-t border-stone-200/80 shadow-lg z-30">
          <div className="max-w-lg mx-auto">
            {!allReadyOrServed && (
              <p className="text-[10px] text-center text-amber-700 font-black uppercase mb-2 tracking-widest flex items-center justify-center gap-1">
                <Clock size={12} />
                <span>Bill request unlocks once all items are ready/served</span>
              </p>
            )}

            <button
              onClick={() => allReadyOrServed && setShowPaymentModal(true)}
              disabled={isRequestingLocal || !allReadyOrServed}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer ${
                !allReadyOrServed
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/25"
              }`}
            >
              {isRequestingLocal ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Notifying Billing Desk...</span>
                </>
              ) : !allReadyOrServed ? (
                <>
                  <Clock size={16} />
                  <span>Cooking in Progress...</span>
                </>
              ) : (
                <>
                  <Receipt size={16} />
                  <span>Request Bill & Payment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-stone-900 leading-tight">Payment Preference</h3>
                <p className="text-xs text-stone-500 mt-0.5">Choose how you wish to pay your bill.</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              
              <button
                onClick={() => handleRequestBill("upi")}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left active:scale-98 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <span className="font-black text-sm text-stone-900 block group-hover:text-purple-700">UPI / QR Scan</span>
                    <span className="text-[10px] text-stone-400">GPay, PhonePe, Paytm QR</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600">Select →</span>
              </button>

              <button
                onClick={() => handleRequestBill("card")}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left active:scale-98 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="font-black text-sm text-stone-900 block group-hover:text-blue-700">Credit / Debit Card</span>
                    <span className="text-[10px] text-stone-400">Card swipe machine at table</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">Select →</span>
              </button>

              <button
                onClick={() => handleRequestBill("cash")}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left active:scale-98 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <span className="font-black text-sm text-stone-900 block group-hover:text-emerald-700">Cash Settlement</span>
                    <span className="text-[10px] text-stone-400">Pay cash directly with waiter</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600">Select →</span>
              </button>

            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
