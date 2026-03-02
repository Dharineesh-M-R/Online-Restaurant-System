"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Trash2, Plus, Minus, ArrowLeft, ReceiptText, 
  Utensils, MessageSquareText, ChevronRight, Info 
} from "lucide-react";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  notes?: string;
}

export default function CartPage() {
  const tableNumber = 12;

  const [cart, setCart] = useState<CartItem[]>([
    { id: 1, name: "Paneer Tikka Masala", price: 320, quantity: 1, isVeg: true, notes: "" },
    { id: 2, name: "Butter Garlic Naan", price: 60, quantity: 2, isVeg: true, notes: "" },
    { id: 3, name: "Chicken Biryani", price: 450, quantity: 1, isVeg: false, notes: "" },
    { id: 4, name: "Mango Lassi", price: 120, quantity: 1, isVeg: true, notes: "" }
  ]);
  
  const [phoneNumber, setPhoneNumber] = useState("");

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05); // 5% GST
  const platformFee = 15;
  const grandTotal = subtotal + gst + platformFee;

  const updateQuantity = (id: number, delta: number) => {
    const updated = cart.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0);
    setCart(updated);
  };

  const updateNotes = (id: number, text: string) => {
    setCart(cart.map(item => item.id === id ? { ...item, notes: text } : item));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans">
      {/* --- Modern Header --- */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <Link href="/customer/menu" className="p-2 hover:bg-gray-100 rounded-full transition-all">
          <ArrowLeft size={22} className="text-gray-800" />
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-bold text-gray-900">Your Order</h1>
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Table {tableNumber}
          </span>
        </div>
        <button className="text-xs font-bold text-orange-600">Clear</button>
      </header>

      <main className="flex-1 p-4 pb-60">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Utensils className="text-gray-300" size={36} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
            <Link href="/customer/menu" className="mt-6">
              <button className="bg-[#FF4F00] text-white py-3 px-10 rounded-full font-bold shadow-lg shadow-orange-200">
                Browse Menu
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* --- Cart Items Section --- */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Items Added</h2>
              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        {/* Veg/Non-Veg Badge */}
                        <div className={`w-4 h-4 border-2 flex items-center justify-center mt-1 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                          <p className="text-sm font-semibold text-gray-500 mt-0.5">₹{item.price}</p>
                        </div>
                      </div>
                      
                      {/* Stepper with corrected visible quantity text */}
                      <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-600">
                          {item.quantity === 1 ? <Trash2 size={16} className="text-red-500" /> : <Minus size={16} />}
                        </button>
                        {/* THE FIX IS HERE: `text-black font-extrabold` makes it visible */}
                        <span className="w-6 text-center text-black font-extrabold text-base">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-600">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Instruction Input */}
                    <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <MessageSquareText size={14} className="text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Add cooking instructions..."
                        className="bg-transparent text-xs w-full outline-none text-gray-600"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- Bill Summary Card --- */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Bill Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-600 font-medium">
                  <span>Item Total</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 font-medium">
                  <span className="flex items-center gap-1">GST (5%) <Info size={12} /></span>
                  <span>₹{gst}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 font-medium pb-3 border-b border-dashed border-gray-200">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-gray-900 pt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>
            </div>

            {/* --- Recommendations --- */}
            <div className="pt-2 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 mb-3 px-1">Commonly ordered with these</h2>
              <div className="flex gap-3 overflow-x-auto pb-4 -mb-4 snap-x">
                {[ {n: 'Extra Cheese', p: 40}, {n: 'Coke 300ml', p: 55}, {n: 'Gulab Jamun', p: 80} ].map((rec, i) => (
                  <div key={i} className="min-w-[140px] bg-white p-3 rounded-2xl border border-gray-100 flex flex-col gap-2 snap-center">
                    <span className="text-xs font-bold text-gray-700 leading-tight truncate">{rec.n}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600">₹{rec.p}</span>
                      <button className="p-1 bg-orange-50 text-orange-600 rounded-lg"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- High Impact Sticky Bottom --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-6 pb-8 rounded-t-[3rem] shadow-[0_-15px_50px_rgba(0,0,0,0.08)] z-30">
          <div className="flex items-center justify-between mb-6 px-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Swipe up for details</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black text-gray-900">₹{grandTotal}</span>
                <ChevronRight size={18} className="text-gray-400 rotate-[-90deg]" />
              </div>
            </div>
            <Link href="/customer/menu">
              <button className="text-orange-600 font-bold text-sm bg-orange-50 px-4 py-2 rounded-full">Add More</button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="bg-black text-white py-4 rounded-2xl font-bold flex flex-col items-center shadow-lg active:scale-95 transition-all">
              <span className="text-[9px] opacity-60 uppercase tracking-widest mb-0.5">Send to Kitchen</span>
              Place Order
            </button>
            <button className="bg-[#FF4F00] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-95 transition-all">
              <ReceiptText size={18} />
              Get Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}