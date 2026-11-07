"use client";

import { useState, useEffect } from "react";
import {
  IndianRupee,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  ReceiptText,
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Tag,
  Percent,
  Search,
  Users,
  LogOut,
  ShoppingBag,
  Clock,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  chefName?: string | null;
  chefs?: string[];
}

interface TableData {
  id: string;
  tableNumber: number;
  tabName?: string;
  isSubTab?: boolean;
  status: "Available" | "Occupied" | "Billed";
  paymentMethod?: "cash" | "card" | "upi" | null;
  sessionId: string | null;
  orderId: string | null;
  itemTotal: number;
  waiterName?: string | null;
  chefs?: string[];
  items: OrderItem[];
}

interface CheckoutItem {
  name: string;
  quantity: number;
  unitPrice: number;
  chefName?: string | null;
  chefs?: string[];
}

export default function BillingDashboard() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "billed" | "occupied" | "parcels">("all");
  const [searchTable, setSearchTable] = useState("");

  // Modal & Checkout State
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  // Protect the route
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const currentTime = new Date().getTime();

    if (role !== "billing" || !expiry || currentTime > parseInt(expiry)) {
      localStorage.removeItem("staff_role");
      localStorage.removeItem("staff_id");
      localStorage.removeItem("staff_name");
      localStorage.removeItem("staff_expiry");
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

  const openModal = (table: TableData) => {
    setSelectedTableId(table.id);
    setDiscountValue(0);
    setDiscountType("percent");

    setCheckoutItems(
      table.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.quantity > 0 ? item.price / item.quantity : 0,
        chefName: item.chefName || (item.chefs && item.chefs[0]) || null,
        chefs: item.chefs || [],
      }))
    );
  };

  const updateQuantity = (index: number, delta: number) => {
    setCheckoutItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeCheckoutItem = (index: number) => {
    setCheckoutItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = checkoutItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discountAmount =
    discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const gst = Math.round(discountedSubtotal * 0.05);
  const platformFee = checkoutItems.length > 0 ? 15 : 0;
  const grandTotal =
    checkoutItems.length > 0 ? Math.round(discountedSubtotal + gst + platformFee) : 0;

  // Process checkout
  const handlePayment = async (paymentMethod: "cash" | "card" | "upi") => {
    if (!selectedTable || !selectedTable.orderId) return;
    setProcessing(true);

    try {
      const res = await fetch(`${apiUrl}/admin/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedTable.orderId,
          sessionId: selectedTable.sessionId,
          tableNumber: selectedTable.tableNumber,
          paymentMethod: paymentMethod,
          finalAmount: grandTotal,
          originalAmount: Math.round(grandTotal + discountAmount),
          discountAmount: Math.round(discountAmount),
        }),
      });

      if (res.ok) {
        setSelectedTableId(null);
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

  // Clear empty table
  const handleCloseSession = async () => {
    if (!selectedTable || !selectedTable.sessionId) return;
    const confirmClose = window.confirm(
      `Clear Table ${selectedTable.tableNumber}? This will cancel the open session.`
    );
    if (!confirmClose) return;

    setProcessing(true);
    try {
      const res = await fetch(`${apiUrl}/sessions/${selectedTable.sessionId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        setSelectedTableId(null);
        fetchTables();
      }
    } catch (err) {
      console.error("Close Session Error", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Stats calculations
  const totalOccupied = tables.filter((t) => t.status === "Occupied").length;
  const totalBilled = tables.filter((t) => t.status === "Billed").length;
  const totalAvailable = tables.filter((t) => t.status === "Available").length;
  const pendingCollection = tables.reduce((acc, t) => acc + (t.itemTotal || 0), 0);

  // Filtering
  const filteredTables = tables.filter((table) => {
    const isParcel = table.tableNumber > 100;
    const matchSearch =
      searchTable === "" ||
      table.tableNumber.toString().includes(searchTable) ||
      (isParcel && (table.tableNumber - 100).toString().includes(searchTable));

    if (!matchSearch) return false;
    if (filterType === "billed") return table.status === "Billed";
    if (filterType === "occupied") return table.status === "Occupied";
    if (filterType === "parcels") return isParcel;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-stone-500 font-bold text-xs uppercase tracking-widest">
          Initializing Cashier Desk...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 p-4 sm:p-6 lg:p-8 font-sans selection:bg-orange-500/20">
      
      {/* Top Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
            <ReceiptText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900 leading-none">Billing Desk</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                POS Online
              </span>
            </div>
            <p className="text-stone-500 text-xs font-medium mt-1">
              Live table settlement, discount management, and payment reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/management"
            className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-stone-200 text-xs font-black text-stone-700 hover:bg-stone-50 transition shadow-2xs"
          >
            <Tag size={15} />
            <span>Management Portal</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 rounded-xl text-xs font-bold transition"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
            Billed (Awaiting Payment)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">
              {totalBilled}
            </span>
            {totalBilled > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                Action Required
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
            Active Occupied Tables
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-600">
            {totalOccupied}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
            Vacant Tables
          </span>
          <span className="text-2xl sm:text-3xl font-black text-stone-400">
            {totalAvailable}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
            Active Orders Value
          </span>
          <span className="text-2xl sm:text-3xl font-black text-stone-900">
            ₹{pendingCollection}
          </span>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs">
        
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: "all", label: "All Tables" },
            { id: "billed", label: `Billed (${totalBilled})` },
            { id: "occupied", label: "Occupied" },
            { id: "parcels", label: "Takeaway Parcels" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                filterType === tab.id
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search table or token #..."
            value={searchTable}
            onChange={(e) => setSearchTable(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-stone-200/80 p-8">
          <p className="text-sm font-bold text-stone-400">No tables match your selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredTables.map((table) => {
            const isParcel = table.tableNumber > 100;
            const isAvailable = table.status === "Available";
            const isBilled = table.status === "Billed";
            const isOccupied = table.status === "Occupied";

            return (
              <button
                key={table.id}
                onClick={() => !isAvailable && openModal(table)}
                disabled={isAvailable}
                className={`relative p-5 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center justify-between min-h-44 text-center cursor-pointer ${
                  isAvailable
                    ? "bg-white border-stone-200/60 opacity-50 cursor-not-allowed"
                    : isBilled
                    ? "bg-rose-50/70 border-rose-500 shadow-lg shadow-rose-500/10 active:scale-95 hover:bg-rose-50"
                    : "bg-amber-50/50 border-amber-300 hover:border-amber-400 active:scale-95 hover:bg-amber-50 shadow-2xs"
                }`}
              >
                {/* Status Badges */}
                {isBilled && (
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs animate-pulse">
                    <AlertCircle size={10} />
                    <span>{table.paymentMethod || "Billed"}</span>
                  </div>
                )}

                {isParcel && (
                  <span className="absolute top-3 right-3 text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                    Takeaway
                  </span>
                )}

                <div className="my-auto">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-0.5">
                    {isParcel ? "Parcel Token" : table.tabName && table.tabName !== "Main" ? "Shared Party" : "Table"}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-stone-900 leading-none">
                    {isParcel ? table.tableNumber - 100 : table.tableNumber}
                  </h2>
                  {table.tabName && table.tabName !== "Main" && (
                    <span className="inline-block mt-1 text-[10px] font-black uppercase text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                      👥 {table.tabName}
                    </span>
                  )}
                  {table.waiterName && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                      🤵 {table.waiterName}
                    </span>
                  )}
                </div>

                <div className="w-full pt-2 border-t border-stone-200/50 flex justify-between items-center text-xs">
                  <span
                    className={`text-[10px] font-black uppercase ${
                      isAvailable
                        ? "text-stone-400"
                        : isBilled
                        ? "text-rose-600 font-extrabold"
                        : "text-amber-700"
                    }`}
                  >
                    {table.status}
                  </span>
                  {!isAvailable && (
                    <span className="font-black text-stone-900">
                      ₹{table.itemTotal}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-[#faf9f6] rounded-t-3xl">
              <div>
                <h3 className="text-xl font-black text-stone-900 leading-tight">
                  {selectedTable.tableNumber > 100
                    ? `Parcel Token #${selectedTable.tableNumber - 100}`
                    : `Table #${selectedTable.tableNumber}${selectedTable.tabName && selectedTable.tabName !== "Main" ? ` (${selectedTable.tabName})` : ''} Settlement`}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    POS Payment Terminal
                  </p>
                  {selectedTable.waiterName && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      🤵 Waiter: {selectedTable.waiterName}
                    </span>
                  )}
                  {selectedTable.chefs && selectedTable.chefs.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      👨‍🍳 Chef(s): {selectedTable.chefs.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTableId(null)}
                className="p-2 rounded-full hover:bg-stone-200 text-stone-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              
              {checkoutItems.length === 0 ? (
                <div className="py-12 text-center">
                  <ReceiptText size={44} className="mx-auto text-stone-300 mb-3" />
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-6">
                    No active items ordered on this table
                  </p>
                  <button
                    onClick={handleCloseSession}
                    disabled={processing}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={16} />
                    <span>Cancel Empty Session & Free Table</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Editable Items List */}
                  <div className="bg-[#faf9f6] rounded-2xl p-4 border border-stone-200/80">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-200 text-stone-500 text-xs font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <UtensilsCrossed size={14} /> Item Details
                      </span>
                      <span>Qty & Subtotal</span>
                    </div>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {checkoutItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-3 rounded-xl border border-stone-200/60 shadow-2xs flex justify-between items-center gap-2"
                        >
                          <div className="flex-1">
                            <span className="text-xs font-black text-stone-900 block leading-tight">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-stone-400 font-bold">
                                ₹{item.unitPrice} each
                              </span>
                              {(item.chefName || (item.chefs && item.chefs.length > 0)) && (
                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                                  👨‍🍳 {item.chefName || item.chefs?.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                              <button
                                onClick={() => updateQuantity(idx, -1)}
                                className="p-1 hover:bg-white rounded text-stone-600"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-5 text-center font-black text-xs text-stone-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(idx, 1)}
                                className="p-1 hover:bg-white rounded text-stone-600"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <span className="text-xs font-black text-stone-900 w-12 text-right">
                              ₹{item.unitPrice * item.quantity}
                            </span>

                            <button
                              onClick={() => removeCheckoutItem(idx)}
                              className="text-stone-300 hover:text-rose-600 p-1 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discount Controls */}
                  <div className="bg-[#faf9f6] p-4 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-2 flex items-center gap-1.5">
                      <Tag size={13} />
                      <span>Promotional Discount</span>
                    </span>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Discount value"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-black text-stone-900 outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                          discountType === "percent"
                            ? "bg-stone-900 text-white"
                            : "bg-white text-stone-600 border border-stone-200"
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("flat")}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                          discountType === "flat"
                            ? "bg-stone-900 text-white"
                            : "bg-white text-stone-600 border border-stone-200"
                        }`}
                      >
                        ₹
                      </button>
                    </div>
                  </div>

                  {/* Math Breakdown */}
                  <div className="space-y-2 text-xs font-medium text-stone-600 bg-white p-4 rounded-2xl border border-stone-200/80">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold">₹{subtotal}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Discount Deducted</span>
                        <span>- ₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>GST (5%)</span>
                      <span className="font-bold">₹{gst}</span>
                    </div>

                    <div className="flex justify-between pb-2 border-b border-dashed border-stone-200">
                      <span>Platform Fee</span>
                      <span className="font-bold">₹{platformFee}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-base">
                      <span className="font-black text-stone-900">Total Settlement</span>
                      <span className="text-2xl font-black text-emerald-600">
                        ₹{grandTotal}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Action Buttons */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2 text-center">
                      Select Tender to Close & Free Table
                    </span>

                    <div className="grid grid-cols-3 gap-2.5">
                      
                      <button
                        onClick={() => handlePayment("cash")}
                        disabled={processing || grandTotal === 0}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                          selectedTable.paymentMethod === "cash"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-stone-200 hover:border-emerald-500 bg-white text-stone-700"
                        }`}
                      >
                        <IndianRupee size={22} className="text-emerald-600 mb-1" />
                        <span className="text-xs font-black">Cash</span>
                      </button>

                      <button
                        onClick={() => handlePayment("card")}
                        disabled={processing || grandTotal === 0}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                          selectedTable.paymentMethod === "card"
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-stone-200 hover:border-blue-500 bg-white text-stone-700"
                        }`}
                      >
                        <CreditCard size={22} className="text-blue-600 mb-1" />
                        <span className="text-xs font-black">Card</span>
                      </button>

                      <button
                        onClick={() => handlePayment("upi")}
                        disabled={processing || grandTotal === 0}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                          selectedTable.paymentMethod === "upi"
                            ? "border-purple-500 bg-purple-50 text-purple-800"
                            : "border-stone-200 hover:border-purple-500 bg-white text-stone-700"
                        }`}
                      >
                        <Smartphone size={22} className="text-purple-600 mb-1" />
                        <span className="text-xs font-black">UPI</span>
                      </button>

                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-[#faf9f6] flex justify-end">
              <button
                onClick={() => setSelectedTableId(null)}
                className="w-full py-2.5 text-stone-500 hover:text-stone-800 font-bold text-xs"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
