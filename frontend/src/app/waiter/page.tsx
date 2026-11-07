"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BellRing,
  LayoutGrid,
  CheckCircle2,
  Utensils,
  Clock,
  UserCheck,
  X,
  ChefHat,
  ChevronRight,
  Hand,
  Trash2,
  Plus,
  Minus,
  Receipt,
  Smartphone,
  CreditCard,
  IndianRupee,
  ShoppingBag,
  LogOut,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  User,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ReadyItem {
  id: string;
  name: string;
  quantity: number;
  tableNumber: number;
  serveNumber: number;
  chefName?: string | null;
  chefEmployeeId?: string | null;
}

interface TableStatus {
  number: number;
  isOccupied: boolean;
  needsHelp: boolean;
  hasUnconfirmed: boolean;
  hasOutOfStock?: boolean;
  outOfStockItems?: string[];
  sessionStatus: string | null;
  assignedWaiter?: {
    id: string;
    name: string;
    employeeId: string;
  } | null;
}

interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
  isOutOfStock?: boolean;
  serve: number;
  notes?: string;
}

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "tables">("tasks");
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const [floorTables, setFloorTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStatus, setActiveSessionStatus] = useState<string | null>(null);
  const [selectedTableWaiter, setSelectedTableWaiter] = useState<{ id: string; name: string; employeeId: string } | null>(null);
  const [tableOrders, setTableOrders] = useState<OrderSummaryItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Current waiter credentials
  const [currentStaff, setCurrentStaff] = useState<{ id: string; name: string; employeeId: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const staffId = localStorage.getItem("staff_id") || "";
    const staffDbId = localStorage.getItem("staff_db_id") || "";
    const staffName = localStorage.getItem("staff_name") || "";

    if (role !== "waiter" || !expiry || new Date().getTime() > parseInt(expiry)) {
      localStorage.clear();
      router.push("/login");
    } else {
      setCurrentStaff({
        id: staffDbId,
        name: staffName,
        employeeId: staffId,
      });
    }
  }, [router]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/tasks?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) setReadyItems((await res.json()).tasks);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchFloorPlan = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/floor-plan?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) setFloorTables((await res.json()).tables);
    } catch (err) {}
  }, [apiUrl]);

  const viewTableDetails = async (tableNum: number, isOccupied: boolean) => {
    if (!isOccupied) return;
    setSelectedTable(tableNum);
    setIsModalLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/admin/waiter/table-details/${tableNum}?t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setTableOrders(data.items);
        setActiveSessionId(data.sessionId);
        setActiveSessionStatus(data.sessionStatus);
        setSelectedTableWaiter(data.assignedWaiter || null);
      }
    } catch (err) {
    } finally {
      setIsModalLoading(false);
    }
  };

  const pollTableDetails = useCallback(
    async (tableNum: number) => {
      try {
        const res = await fetch(
          `${apiUrl}/admin/waiter/table-details/${tableNum}?t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setActiveSessionId(data.sessionId);
          setActiveSessionStatus(data.sessionStatus);
          setSelectedTableWaiter(data.assignedWaiter || null);
          setTableOrders((prev) =>
            data.items.map((newItem: OrderSummaryItem) => {
              const existing = prev.find((p) => p.id === newItem.id);
              return existing &&
                existing.status === "waiting_confirmation" &&
                newItem.status === "waiting_confirmation"
                ? { ...newItem, quantity: existing.quantity }
                : newItem;
            })
          );
        }
      } catch (err) {}
    },
    [apiUrl]
  );

  useEffect(() => {
    fetchTasks();
    fetchFloorPlan();
    const interval = setInterval(() => {
      fetchTasks();
      fetchFloorPlan();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchFloorPlan]);

  useEffect(() => {
    if (selectedTable !== null) {
      const modalInterval = setInterval(() => pollTableDetails(selectedTable), 3000);
      return () => clearInterval(modalInterval);
    }
  }, [selectedTable, pollTableDetails]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setTableOrders((prev) =>
      prev.map((item) =>
        item.id === itemId && item.status === "waiting_confirmation"
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: itemId, action: "delete" }] }),
      });
      setTableOrders((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {}
  };

  const handleConfirmAndSend = async () => {
    const items = tableOrders
      .filter((i) => i.status === "waiting_confirmation")
      .map((i) => ({ id: i.id, quantity: i.quantity, action: "confirm" }));
    if (!items.length) return;
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items,
          waiterId: currentStaff?.id || null,
          tableNumber: selectedTable
        }),
      });
      if (res.ok) {
        setSelectedTable(null);
        fetchFloorPlan();
      }
    } catch (err) {}
  };

  const executeBillRequest = async (method: string) => {
    if (!selectedTable) return;
    setShowPaymentModal(false);
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/request-bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tableNumber: selectedTable, 
          paymentMethod: method,
          waiterId: currentStaff?.id || null
        }),
      });
      if (res.ok) fetchFloorPlan();
    } catch (err) {}
  };

  const markAsServed = async (itemId: string) => {
    setReadyItems((prev) => prev.filter((item) => item.id !== itemId));
    try {
      await fetch(`${apiUrl}/admin/waiter/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "served" }),
      });
    } catch (err) {}
  };

  const attendTable = async (e: React.MouseEvent, tableNumber: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/attend-table`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tableNumber,
          waiterId: currentStaff?.id || null
        }),
      });
      if (res.ok) fetchFloorPlan();
    } catch (err) {}
  };

  const claimTable = async (e: React.MouseEvent, tableNumber: number) => {
    e.stopPropagation();
    if (!currentStaff?.id) return;
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/assign-waiter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tableNumber,
          waiterId: currentStaff.id
        }),
      });
      if (res.ok) fetchFloorPlan();
    } catch (err) {}
  };

  const handleClearEmptyTable = async () => {
    if (!selectedTable || !activeSessionId) return;
    if (!window.confirm(`Clear Table ${selectedTable}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/sessions/${activeSessionId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        setSelectedTable(null);
        setActiveSessionId(null);
        fetchFloorPlan();
      }
    } catch (err) {}
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const groupedTasks = readyItems.reduce((acc, item) => {
    if (!acc[item.tableNumber]) acc[item.tableNumber] = [];
    acc[item.tableNumber].push(item);
    return acc;
  }, {} as Record<number, ReadyItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center text-stone-500 font-sans">
        <Utensils size={40} className="animate-bounce mb-3 text-orange-500" />
        <p className="font-bold text-xs uppercase tracking-widest">
          Syncing Waiter Copilot...
        </p>
      </div>
    );
  }

  const hasItemsToConfirm = tableOrders.some(
    (item) => item.status === "waiting_confirmation"
  );
  const allItemsReadyOrServed =
    tableOrders.length > 0 &&
    tableOrders.every(
      (item) => item.status === "ready" || item.status === "served"
    );
  const isSelectedTableParcel = selectedTable !== null && selectedTable > 100;

  const isModalBilled = activeSessionStatus?.startsWith("billed");
  const modalBilledMethod = activeSessionStatus?.includes("_")
    ? activeSessionStatus.split("_")[1]
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 pb-28 font-sans selection:bg-orange-500/20">
      
      {/* Top Header */}
      <header className="bg-white px-5 py-4 shadow-2xs border-b border-stone-200/80 sticky top-0 z-20 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-stone-900 leading-none">
              {activeTab === "tasks" ? "Runner Delivery Tasks" : "Floor Layout"}
            </h1>
            {activeTab === "tasks" && readyItems.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {readyItems.length} Ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {activeTab === "tasks" ? "Serve freshly plated dishes" : "Monitor all active diners"}
            </p>
            {currentStaff?.name && (
              <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-bold">
                Logged as: {currentStaff.name} ({currentStaff.employeeId})
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-500 hover:text-rose-600 transition"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 max-w-lg mx-auto w-full">
        
        {/* TAB 1: RUNNER TASKS (With Chef attribution) */}
        {activeTab === "tasks" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-lg font-black text-stone-900">All Plated Items Served!</h2>
                <p className="text-stone-500 text-xs mt-1 max-w-xs">
                  Kitchen display has no pending dishes awaiting pickup.
                </p>
              </div>
            ) : (
              Object.entries(groupedTasks).map(([tableNum, items]) => {
                const isParcel = Number(tableNum) > 100;
                return (
                  <div
                    key={tableNum}
                    className={`bg-white rounded-3xl p-5 border shadow-2xs ${
                      isParcel ? "border-purple-200" : "border-stone-200/80"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${
                            isParcel ? "bg-purple-600" : "bg-orange-600"
                          }`}
                        >
                          {isParcel ? <ShoppingBag size={18} /> : tableNum}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-stone-900 leading-tight">
                            {isParcel ? `Takeaway #${Number(tableNum) - 100}` : `Table #${tableNum}`}
                          </h3>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={11} /> Food Plated
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center gap-3 bg-[#faf9f6] p-3 rounded-2xl border border-stone-200/60"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="font-black text-base text-stone-900">
                              {item.quantity}×
                            </span>
                            <div>
                              <p className="font-bold text-xs text-stone-900 leading-tight">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {!isParcel && (
                                  <span className="text-[10px] font-bold text-stone-400">
                                    Round #{item.serveNumber}
                                  </span>
                                )}
                                {item.chefName && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                                    <ChefHat size={10} /> Cooked by {item.chefName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => markAsServed(item.id)}
                            className={`px-3 py-2 text-white rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition shadow-xs cursor-pointer ${
                              isParcel
                                ? "bg-purple-600 hover:bg-purple-700"
                                : "bg-stone-900 hover:bg-black"
                            }`}
                          >
                            <CheckCircle2 size={15} />
                            <span>Served</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: FLOOR PLAN GRID (With Waiter monitoring & Claim action) */}
        {activeTab === "tables" && (
          <div className="animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-3">
              {floorTables.map((table) => {
                const isParcel = table.number > 100;
                const isBilled = table.sessionStatus?.startsWith("billed");
                const isAssignedToMe = table.assignedWaiter && currentStaff?.employeeId === table.assignedWaiter.employeeId;

                return (
                  <div
                    key={table.number}
                    onClick={() => viewTableDetails(table.number, table.isOccupied)}
                    className={`relative aspect-square rounded-3xl flex flex-col items-center justify-between border-2 transition-all cursor-pointer p-2 ${
                      table.hasOutOfStock
                        ? "bg-rose-50 border-rose-600 shadow-lg shadow-rose-500/20 animate-pulse"
                        : table.hasUnconfirmed
                        ? "bg-blue-50 border-blue-500 shadow-md shadow-blue-500/10 animate-pulse"
                        : table.needsHelp
                        ? "bg-rose-50 border-rose-500 animate-pulse"
                        : isBilled
                        ? "bg-rose-50/60 border-rose-500 shadow-sm"
                        : table.isOccupied
                        ? "bg-amber-50/50 border-amber-300 shadow-2xs"
                        : "bg-white border-stone-200/60 opacity-50 cursor-default"
                    }`}
                  >
                    {/* Out of Stock Alert Badge */}
                    {table.hasOutOfStock && (
                      <div className="absolute -top-2 -left-2 bg-rose-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-bounce z-10">
                        <AlertCircle size={10} />
                        <span>OOS!</span>
                      </div>
                    )}

                    {/* Billed indicator badge */}
                    {isBilled && (
                      <div className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full shadow-md">
                        <Receipt size={12} />
                      </div>
                    )}

                    {/* Waiter assignment badge at top */}
                    {table.isOccupied && (
                      <div className="w-full flex justify-center">
                        {table.assignedWaiter ? (
                          <span
                            className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md truncate max-w-full ${
                              isAssignedToMe
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-purple-100 text-purple-700 border border-purple-200"
                            }`}
                            title={`Waiter: ${table.assignedWaiter.name}`}
                          >
                            {isAssignedToMe ? "You" : table.assignedWaiter.name.split(" ")[0]}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => claimTable(e, table.number)}
                            className="text-[8px] font-black uppercase text-stone-500 bg-white/80 hover:bg-stone-900 hover:text-white px-1.5 py-0.5 rounded-md border border-stone-200 transition"
                            title="Click to claim table"
                          >
                            + Claim
                          </button>
                        )}
                      </div>
                    )}

                    {isParcel ? (
                      <ShoppingBag
                        size={22}
                        className={
                          table.hasUnconfirmed
                            ? "text-blue-600 my-auto"
                            : isBilled
                            ? "text-rose-600 my-auto"
                            : table.needsHelp
                            ? "text-rose-600 my-auto"
                            : table.isOccupied
                            ? "text-purple-600 my-auto"
                            : "text-stone-300 my-auto"
                        }
                      />
                    ) : (
                      <span
                        className={`text-2xl font-black my-auto ${
                          table.hasUnconfirmed
                            ? "text-blue-600"
                            : isBilled
                            ? "text-rose-600"
                            : table.needsHelp
                            ? "text-rose-600"
                            : table.isOccupied
                            ? "text-stone-900"
                            : "text-stone-300"
                        }`}
                      >
                        {table.number}
                      </span>
                    )}

                    {table.needsHelp ? (
                      <button
                        onClick={(e) => attendTable(e, table.number)}
                        className="mb-1 bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-xs active:scale-90"
                      >
                        <Hand size={10} /> Attend
                      </button>
                    ) : (
                      <span
                        className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${
                          isBilled
                            ? "text-rose-600 font-extrabold"
                            : table.hasUnconfirmed
                            ? "text-blue-600 font-extrabold"
                            : table.isOccupied
                            ? "text-amber-700"
                            : "text-stone-300"
                        }`}
                      >
                        {isBilled
                          ? "Bill Due"
                          : isParcel
                          ? `Token ${table.number - 100}`
                          : table.hasUnconfirmed
                          ? "New Items"
                          : table.isOccupied
                          ? "Active"
                          : "Vacant"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Table Details & Items Verification Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-8 duration-200">
            
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-stone-100">
              <div>
                <h2 className="text-2xl font-black text-stone-900 leading-tight">
                  {isSelectedTableParcel
                    ? `Parcel #${selectedTable - 100}`
                    : `Table #${selectedTable}`}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${
                    isModalBilled ? "text-rose-500" : "text-stone-400"
                  }`}>
                    {isModalBilled ? "Bill Requested Status" : "Verify & Confirm Order"}
                  </p>
                  {selectedTableWaiter ? (
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.2 rounded-md font-bold">
                      Waiter: {selectedTableWaiter.name}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => claimTable(e, selectedTable)}
                      className="text-[10px] bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-700 px-2 py-0.2 rounded-md font-black transition"
                    >
                      + Assign to Me
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {/* Quick Remove All Out-of-Stock Banner */}
              {!isModalLoading && tableOrders.some((i) => i.status === "out_of_stock" || i.isOutOfStock) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    <span className="text-xs font-bold text-rose-900 leading-tight">
                      Kitchen flagged out-of-stock items on this table.
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const oosItems = tableOrders.filter((i) => i.status === "out_of_stock" || i.isOutOfStock);
                      await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: oosItems.map((i) => ({ id: i.id, action: "delete" })),
                          tableNumber: selectedTable,
                        }),
                      });
                      oosItems.forEach((i) => handleDeleteItem(i.id));
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition shrink-0 active:scale-95 shadow-xs cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Remove All OOS</span>
                  </button>
                </div>
              )}

              {isModalLoading ? (
                <div className="py-12 flex flex-col items-center text-stone-300">
                  <ChefHat size={36} className="animate-bounce mb-2" />
                  <p className="font-bold text-xs uppercase tracking-wider">Syncing table items...</p>
                </div>
              ) : tableOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-stone-400 text-xs font-bold uppercase mb-4">No active dishes</p>
                  <button
                    onClick={handleClearEmptyTable}
                    className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 mx-auto"
                  >
                    <Trash2 size={14} /> Clear Vacant Session
                  </button>
                </div>
              ) : (
                tableOrders.map((item) => {
                  const isOOS = item.status === "out_of_stock" || item.isOutOfStock;
                  return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-colors ${
                          isOOS
                            ? "bg-rose-50 border-rose-300 shadow-xs"
                            : item.status === "waiting_confirmation"
                            ? "bg-blue-50/60 border-blue-200"
                            : "bg-[#faf9f6] border-stone-200/60"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className={`font-black text-xs leading-snug ${isOOS ? "text-rose-700 line-through" : "text-stone-900"}`}>{item.name}</p>
                              {item.status === "waiting_confirmation" && (
                                <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">
                                  New
                                </span>
                              )}
                              {isOOS && (
                                <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md font-black uppercase">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] font-bold uppercase mt-0.5 ${isOOS ? "text-rose-500" : "text-stone-400"}`}>
                              {!isSelectedTableParcel && `Serve #${item.serve} • `}
                              {isOOS ? "Kitchen Alert: Marked Out of Stock" : `Status: ${item.status.replace("_", " ")}`}
                            </p>
                          </div>

                      <div className="flex items-center gap-2">
                        {/* Remove button for Out of Stock or Unconfirmed items */}
                        {!isModalBilled &&
                          (isOOS || item.status === "waiting_confirmation" || item.status === "pending") && (
                            <button
                              onClick={async () => {
                                await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    items: [{ id: item.id, action: "delete" }],
                                    tableNumber: selectedTable,
                                  }),
                                });
                                handleDeleteItem(item.id);
                              }}
                              className={isOOS
                                ? "bg-rose-100 hover:bg-rose-200 text-rose-700 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs border border-rose-200"
                                : "text-stone-300 hover:text-rose-600 p-1 transition cursor-pointer"}
                              title={isOOS ? "Remove Out of Stock item from order" : "Delete item"}
                            >
                              <Trash2 size={isOOS ? 13 : 15} />
                              {isOOS && <span>Remove</span>}
                            </button>
                          )}

                        {!isModalBilled && item.status === "waiting_confirmation" ? (
                          <div className="flex items-center bg-white rounded-xl border border-stone-200 p-0.5">
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="p-1 text-stone-600 hover:bg-stone-50 rounded"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center font-black text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="p-1 text-stone-600 hover:bg-stone-50 rounded"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="bg-stone-100 text-stone-800 text-xs font-black px-2.5 py-1 rounded-xl">
                            {item.quantity}×
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                })
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-stone-100 space-y-2">
              {hasItemsToConfirm && tableOrders.length > 0 && !isModalBilled && (
                <button
                  onClick={handleConfirmAndSend}
                  className="w-full bg-stone-900 hover:bg-black text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Confirm & Send to Kitchen</span>
                  <ChevronRight size={16} />
                </button>
              )}

              {allItemsReadyOrServed && tableOrders.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="w-1/3 bg-stone-100 text-stone-700 py-3 rounded-2xl font-bold text-xs"
                  >
                    Back
                  </button>

                  {isModalBilled ? (
                    <button
                      disabled
                      className="w-2/3 bg-emerald-100 text-emerald-800 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <CheckCircle2 size={16} />
                      <span>{modalBilledMethod ? `Billed (${modalBilledMethod.toUpperCase()})` : "Bill Requested"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-2xl font-black text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Receipt size={16} />
                      <span>Request Bill</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Payment Selection Dialog */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-stone-900 text-center mb-1">
              Select Customer Payment
            </h3>
            <p className="text-xs text-stone-500 text-center mb-5">
              Choose the payment channel preferred by the diner.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => executeBillRequest("upi")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-purple-500 hover:bg-purple-50 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone size={18} className="text-purple-600" />
                  <span className="font-black text-xs text-stone-900">UPI / QR Code</span>
                </div>
                <span className="text-[10px] font-bold text-purple-600">Select →</span>
              </button>

              <button
                onClick={() => executeBillRequest("card")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-blue-500 hover:bg-blue-50 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard size={18} className="text-blue-600" />
                  <span className="font-black text-xs text-stone-900">Card Terminal</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Select →</span>
              </button>

              <button
                onClick={() => executeBillRequest("cash")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <IndianRupee size={18} className="text-emerald-600" />
                  <span className="font-black text-xs text-stone-900">Cash Payment</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Select →</span>
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-4 py-2 text-stone-400 hover:text-stone-700 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Fixed Navigation Switcher */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200/80 px-6 py-2.5 shadow-lg z-30">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center py-1 px-4 rounded-xl transition ${
              activeTab === "tasks" ? "text-orange-600" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <div className="relative mb-1">
              <BellRing size={20} strokeWidth={activeTab === "tasks" ? 2.5 : 2} />
              {readyItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Runner Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab("tables")}
            className={`flex flex-col items-center py-1 px-4 rounded-xl transition ${
              activeTab === "tables" ? "text-orange-600" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            <div className="mb-1">
              <LayoutGrid size={20} strokeWidth={activeTab === "tables" ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Floor Plan</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
