"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  UtensilsCrossed,
  Clock
} from "lucide-react";
import { useCart } from "../component/cartContext";

export default function BillPage() {
  const router = useRouter();
  const { cart, clearCart, isLoaded } = useCart();
  
  const [showPopup, setShowPopup] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const tableNumber = 12;

  // Loading State
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-500 font-bold">Loading your bill...</p>
        </div>
      </div>
    );
  }

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const platformFee = 15;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  // Handle Get Bill Action
  const handleGetBill = () => {
    if (isRequesting || cart.length === 0) return;
    setIsRequesting(true);
    
    // Show the popup immediately
    setShowPopup(true);

    // Empty the cart from local storage and redirect after a delay
    setTimeout(() => {
      clearCart();
      router.push("/");
    }, 4000); // 4 seconds delay to let them read the popup
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-stone-50/80 backdrop-blur-md px-6 py-5 flex items-center justify-between border-b border-stone-200/50">
        <Link
          href="/customer/menu"
          className="p-2 bg-white shadow-sm border border-stone-100 hover:bg-stone-100 rounded-full transition-all"
        >
          <ArrowLeft size={20} className="text-stone-800" />
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-stone-900 tracking-tight">Your Bill</h1>
          <span className="text-[10px] bg-stone-200 text-stone-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1">
            Table {tableNumber}
          </span>
        </div>

        {/* Empty div to balance flex spacing */}
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-6 pb-40">
        {cart.length === 0 && !showPopup ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center mb-6">
              <Receipt className="text-stone-400" size={40} />
            </div>
            <h2 className="text-xl font-bold text-stone-900">No items to bill</h2>
            <p className="text-sm text-stone-500 mt-2 max-w-[200px]">
              You haven't ordered anything yet.
            </p>
            <Link href="/customer/menu" className="mt-8">
              <button className="bg-stone-900 hover:bg-stone-800 transition-colors text-white py-3 px-10 rounded-full font-bold shadow-lg shadow-stone-300">
                Back to Menu
              </button>
            </Link>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            {/* Receipt Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-stone-100 relative overflow-hidden">
              
              {/* Receipt Header */}
              <div className="text-center mb-6 pb-6 border-b border-dashed border-stone-200">
                <UtensilsCrossed className="mx-auto text-orange-600 mb-2" size={28} />
                <h2 className="text-xl font-black text-stone-900">Order Summary</h2>
                <p className="text-sm text-stone-400 font-medium mt-1">Please review your items</p>
              </div>

              {/* Items List (Read-Only) */}
              <div className="space-y-4 mb-6 pb-6 border-b border-dashed border-stone-200">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 flex-1">
                      <span className="font-bold text-stone-900 w-6">
                        {item.quantity}x
                      </span>
                      <div>
                        <h3 className="font-bold text-stone-700 leading-tight">
                          {item.name}
                        </h3>
                        {item.notes && (
                          <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-wider">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-stone-900 shrink-0">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>GST (5%)</span>
                  <span>₹{gst}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>Platform Fee</span>
                  <span>₹{platformFee}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center">
                <span className="text-lg font-black text-stone-900">Grand Total</span>
                <span className="text-2xl font-black text-orange-600">₹{grandTotal}</span>
              </div>
              
              {/* Receipt edge decorations */}
              <div className="absolute -left-3 top-[45%] w-6 h-6 bg-stone-50 rounded-full border-r border-stone-100"></div>
              <div className="absolute -right-3 top-[45%] w-6 h-6 bg-stone-50 rounded-full border-l border-stone-100"></div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-safe border-t border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleGetBill}
              disabled={isRequesting}
              className="bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg w-full shadow-lg shadow-orange-200 active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Receipt size={20} />
                  Get Bill
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 transition-opacity duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <CheckCircle2 className="text-green-500 relative z-10" size={40} />
              {/* Ping animation effect */}
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            </div>
            
            <h2 className="text-2xl font-black text-stone-900 mb-4 leading-tight">
              Bill Generated!
            </h2>

            <div className="bg-orange-50 rounded-2xl p-4 mb-6 border border-orange-100 flex items-start gap-3 text-left">
              <Clock className="text-orange-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-stone-700 font-medium leading-relaxed">
                The bill is being generated and the waiter will bring it to your table in <span className="font-bold text-orange-600">1 min</span>.
              </p>
            </div>
            
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              {/* Progress bar matching the setTimeout duration (4 seconds) */}
              <div className="bg-green-500 h-full animate-[progress_4s_ease-in-out_forwards] w-full origin-left" />
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-4">
              Redirecting to home...
            </p>
          </div>
        </div>
      )}

      {/* Custom styles for progress bar */}
      <style jsx global>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}