"use client";

import { useState, useEffect } from "react";
import { 
  BellRing, 
  LayoutGrid, 
  CheckCircle2, 
  Utensils, 
  ArrowRight,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";

// Interface for items sitting in the kitchen waiting to be run to the table
interface ReadyItem {
  id: string;
  name: string;
  quantity: number;
  tableNumber: number;
  serveNumber: number;
}

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "tables">("tasks");
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  // Protect the route and Check Shift Expiry
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const currentTime = new Date().getTime();

    // Check if role is wrong, OR if expiry is missing, OR if 8 hours have passed
    if (role !== "waiter" || !expiry || currentTime > parseInt(expiry)) {
      
      // Wipe the expired data
      localStorage.removeItem("staff_role");
      localStorage.removeItem("staff_id");
      localStorage.removeItem("staff_name");
      localStorage.removeItem("staff_expiry");
      
      // Kick them out to the login page
      router.push("/login");
    }
  }, [router]);

  // 1. Fetch items that the Kitchen has marked as 'ready'
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/tasks`);
      if (res.ok) {
        const data = await res.json();
        setReadyItems(data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch waiter tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000); // Live poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // 2. Mark an item as 'served' once the waiter drops it at the table
  const markAsServed = async (itemId: string) => {
    // Optimistic UI update: instantly remove it from the screen
    setReadyItems((prev) => prev.filter((item) => item.id !== itemId));

    try {
      await fetch(`${apiUrl}/admin/waiter/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "served" }),
      });
    } catch (err) {
      console.error("Failed to mark item as served", err);
      fetchTasks(); // Revert if it failed
    }
  };

  // Group the ready items by Table Number so the waiter can grab a tray for one table
  const groupedTasks = readyItems.reduce((acc, item) => {
    if (!acc[item.tableNumber]) acc[item.tableNumber] = [];
    acc[item.tableNumber].push(item);
    return acc;
  }, {} as Record<number, ReadyItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-500">
        <Utensils size={40} className="animate-bounce mb-4 text-orange-500" />
        <p className="font-bold">Syncing floor data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      
      {/* Mobile Header */}
      <header className="bg-white px-5 py-6 shadow-sm border-b border-stone-100 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              {activeTab === "tasks" ? "Service Tasks" : "Floor Plan"}
            </h1>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
              {activeTab === "tasks" ? "Run Food to Tables" : "Monitor All Tables"}
            </p>
          </div>
          {activeTab === "tasks" && readyItems.length > 0 && (
            <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-black text-sm animate-pulse">
              {readyItems.length} Pending
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 max-w-md mx-auto w-full">
        
        {/* --- TAB 1: SERVICE TASKS (Food ready to be delivered) --- */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-black text-stone-900">You're all caught up!</h2>
                <p className="text-sm text-stone-500 mt-2">No food is waiting in the kitchen right now.</p>
              </div>
            ) : (
              Object.entries(groupedTasks).map(([tableNum, items]) => (
                <div key={tableNum} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
                  <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-200">
                        {tableNum}
                      </div>
                      <h3 className="font-bold text-stone-900">Table {tableNum}</h3>
                    </div>
                    <div className="flex items-center text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md">
                      <Clock size={12} className="mr-1" />
                      Ready
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center gap-3 bg-stone-50 p-3 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <span className="font-black text-stone-900">{item.quantity}x</span>
                          <div>
                            <p className="font-bold text-stone-800 leading-tight">{item.name}</p>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Serve {item.serveNumber}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => markAsServed(item.id)}
                          className="w-10 h-10 bg-stone-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-md shrink-0"
                        >
                          <CheckCircle2 size={18} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB 2: FLOOR PLAN (Placeholder for seeing all tables) --- */}
        {activeTab === "tables" && (
          <div className="flex flex-col items-center justify-center pt-20 text-center text-stone-500">
            <LayoutGrid size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">Floor Plan View</h2>
            <p className="text-sm px-6">
              Use this tab to check which tables are empty, occupied, or waiting for the bill.
              <br/><br/>
              (You can fetch the exact same data here as the Cashier Dashboard!)
            </p>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-30">
        <div className="flex justify-around max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center p-2 min-w-20 transition-colors ${activeTab === "tasks" ? "text-orange-600" : "text-stone-400 hover:text-stone-600"}`}
          >
            <div className="relative mb-1">
              <BellRing size={24} strokeWidth={activeTab === "tasks" ? 2.5 : 2} />
              {readyItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Tasks</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("tables")}
            className={`flex flex-col items-center p-2 min-w-20 transition-colors ${activeTab === "tables" ? "text-orange-600" : "text-stone-400 hover:text-stone-600"}`}
          >
            <LayoutGrid size={24} className="mb-1" strokeWidth={activeTab === "tables" ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Floor</span>
          </button>
        </div>
      </div>

    </div>
  );
}