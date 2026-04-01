"use client";

import { useState, useEffect } from "react";
import { 
  IndianRupee, CreditCard, Smartphone, CheckCircle2, 
  AlertCircle, X
} from "lucide-react";

interface TableData {
  id: string;
  tableNumber: number;
  status: "Available" | "Occupied" | "Billed";
  paymentMethod?: "cash" | "card" | "upi" | null; // NEW: Track customer preference
  sessionId: string | null;
  orderId: string | null;
  itemTotal: number;
}

export default function BillingDashboard() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [processing, setProcessing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchTables = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/billing/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables);
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePayment = async (paymentMethod: "cash" | "card" | "upi") => {
    if (!selectedTable || !selectedTable.orderId) return;
    setProcessing(true);

    const gst = Math.round(selectedTable.itemTotal * 0.05);
    const platformFee = 15;
    const finalAmount = selectedTable.itemTotal > 0 ? selectedTable.itemTotal + gst + platformFee : 0;

    try {
      const res = await fetch(`${apiUrl}/admin/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedTable.orderId,
          sessionId: selectedTable.sessionId,
          tableNumber: selectedTable.tableNumber,
          paymentMethod: paymentMethod, // Final confirmed method
          finalAmount: finalAmount
        })
      });

      if (res.ok) {
        setSelectedTable(null);
        fetchTables();
      } else {
        alert("Payment failed to process.");
      }
    } catch (err) {
      console.error("Checkout Error", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center font-bold text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6 sm:p-10 font-sans">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Billing Desk</h1>
          <p className="text-gray-500 font-medium mt-1">Manage table sessions and process payments.</p>
        </div>
        <div className="flex gap-4 text-sm font-bold">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Available</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> Ordering</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Bill Requested</div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => table.status !== "Available" && setSelectedTable(table)}
            disabled={table.status === "Available"}
            className={`relative p-6 rounded-3xl shadow-sm border-2 transition-all flex flex-col items-center justify-center text-center h-40
              ${table.status === "Available" ? "bg-white border-gray-100 opacity-60 cursor-not-allowed" : ""}
              ${table.status === "Occupied" ? "bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer active:scale-95" : ""}
              ${table.status === "Billed" ? "bg-red-50 border-red-500 hover:bg-red-100 cursor-pointer active:scale-95 shadow-red-100 shadow-lg" : ""}
            `}
          >
            {/* NEW: Customer Payment Preference Badge */}
            {table.status === "Billed" && table.paymentMethod && (
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                {table.paymentMethod === 'cash' && <IndianRupee size={12}/>}
                {table.paymentMethod === 'card' && <CreditCard size={12}/>}
                {table.paymentMethod === 'upi' && <Smartphone size={12}/>}
                {table.paymentMethod}
              </div>
            )}

            {table.status === "Billed" && (
              <AlertCircle className="absolute top-4 right-4 text-red-500 animate-pulse" size={20} />
            )}
            
            <h2 className={`text-4xl font-black mb-2 ${table.status === "Available" ? "text-gray-300" : "text-gray-900"}`}>
              {table.tableNumber}
            </h2>
            
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full
              ${table.status === "Available" ? "bg-gray-100 text-gray-400" : ""}
              ${table.status === "Occupied" ? "bg-orange-200 text-orange-700" : ""}
              ${table.status === "Billed" ? "bg-red-500 text-white" : ""}
            `}>
              {table.status}
            </span>

            {table.status !== "Available" && (
              <p className="text-sm font-bold text-gray-600 mt-3">₹{table.itemTotal}</p>
            )}
          </button>
        ))}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Table {selectedTable.tableNumber}</h3>
                <p className="text-sm font-medium text-gray-500">Checkout & Payment</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100 space-y-3">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Items Total</span><span>₹{selectedTable.itemTotal}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>GST (5%)</span><span>₹{Math.round(selectedTable.itemTotal * 0.05)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600 pb-4 border-b border-dashed border-gray-200">
                  <span>Platform Fee</span><span>₹15</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-gray-900">Amount Due</span>
                  <span className="text-3xl font-black text-green-600">
                    ₹{selectedTable.itemTotal > 0 ? selectedTable.itemTotal + Math.round(selectedTable.itemTotal * 0.05) + 15 : 0}
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Select Payment Method to Close</h4>
              <div className="grid grid-cols-3 gap-3">
                {/* We highlight the button if it matches the customer's request! */}
                <button 
                  onClick={() => handlePayment("cash")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'cash' ? 'border-green-500 bg-green-50 shadow-md ring-4 ring-green-500/20' : 'bg-white border-gray-100 hover:border-green-500 hover:bg-green-50'}`}
                >
                  <IndianRupee size={24} className={`mb-2 ${selectedTable.paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-700'}`} />
                  <span className="text-sm font-bold text-gray-900">Cash</span>
                  {selectedTable.paymentMethod === 'cash' && <span className="text-[9px] font-black text-green-600 uppercase mt-1">Requested</span>}
                </button>
                
                <button 
                  onClick={() => handlePayment("card")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 shadow-md ring-4 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-blue-500 hover:bg-blue-50'}`}
                >
                  <CreditCard size={24} className={`mb-2 ${selectedTable.paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-700'}`} />
                  <span className="text-sm font-bold text-gray-900">Card</span>
                  {selectedTable.paymentMethod === 'card' && <span className="text-[9px] font-black text-blue-600 uppercase mt-1">Requested</span>}
                </button>

                <button 
                  onClick={() => handlePayment("upi")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'upi' ? 'border-purple-500 bg-purple-50 shadow-md ring-4 ring-purple-500/20' : 'bg-white border-gray-100 hover:border-purple-500 hover:bg-purple-50'}`}
                >
                  <Smartphone size={24} className={`mb-2 ${selectedTable.paymentMethod === 'upi' ? 'text-purple-600' : 'text-gray-700'}`} />
                  <span className="text-sm font-bold text-gray-900">UPI</span>
                  {selectedTable.paymentMethod === 'upi' && <span className="text-[9px] font-black text-purple-600 uppercase mt-1">Requested</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}