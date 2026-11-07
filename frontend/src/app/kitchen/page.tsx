"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChefHat,
  Clock,
  Flame,
  CheckCircle,
  LayoutGrid,
  X,
  List,
  Grip,
  AlertTriangle,
  Volume2,
  VolumeX,
  LogOut,
  ShoppingBag,
  Sparkles,
  User,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface KitchenItem {
  id: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "preparing" | "ready" | "served" | "waiting_confirmation";
  category: string;
  chefName?: string | null;
  chefEmployeeId?: string | null;
  chefId?: string | null;
}

interface KitchenTicket {
  serveId: string;
  tableNumber: number;
  serveNumber: number;
  orderTime: string;
  waiterName?: string | null;
  waiterEmployeeId?: string | null;
  items: KitchenItem[];
}

export default function KitchenDashboard() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"tickets" | "allday">("tickets");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Current chef credentials
  const [currentChef, setCurrentChef] = useState<{ id: string; name: string; employeeId: string } | null>(null);
  
  // Kitchen 86 / Stock Control Modal state
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItems, setStockItems] = useState<{ id: string; name: string; category: string; price: number; isAvailable: boolean }[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("All");
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const prevTicketCount = useRef(0);

  const stations = [
    "All",
    "Veg Starters",
    "Non Veg Starters",
    "Breads",
    "Rices/Noodles",
    "Desserts",
  ];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  // Shift Expiry Logic
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const staffId = localStorage.getItem("staff_id") || "";
    const staffDbId = localStorage.getItem("staff_db_id") || "";
    const staffName = localStorage.getItem("staff_name") || "";
    const now = new Date().getTime();

    if (role !== "kitchen" || !expiry || now > parseInt(expiry)) {
      localStorage.clear();
      router.push("/login");
    } else {
      setCurrentChef({
        id: staffDbId,
        name: staffName,
        employeeId: staffId,
      });
    }
  }, [router]);

  // Fetch Orders & Audio Ping
  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/kitchen/orders`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);

        if (data.tickets.length > prevTicketCount.current && isAudioEnabled) {
          playAudioAlert();
        }
        prevTicketCount.current = data.tickets.length;
      }
    } catch (err) {
      console.error("Failed to fetch kitchen orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000);
    return () => clearInterval(interval);
  }, [isAudioEnabled]);

  // Live Timer Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playAudioAlert = () => {
    try {
      const audio = new Audio("/ding.mp3");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Status updates with Chef tracking
  const advanceStatus = async (itemId: string, currentStatus: string) => {
    let newStatus = "";
    if (currentStatus === "pending") newStatus = "preparing";
    else if (currentStatus === "preparing") newStatus = "ready";
    else return;

    const assignedChefName = currentChef?.name || "Chef";

    // Optimistic UI Update
    setTickets((prev) =>
      prev.map((ticket) => ({
        ...ticket,
        items: ticket.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: newStatus as any,
                chefName: item.chefName || assignedChefName,
              }
            : item
        ),
      }))
    );

    try {
      await fetch(`${apiUrl}/admin/kitchen/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          status: newStatus,
          chefId: currentChef?.id || null,
        }),
      });
    } catch (err) {
      console.error("Failed to update item status", err);
    }
  };

  const advanceBulkStatus = async (itemIds: string[], currentStatus: string) => {
    await Promise.all(itemIds.map((id) => advanceStatus(id, currentStatus)));
  };

  const markOutOfStock = async (itemId: string, menuItemId?: string, dishName?: string) => {
    setTickets((prev) =>
      prev
        .map((t) => ({
          ...t,
          items: t.items.filter((i) => i.id !== itemId),
        }))
        .filter((t) => t.items.length > 0)
    );

    try {
      const res = await fetch(`${apiUrl}/admin/kitchen/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "out_of_stock", menuItemId, dishName }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationToast(data.message || `${dishName || "Dish"} marked Out of Stock. Waiter & Table alerted!`);
        setTimeout(() => setNotificationToast(null), 4000);
      }
    } catch (err) {
      console.error("Failed to mark out of stock", err);
    } finally {
      fetchKitchenOrders();
    }
  };

  const fetchStockItems = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/kitchen/stock`);
      if (res.ok) {
        const data = await res.json();
        setStockItems(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch stock items", err);
    }
  };

  const toggleStockItem = async (menuItemId: string, currentStatus: boolean) => {
    setStockItems((prev) =>
      prev.map((i) => (i.id === menuItemId ? { ...i, isAvailable: !currentStatus } : i))
    );
    try {
      const res = await fetch(`${apiUrl}/admin/kitchen/toggle-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId, isAvailable: !currentStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationToast(data.message);
        setTimeout(() => setNotificationToast(null), 3500);
      }
    } catch (err) {
      console.error("Failed to toggle stock", err);
      fetchStockItems();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const getTicketUrgency = (orderTime: string) => {
    const safeTimeString =
      orderTime.replace(" ", "T") + (orderTime.includes("Z") ? "" : "Z");
    const orderDate = new Date(safeTimeString);

    if (isNaN(orderDate.getTime())) {
      return {
        bg: "bg-zinc-900",
        text: "text-zinc-400",
        label: "00:00",
        ring: "border-zinc-800",
        level: "normal",
      };
    }

    const diffMs = currentTime.getTime() - orderDate.getTime();
    const safeDiffMs = Math.max(0, diffMs);

    const diffMins = Math.floor(safeDiffMs / 60000);
    const diffSecs = Math.floor((safeDiffMs % 60000) / 1000);
    const timeLabel = `${diffMins}:${diffSecs.toString().padStart(2, "0")}`;

    if (diffMins >= 20) {
      return {
        bg: "bg-rose-950/90",
        text: "text-rose-400",
        label: timeLabel,
        ring: "border-rose-600 animate-pulse",
        level: "critical",
      };
    }
    if (diffMins >= 10) {
      return {
        bg: "bg-amber-950/60",
        text: "text-amber-400",
        label: timeLabel,
        ring: "border-amber-500/70",
        level: "warning",
      };
    }

    return {
      bg: "bg-zinc-900",
      text: "text-emerald-400",
      label: timeLabel,
      ring: "border-zinc-800",
      level: "normal",
    };
  };

  // Data Filtering
  const filteredTickets = tickets
    .map((ticket) => ({
      ...ticket,
      items:
        activeStation === "All"
          ? ticket.items
          : ticket.items.filter((i) => i.category === activeStation),
    }))
    .filter((ticket) => ticket.items.length > 0);

  // Consolidated All-Day Prep
  const getAllDayTotals = () => {
    const totals: Record<
      string,
      {
        totalQuantity: number;
        destinations: string[];
        idsToUpdate: string[];
        status: string;
        chefs: string[];
      }
    > = {};

    filteredTickets.forEach((ticket) => {
      ticket.items.forEach((item) => {
        if (item.status === "pending" || item.status === "preparing") {
          if (!totals[item.name]) {
            totals[item.name] = {
              totalQuantity: 0,
              destinations: [],
              idsToUpdate: [],
              status: item.status,
              chefs: [],
            };
          }
          totals[item.name].totalQuantity += item.quantity;
          totals[item.name].destinations.push(
            `T${ticket.tableNumber} (${item.quantity})`
          );
          totals[item.name].idsToUpdate.push(item.id);

          if (item.chefName && !totals[item.name].chefs.includes(item.chefName)) {
            totals[item.name].chefs.push(item.chefName);
          }

          if (item.status === "preparing") totals[item.name].status = "preparing";
        }
      });
    });
    return totals;
  };

  const allDayData = getAllDayTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-sans">
        <ChefHat size={56} className="animate-bounce mb-3 text-orange-500" />
        <h2 className="text-xl font-black uppercase tracking-widest text-zinc-300">
          Initializing Kitchen Display...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 font-sans selection:bg-orange-500/30">
      
      {/* Top KDS Header */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 pb-4 border-b border-zinc-800/80">
        
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center shadow-xs">
            <ChefHat size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                Kitchen KDS
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Live Station
              </span>
              {currentChef?.name && (
                <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                  Chef: {currentChef.name} ({currentChef.employeeId})
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs font-bold mt-0.5">
              Clock: {currentTime.toLocaleTimeString()} • {filteredTickets.length} Active Tickets
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
          
          {/* Station Switchers */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-full">
            {stations.map((st) => (
              <button
                key={st}
                onClick={() => setActiveStation(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer border ${
                  activeStation === st
                    ? "bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-600/20"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setViewMode("tickets")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "tickets" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Grip size={14} />
                <span>Tickets</span>
              </button>
              <button
                onClick={() => setViewMode("allday")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "allday" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <List size={14} />
                <span>All-Day</span>
              </button>
            </div>

            {/* 86 / Stock Control Button */}
            <button
              onClick={() => {
                setIsStockModalOpen(true);
                fetchStockItems();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/40 active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <AlertTriangle size={14} className="text-rose-400" />
              <span>86 Stock Control</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isAudioEnabled
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                  : "bg-rose-950/40 border-rose-900 text-rose-400"
              }`}
              title={isAudioEnabled ? "Sound Enabled" : "Sound Muted"}
            >
              {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-rose-400 transition cursor-pointer"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* VIEW 1: KANBAN TICKETS */}
      {viewMode === "tickets" && (
        <div className="flex flex-wrap items-start gap-4 pb-12">
          {filteredTickets.length === 0 ? (
            <div className="w-full py-28 flex flex-col items-center justify-center text-zinc-600">
              <CheckCircle size={64} className="mb-3 opacity-20 text-emerald-500" />
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-400">
                All Orders Dispatched
              </h2>
              <p className="text-xs text-zinc-600 mt-1">Ready for incoming table orders</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const urgency = getTicketUrgency(ticket.orderTime);
              const isParcel = ticket.tableNumber > 100;

              return (
                <div
                  key={ticket.serveId}
                  className={`bg-zinc-900 rounded-3xl shadow-xl flex flex-col w-full md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] border-2 ${urgency.ring} overflow-hidden`}
                >
                  {/* Ticket Header */}
                  <div className={`${urgency.bg} p-4 flex justify-between items-center border-b border-zinc-800`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg ${
                        isParcel ? "bg-purple-600" : "bg-orange-600"
                      }`}>
                        {isParcel ? <ShoppingBag size={20} /> : ticket.tableNumber}
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-white leading-tight">
                          {isParcel ? `Parcel #${ticket.tableNumber - 100}` : `Table #${ticket.tableNumber}`}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Round #{ticket.serveNumber}
                          </span>
                          {ticket.waiterName && (
                            <span className="text-[9px] font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-800">
                              Waiter: {ticket.waiterName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-950/70 px-3 py-1.5 rounded-xl border border-white/10">
                      <Clock size={14} className={urgency.text} />
                      <span className={`text-sm font-black tracking-wider ${urgency.text}`}>
                        {urgency.label}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-[60vh]">
                    {ticket.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => advanceStatus(item.id, item.status)}
                        className={`w-full p-3.5 rounded-2xl border-2 transition-all cursor-pointer active:scale-98 ${
                          item.status === "pending"
                            ? "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                            : item.status === "preparing"
                            ? "bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-500/10"
                            : "bg-emerald-950/20 border-emerald-900/40 opacity-40 hover:opacity-100"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`text-2xl font-black ${
                                item.status === "pending"
                                  ? "text-zinc-300"
                                  : item.status === "preparing"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {item.quantity}×
                            </span>
                            <div>
                              <h3
                                className={`text-base font-black leading-snug ${
                                  item.status === "ready"
                                    ? "line-through text-zinc-500"
                                    : "text-white"
                                }`}
                              >
                                {item.name}
                              </h3>

                              {/* Which Chef is cooking this dish badge */}
                              {item.chefName && (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-[10px] font-black text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-800/80 flex items-center gap-1">
                                    <ChefHat size={11} /> Chef: {item.chefName}
                                  </span>
                                </div>
                              )}

                              {/* Special Cooking Notes */}
                              {item.notes && (
                                <div className="mt-1.5 inline-flex items-center gap-1 bg-rose-600/90 text-white px-2 py-0.5 rounded-md border border-rose-400 text-[10px] font-black uppercase tracking-wider">
                                  <AlertTriangle size={12} />
                                  <span>{item.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {item.status === "pending" && (
                              <div className="w-7 h-7 rounded-full border-3 border-zinc-700" />
                            )}
                            {item.status === "preparing" && (
                              <Flame size={24} className="text-amber-400 animate-pulse" />
                            )}
                            {item.status === "ready" && (
                              <CheckCircle size={24} className="text-emerald-400" />
                            )}
                          </div>
                        </div>

                        {/* Out of Stock Safety Action */}
                        {(item.status === "pending" || item.status === "preparing") && (
                          <div className="mt-3 pt-2 border-t border-zinc-800/60 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markOutOfStock(item.id, item.menuItemId, item.name);
                              }}
                              className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <X size={13} /> Mark Out of Stock
                            </button>
                          </div>
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

      {/* VIEW 2: ALL-DAY CONSOLIDATED SUMMARY */}
      {viewMode === "allday" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {Object.keys(allDayData).length === 0 ? (
            <div className="col-span-full py-28 flex flex-col items-center justify-center text-zinc-600">
              <CheckCircle size={64} className="mb-3 opacity-20 text-emerald-500" />
              <h2 className="text-xl font-black uppercase tracking-widest text-zinc-400">
                All Prep Queues Cleared
              </h2>
            </div>
          ) : (
            Object.entries(allDayData).map(([dishName, data]) => (
              <div
                key={dishName}
                onClick={() => advanceBulkStatus(data.idsToUpdate, data.status)}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer active:scale-95 flex flex-col justify-between min-h-52 ${
                  data.status === "pending"
                    ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    : "bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-500/10"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-5xl font-black tracking-tight ${
                        data.status === "preparing" ? "text-amber-400" : "text-white"
                      }`}
                    >
                      {data.totalQuantity}×
                    </span>
                    {data.status === "preparing" ? (
                      <Flame size={32} className="text-amber-400 animate-pulse" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-3 border-zinc-700" />
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight uppercase">
                    {dishName}
                  </h3>
                  {data.chefs.length > 0 && (
                    <p className="text-xs font-bold text-amber-400 mt-1">
                      Cooking: {data.chefs.join(", ")}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    Orders for:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.destinations.map((dest, i) => (
                      <span
                        key={i}
                        className="bg-zinc-800 text-zinc-300 text-[11px] font-bold px-2 py-0.5 rounded-md"
                      >
                        {dest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-bold text-xs animate-in slide-in-from-bottom-5">
          <AlertCircle size={16} />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* 86 Stock Control Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" />
                  <span>Kitchen 86 / Stock Management</span>
                </h3>
                <p className="text-[11px] font-bold text-zinc-400 mt-0.5">
                  Toggle dishes Out of Stock instantly. Automatically updates Customer and Management views.
                </p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-white placeholder:text-zinc-600 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {["All", ...Array.from(new Set(stockItems.map((i) => i.category)))].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStockCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer transition ${
                      stockCategoryFilter === cat
                        ? "bg-rose-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Item List */}
            <div className="p-4 overflow-y-auto divide-y divide-zinc-800/60 max-h-[55vh]">
              {stockItems
                .filter((item) => {
                  const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase());
                  const matchesCat = stockCategoryFilter === "All" || item.category === stockCategoryFilter;
                  return matchesSearch && matchesCat;
                })
                .map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-white">{item.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                        {item.category} • ₹{item.price}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleStockItem(item.id, item.isAvailable)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                        item.isAvailable
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/60"
                          : "bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900/60"
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check size={13} />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <X size={13} />
                          <span>Out of Stock</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                Close Stock Control
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
