"use client";

import { useState, useEffect, useRef } from "react";
import { ChefHat, Clock, Flame, CheckCircle, LayoutGrid, X, List, Grip, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface KitchenItem {
  id: string; 
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "preparing" | "ready" | "served" | "waiting_confirmation";
  category: string; 
}

interface KitchenTicket {
  serveId: string;
  tableNumber: number;
  serveNumber: number;
  orderTime: string; // Assuming ISO string from DB
  items: KitchenItem[];
}

export default function KitchenDashboard() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"tickets" | "allday">("tickets");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Track previous ticket count for audio alerts
  const prevTicketCount = useRef(0);

  const stations = ["All", "Veg Starters", "Non Veg Starters", "Breads", "Rices/Noodles", "Desserts"];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  // 1. Shift Expiry Logic
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const now = new Date().getTime();

    if (role !== "kitchen" || !expiry || now > parseInt(expiry)) {
      localStorage.clear();
      router.push("/login");
    }
  }, [router]);

  // 2. Fetch Orders & Audio Ping
  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/kitchen/orders`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);

        // Play audio if NEW tickets arrived
        if (data.tickets.length > prevTicketCount.current) {
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
  }, []);

  // 3. Live Timer Ticker (updates every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playAudioAlert = () => {
    // Note: You need to put a "ding.mp3" in your frontend/public folder!
    const audio = new Audio('/ding.mp3'); 
    audio.play().catch(e => console.log("Audio play blocked by browser until user interacts"));
  };

  // 4. Update Status Logic
  const advanceStatus = async (itemId: string, currentStatus: string) => {
    let newStatus = "";
    if (currentStatus === "pending") newStatus = "preparing";
    else if (currentStatus === "preparing") newStatus = "ready";
    else return; 

    // Optimistic UI Update
    setTickets((prev) =>
      prev.map((ticket) => ({
        ...ticket,
        items: ticket.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus as any } : item
        ),
      }))
    );

    try {
      await fetch(`${apiUrl}/admin/kitchen/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update item status", err);
    }
  };

  // Bulk update for All-Day view
  const advanceBulkStatus = async (itemIds: string[], currentStatus: string) => {
    // We execute the standard advanceStatus for every ID in the batch
    await Promise.all(itemIds.map(id => advanceStatus(id, currentStatus)));
  };

  const markOutOfStock = async (itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.filter((i) => i.id !== itemId),
      })).filter((t) => t.items.length > 0)
    );

    try {
      await fetch(`${apiUrl}/admin/kitchen/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "waiting_confirmation" }),
      });
    } catch (err) {
      console.error("Failed to mark out of stock", err);
      fetchKitchenOrders(); 
    }
  };

  // 5. Helpers for Timers & Urgency
  // 5. Helpers for Timers & Urgency
  const getTicketUrgency = (orderTime: string) => {
    // 🔥 FIX: Force the browser to parse the DB time as UTC by adding 'Z'
    const safeTimeString = orderTime.replace(" ", "T") + (orderTime.includes("Z") ? "" : "Z");
    const orderDate = new Date(safeTimeString);
    
    if (isNaN(orderDate.getTime())) return { bg: "bg-slate-800", text: "text-slate-300", label: "00:00", ring: "border-slate-700" };

    const diffMs = currentTime.getTime() - orderDate.getTime();
    
    // Prevent negative numbers if the server clock is a few seconds ahead of the laptop
    const safeDiffMs = Math.max(0, diffMs); 
    
    const diffMins = Math.floor(safeDiffMs / 60000);
    const diffSecs = Math.floor((safeDiffMs % 60000) / 1000);
    const timeLabel = `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;

    if (diffMins >= 20) return { bg: "bg-red-950/80 animate-pulse", text: "text-red-400", label: timeLabel, ring: "border-red-500/50" };
    if (diffMins >= 10) return { bg: "bg-yellow-900/40", text: "text-yellow-400", label: timeLabel, ring: "border-yellow-500/50" };
    
    return { bg: "bg-slate-800", text: "text-slate-300", label: timeLabel, ring: "border-slate-700" };
  };

  // 6. Data Filtering
  const filteredTickets = tickets
    .map((ticket) => ({
      ...ticket,
      items: activeStation === "All" ? ticket.items : ticket.items.filter((i) => i.category === activeStation),
    }))
    .filter((ticket) => ticket.items.length > 0);

  // 7. Calculate "All Day" Totals
  const getAllDayTotals = () => {
    const totals: Record<string, { totalQuantity: number; destinations: string[]; idsToUpdate: string[]; status: string }> = {};

    filteredTickets.forEach(ticket => {
      ticket.items.forEach(item => {
        if (item.status === "pending" || item.status === "preparing") {
          if (!totals[item.name]) {
            totals[item.name] = { totalQuantity: 0, destinations: [], idsToUpdate: [], status: item.status };
          }
          totals[item.name].totalQuantity += item.quantity;
          totals[item.name].destinations.push(`T${ticket.tableNumber} (${item.quantity})`);
          totals[item.name].idsToUpdate.push(item.id);
          
          // If at least one is preparing, mark the whole batch as preparing
          if (item.status === "preparing") totals[item.name].status = "preparing";
        }
      });
    });
    return totals;
  };

  const allDayData = getAllDayTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <ChefHat size={64} className="animate-bounce mb-4 text-orange-500" />
        <p className="font-black text-2xl tracking-widest uppercase">Firing Up KDS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans selection:bg-orange-500/30">
      
      {/* KDS Header - Dark Mode Optimized */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
            <ChefHat size={32} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">Kitchen Display</h1>
            <p className="text-slate-400 font-bold mt-1 tracking-wide">STATION: {activeStation.toUpperCase()}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Station Filters */}
          <div className="flex gap-2 overflow-x-auto w-full xl:w-auto pb-2 sm:pb-0 no-scrollbar">
            {stations.map((station) => (
              <button
                key={station}
                onClick={() => setActiveStation(station)}
                className={`px-5 py-3 rounded-xl font-black text-sm whitespace-nowrap transition-all border-2 ${
                  activeStation === station
                    ? "bg-orange-500 border-orange-500 text-slate-950 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border-2 border-slate-800 shrink-0">
            <button 
              onClick={() => setViewMode("tickets")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${viewMode === "tickets" ? "bg-slate-800 text-white shadow-md" : "text-slate-500"}`}
            >
              <Grip size={18} /> Tickets
            </button>
            <button 
              onClick={() => setViewMode("allday")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${viewMode === "allday" ? "bg-slate-800 text-white shadow-md" : "text-slate-500"}`}
            >
              <List size={18} /> All-Day
            </button>
          </div>
        </div>
      </header>

      {/* ========================================= */}
      {/* VIEW 1: KANBAN TICKET VIEW (By Table) */}
      {/* ========================================= */}
      {viewMode === "tickets" && (
        <div className="flex flex-wrap items-start gap-4 pb-12">
          {filteredTickets.length === 0 ? (
            <div className="w-full py-24 flex flex-col items-center text-slate-600">
              <CheckCircle size={80} className="mb-4 opacity-20" />
              <h2 className="text-3xl font-black uppercase tracking-widest">Queue Clear</h2>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const urgency = getTicketUrgency(ticket.orderTime);

              return (
                <div key={ticket.serveId} className={`bg-slate-900 rounded-2xl shadow-xl flex flex-col w-full md:w-[calc(50%-8px)] xl:w-[calc(33.333%-11px)] 2xl:w-[calc(25%-12px)] max-h-[80vh] border-2 ${urgency.ring} overflow-hidden`}>
                  
                  {/* Ticket Header (Color Coded by Time) */}
                  <div className={`${urgency.bg} p-4 flex justify-between items-center border-b ${urgency.ring}`}>
                    <div>
                      <h2 className="text-3xl font-black text-white leading-none">Tbl {ticket.tableNumber}</h2>
                      <p className="text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Serve {ticket.serveNumber}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-2 rounded-lg border border-white/10">
                      <Clock size={18} className={urgency.text} />
                      <span className={`text-lg font-black tracking-widest ${urgency.text}`}>{urgency.label}</span>
                    </div>
                  </div>

                  {/* Items List (Fat Fingers UI) */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {ticket.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => advanceStatus(item.id, item.status)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
                          item.status === "pending" 
                            ? "bg-slate-800 border-slate-700 hover:border-slate-500" 
                            : item.status === "preparing"
                            ? "bg-orange-950/40 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                            : "bg-green-950/20 border-green-900/50 opacity-40 hover:opacity-100"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 items-start">
                            <span className={`text-3xl font-black ${
                               item.status === "pending" ? "text-slate-300" : 
                               item.status === "preparing" ? "text-orange-500" : "text-green-600"
                            }`}>
                              {item.quantity}
                            </span>
                            <div>
                              <h3 className={`text-xl font-bold leading-tight ${
                                 item.status === "ready" ? "line-through text-slate-500" : "text-white"
                              }`}>
                                {item.name}
                              </h3>
                              {/* SCREAMING EXCEPTIONS FOR ALLERGIES/NOTES */}
                              {item.notes && (
                                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                                  <AlertTriangle size={14} strokeWidth={3} />
                                  <span className="text-xs font-black uppercase tracking-wider">
                                    {item.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Large Status Icons */}
                          <div className="shrink-0 mt-1">
                            {item.status === "pending" && <div className="w-8 h-8 rounded-full border-4 border-slate-600"></div>}
                            {item.status === "preparing" && <Flame size={32} className="text-orange-500 animate-pulse" />}
                            {item.status === "ready" && <CheckCircle size={32} className="text-green-500" />}
                          </div>
                        </div>

                        {/* Out of Stock Button (Hidden if Ready) */}
                        {(item.status === "pending" || item.status === "preparing") && (
                          <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                markOutOfStock(item.id);
                              }}
                              className="text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 bg-red-950/30 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <X size={18} strokeWidth={3} /> Mark Out of Stock
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

      {/* ========================================= */}
      {/* VIEW 2: ALL-DAY CONSOLIDATED VIEW */}
      {/* ========================================= */}
      {viewMode === "allday" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          {Object.keys(allDayData).length === 0 ? (
            <div className="col-span-full py-24 flex flex-col items-center text-slate-600">
              <CheckCircle size={80} className="mb-4 opacity-20" />
              <h2 className="text-3xl font-black uppercase tracking-widest">All Prep Finished</h2>
            </div>
          ) : (
            Object.entries(allDayData).map(([dishName, data]) => (
              <div 
                key={dishName} 
                onClick={() => advanceBulkStatus(data.idsToUpdate, data.status)}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 flex flex-col justify-between min-h-50 ${
                  data.status === "pending" 
                    ? "bg-slate-900 border-slate-700 hover:border-slate-500"
                    : "bg-orange-950/40 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-6xl font-black tracking-tighter ${data.status === "preparing" ? "text-orange-500" : "text-white"}`}>
                      {data.totalQuantity}
                    </span>
                    {data.status === "preparing" ? (
                      <Flame size={40} className="text-orange-500 animate-pulse" />
                    ) : (
                      <div className="w-10 h-10 rounded-full border-4 border-slate-600"></div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-wide">
                    {dishName}
                  </h3>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-700/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Going to:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.destinations.map((dest, i) => (
                      <span key={i} className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-700">
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

    </div>
  );
}