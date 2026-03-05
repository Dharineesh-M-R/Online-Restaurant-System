"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Utensils,
  MessageSquareText,
  ChevronRight,
  Phone,
  CheckCircle2, // Added for the success popup
} from "lucide-react";
import { useCart } from "../component/cartContext";

export default function CartPage() {
  const tableNumber = 12;
  const router = useRouter();

  const { cart, updateQuantity, updateNotes, clearCart, isLoaded } = useCart();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false); // Added to prevent double clicks

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold">Loading your cart...</p>
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const gst = Math.round(subtotal * 0.05);
  const platformFee = 15;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  const handlePlaceOrder = () => {
    if (isOrdering) return;
    setIsOrdering(true);
    
    console.log("Order Placed", {
      cart,
      grandTotal,
      phoneNumber,
    });

    setShowPopup(true);

    // Simulate API call and redirect
    setTimeout(() => {
      // clearCart();  <--- REMOVE THIS LINE
      router.push("/customer/menu");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <Link
          href="/customer/menu"
          className="p-2 hover:bg-gray-100 rounded-full transition-all"
        >
          <ArrowLeft size={22} className="text-gray-800" />
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="text-base font-bold text-gray-900">Your Order</h1>
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mt-0.5">
            Table {tableNumber}
          </span>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors"
        >
          Clear
        </button>
      </header>

      <main className="flex-1 p-4 pb-48">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Utensils className="text-orange-300" size={40} />
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              Your cart is empty
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-[200px]">
              Looks like you haven't added anything to your order yet.
            </p>

            <Link href="/customer/menu" className="mt-8">
              <button className="bg-[#FF4F00] hover:bg-[#e64700] transition-colors text-white py-3 px-10 rounded-full font-bold shadow-lg shadow-orange-200">
                Browse Menu
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Cart Items */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Items Added
              </h2>

              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div
                          className={`w-4 h-4 border-2 flex items-center justify-center mt-1 shrink-0 ${
                            item.isVeg ? "border-green-600" : "border-red-600"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? "bg-green-600" : "bg-red-600"
                            }`}
                          />
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-800 leading-tight">
                            {item.name}
                          </h3>
                          <p className="text-sm font-semibold text-gray-500 mt-1">
                            ₹{item.price}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={16} className="text-red-500" />
                          ) : (
                            <Minus size={16} />
                          )}
                        </button>

                        <span className="w-8 text-center text-black font-extrabold text-sm">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 flex items-center gap-2 bg-[#F8F9FB] rounded-xl px-3 py-2.5">
                      <MessageSquareText size={14} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Add cooking instructions..."
                        className="bg-transparent text-xs w-full outline-none text-gray-700 placeholder:text-gray-400"
                        value={item.notes || ""}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone Input */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
                Contact Info (Optional)
              </h2>

              <div className="flex items-center gap-3 bg-[#F8F9FB] rounded-xl px-4 py-3 border border-gray-50 focus-within:border-orange-200 transition-colors">
                <Phone size={18} className="text-gray-400 shrink-0" />
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  className="bg-transparent text-sm w-full outline-none text-gray-800"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} // Only allow numbers
                  maxLength={10}
                />
              </div>
            </div>

            {/* Bill Details */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Bill Details
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Item Total</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST (5%)</span>
                  <span className="font-medium">₹{gst}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 pb-4 border-b border-dashed border-gray-200">
                  <span>Platform Fee</span>
                  <span className="font-medium">₹{platformFee}</span>
                </div>

                <div className="flex justify-between text-lg font-black text-gray-900 pt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Fixed Action Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-safe border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                  Total to pay
                </span>
                <span className="text-2xl font-black text-gray-900">
                  ₹{grandTotal}
                </span>
              </div>

              <Link href="/customer/menu">
                <button className="text-orange-600 font-bold text-sm bg-orange-50 hover:bg-orange-100 transition-colors px-5 py-2.5 rounded-full">
                  Add More
                </button>
              </Link>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isOrdering}
              className="bg-black text-white py-4 rounded-2xl font-bold w-full shadow-xl active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2"
            >
              {isOrdering ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Popup (Animated) */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 transition-opacity duration-300">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-500" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Order Placed! 🎉
            </h2>

            <p className="text-gray-500 mb-6">
              Your order has been sent to the kitchen. Redirecting you to the menu...
            </p>
            
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full animate-[progress_2.5s_ease-in-out] w-full origin-left" />
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for the progress bar animation */}
      <style jsx global>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}