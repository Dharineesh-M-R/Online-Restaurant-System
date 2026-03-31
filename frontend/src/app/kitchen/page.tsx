"use client";

import { useState, useEffect } from "react";
import { ChefHat, Clock, Flame, CheckCircle, LayoutGrid } from "lucide-react";

// The shape of the data we expect from the backend
interface KitchenItem {
  id: string; // The order_items UUID
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "preparing" | "ready" | "served";
  category: string; // e.g., "Starters", "Main Course"
}

interface KitchenTicket {
  serveId: string;
  tableNumber: number;
  serveNumber: number;
  orderTime: string;
  items: KitchenItem[];
}

export default function KitchenDashboard() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // The active "Station" the tablet is assigned to
  const [activeStation, setActiveStation] = useState<string>("All");

  // These should dynamically match the categories in your categories table
  const stations = ["All", "Starters", "Main Course", "Breads", "Beverages", "Desserts"];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // 1. Fetch live orders from the kitchen API
  const fetchKitchenOrders = async () => {
    try {
      // NOTE: You will need to build this backend route next!
      const res = await fetch(`${apiUrl}/admin/kitchen/orders`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch kitchen orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000); // Live poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // 2. Handle tapping an item to advance its cooking status
  const advanceStatus = async (itemId: string, currentStatus: string) => {
    let newStatus = "";
    if (currentStatus === "pending") newStatus = "preparing";
    else if (currentStatus === "preparing") newStatus = "ready";
    else return; // If ready or served, clicking does nothing here

    // Optimistic UI Update (Change it on screen instantly so it feels fast)
    setTickets((prevTickets) =>
      prevTickets.map((ticket) => ({
        ...ticket,
        items: ticket.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus as any } : item
        ),
      }))
    );

    // Tell the backend to update the database
    try {
      await fetch(`${apiUrl}/admin/kitchen/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update item status", err);
      // If it fails, the next 3-second poll will revert the UI automatically
    }
  };

  // 3. Filter Logic: Only show tickets that contain items for the selected station
  const filteredTickets = tickets
    .map((ticket) => {
      // If a specific station is selected, filter out the items that don't belong to it
      const relevantItems = activeStation === "All" 
        ? ticket.items 
        : ticket.items.filter((item) => item.category === activeStation);
      
      return { ...ticket, items: relevantItems };
    })
    // Remove tickets entirely if they have 0 items for this specific station
    .filter((ticket) => ticket.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-400">
        <ChefHat size={48} className="animate-bounce mb-4 text-orange-500" />
        <p className="font-bold text-xl tracking-widest uppercase">Warming up the kitchen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 sm:p-6 font-sans selection:bg-orange-500/30">
      
      {/* Top Navigation Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-stone-900 p-4 rounded-3xl border border-stone-800">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-3 rounded-2xl">
            <ChefHat size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Kitchen Display</h1>
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-0.5">Live Order Queue</p>
          </div>
        </div>

        {/* Chef Station Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {stations.map((station) => (
            <button
              key={station}
              onClick={() => setActiveStation(station)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeStation === station
                  ? "bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white"
              }`}
            >
              {station === "All" ? <LayoutGrid size={16} className="inline mr-2 -mt-0.5" /> : null}
              {station}
            </button>
          ))}
        </div>
      </header>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center text-stone-600">
            <CheckCircle size={64} className="mb-4 opacity-20" />
            <h2 className="text-2xl font-black">All Clear!</h2>
            <p className="font-medium">No active orders for the {activeStation} station.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.serveId} className="bg-stone-900 rounded-[2rem] border border-stone-800 overflow-hidden flex flex-col max-h-[70vh]">
              
              {/* Ticket Header */}
              <div className="bg-stone-800/50 p-4 flex justify-between items-start border-b border-stone-800">
                <div>
                  <h2 className="text-3xl font-black text-white leading-none mb-1">
                    Table {ticket.tableNumber}
                  </h2>
                  <span className="text-xs font-bold bg-stone-700 text-stone-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Serve {ticket.serveNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
                  <Clock size={14} className="text-orange-500" />
                  <span className="text-sm font-bold text-stone-300">
                    {/* In a real app, calculate elapsed time here like "4m" */}
                    Just Now
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {ticket.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => advanceStatus(item.id, item.status)}
                    disabled={item.status === "ready" || item.status === "served"}
                    className={`w-full text-left p-4 rounded-2xl border-l-4 transition-all active:scale-[0.98] ${
                      item.status === "pending" 
                        ? "bg-stone-950 border-stone-600 hover:bg-stone-800" 
                        : item.status === "preparing"
                        ? "bg-orange-950/30 border-orange-500 hover:bg-orange-900/40"
                        : "bg-green-950/20 border-green-500 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 items-start">
                        <span className={`text-xl font-black mt-0.5 ${
                           item.status === "pending" ? "text-stone-100" : 
                           item.status === "preparing" ? "text-orange-400" : "text-green-500"
                        }`}>
                          {item.quantity}x
                        </span>
                        <div>
                          <h3 className={`text-lg font-bold leading-tight ${
                             item.status === "ready" ? "line-through text-stone-500" : "text-stone-100"
                          }`}>
                            {item.name}
                          </h3>
                          {item.notes && (
                            <p className="text-sm font-medium text-red-400 mt-1 uppercase tracking-wider bg-red-950/30 inline-block px-2 py-0.5 rounded">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Icon */}
                      <div className="shrink-0 mt-1">
                        {item.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-stone-600"></div>}
                        {item.status === "preparing" && <Flame size={20} className="text-orange-500 animate-pulse" />}
                        {item.status === "ready" && <CheckCircle size={20} className="text-green-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}