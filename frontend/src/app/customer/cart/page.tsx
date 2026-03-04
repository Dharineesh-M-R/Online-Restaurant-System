"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Utensils,
  MessageSquareText,
  ChevronRight,
  Phone,
} from "lucide-react";
import { useCart } from "../component/cartContext";

export default function CartPage() {
  const tableNumber = 12;

  const { cart, updateQuantity, updateNotes, clearCart, isLoaded } = useCart();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [serveCount, setServeCount] = useState(1);

  // Prevent hydration mismatch by not rendering until local storage is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <p className="text-gray-500 font-bold">Loading your cart...</p>
      </div>
    );
  }

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const gst = Math.round(subtotal * 0.05);
  const platformFee = 15;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans">
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
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Table {tableNumber}
          </span>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-bold text-orange-600 hover:text-orange-800"
        >
          Clear
        </button>
      </header>

      <main className="flex-1 p-4 pb-60">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Utensils className="text-gray-300" size={36} />
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              Your cart is empty
            </h2>

            <Link href="/customer/menu" className="mt-6">
              <button className="bg-[#FF4F00] text-white py-3 px-10 rounded-full font-bold shadow-lg shadow-orange-200">
                Browse Menu
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Items Added
              </h2>

              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.id} className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <div
                          className={`w-4 h-4 border-2 flex items-center justify-center mt-1 ${
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
                          <h3 className="font-bold text-gray-800">
                            {item.name}
                          </h3>
                          <p className="text-sm font-semibold text-gray-500">
                            ₹{item.price}
                          </p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 text-gray-600"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={16} className="text-red-500" />
                          ) : (
                            <Minus size={16} />
                          )}
                        </button>

                        <span className="w-6 text-center text-black font-extrabold text-base">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 text-gray-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <MessageSquareText size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Add cooking instructions..."
                        className="bg-transparent text-xs w-full outline-none text-gray-600"
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
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                Contact Info (OPTIONAL)
              </h2>

              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Phone size={18} className="text-gray-400" />

                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  className="bg-transparent text-sm w-full outline-none text-gray-800"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Bill */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                Bill Details
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600 font-medium">
                  <span>Item Total</span>
                  <span>₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 font-medium">
                  <span>GST (5%)</span>
                  <span>₹{gst}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 font-medium pb-3 border-b border-dashed border-gray-200">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>

                <div className="flex justify-between text-lg font-black text-gray-900">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Section */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-6 pb-8 rounded-t-[3rem] shadow-[0_-15px_50px_rgba(0,0,0,0.08)] z-30">
          <div className="flex items-center justify-between mb-6 px-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">
                Swipe up for details
              </p>

              <div className="flex items-center gap-1">
                <span className="text-2xl font-black text-gray-900">
                  ₹{grandTotal}
                </span>

                <ChevronRight
                  size={18}
                  className="text-gray-400 rotate-[-90deg]"
                />
              </div>
            </div>

            <Link href="/customer/menu">
              <button className="text-orange-600 font-bold text-sm bg-orange-50 px-4 py-2 rounded-full">
                Add More
              </button>
            </Link>
          </div>

          <button
            onClick={() => {
              console.log(`Serve ${serveCount} ordered`, {
                cart,
                grandTotal,
                phoneNumber,
              });

              setShowPopup(true);
            }}
            className="bg-black text-white py-4 rounded-2xl font-bold w-full shadow-lg active:scale-95 transition-all"
          >
            Place Order
          </button>
        </div>
      )}

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Serve {serveCount} Ordered Successfully
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Your order has been sent to the kitchen. It will take
              approximately <b>15 minutes</b>.
            </p>

            <div className="flex flex-col gap-3">
              <Link href="/customer/menu">
                <button
                  onClick={() => {
                    setServeCount(serveCount + 1);
                    setShowPopup(false);
                  }}
                  className="group w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all"
                >
                  <Plus
                    size={18}
                    className="group-hover:rotate-90 transition-transform"
                  />
                  Order One More Serve
                  <ChevronRight
                    size={16}
                    className="opacity-70 group-hover:translate-x-1 transition"
                  />
                </button>
              </Link>

              <button
                onClick={() => {
                  clearCart();
                  setShowPopup(false);
                }}
                className="w-full bg-gray-100 text-gray-800 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                Get Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}