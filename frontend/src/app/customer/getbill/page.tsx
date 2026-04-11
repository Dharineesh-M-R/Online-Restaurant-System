"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Receipt, CheckCircle2, UtensilsCrossed, 
  IndianRupee, CreditCard, Smartphone, Wallet, Clock, ShoppingBag
} from "lucide-react";
import { useCart } from "../component/cartContext";

export default function BillPage() {
  const { placedServes, isLoaded, tableNumber, sessionId } = useCart();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isBillRequested, setIsBillRequested] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

  // 🔥 Identify if this is a Parcel
  const isParcel = Number(tableNumber) > 100;

  // Calculate live totals
  const subtotal = placedServes.reduce((acc, serve) => acc + serve.serveTotal, 0);
  const gst = Math.round(subtotal * 0.05);
  const platformFee = 15;
  const grandTotal = subtotal > 0 ? subtotal + gst + platformFee : 0;

  // Check if ALL items are ready or served 
  const allItems = placedServes.flatMap(serve => serve.items);
  const hasItems = allItems.length > 0;
  const allReadyOrServed = hasItems && allItems.every(
    item => (item as any).status === 'ready' || (item as any).status === 'served'
  );

  // Triggered when they select a payment method in the modal
  const handleRequestBill = async (method: string) => {
    if (isRequesting || isBillRequested || !sessionId) return;
    setIsRequesting(true);
    setShowPaymentModal(false);
    setSelectedMethod(method);
    
    try {
      const res = await fetch(`${apiUrl}/sessions/${sessionId}/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method })
      });

      if (!res.ok) throw new Error("Failed to request bill on backend");

      setIsBillRequested(true);
      setShowSuccessPopup(true);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 4000); 

    } catch (err) {
      console.error("Error requesting bill:", err);
      alert("Failed to request bill. Please check your connection.");
      setSelectedMethod(null);
    } finally {
      setIsRequesting(false);
    }
  };

  // Helper to color-code statuses dynamically
  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
    switch(status) {
      case "waiting_confirmation":
        return <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase font-black">Waiting</span>;
      case "pending":
      case "preparing":
        return <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase font-black">Preparing</span>;
      case "ready":
        return <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded uppercase font-black animate-pulse">Ready</span>;
      case "served":
        return <span className="text-[8px] bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded uppercase font-black">Served</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans relative">
      <header className="sticky top-0 z-20 bg-stone-50/80 backdrop-blur-md px-6 py-5 flex items-center justify-between border-b border-stone-200/50">
        
        {/* 🔥 Hide the Back Button for Parcels */}
        {!isParcel ? (
          <Link href={`/customer/menu?table=${tableNumber}`} className="p-2 bg-white shadow-sm border border-stone-100 hover:bg-stone-100 rounded-full transition-all">
            <ArrowLeft size={20} className="text-stone-800" />
          </Link>
        ) : (
          <div className="w-10"></div> // Spacer to keep layout balanced
        )}

        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-stone-900 tracking-tight">Your Bill</h1>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1 ${isParcel ? 'bg-purple-100 text-purple-700' : 'bg-stone-200 text-stone-600'}`}>
            {isParcel ? `Token ${Number(tableNumber) - 100}` : `Table ${tableNumber}`}
          </span>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-6 pb-40">
        {placedServes.length === 0 && !showSuccessPopup ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center mb-6">
              <Receipt className="text-stone-400" size={40} />
            </div>
            <h2 className="text-xl font-bold text-stone-900">No items ordered yet</h2>
            <p className="text-sm text-stone-500 mt-2 max-w-50">Place an order from the cart to generate a bill.</p>
            
            {/* 🔥 Hide the Back to Menu button for Parcels if empty */}
            {!isParcel && (
              <Link href={`/customer/menu?table=${tableNumber}`} className="mt-8">
                <button className="bg-stone-900 hover:bg-stone-800 transition-colors text-white py-3 px-10 rounded-full font-bold shadow-lg shadow-stone-300">
                  Back to Menu
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-4xl p-6 shadow-sm border border-stone-100 relative overflow-hidden">
              <div className="text-center mb-6 pb-6 border-b border-dashed border-stone-200">
                {isParcel ? (
                  <ShoppingBag className="mx-auto text-purple-600 mb-2" size={28} />
                ) : (
                  <UtensilsCrossed className="mx-auto text-orange-600 mb-2" size={28} />
                )}
                <h2 className="text-xl font-black text-stone-900">Order Summary</h2>
                <p className="text-sm text-stone-400 font-medium mt-1">Review your orders</p>
              </div>

              <div className="mb-6 pb-6 border-b border-dashed border-stone-200">
                {placedServes.map((serve) => (
                  <div key={serve.serveNumber} className="mb-6 last:mb-0">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 border-b border-stone-100 pb-2">
                      {isParcel ? "Takeaway Order" : `Serve ${serve.serveNumber}`}
                    </h3>
                    <div className="space-y-4">
                      {serve.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start gap-4">
                          <div className="flex gap-3 flex-1">
                            <span className="font-bold text-stone-900 w-6">{item.quantity}x</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-stone-700 leading-tight">{item.name}</h3>
                                {getStatusBadge((item as any).status)}
                              </div>
                              {item.notes && <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-wider">Note: {item.notes}</p>}
                            </div>
                          </div>
                          <span className="font-bold text-stone-900 shrink-0">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>Subtotal</span><span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>GST (5%)</span><span>₹{gst}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500 font-medium">
                  <span>Platform Fee</span><span>₹{platformFee}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center">
                <span className="text-lg font-black text-stone-900">Grand Total</span>
                <span className="text-2xl font-black text-orange-600">₹{grandTotal}</span>
              </div>
              
              <div className="absolute -left-3 top-[45%] w-6 h-6 bg-stone-50 rounded-full border-r border-stone-100"></div>
              <div className="absolute -right-3 top-[45%] w-6 h-6 bg-stone-50 rounded-full border-l border-stone-100"></div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Action */}
      {placedServes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-safe border-t border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-md mx-auto">
            {/* Warning Message if food is still cooking */}
            {!allReadyOrServed && !isBillRequested && (
              <p className="text-[10px] text-center text-orange-600 font-bold uppercase mb-2 tracking-widest">
                You can request the bill when all items are ready or served
              </p>
            )}
            
            <button 
              onClick={() => !isBillRequested && allReadyOrServed && setShowPaymentModal(true)} 
              disabled={isRequesting || isBillRequested || !allReadyOrServed} 
              className={`py-4 rounded-2xl font-bold text-lg w-full shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2
                ${isBillRequested ? "bg-green-100 text-green-700 shadow-none cursor-not-allowed" : 
                  !allReadyOrServed ? "bg-stone-200 text-stone-500 shadow-none cursor-not-allowed" : 
                  "bg-orange-600 text-white shadow-orange-200 disabled:opacity-70"}`}
            >
              {isRequesting ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Alerting Cashier...</>
              ) : isBillRequested ? (
                <><CheckCircle2 size={20} /> Waiter bringing {selectedMethod?.toUpperCase()} bill</>
              ) : !allReadyOrServed ? (
                <><Clock size={20} /> Food is being prepared...</>
              ) : (
                <><Receipt size={20} /> Request Bill</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-stone-900 mb-1 text-center">How would you like to pay?</h3>
            <p className="text-stone-500 text-sm text-center mb-6">
              {isParcel ? "Select a method to pay at the counter." : "Select a method so our waiter brings the right machine."}
            </p>
            
            <div className="space-y-3">
              <button onClick={() => handleRequestBill("upi")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-purple-500 hover:bg-purple-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><Smartphone size={24} className="text-purple-600" /><span className="font-bold text-stone-900">UPI / QR Code</span></div>
                <ArrowLeft size={16} className="text-stone-300 rotate-180" />
              </button>
              
              <button onClick={() => handleRequestBill("card")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><CreditCard size={24} className="text-blue-600" /><span className="font-bold text-stone-900">Credit / Debit Card</span></div>
                <ArrowLeft size={16} className="text-stone-300 rotate-180" />
              </button>

              <button onClick={() => handleRequestBill("cash")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-green-500 hover:bg-green-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><IndianRupee size={24} className="text-green-600" /><span className="font-bold text-stone-900">Cash</span></div>
                <ArrowLeft size={16} className="text-stone-300 rotate-180" />
              </button>
            </div>
            
            <button onClick={() => setShowPaymentModal(false)} className="w-full mt-4 py-3 text-stone-400 font-bold hover:text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 transition-opacity duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <CheckCircle2 className="text-green-500 relative z-10" size={40} />
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-4 leading-tight">Bill Requested!</h2>
            <div className="bg-orange-50 rounded-2xl p-4 mb-2 border border-orange-100 flex items-start gap-3 text-left">
              <Wallet className="text-orange-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-stone-700 font-medium leading-relaxed">
                {isParcel ? "Please proceed to the billing counter to process your payment and collect your takeaway." : "The billing desk has been alerted. A waiter will bring your bill to the table shortly."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}