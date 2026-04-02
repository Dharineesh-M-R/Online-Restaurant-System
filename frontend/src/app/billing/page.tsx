"use client";

import { useState, useEffect } from "react";
import { 
  IndianRupee, CreditCard, Smartphone, CheckCircle2, 
  AlertCircle, X, ReceiptText
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TableData {
  id: string;
  tableNumber: number;
  status: "Available" | "Occupied" | "Billed";
  paymentMethod?: "cash" | "card" | "upi" | null; 
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
  const router = useRouter();

  // Protect the route and Check Shift Expiry
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const currentTime = new Date().getTime();

    // Check if role is wrong, OR if expiry is missing, OR if 8 hours have passed
    if (role !== "billing" || !expiry || currentTime > parseInt(expiry)) {
      
      // Wipe the expired data
      localStorage.removeItem("staff_role");
      localStorage.removeItem("staff_id");
      localStorage.removeItem("staff_name");
      localStorage.removeItem("staff_expiry");
      
      // Kick them out to the login page
      router.push("/login");
    }
  }, [router]);

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
          paymentMethod: paymentMethod, 
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

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Desk...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 p-4 sm:p-6 md:p-8 font-sans">
      
      {/* IMPROVED HEADER: Matches Kitchen dashboard mobile alignment & spacing */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-orange-100 p-2.5 sm:p-3.5 rounded-2xl shadow-sm border border-orange-200/50 shrink-0">
              <ReceiptText className="text-orange-600 w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 leading-none mb-1">
                Billing Desk
              </h1>
              <p className="text-gray-500 font-medium text-xs sm:text-sm">
                Manage table sessions and process payments.
              </p>
            </div>
          </div>
          
          {/* Status Legend - Turned into a sleek, scrollable pill */}
          <div className="flex gap-4 sm:gap-6 text-[10px] sm:text-xs font-bold bg-white px-5 sm:px-6 py-3 sm:py-3.5 rounded-full shadow-sm border border-gray-200 overflow-x-auto no-scrollbar whitespace-nowrap w-full md:w-auto">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Available
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span> Occupied
            </div>
            <div className="flex items-center gap-2 text-gray-900">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"></span> Bill Requested
            </div>
          </div>
        </div>
      </header>

      {/* Table Grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-gray-400">
           <ReceiptText size={56} className="mb-4 opacity-20" />
           <h2 className="text-xl sm:text-2xl font-black text-gray-600">No Tables Configured</h2>
           <p className="font-medium mt-1 text-sm sm:text-base text-center">Add tables to your database to start taking orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => table.status !== "Available" && setSelectedTable(table)}
              disabled={table.status === "Available"}
              className={`relative p-5 sm:p-6 rounded-4xl shadow-sm border-2 transition-all duration-200 flex flex-col items-center justify-center text-center aspect-square sm:aspect-auto sm:h-48
                ${table.status === "Available" ? "bg-white border-gray-100 opacity-60 cursor-not-allowed hover:bg-gray-50" : ""}
                ${table.status === "Occupied" ? "bg-orange-50/50 border-orange-200 hover:bg-orange-100 hover:shadow-md cursor-pointer active:scale-95" : ""}
                ${table.status === "Billed" ? "bg-red-50 border-red-500 hover:bg-red-100 cursor-pointer active:scale-95 shadow-[0_8px_30px_rgba(239,68,68,0.2)]" : ""}
              `}
            >
              {/* Customer Payment Preference Badge */}
              {table.status === "Billed" && table.paymentMethod && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  {table.paymentMethod === 'cash' && <IndianRupee size={12}/>}
                  {table.paymentMethod === 'card' && <CreditCard size={12}/>}
                  {table.paymentMethod === 'upi' && <Smartphone size={12}/>}
                  <span className="hidden sm:inline">{table.paymentMethod}</span>
                </div>
              )}

              {table.status === "Billed" && (
                <AlertCircle className="absolute top-3 right-3 sm:top-4 sm:right-4 text-red-500 animate-pulse" size={18} />
              )}
              
              <h2 className={`text-3xl sm:text-4xl font-black mb-1 sm:mb-2 ${table.status === "Available" ? "text-gray-300" : "text-gray-900"}`}>
                {table.tableNumber}
              </h2>
              
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md
                ${table.status === "Available" ? "bg-gray-100 text-gray-400" : ""}
                ${table.status === "Occupied" ? "bg-orange-200 text-orange-700" : ""}
                ${table.status === "Billed" ? "bg-red-500 text-white" : ""}
              `}>
                {table.status}
              </span>

              {table.status !== "Available" && (
                <p className="text-xs sm:text-sm font-bold text-gray-700 mt-2 sm:mt-3 bg-white/60 px-3 py-1 rounded-lg shadow-sm border border-gray-100/50">
                  ₹{table.itemTotal}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Checkout Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Table {selectedTable.tableNumber}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Checkout & Payment</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm border border-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-[#F8F9FB] rounded-3xl p-5 mb-6 border border-gray-100 space-y-3">
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>Items Total</span><span className="font-bold text-gray-900">₹{selectedTable.itemTotal}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600">
                  <span>GST (5%)</span><span className="font-bold text-gray-900">₹{Math.round(selectedTable.itemTotal * 0.05)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600 pb-4 border-b border-dashed border-gray-200">
                  <span>Platform Fee</span><span className="font-bold text-gray-900">₹15</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black text-gray-900">Amount Due</span>
                  <span className="text-3xl font-black text-green-600">
                    ₹{selectedTable.itemTotal > 0 ? selectedTable.itemTotal + Math.round(selectedTable.itemTotal * 0.05) + 15 : 0}
                  </span>
                </div>
              </div>

              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Select Payment Method to Close</h4>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => handlePayment("cash")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'cash' ? 'border-green-500 bg-green-50 shadow-md ring-4 ring-green-500/20' : 'bg-white border-gray-100 hover:border-green-500 hover:bg-green-50'}`}
                >
                  <IndianRupee size={24} className={`mb-2 ${selectedTable.paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-bold text-gray-900">Cash</span>
                  {selectedTable.paymentMethod === 'cash' && <span className="text-[9px] font-black text-green-600 uppercase mt-1">Requested</span>}
                </button>
                
                <button 
                  onClick={() => handlePayment("card")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 shadow-md ring-4 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-blue-500 hover:bg-blue-50'}`}
                >
                  <CreditCard size={24} className={`mb-2 ${selectedTable.paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="text-sm font-bold text-gray-900">Card</span>
                  {selectedTable.paymentMethod === 'card' && <span className="text-[9px] font-black text-blue-600 uppercase mt-1">Requested</span>}
                </button>

                <button 
                  onClick={() => handlePayment("upi")} disabled={processing}
                  className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50
                    ${selectedTable.paymentMethod === 'upi' ? 'border-purple-500 bg-purple-50 shadow-md ring-4 ring-purple-500/20' : 'bg-white border-gray-100 hover:border-purple-500 hover:bg-purple-50'}`}
                >
                  <Smartphone size={24} className={`mb-2 ${selectedTable.paymentMethod === 'upi' ? 'text-purple-600' : 'text-gray-500'}`} />
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