"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Utensils,
  MessageSquareText,
  Phone,
  CheckCircle2,
  Check,
  Receipt,
  Sparkles,
  Clock,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const router = useRouter();

  const {
    cart,
    updateQuantity,
    updateNotes,
    clearCurrentCart,
    isLoaded,
    serveCount,
    placedServes,
    placeCurrentOrder,
    tableNumber,
    sessionId,
  } = useCart();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  const redirectTimer = useRef<NodeJS.Timeout | null>(null);

  const isParcel = Number(tableNumber) > 100;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
            Loading your order...
          </p>
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const platformFee = subtotal > 0 ? 15 : 0;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  const handlePlaceOrder = () => {
    if (isOrdering || cart.length === 0) return;
    setIsOrdering(true);

    placeCurrentOrder();
    setShowPopup(true);

    redirectTimer.current = setTimeout(() => {
      router.push(`/customer/getbill?table=${tableNumber}`);
    }, 5000);
  };

  const handlePopupAction = (path: string) => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans relative selection:bg-orange-500/20">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-[#faf9f6]/90 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between border-b border-stone-200/60">
        <Link
          href={`/customer/menu?table=${tableNumber}`}
          className="p-2 bg-white rounded-xl border border-stone-200 hover:bg-stone-50 transition shadow-2xs"
        >
          <ArrowLeft size={18} className="text-stone-800" />
        </Link>
        
        <div className="flex flex-col items-center">
          <h1 className="text-base font-black text-stone-900 leading-none">Your Order</h1>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
              isParcel ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {isParcel ? `Token #${Number(tableNumber) - 100}` : `Table #${tableNumber}`}
          </span>
        </div>

        {cart.length > 0 ? (
          <button
            onClick={clearCurrentCart}
            className="text-xs font-bold text-stone-500 hover:text-red-600 transition-colors p-1"
          >
            Clear Round
          </button>
        ) : (
          <div className="w-12" />
        )}
      </header>

      {/* Main Order Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full pb-44">
        
        {/* Previously Ordered Serves */}
        {placedServes.length > 0 && (
          <div className="bg-emerald-50/70 rounded-3xl p-4 sm:p-5 border border-emerald-200/80 mb-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-100">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Previously Placed Rounds</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                Kitchen Preparing
              </span>
            </div>

            <div className="space-y-3">
              {placedServes.map((serve) => (
                <div key={serve.serveNumber} className="bg-white/80 rounded-2xl p-3.5 border border-emerald-100/60 shadow-2xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {isParcel ? "Initial Takeaway Pack" : `Serve Round #${serve.serveNumber}`}
                    </span>
                    <span className="text-xs font-black text-stone-800">
                      ₹{serve.serveTotal}
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {serve.items.map((item) => {
                      const isOOS = item.status === "out_of_stock" || item.isOutOfStock;
                      return (
                        <div key={item.id} className="flex justify-between items-center py-1.5 text-xs">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className={isOOS ? "line-through text-rose-500 font-bold" : "text-stone-700 font-bold"}>
                              {item.quantity}× {item.name}
                            </span>
                            {isOOS && (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded uppercase">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <span className={isOOS ? "text-stone-400 line-through font-medium" : "text-stone-500 font-medium"}>
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Round Cart Items */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center">
            <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mb-4 text-stone-400">
              <Utensils size={36} />
            </div>
            <h2 className="text-lg font-black text-stone-800">No new items in this round</h2>
            <p className="text-stone-500 text-xs mt-1.5 max-w-xs leading-relaxed">
              Add more dishes from the menu to prepare your next serving round.
            </p>
            <Link href={`/customer/menu?table=${tableNumber}`} className="mt-6">
              <button className="bg-orange-600 hover:bg-orange-700 text-white py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 active:scale-95 transition-all">
                Browse Menu
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* New Round Header Card */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">
                  {isParcel ? "Takeaway Order" : `Round ${serveCount + 1} • In Progress`}
                </span>
                <span className="text-xs font-black text-orange-600">
                  {cart.length} {cart.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="divide-y divide-stone-100">
                {cart.map((item) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-3">
                      
                      <div className="flex gap-2.5 flex-1">
                        {/* Veg / Non-Veg Indicator */}
                        <div className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center mt-1 shrink-0 ${
                          item.isVeg ? "border-emerald-600" : "border-rose-600"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-600" : "bg-rose-600"}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm leading-snug">{item.name}</h3>
                          <p className="text-xs font-black text-stone-500 mt-0.5">₹{item.price}</p>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-stone-100 rounded-xl p-0.5 border border-stone-200 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-lg transition active:scale-90"
                          title="Decrease"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={14} className="text-rose-500" />
                          ) : (
                            <Minus size={14} strokeWidth={2.5} />
                          )}
                        </button>
                        <span className="w-6 text-center text-stone-900 font-black text-xs">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-lg transition active:scale-90"
                          title="Increase"
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                    </div>

                    {/* Cooking Notes Input */}
                    <div className="mt-2.5 flex items-center gap-2 bg-[#faf9f6] rounded-xl px-3 py-2 border border-stone-200/60">
                      <MessageSquareText size={14} className="text-stone-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Special instructions (e.g., less oil, extra spicy)..."
                        className="bg-transparent text-xs w-full outline-none text-stone-800 placeholder:text-stone-400 font-medium"
                        defaultValue={item.notes || ""}
                        onBlur={(e) => updateNotes(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Customer Phone Input */}
            <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-2xs">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                Order Updates (Optional)
              </span>
              <div className="flex items-center gap-2.5 bg-[#faf9f6] rounded-xl px-3.5 py-2.5 border border-stone-200/60">
                <Phone size={16} className="text-stone-400 shrink-0" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number for SMS alerts"
                  className="bg-transparent text-xs font-medium w-full outline-none text-stone-900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-black text-stone-400 uppercase tracking-widest">
                  Current Round Cost
                </span>
                <span className="text-[10px] font-bold text-stone-400">All Taxes Included</span>
              </div>

              <div className="flex justify-between text-xs text-stone-600 font-medium">
                <span>Items Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-xs text-stone-600 font-medium">
                <span>GST (5%)</span>
                <span>₹{gst}</span>
              </div>

              <div className="flex justify-between text-xs text-stone-600 font-medium pb-2 border-b border-dashed border-stone-200">
                <span>Restaurant Platform Fee</span>
                <span>₹{platformFee}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-black text-stone-900">Round Total</span>
                <span className="text-xl font-black text-orange-600">₹{grandTotal}</span>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Sticky Bottom Order Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-4 border-t border-stone-200/80 shadow-lg z-30">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Round Total</span>
              <span className="text-xl font-black text-stone-900 leading-tight">₹{grandTotal}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isOrdering}
              className="flex-2 bg-stone-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm tracking-wide shadow-md active:scale-98 disabled:opacity-70 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isOrdering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending to Kitchen...</span>
                </>
              ) : (
                <>
                  <Utensils size={18} />
                  <span>Send Order (Serve {serveCount + 1})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Order Success Animated Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="text-2xl font-black text-stone-900 mb-1">Order Sent! 🎉</h2>
            <p className="text-stone-500 text-xs mb-6">
              Your order has been queued on the Kitchen Display System.
            </p>

            <div className="flex flex-col gap-2.5 mb-5">
              <button
                onClick={() => handlePopupAction(`/customer/menu?table=${tableNumber}`)}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition"
              >
                Add More Items
              </button>

              <button
                onClick={() => handlePopupAction(`/customer/getbill?table=${tableNumber}`)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition"
              >
                View Live Bill & Tracking
              </button>
            </div>

            {/* Visual 5-second countdown progress line */}
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full animate-[progress_5s_linear] w-full origin-left" />
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-2.5">
              Auto-redirecting to bill status...
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
