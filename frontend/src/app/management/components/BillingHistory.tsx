"use client";

import { useState, useEffect } from "react";
import { Search, Filter, TrendingUp, CreditCard, Banknote, IndianRupee, Download, ChevronDown, Receipt } from "lucide-react";

interface PastOrder {
  id: string;
  tableNumber: number;
  totalAmount: number;
  paymentMethod: "cash" | "card" | "upi" | "pending";
  paymentStatus: "paid" | "pending" | "failed";
  createdAt: string;
}

export default function BillingHistory() {
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all"); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchBillingHistory = async () => {
      try {
        const res = await fetch(`${apiUrl}/management/billing/history`);
        if (res.ok) setOrders((await res.json()).orders);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingHistory();
  }, [apiUrl]);

  const displayOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) || order.tableNumber.toString().includes(searchQuery);
    if (!matchesSearch) return false;
    if (dateFilter === "all") return true;

    const today = new Date();
    const orderDate = new Date(order.createdAt);
    const diffDays = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));

    if (dateFilter === "today") return diffDays === 0;
    if (dateFilter === "yesterday") return diffDays === 1;
    if (dateFilter === "week") return diffDays <= 7;
    if (dateFilter === "month") return orderDate.getMonth() === today.getMonth();
    return true;
  });

  const displayRevenue = displayOrders.filter(o => o.paymentStatus === "paid").reduce((sum, order) => sum + Number(order.totalAmount), 0);

  const handleExport = () => {
    if (displayOrders.length === 0) return alert("No data to export!");
    const headers = ["Order ID", "Date & Time", "Table", "Amount", "Method", "Status"];
    const csvRows = [headers.join(","), ...displayOrders.map(o => [o.id, `"${new Date(o.createdAt).toLocaleString()}"`, o.tableNumber, o.totalAmount, o.paymentMethod, o.paymentStatus].join(","))];
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(new Blob([csvRows.join("\n")], { type: "text/csv" }));
    a.download = `Billing_Export.csv`;
    a.click();
  };

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400 font-bold">Loading Billing Data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-full text-green-600"><IndianRupee size={28} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase">Revenue (Filtered)</p><h3 className="text-2xl font-black text-gray-900">₹{displayRevenue}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full text-blue-600"><Receipt size={28} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase">Orders (Filtered)</p><h3 className="text-2xl font-black text-gray-900">{displayOrders.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-100 p-4 rounded-full text-purple-600"><TrendingUp size={28} /></div>
          <div><p className="text-sm font-bold text-gray-500 uppercase">Avg. Order Value</p><h3 className="text-2xl font-black text-gray-900">₹{displayOrders.length > 0 ? Math.round(displayRevenue / displayOrders.length) : 0}</h3></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search by Order ID or Table..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-900 placeholder:text-gray-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">Last 7 Days</option><option value="month">This Month</option>
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button onClick={handleExport} className="bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl font-black uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-orange-100 transition active:scale-95"><Download size={16} strokeWidth={3} /> Export</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-widest font-black">
                <th className="p-5">Order ID</th><th className="p-5">Date & Time</th><th className="p-5">Table</th><th className="p-5">Amount</th><th className="p-5">Method</th><th className="p-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition cursor-pointer">
                  <td className="p-5 font-black text-gray-900">{order.id}</td>
                  <td className="p-5 text-gray-600 font-bold text-sm">{new Date(order.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-5"><span className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-black text-sm">T - {order.tableNumber}</span></td>
                  <td className="p-5 font-black text-gray-900 text-lg">₹{order.totalAmount}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 font-black text-gray-600 uppercase text-xs tracking-wider">
                      {order.paymentMethod === 'cash' && <Banknote size={18} className="text-green-600" />}
                      {order.paymentMethod === 'card' && <CreditCard size={18} className="text-blue-600" />}
                      {order.paymentMethod === 'upi' && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">UPI</span>}
                      {order.paymentMethod === 'pending' && <span className="text-gray-400">PENDING</span>}
                      {order.paymentMethod !== 'pending' && order.paymentMethod}
                    </div>
                  </td>
                  <td className="p-5"><span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.paymentStatus}</span></td>
                </tr>
              ))}
              {displayOrders.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-gray-400 font-bold">No orders found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}