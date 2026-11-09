"use client";

import { useState, useEffect } from "react";
import {
  Search,
  TrendingUp,
  CreditCard,
  Banknote,
  IndianRupee,
  ChevronDown,
  Receipt,
  X,
  FileSpreadsheet,
  Eye,
} from "lucide-react";

interface PastOrder {
  id: string;
  rawId?: string;
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

interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  notes?: string;
}

export default function BillingHistory() {
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Receipt Modal State
  const [selectedOrder, setSelectedOrder] = useState<PastOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingHistory();
  }, [apiUrl]);

  // Fetch line items for specific order
  const handleViewDetails = async (order: PastOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    setLoadingDetails(true);
    setOrderItems([]);

    try {
      const res = await fetch(`${apiUrl}/management/billing/history/${order.rawId || order.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrderItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch line items:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

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
                <th className="py-4 px-5 text-center">Action</th>
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
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="inline-flex items-center justify-center p-2 bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors cursor-pointer"
                      title="View Receipt Details"
                    >
                      <Eye size={16} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))}
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400 font-bold">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Receipt Drill-Down Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200/80 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex justify-between items-start bg-[#faf9f6] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-stone-900 font-mono">{selectedOrder.id}</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    {selectedOrder.tableNumber > 100
                      ? `Token #${selectedOrder.tableNumber - 100}`
                      : `Table #${selectedOrder.tableNumber}`}
                  </span>
                </div>
                <p className="text-xs font-bold text-stone-400 mt-1">
                  {parseDatabaseDate(selectedOrder.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {selectedOrder.waiterName && selectedOrder.waiterName !== "Unassigned" && (
                  <p className="text-[11px] font-bold text-blue-700 mt-1">
                    Assigned Waiter: {selectedOrder.waiterName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 p-2 rounded-full transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Modal Body (Scrollable Line Items) */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-stone-100">
              <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-3">
                Itemized Dishes & Quantities
              </h4>
              
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center text-stone-400 text-xs font-bold gap-2">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading Line Items...</span>
                </div>
              ) : orderItems.length > 0 ? (
                <div className="space-y-3.5 pt-2">
                  {orderItems.map((item, index) => (
                    <div key={item.id || index} className="flex justify-between items-start gap-3">
                      <div className="flex gap-2.5 items-start">
                        <span className="font-black text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md text-xs shrink-0">
                          {item.quantity}×
                        </span>
                        <div>
                          <p className="font-black text-stone-900 text-xs leading-snug">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-medium text-stone-400">₹{item.price} each</span>
                            {item.status && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                                {item.status.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-stone-400 italic mt-0.5">Note: {item.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-stone-900 text-xs shrink-0">₹{item.total}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 font-bold text-stone-400 text-xs">
                  No line items found for this order.
                </div>
              )}
            </div>

            {/* Modal Footer (Financial Summary) */}
            <div className="p-6 bg-[#faf9f6] border-t border-stone-200 shrink-0 space-y-2">
              <div className="flex justify-between items-center text-stone-500 font-bold text-xs">
                <span>Subtotal (Before Discount)</span>
                <span>₹{selectedOrder.originalAmount || selectedOrder.totalAmount}</span>
              </div>
              
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between items-center text-orange-600 font-black text-xs">
                  <span>Offer Discount</span>
                  <span>- ₹{selectedOrder.discountAmount}</span>
                </div>
              )}
              
              <div className="border-t border-dashed border-stone-200 my-2 pt-2.5 flex justify-between items-center">
                <span className="font-black text-stone-900 text-xs uppercase tracking-wider">Total Paid</span>
                <span className="text-2xl font-black text-stone-900">₹{selectedOrder.totalAmount}</span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  selectedOrder.paymentStatus === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {selectedOrder.paymentStatus}
                </span>
                <span className="text-xs font-black text-stone-500 uppercase tracking-widest">
                  Tender: {selectedOrder.paymentMethod}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
