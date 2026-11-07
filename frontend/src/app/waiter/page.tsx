"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  BellOff,
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
  Users,
  QrCode,
  Copy,
  Check,
  Sparkles,
  Lock,
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
  isParcel?: boolean;
  paymentStatus?: "paid" | "pending" | "failed" | string;
}

interface TableStatus {
  number: number;
  isOccupied: boolean;
  sharedPartiesCount?: number;
  activeTabs?: { sessionId: string; tabName: string; status: string }[];
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

interface TabInfo {
  sessionId: string;
  tabName: string;
  status: string;
  assignedWaiter?: { id: string; name: string; employeeId: string } | null;
}

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "tables">("tasks");
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const [floorTables, setFloorTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStatus, setActiveSessionStatus] = useState<string | null>(null);
  const [activeTabName, setActiveTabName] = useState<string>("Main");
  const [availableTabs, setAvailableTabs] = useState<TabInfo[]>([]);
  const [selectedTableWaiter, setSelectedTableWaiter] = useState<{ id: string; name: string; employeeId: string } | null>(null);
  const [tableOrders, setTableOrders] = useState<OrderSummaryItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Sub-Tab Creation State
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  // Method B: Dynamic Guest QR State
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Method A: Waiter Mini-POS State
  const [showMiniPosModal, setShowMiniPosModal] = useState(false);
  const [menuItems, setMenuItems] = useState<{ id: number; name: string; price: number; category: string }[]>([]);
  const [miniPosCart, setMiniPosCart] = useState<{ menuItemId: number; name: string; price: number; quantity: number }[]>([]);
  const [posCategoryFilter, setPosCategoryFilter] = useState("All");
  const [posSearch, setPosSearch] = useState("");
  const [isSubmittingPosOrder, setIsSubmittingPosOrder] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Current waiter credentials
  const [currentStaff, setCurrentStaff] = useState<{ id: string; name: string; employeeId: string } | null>(null);

  // Audio Notification State & Refs (Default muted to adhere to browser autoplay policy)
  const [isMuted, setIsMuted] = useState(true);
  const prevUnconfirmedOrders = useRef(0);
  const prevReadyTasks = useRef(0);
  const prevBillRequests = useRef(0);
  const isInitialMount = useRef(true);

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

  const viewTableDetails = async (tableNum: number, isOccupied: boolean, targetSessionId?: string) => {
    if (!isOccupied) return;
    setSelectedTable(tableNum);
    setIsModalLoading(true);
    try {
      const query = targetSessionId ? `?sessionId=${targetSessionId}&t=${Date.now()}` : `?t=${Date.now()}`;
      const res = await fetch(
        `${apiUrl}/admin/waiter/table-details/${tableNum}${query}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setTableOrders(data.items);
        setActiveSessionId(data.sessionId);
        setActiveSessionStatus(data.sessionStatus);
        setActiveTabName(data.tabName || "Main");
        setAvailableTabs(data.availableTabs || []);
        setSelectedTableWaiter(data.assignedWaiter || null);
      }
    } catch (err) {
    } finally {
      setIsModalLoading(false);
    }
  };

  const pollTableDetails = useCallback(
    async (tableNum: number, targetSessionId?: string | null) => {
      try {
        const query = targetSessionId ? `?sessionId=${targetSessionId}&t=${Date.now()}` : `?t=${Date.now()}`;
        const res = await fetch(
          `${apiUrl}/admin/waiter/table-details/${tableNum}${query}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setActiveSessionId(data.sessionId);
          setActiveSessionStatus(data.sessionStatus);
          setActiveTabName(data.tabName || "Main");
          setAvailableTabs(data.availableTabs || []);
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

  const handleCreateSubTab = async () => {
    if (!selectedTable || isCreatingParty) return;
    setIsCreatingParty(true);
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/create-sub-tab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: selectedTable,
          tabName: newPartyName.trim() || undefined,
          waiterId: currentStaff?.id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewPartyName("");
        setIsAddPartyModalOpen(false);
        await fetchFloorPlan();
        await viewTableDetails(selectedTable, true, data.sessionId);
      }
    } catch (err) {
      console.error("Create sub-tab error:", err);
    } finally {
      setIsCreatingParty(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch(`${apiUrl}/menu/items`);
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.menuItems || []);
      }
    } catch (err) {}
  };

  const handlePunchMiniPosOrder = async () => {
    if (!activeSessionId || !selectedTable || miniPosCart.length === 0 || isSubmittingPosOrder) return;
    setIsSubmittingPosOrder(true);
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/punch-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          tableNumber: selectedTable,
          waiterId: currentStaff?.id || null,
          items: miniPosCart.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      if (res.ok) {
        setShowMiniPosModal(false);
        setMiniPosCart([]);
        await viewTableDetails(selectedTable, true, activeSessionId);
        await fetchFloorPlan();
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to punch order:", err);
    } finally {
      setIsSubmittingPosOrder(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchFloorPlan();
    const interval = setInterval(() => {
      fetchTasks();
      fetchFloorPlan();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchFloorPlan]);

  // Audio Notification Triggers (New Orders, Ready Runner Tasks, Bill Requests)
  useEffect(() => {
    const currentUnconfirmed = floorTables.filter((t) => t.hasUnconfirmed).length;
    const currentReady = readyItems.length;
    const currentBills = floorTables.filter(
      (t) => t.sessionStatus?.startsWith("billed") || t.needsHelp
    ).length;

    // Skip first load to avoid false alarm ding on page open
    if (isInitialMount.current) {
      if (floorTables.length > 0 || readyItems.length > 0) {
        prevUnconfirmedOrders.current = currentUnconfirmed;
        prevReadyTasks.current = currentReady;
        prevBillRequests.current = currentBills;
        isInitialMount.current = false;
      }
      return;
    }

    let playSound = false;

    // Trigger 1: Customer placed a new order (Needs Confirmation)
    if (currentUnconfirmed > prevUnconfirmedOrders.current) playSound = true;

    // Trigger 2: Kitchen marked food as Ready (Runner Task)
    if (currentReady > prevReadyTasks.current) playSound = true;

    // Trigger 3: Customer requested the bill
    if (currentBills > prevBillRequests.current) playSound = true;

    // Play ding sound if a trigger fired and sound is unmuted
    if (playSound && !isMuted) {
      const audio = new Audio("/ding.mp3");
      audio.play().catch((err) => console.log("Browser blocked audio playback", err));
    }

    // Update refs for next poll
    prevUnconfirmedOrders.current = currentUnconfirmed;
    prevReadyTasks.current = currentReady;
    prevBillRequests.current = currentBills;
  }, [floorTables, readyItems, isMuted]);

  useEffect(() => {
    if (selectedTable !== null) {
      const modalInterval = setInterval(() => pollTableDetails(selectedTable, activeSessionId), 3000);
      return () => clearInterval(modalInterval);
    }
  }, [selectedTable, activeSessionId, pollTableDetails]);

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
          sessionId: activeSessionId,
          paymentMethod: method,
          waiterId: currentStaff?.id || null
        }),
      });
      if (res.ok) {
        const billedStatus = `billed_${method}`;
        setActiveSessionStatus(billedStatus);
        fetchFloorPlan();
        if (selectedTable) {
          pollTableDetails(selectedTable, activeSessionId);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Failed to request bill for this table");
      }
    } catch (err) {
      console.error("Execute bill request error:", err);
    }
  };

  const markAsServed = async (itemId: string) => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "served" }),
      });
      if (res.ok) {
        setReadyItems((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Cannot handover item. Please verify payment.");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to update item status", err);
      fetchTasks();
    }
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

        <div className="flex items-center gap-2">
          {/* Mute Toggle Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isMuted
                ? "bg-stone-100 text-stone-500 hover:bg-stone-200"
                : "bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs"
            }`}
            title={isMuted ? "Click to enable sound alerts" : "Click to mute sound alerts"}
          >
            {isMuted ? <BellOff size={16} /> : <Bell size={16} className="text-orange-600 animate-bounce" />}
            <span>{isMuted ? "Alerts Muted" : "Alerts On"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-500 hover:text-rose-600 transition cursor-pointer"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
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

                      {isParcel ? (
                        items.every((i) => i.paymentStatus === "paid") ? (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={11} /> Paid • Handover Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <Lock size={11} /> Unpaid • Hold at Counter
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={11} /> Food Plated
                        </span>
                      )}
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

                          {/* Digital Gatekeeper Action */}
                          {isParcel ? (
                            item.paymentStatus === "paid" ? (
                              <button
                                onClick={() => markAsServed(item.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition shadow-sm shadow-emerald-600/20 cursor-pointer"
                              >
                                <CheckCircle2 size={14} />
                                <span>Paid - Handover</span>
                              </button>
                            ) : (
                              <div
                                className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 opacity-80 cursor-not-allowed select-none shadow-2xs"
                                title="Payment is pending at the billing counter. Cannot handover parcel."
                              >
                                <Lock size={13} className="text-rose-500" />
                                <span>Unpaid - Hold</span>
                              </div>
                            )
                          ) : (
                            <button
                              onClick={() => markAsServed(item.id)}
                              className="bg-stone-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 size={14} />
                              <span>Serve to Table</span>
                            </button>
                          )}
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

                    {/* Shared Parties Indicator Badge */}
                    {Boolean(table.sharedPartiesCount && table.sharedPartiesCount > 1 && !table.hasOutOfStock) && (
                      <div
                        className="absolute -top-1.5 -left-1.5 bg-purple-700 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-md z-10 flex items-center gap-0.5"
                        title={`${table.sharedPartiesCount} shared parties at this table`}
                      >
                        <Users size={9} />
                        <span>{table.sharedPartiesCount}P</span>
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

            {/* Virtual Sub-Tab Switcher & Sharing Controls */}
            {!isSelectedTableParcel && (
              <div className="mb-3.5 pb-2.5 border-b border-stone-100">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {availableTabs.map((tab) => {
                      const isActive = tab.sessionId === activeSessionId;
                      return (
                        <button
                          key={tab.sessionId}
                          onClick={() => viewTableDetails(selectedTable, true, tab.sessionId)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          <Users size={12} />
                          <span>{tab.tabName}</span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setIsAddPartyModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition whitespace-nowrap flex items-center gap-1 cursor-pointer"
                      title="Add a separate shared party to this table"
                    >
                      <UserPlus size={12} />
                      <span>+ Shared Party</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tab Action Quick Bar: Method A (Mini-POS) & Method B (Guest QR) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowMiniPosModal(true);
                      setMiniPosCart([]);
                      fetchMenuItems();
                    }}
                    className="flex-1 py-1.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Utensils size={13} />
                    <span>Punch Order (Mini-POS)</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                    title="Show temporary QR code for guests of this party to scan"
                  >
                    <QrCode size={13} />
                    <span>Guest QR</span>
                  </button>
                </div>
              </div>
            )}

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
                      try {
                        await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            items: oosItems.map((i) => ({ id: i.id, action: "delete" })),
                            tableNumber: selectedTable,
                          }),
                        });
                        const oosIds = new Set(oosItems.map((i) => i.id));
                        setTableOrders((prev) => prev.filter((item) => !oosIds.has(item.id)));
                        fetchFloorPlan();
                      } catch (err) {}
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
                        {(isOOS || (!isModalBilled && (item.status === "waiting_confirmation" || item.status === "pending"))) && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    items: [{ id: item.id, action: "delete" }],
                                    tableNumber: selectedTable,
                                  }),
                                });
                                setTableOrders((prev) => prev.filter((i) => i.id !== item.id));
                                fetchFloorPlan();
                              } catch (err) {}
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

              {isModalBilled ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="w-1/3 bg-stone-100 text-stone-700 py-3 rounded-2xl font-bold text-xs hover:bg-stone-200 transition"
                  >
                    Back
                  </button>
                  <div className="w-2/3 bg-emerald-100 border border-emerald-300 text-emerald-800 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>{modalBilledMethod ? `Billed (${modalBilledMethod.toUpperCase()})` : "Bill Requested"}</span>
                  </div>
                </div>
              ) : tableOrders.length > 0 && !hasItemsToConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="w-1/3 bg-stone-100 text-stone-700 py-3 rounded-2xl font-bold text-xs hover:bg-stone-200 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-2xl font-black text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                  >
                    <Receipt size={16} />
                    <span>Request Bill</span>
                  </button>
                </div>
              ) : null}
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

      {/* 1. Add Shared Party Modal */}
      {isAddPartyModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900 leading-tight">
                  Add Shared Party
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Table #{selectedTable} • Spawn a separate virtual tab
                </p>
              </div>
              <button
                onClick={() => setIsAddPartyModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 my-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Party Identifier / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue Shirt, Couple by Window, Party B"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-purple-500 transition"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed bg-purple-50 p-2.5 rounded-xl border border-purple-100">
                This creates an independent sub-tab with its own orders and check, keeping Group A&apos;s bill completely separate.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsAddPartyModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-stone-100 text-stone-600 font-black text-xs hover:bg-stone-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubTab}
                disabled={isCreatingParty}
                className="flex-[2] py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCreatingParty ? (
                  <span>Creating Tab...</span>
                ) : (
                  <>
                    <Users size={14} />
                    <span>Create Sub-Tab</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dynamic Guest QR Code Modal (Method B) */}
      {showQrModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 p-4 transition-opacity">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 text-center">
            <div className="flex justify-between items-start mb-3">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                  Party Sub-Tab: {activeTabName}
                </span>
                <h3 className="text-lg font-black text-stone-900 leading-tight mt-1">
                  Table #{selectedTable} Guest QR
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setCopiedLink(false);
                }}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4 text-left">
              Hold this screen out for the new guests to scan. They will order directly into their private party tab.
            </p>

            {/* QR Code Container */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 inline-block mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/customer/menu?table=${selectedTable}&session=${activeSessionId}`
                    : ""
                )}`}
                alt="Guest Sub-Tab QR Code"
                className="w-48 h-48 rounded-xl mx-auto shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    const guestUrl = `${window.location.origin}/customer/menu?table=${selectedTable}&session=${activeSessionId}`;
                    navigator.clipboard.writeText(guestUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedLink ? "Link Copied!" : "Copy Guest Link"}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowQrModal(false);
                setCopiedLink(false);
              }}
              className="w-full py-2 text-stone-400 hover:text-stone-700 text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. Waiter Mini-POS Modal (Method A) */}
      {showMiniPosModal && (
        <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-8 duration-200">
            
            {/* Mini-POS Header */}
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-[#faf9f6] rounded-t-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-stone-900 leading-tight">
                    Waiter Mini-POS
                  </h3>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                    Table #{selectedTable} • {activeTabName}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">
                  Punch dishes directly to Kitchen KDS
                </p>
              </div>
              <button
                onClick={() => setShowMiniPosModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mini-POS Search & Category Filter */}
            <div className="p-3 border-b border-stone-100 bg-white space-y-2">
              <input
                type="text"
                placeholder="Search dish name..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition"
              />
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {["All", "Veg Starters", "Non Veg Starters", "Breads", "Rices/Noodles", "Desserts"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPosCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      posCategoryFilter === cat
                        ? "bg-orange-600 text-white shadow-xs"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-stone-100">
              {menuItems
                .filter((item) => {
                  const matchSearch = item.name.toLowerCase().includes(posSearch.toLowerCase());
                  const matchCat = posCategoryFilter === "All" || item.category === posCategoryFilter;
                  return matchSearch && matchCat;
                })
                .map((dish) => {
                  const inCart = miniPosCart.find((c) => c.menuItemId === dish.id);
                  const qty = inCart?.quantity || 0;

                  return (
                    <div key={dish.id} className="pt-2.5 flex justify-between items-center gap-3">
                      <div>
                        <p className="font-black text-xs text-stone-900">{dish.name}</p>
                        <p className="text-[11px] font-bold text-orange-600">₹{dish.price}</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-0.5 border border-stone-200">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => {
                                setMiniPosCart((prev) =>
                                  prev
                                    .map((i) =>
                                      i.menuItemId === dish.id ? { ...i, quantity: i.quantity - 1 } : i
                                    )
                                    .filter((i) => i.quantity > 0)
                                );
                              }}
                              className="p-1 rounded-lg bg-white text-stone-700 hover:bg-stone-200 transition"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-5 text-center text-xs font-black">{qty}</span>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setMiniPosCart((prev) => {
                              const existing = prev.find((i) => i.menuItemId === dish.id);
                              if (existing) {
                                return prev.map((i) =>
                                  i.menuItemId === dish.id ? { ...i, quantity: i.quantity + 1 } : i
                                );
                              }
                              return [
                                ...prev,
                                {
                                  menuItemId: dish.id,
                                  name: dish.name,
                                  price: dish.price,
                                  quantity: 1,
                                },
                              ];
                            });
                          }}
                          className="p-1 rounded-lg bg-white text-stone-700 hover:bg-stone-200 transition"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Punch Action */}
            <div className="p-4 border-t border-stone-200 bg-white flex justify-between items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                  Items to Send
                </span>
                <p className="text-base font-black text-stone-900">
                  {miniPosCart.reduce((sum, i) => sum + i.quantity, 0)} items • ₹
                  {miniPosCart.reduce((sum, i) => sum + i.price * i.quantity, 0)}
                </p>
              </div>

              <button
                onClick={handlePunchMiniPosOrder}
                disabled={miniPosCart.length === 0 || isSubmittingPosOrder}
                className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer ${
                  miniPosCart.length === 0 || isSubmittingPosOrder
                    ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                    : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/25 active:scale-95"
                }`}
              >
                <span>{isSubmittingPosOrder ? "Sending..." : "Send to Kitchen 🚀"}</span>
              </button>
            </div>

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
