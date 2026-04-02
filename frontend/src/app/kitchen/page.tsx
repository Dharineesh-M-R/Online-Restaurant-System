"use client";

import { useState, useEffect } from "react";
import { ChefHat, Clock, Flame, CheckCircle, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";

interface KitchenItem {
  id: string; 
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "preparing" | "ready" | "served";
  category: string; 
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
  const [activeStation, setActiveStation] = useState<string>("All");

  const stations = ["All", "Veg Starters", "Non Veg Starters", "Breads", "Rices/Noodles", "Desserts"];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  // Protect the route and Check Shift Expiry
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const currentTime = new Date().getTime();

    // Check if role is wrong, OR if expiry is missing, OR if 8 hours have passed
    if (role !== "kitchen" || !expiry || currentTime > parseInt(expiry)) {
      
      // Wipe the expired data
      localStorage.removeItem("staff_role");
      localStorage.removeItem("staff_id");
      localStorage.removeItem("staff_name");
      localStorage.removeItem("staff_expiry");
      
      // Kick them out to the login page
      router.push("/login");
    }
  }, [router]);

  const fetchKitchenOrders = async () => {
    try {
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
    const interval = setInterval(fetchKitchenOrders, 3000); 
    return () => clearInterval(interval);
  }, []);

  const advanceStatus = async (itemId: string, currentStatus: string) => {
    let newStatus = "";
    if (currentStatus === "pending") newStatus = "preparing";
    else if (currentStatus === "preparing") newStatus = "ready";
    else return; 

    setTickets((prevTickets) =>
      prevTickets.map((ticket) => ({
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

  const filteredTickets = tickets
    .map((ticket) => {
      const relevantItems = activeStation === "All" 
        ? ticket.items 
        : ticket.items.filter((item) => item.category === activeStation);
      
      return { ...ticket, items: relevantItems };
    })
    .filter((ticket) => ticket.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center text-gray-500">
        <ChefHat size={48} className="animate-bounce mb-4 text-orange-500" />
        <p className="font-bold text-xl tracking-widest uppercase">Warming up the kitchen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 p-4 sm:p-8 font-sans selection:bg-orange-500/30">
      
      {/* Top Navigation Bar - Matching Billing/Menu Header Style */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3.5 rounded-2xl shadow-sm border border-orange-200/50">
            <ChefHat size={28} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Kitchen Display</h1>
            <p className="text-gray-500 font-medium mt-1">Manage live order queues and prep statuses.</p>
          </div>
        </div>

        {/* Chef Station Filter Tabs - Exact match to Menu page categories */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {stations.map((station) => (
            <button
              key={station}
              onClick={() => setActiveStation(station)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                activeStation === station
                  ? "bg-gray-900 text-white shadow-md"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
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
          <div className="col-span-full py-24 flex flex-col items-center text-gray-400">
            <CheckCircle size={64} className="mb-4 opacity-20" />
            <h2 className="text-2xl font-black text-gray-600">All Clear!</h2>
            <p className="font-medium mt-1">No active orders for the {activeStation} station.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.serveId} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[75vh]">
              
              {/* Ticket Header */}
              <div className="bg-gray-50/80 p-5 flex justify-between items-start border-b border-gray-100">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 leading-none mb-2">
                    Table {ticket.tableNumber}
                  </h2>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
                    Serve {ticket.serveNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                  <Clock size={14} className="text-orange-500" />
                  <span className="text-sm font-bold text-gray-600">
                    Just Now
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-white">
                {ticket.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => advanceStatus(item.id, item.status)}
                    disabled={item.status === "ready" || item.status === "served"}
                    className={`w-full text-left p-4 rounded-2xl border-l-4 transition-all active:scale-[0.98] ${
                      item.status === "pending" 
                        ? "bg-gray-50 border-gray-300 hover:bg-gray-100" 
                        : item.status === "preparing"
                        ? "bg-orange-50/50 border-orange-500 shadow-sm shadow-orange-100"
                        : "bg-green-50/50 border-green-500 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 items-start">
                        <span className={`text-xl font-black mt-0.5 ${
                           item.status === "pending" ? "text-gray-800" : 
                           item.status === "preparing" ? "text-orange-600" : "text-green-600"
                        }`}>
                          {item.quantity}x
                        </span>
                        <div>
                          <h3 className={`text-base font-bold leading-tight ${
                             item.status === "ready" ? "line-through text-gray-400" : "text-gray-800"
                          }`}>
                            {item.name}
                          </h3>
                          {item.notes && (
                            <div className="mt-2">
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider bg-red-50 border border-red-100 inline-block px-2 py-0.5 rounded-md">
                                Note: {item.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Icon */}
                      <div className="shrink-0 mt-1">
                        {item.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
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