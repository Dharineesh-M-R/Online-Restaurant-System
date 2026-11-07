"use client";

import { useState, useEffect } from "react";
import {
  Search,
  TrendingUp,
  CreditCard,
  Banknote,
  IndianRupee,
  Download,
  ChevronDown,
  Receipt,
  Calendar,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface PastOrder {
  id: string;
  tableNumber: number;
  totalAmount: number;
  originalAmount: number;
  discountAmount: number;
  paymentMethod: "cash" | "card" | "upi" | "pending";
  paymentStatus: "paid" | "pending" | "failed";
  createdAt: string;
  waiterName?: string;
  waiterEmployeeId?: string | null;
  chefs?: string[];
}

export default function BillingHistory() {
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Force JS to parse the database string as UTC 
  // so it correctly converts it to local Indian Standard Time (IST)
  const parseDatabaseDate = (dateString: string) => {
    if (!dateString) return new Date();
    const safeString = dateString.replace(" ", "T") + (dateString.includes("Z") ? "" : "Z");
    return new Date(safeString);
  };

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

  const displayOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tableNumber.toString().includes(searchQuery);

    if (!matchesSearch) return false;
    if (dateFilter === "all") return true;

    const today = new Date();
    const orderDate = parseDatabaseDate(order.createdAt);
    const diffDays = Math.floor(
      (today.getTime() - orderDate.getTime()) / (1000 * 3600 * 24)
    );

    if (dateFilter === "today") return diffDays === 0;
    if (dateFilter === "yesterday") return diffDays === 1;
    if (dateFilter === "week") return diffDays <= 7;
    if (dateFilter === "month") return orderDate.getMonth() === today.getMonth();
    return true;
  });

  const displayRevenue = displayOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.totalAmount), 0);

  const handleExport = () => {
    if (displayOrders.length === 0) return alert("No data available to export!");
    const headers = ["Order ID", "Date & Time", "Table", "Assigned Waiter", "Chef(s)", "Original Amount", "Discount", "Paid Amount", "Method", "Status"];
    const csvRows = [
      headers.join(","),
      ...displayOrders.map((o) =>
        [
          o.id,
          `"${parseDatabaseDate(o.createdAt).toLocaleString()}"`,
          o.tableNumber,
          `"${o.waiterName || "Unassigned"}"`,
          `"${(o.chefs || []).join("; ") || "N/A"}"`,
          o.originalAmount || o.totalAmount,
          o.discountAmount || 0,
          o.totalAmount,
          o.paymentMethod,
          o.paymentStatus,
        ].join(",")
      ),
    ];
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(new Blob([csvRows.join("\n")], { type: "text/csv" }));
    a.download = `Billing_History_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-stone-400 font-bold text-xs uppercase tracking-widest">
        <Receipt size={32} className="animate-bounce mb-2 text-orange-500" />
        <span>Loading Financial History...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <IndianRupee size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              Filtered Revenue
            </span>
            <h3 className="text-2xl font-black text-stone-900 leading-tight">
              ₹{displayRevenue}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Receipt size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              Total Receipts
            </span>
            <h3 className="text-2xl font-black text-stone-900 leading-tight">
              {displayOrders.length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
              Average Order Value
            </span>
            <h3 className="text-2xl font-black text-stone-900 leading-tight">
              ₹{displayOrders.length > 0 ? Math.round(displayRevenue / displayOrders.length) : 0}
            </h3>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col md:flex-row gap-3 justify-between items-center">
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
          <input
            type="text"
            placeholder="Search by Order ID or Table Number..."
            className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative">
            <select
              className="appearance-none bg-stone-50 border border-stone-200 text-stone-800 py-2.5 pl-4 pr-9 rounded-2xl text-xs font-black outline-none focus:border-orange-500 cursor-pointer"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>

          <button
            onClick={handleExport}
            className="bg-stone-900 hover:bg-black text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>
        </div>

      </div>

      {/* Orders Data Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200/80 text-stone-400 text-[10px] uppercase tracking-widest font-black">
                <th className="py-4 px-5">Receipt ID</th>
                <th className="py-4 px-5">Date & Time</th>
                <th className="py-4 px-5">Table</th>
                <th className="py-4 px-5">Assigned Waiter</th>
                <th className="py-4 px-5">Chef(s)</th>
                <th className="py-4 px-5">Total Amount</th>
                <th className="py-4 px-5">Tender Method</th>
                <th className="py-4 px-5">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {displayOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#faf9f6] transition">
                  <td className="py-4 px-5 font-black text-stone-900 font-mono">
                    {order.id}
                  </td>
                  <td className="py-4 px-5 text-stone-500 font-medium">
                    {parseDatabaseDate(order.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-4 px-5">
                    <span className="bg-stone-100 text-stone-800 px-2.5 py-1 rounded-lg font-black text-[11px]">
                      {order.tableNumber > 100
                        ? `Parcel #${order.tableNumber - 100}`
                        : `Table #${order.tableNumber}`}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    {order.waiterName && order.waiterName !== "Unassigned" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                        🤵 {order.waiterName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    {order.chefs && order.chefs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {order.chefs.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md whitespace-nowrap"
                          >
                            👨‍🍳 {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-400 font-medium">-</span>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex flex-col justify-center">
                      <span className="font-black text-stone-900 text-sm">₹{order.totalAmount}</span>
                      {order.discountAmount > 0 && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-stone-400 line-through">
                            ₹{order.originalAmount}
                          </span>
                          <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-200 uppercase tracking-widest">
                            -₹{order.discountAmount} Offer
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-stone-700">
                      {order.paymentMethod === "cash" && (
                        <Banknote size={15} className="text-emerald-600" />
                      )}
                      {order.paymentMethod === "card" && (
                        <CreditCard size={15} className="text-blue-600" />
                      )}
                      {order.paymentMethod === "upi" && (
                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-black">
                          UPI
                        </span>
                      )}
                      <span>{order.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 font-bold">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
