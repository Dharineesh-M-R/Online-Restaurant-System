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
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface ReadyItem {
  id: string;
  name: string;
  quantity: number;
  tableNumber: number;
  serveNumber: number;
}

interface TableStatus {
  number: number;
  isOccupied: boolean;
  needsHelp: boolean;
  hasUnconfirmed: boolean;
}

interface OrderSummaryItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
  serve: number;
  notes?: string;
}

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "tables">("tasks");
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const [floorTables, setFloorTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [tableOrders, setTableOrders] = useState<OrderSummaryItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  // --- 1. AUTH PROTECTION ---
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    const currentTime = new Date().getTime();

    if (role !== "waiter" || !expiry || currentTime > parseInt(expiry)) {
      localStorage.removeItem("staff_role");
      localStorage.removeItem("staff_id");
      localStorage.removeItem("staff_name");
      localStorage.removeItem("staff_expiry");
      router.push("/login");
    }
  }, [router]);

  // --- 2. DATA FETCHING (CACHE-BUSTED) ---

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/tasks?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReadyItems(data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch waiter tasks", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchFloorPlan = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/floor-plan?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFloorTables(data.tables);
      }
    } catch (err) {
      console.error("Failed to fetch floor plan", err);
    }
  }, [apiUrl]);

  const viewTableDetails = async (tableNum: number, isOccupied: boolean) => {
    if (!isOccupied) return;
    
    setSelectedTable(tableNum);
    setIsModalLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/table-details/${tableNum}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTableOrders(data.items);
      }
    } catch (err) {
      console.error("Error fetching table items", err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const pollTableDetails = useCallback(async (tableNum: number) => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/table-details/${tableNum}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTableOrders((prevOrders) => {
          return data.items.map((newItem: OrderSummaryItem) => {
            const existingLocalItem = prevOrders.find(prev => prev.id === newItem.id);
            if (existingLocalItem && existingLocalItem.status === 'waiting_confirmation' && newItem.status === 'waiting_confirmation') {
              return { ...newItem, quantity: existingLocalItem.quantity };
            }
            return newItem;
          });
        });
      }
    } catch (err) {
      console.error("Error polling table items", err);
    }
  }, [apiUrl]);

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
      const modalInterval = setInterval(() => {
        pollTableDetails(selectedTable);
      }, 3000);
      return () => clearInterval(modalInterval);
    }
  }, [selectedTable, pollTableDetails]);


  // --- 3. ACTIONS & EDITING ---

  const handleQuantityChange = (itemId: string, delta: number) => {
    setTableOrders(prev => prev.map(item => 
      (item.id === itemId && item.status === 'waiting_confirmation') 
        ? { ...item, quantity: Math.max(1, item.quantity + delta) } 
        : item
    ));
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: itemId, action: 'delete' }] }),
      });
      setTableOrders(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const handleConfirmAndSend = async () => {
    const itemsToConfirm = tableOrders
      .filter(item => item.status === 'waiting_confirmation')
      .map(item => ({ id: item.id, quantity: item.quantity, action: 'confirm' }));

    if (itemsToConfirm.length === 0) return;

    try {
      const res = await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToConfirm }),
      });

      if (res.ok) {
        setSelectedTable(null);
        fetchFloorPlan(); 
      }
    } catch (err) {
      console.error("Failed to confirm items", err);
    }
  };

  // 🔥 Triggered from the Payment Modal
  const executeBillRequest = async (method: string) => {
    if (!selectedTable) return;
    setShowPaymentModal(false); // Close payment modal immediately
    
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/request-bill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: selectedTable, paymentMethod: method }), // Send method
      });

      if (res.ok) {
        setSelectedTable(null); // Close main table details modal
        fetchFloorPlan(); // Refresh floor plan view
      }
    } catch (err) {
      console.error("Failed to request bill", err);
    }
  };

  const markAsServed = async (itemId: string) => {
    setReadyItems((prev) => prev.filter((item) => item.id !== itemId));
    try {
      await fetch(`${apiUrl}/admin/waiter/update-item`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "served" }),
      });
    } catch (err) {
      console.error("Failed to mark item as served", err);
      fetchTasks(); 
    }
  };

  const attendTable = async (e: React.MouseEvent, tableNumber: number) => {
    e.stopPropagation(); 
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/attend-table`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      if (res.ok) fetchFloorPlan();
    } catch (err) {
      console.error("Failed to attend table", err);
    }
  };

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

  // --- LOGIC GATES FOR BUTTON RENDER ---
  const hasItemsToConfirm = tableOrders.some(item => item.status === 'waiting_confirmation');
  
  // Evaluates to true ONLY if there are items, AND none of them are pending/preparing/waiting
  const allItemsReadyOrServed = tableOrders.length > 0 && 
    tableOrders.every(item => item.status === 'ready' || item.status === 'served');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      
      {/* Header */}
      <header className="bg-white px-5 py-6 shadow-sm border-b border-stone-100 sticky top-0 z-20">
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

      {/* Main Content */}
      <main className="p-4 sm:p-6 max-w-md mx-auto w-full">
        
        {/* --- TAB 1: SERVICE TASKS --- */}
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-black text-stone-900">All Clear!</h2>
                <p className="text-sm text-stone-500 mt-2">No food is waiting in the kitchen.</p>
              </div>
            ) : (
              Object.entries(groupedTasks).map(([tableNum, items]) => (
                <div key={tableNum} className="bg-white rounded-3xl p-5 shadow-sm border border-stone-100">
                  <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-md">
                        {tableNum}
                      </div>
                      <h3 className="font-bold text-stone-900">Table {tableNum}</h3>
                    </div>
                    <div className="flex items-center text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md">
                      <Clock size={12} className="mr-1" /> Ready
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
                          className="w-10 h-10 bg-stone-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-md"
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

        {/* --- TAB 2: FLOOR PLAN --- */}
        {activeTab === "tables" && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-4">
              {floorTables.map((table) => (
                <div 
                  key={table.number}
                  onClick={() => viewTableDetails(table.number, table.isOccupied)}
                  className={`
                    relative aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all duration-300 cursor-pointer
                    ${table.hasUnconfirmed 
                      ? "bg-blue-50 border-blue-500 animate-pulse shadow-lg shadow-blue-100" 
                      : table.needsHelp 
                        ? "bg-red-50 border-red-500 shadow-lg shadow-red-100 animate-pulse" 
                        : table.isOccupied 
                          ? "bg-orange-50 border-orange-200 shadow-sm active:scale-95" 
                          : "bg-white border-stone-100 opacity-60 cursor-default"}
                  `}
                >
                  <span className={`text-2xl font-black 
                    ${table.hasUnconfirmed ? "text-blue-600" : 
                      table.needsHelp ? "text-red-600" : 
                      table.isOccupied ? "text-orange-600" : "text-stone-300"}`}>
                    {table.number}
                  </span>
                  
                  {table.needsHelp ? (
                    <button 
                      onClick={(e) => attendTable(e, table.number)}
                      className="mt-2 bg-red-600 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-lg shadow-red-200 active:scale-90 transition-transform"
                    >
                      <Hand size={10} /> Attended
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      {table.isOccupied && <UserCheck size={10} className={table.hasUnconfirmed ? "text-blue-400" : "text-orange-400"} />}
                      <span className={`text-[10px] font-bold uppercase tracking-tighter 
                        ${table.hasUnconfirmed ? "text-blue-500" : 
                          table.isOccupied ? "text-orange-400" : "text-stone-300"}`}>
                        {table.hasUnconfirmed ? "New Order" : table.isOccupied ? "Active" : "Vacant"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm flex flex-wrap justify-around gap-y-3 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-stone-200 rounded-full"></div> Vacant</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Occupied</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div> New Order</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div> Call Waiter</div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: TABLE DETAILS & EDITING --- */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-stone-900 italic">Table {selectedTable}</h2>
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-1">Order Summary</p>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="bg-stone-100 p-2 rounded-full text-stone-400 hover:bg-stone-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
              {isModalLoading ? (
                <div className="py-12 flex flex-col items-center text-stone-300">
                  <ChefHat size={40} className="animate-bounce mb-2" />
                  <p className="font-bold">Fetching details...</p>
                </div>
              ) : tableOrders.length === 0 ? (
                <div className="py-12 text-center text-stone-400 font-bold uppercase text-xs">No active items</div>
              ) : (
                tableOrders.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border transition-colors ${item.status === 'waiting_confirmation' ? 'bg-blue-50/50 border-blue-100' : 'bg-stone-50 border-stone-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-800 leading-tight">{item.name}</p>
                          {item.status === 'waiting_confirmation' && (
                            <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">New</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-tighter">
                          Serve {item.serve} • Status: <span className={item.status === 'waiting_confirmation' ? 'text-blue-500' : 'text-stone-500'}>{item.status.replace('_', ' ')}</span>
                        </p>
                      </div>

                      {/* EDITABLE CONTROLS: ONLY FOR WAITING_CONFIRMATION */}
                      {item.status === 'waiting_confirmation' ? (
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={async () => {
                                await fetch(`${apiUrl}/admin/waiter/confirm-items`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ items: [{ id: item.id, action: 'delete' }] }),
                                });
                                handleDeleteItem(item.id);
                            }} 
                            className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex items-center bg-white rounded-xl border border-stone-200 p-1">
                            <button onClick={() => handleQuantityChange(item.id, -1)} className="p-1 text-stone-600 hover:bg-stone-50 rounded-lg">
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                            <button onClick={() => handleQuantityChange(item.id, 1)} className="p-1 text-stone-600 hover:bg-stone-50 rounded-lg">
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center bg-stone-200 text-stone-600 px-3 py-1.5 rounded-xl font-black text-sm">
                          {item.quantity}x
                        </div>
                      )}
                    </div>
                    {item.notes && <p className="mt-2 text-[10px] text-stone-400 italic">"{item.notes}"</p>}
                  </div>
                ))
              )}
            </div>

            {/* DYNAMIC ACTION BUTTONS */}
            {hasItemsToConfirm ? (
              <button 
                onClick={handleConfirmAndSend}
                className="w-full mt-8 bg-stone-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Confirm & Send to Kitchen <ChevronRight size={18} />
              </button>
            ) : allItemsReadyOrServed ? (
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="w-1/3 bg-stone-100 text-stone-600 py-4 rounded-2xl font-black active:scale-95 transition-all flex items-center justify-center"
                >
                  Back
                </button>
                <button 
                  onClick={() => setShowPaymentModal(true)} // Open Payment Modal
                  className="w-2/3 bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Receipt size={18} /> Request Bill
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSelectedTable(null)}
                className="w-full mt-8 bg-stone-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Back to Floor <ChevronRight size={18} />
              </button>
            )}

          </div>
        </div>
      )}

      {/* --- PAYMENT SELECTION MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4 transition-opacity">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-stone-900 mb-1 text-center">Customer Payment</h3>
            <p className="text-stone-500 text-sm text-center mb-6">Select how the customer wants to pay.</p>
            
            <div className="space-y-3">
              <button onClick={() => executeBillRequest("upi")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-purple-500 hover:bg-purple-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><Smartphone size={24} className="text-purple-600" /><span className="font-bold text-stone-900">UPI / QR Code</span></div>
              </button>
              
              <button onClick={() => executeBillRequest("card")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><CreditCard size={24} className="text-blue-600" /><span className="font-bold text-stone-900">Credit / Debit Card</span></div>
              </button>

              <button onClick={() => executeBillRequest("cash")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-green-500 hover:bg-green-50 transition-colors active:scale-[0.98]">
                <div className="flex items-center gap-3"><IndianRupee size={24} className="text-green-600" /><span className="font-bold text-stone-900">Cash</span></div>
              </button>
            </div>
            
            <button onClick={() => setShowPaymentModal(false)} className="w-full mt-4 py-3 text-stone-400 font-bold hover:text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-30">
        <div className="flex justify-around max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab("tasks")}
            className={`flex flex-col items-center p-2 transition-colors ${activeTab === "tasks" ? "text-orange-600" : "text-stone-400"}`}
          >
            <div className="relative mb-1 flex items-center justify-center">
              <BellRing size={24} strokeWidth={activeTab === "tasks" ? 2.5 : 2} />
              {readyItems.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Tasks</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("tables")}
            className={`flex flex-col items-center p-2 transition-colors ${activeTab === "tables" ? "text-orange-600" : "text-stone-400"}`}
          >
            <div className="mb-1 flex items-center justify-center">
              <LayoutGrid size={24} strokeWidth={activeTab === "tables" ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Floor</span>
          </button>
        </div>
      </nav>

    </div>
  );
}