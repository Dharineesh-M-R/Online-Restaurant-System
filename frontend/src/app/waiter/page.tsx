"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BellRing, LayoutGrid, CheckCircle2, Utensils, Clock, UserCheck, X, ChefHat, 
  ChevronRight, Hand, Trash2, Plus, Minus, Receipt, Smartphone, CreditCard, IndianRupee, ShoppingBag
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ReadyItem { id: string; name: string; quantity: number; tableNumber: number; serveNumber: number; }
interface TableStatus { number: number; isOccupied: boolean; needsHelp: boolean; hasUnconfirmed: boolean; sessionStatus: string | null; }
interface OrderSummaryItem { id: string; name: string; quantity: number; status: string; serve: number; notes?: string; }

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "tables">("tasks");
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
  const [floorTables, setFloorTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionStatus, setActiveSessionStatus] = useState<string | null>(null); // 🔥 Added status tracking
  const [tableOrders, setTableOrders] = useState<OrderSummaryItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    const expiry = localStorage.getItem("staff_expiry");
    if (role !== "waiter" || !expiry || new Date().getTime() > parseInt(expiry)) {
      localStorage.clear();
      router.push("/login");
    }
  }, [router]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/tasks?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setReadyItems((await res.json()).tasks);
    } catch (err) {} finally { setLoading(false); }
  }, [apiUrl]);

  const fetchFloorPlan = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/floor-plan?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setFloorTables((await res.json()).tables);
    } catch (err) {}
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
        setActiveSessionId(data.sessionId);
        setActiveSessionStatus(data.sessionStatus); // 🔥 Store status
      }
    } catch (err) {} finally { setIsModalLoading(false); }
  };

  const pollTableDetails = useCallback(async (tableNum: number) => {
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/table-details/${tableNum}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setActiveSessionId(data.sessionId);
        setActiveSessionStatus(data.sessionStatus); // 🔥 Keep status updated
        setTableOrders(prev => data.items.map((newItem: OrderSummaryItem) => {
            const existing = prev.find(p => p.id === newItem.id);
            return (existing && existing.status === 'waiting_confirmation' && newItem.status === 'waiting_confirmation') 
              ? { ...newItem, quantity: existing.quantity } : newItem;
        }));
      }
    } catch (err) {}
  }, [apiUrl]);

  useEffect(() => {
    fetchTasks(); fetchFloorPlan();
    const interval = setInterval(() => { fetchTasks(); fetchFloorPlan(); }, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchFloorPlan]);

  useEffect(() => {
    if (selectedTable !== null) {
      const modalInterval = setInterval(() => pollTableDetails(selectedTable), 3000);
      return () => clearInterval(modalInterval);
    }
  }, [selectedTable, pollTableDetails]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setTableOrders(prev => prev.map(item => (item.id === itemId && item.status === 'waiting_confirmation') 
        ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await fetch(`${apiUrl}/admin/waiter/confirm-items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: itemId, action: 'delete' }] }) });
      setTableOrders(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {}
  };

  const handleConfirmAndSend = async () => {
    const items = tableOrders.filter(i => i.status === 'waiting_confirmation').map(i => ({ id: i.id, quantity: i.quantity, action: 'confirm' }));
    if (!items.length) return;
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/confirm-items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      if (res.ok) { setSelectedTable(null); fetchFloorPlan(); }
    } catch (err) {}
  };

  const executeBillRequest = async (method: string) => {
    if (!selectedTable) return;
    setShowPaymentModal(false); 
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/request-bill`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableNumber: selectedTable, paymentMethod: method }) });
      if (res.ok) fetchFloorPlan(); // Refresh so modal button updates to green
    } catch (err) {}
  };

  const markAsServed = async (itemId: string) => {
    setReadyItems(prev => prev.filter(item => item.id !== itemId));
    try { await fetch(`${apiUrl}/admin/waiter/update-item`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, status: "served" }) }); } catch (err) {}
  };

  const attendTable = async (e: React.MouseEvent, tableNumber: number) => {
    e.stopPropagation(); 
    try {
      const res = await fetch(`${apiUrl}/admin/waiter/attend-table`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableNumber }) });
      if (res.ok) fetchFloorPlan();
    } catch (err) {}
  };

  const handleClearEmptyTable = async () => {
    if (!selectedTable || !activeSessionId) return;
    if (!window.confirm(`Clear Table ${selectedTable}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/sessions/${activeSessionId}/cancel`, { method: "POST" });
      if (res.ok) { setSelectedTable(null); setActiveSessionId(null); fetchFloorPlan(); }
    } catch (err) {}
  };

  const groupedTasks = readyItems.reduce((acc, item) => {
    if (!acc[item.tableNumber]) acc[item.tableNumber] = [];
    acc[item.tableNumber].push(item);
    return acc;
  }, {} as Record<number, ReadyItem[]>);

  if (loading) return <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-500"><Utensils size={40} className="animate-bounce mb-4 text-orange-500" /><p className="font-bold">Syncing floor data...</p></div>;

  const hasItemsToConfirm = tableOrders.some(item => item.status === 'waiting_confirmation');
  const allItemsReadyOrServed = tableOrders.length > 0 && tableOrders.every(item => item.status === 'ready' || item.status === 'served');
  const isSelectedTableParcel = selectedTable !== null && selectedTable > 100;
  
  // 🔥 CHECK IF BILLED
  const isModalBilled = activeSessionStatus?.startsWith("billed");
  const modalBilledMethod = activeSessionStatus?.includes("_") ? activeSessionStatus.split("_")[1] : null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 font-sans">
      <header className="bg-white px-5 py-6 shadow-sm border-b border-stone-100 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div><h1 className="text-2xl font-black tracking-tight text-stone-900">{activeTab === "tasks" ? "Service Tasks" : "Floor Plan"}</h1><p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">{activeTab === "tasks" ? "Run Food to Tables" : "Monitor All Tables"}</p></div>
          {activeTab === "tasks" && readyItems.length > 0 && <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-black text-sm animate-pulse">{readyItems.length} Pending</div>}
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-md mx-auto w-full">
        {activeTab === "tasks" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {Object.keys(groupedTasks).length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-center"><div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={32} className="text-green-500" /></div><h2 className="text-xl font-black text-stone-900">All Clear!</h2></div>
            ) : (
              Object.entries(groupedTasks).map(([tableNum, items]) => {
                const isParcel = Number(tableNum) > 100;
                return (
                  <div key={tableNum} className={`bg-white rounded-3xl p-5 shadow-sm border ${isParcel ? 'border-purple-200 shadow-purple-50' : 'border-stone-100'}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg shadow-md ${isParcel ? 'bg-purple-600' : 'bg-orange-600'}`}>{isParcel ? <ShoppingBag size={18} /> : tableNum}</div><div><h3 className="font-bold text-stone-900">{isParcel ? `Parcel #${Number(tableNum) - 100}` : `Table ${tableNum}`}</h3></div></div>
                      <div className="flex items-center text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md"><Clock size={12} className="mr-1" /> Ready</div>
                    </div>
                    <div className="space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center gap-3 bg-stone-50 p-3 rounded-2xl">
                          <div className="flex items-start gap-3"><span className="font-black text-stone-900">{item.quantity}x</span><div><p className="font-bold text-stone-800 leading-tight">{item.name}</p>{!isParcel && <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Serve {item.serveNumber}</p>}</div></div>
                          <button onClick={() => markAsServed(item.id)} className={`w-10 h-10 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-md ${isParcel ? 'bg-purple-600' : 'bg-stone-900'}`}><CheckCircle2 size={18} strokeWidth={3} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === "tables" && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-3 gap-4">
              {floorTables.map((table) => {
                const isParcel = table.number > 100;
                const isBilled = table.sessionStatus?.startsWith("billed"); // 🔥 Floor plan UI logic
                
                return (
                  <div key={table.number} onClick={() => viewTableDetails(table.number, table.isOccupied)} className={`relative aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all duration-300 cursor-pointer ${table.hasUnconfirmed ? (isParcel ? "bg-purple-50 border-purple-500 animate-pulse" : "bg-blue-50 border-blue-500 animate-pulse") : table.needsHelp ? "bg-red-50 border-red-500 animate-pulse" : isBilled ? "bg-white border-red-500 shadow-md" : table.isOccupied ? (isParcel ? "bg-purple-50 border-purple-200" : "bg-orange-50 border-orange-200") : "bg-white border-stone-100 opacity-60"}`}>
                    
                    {/* 🔥 NEW UI: Show Red Billed Icon on the table grid */}
                    {isBilled && (
                       <div className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full animate-bounce shadow-md">
                          <Receipt size={14} />
                       </div>
                    )}

                    {isParcel ? <ShoppingBag size={24} className={table.hasUnconfirmed ? "text-purple-600" : isBilled ? "text-red-500" : table.needsHelp ? "text-red-600" : table.isOccupied ? "text-purple-500" : "text-stone-300"} /> : <span className={`text-2xl font-black ${table.hasUnconfirmed ? "text-blue-600" : isBilled ? "text-red-500" : table.needsHelp ? "text-red-600" : table.isOccupied ? "text-orange-600" : "text-stone-300"}`}>{table.number}</span>}
                    
                    {table.needsHelp ? (
                      <button onClick={(e) => attendTable(e, table.number)} className="mt-2 bg-red-600 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-lg shadow-red-200 active:scale-90 transition-transform"><Hand size={10} /> Attended</button>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        {!isParcel && table.isOccupied && !isBilled && <UserCheck size={10} className={table.hasUnconfirmed ? "text-blue-400" : "text-orange-400"} />}
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isBilled ? "text-red-500" : table.hasUnconfirmed ? (isParcel ? "text-purple-500" : "text-blue-500") : table.isOccupied ? (isParcel ? "text-purple-400" : "text-orange-400") : "text-stone-300"}`}>
                          {isBilled ? "Checkout" : isParcel ? `Token ${table.number - 100}` : (table.hasUnconfirmed ? "New Order" : table.isOccupied ? "Active" : "Vacant")}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
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
                <h2 className={`text-3xl font-black italic ${isSelectedTableParcel ? 'text-purple-900' : 'text-stone-900'}`}>{isSelectedTableParcel ? `Parcel #${selectedTable - 100}` : `Table ${selectedTable}`}</h2>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isModalBilled ? 'text-red-500' : isSelectedTableParcel ? 'text-purple-500' : 'text-orange-500'}`}>{isModalBilled ? "Bill Requested" : "Verify Order"}</p>
              </div>
              <button onClick={() => setSelectedTable(null)} className="bg-stone-100 p-2 rounded-full text-stone-400 hover:bg-stone-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
              {isModalLoading ? (
                <div className="py-12 flex flex-col items-center text-stone-300"><ChefHat size={40} className="animate-bounce mb-2" /><p className="font-bold">Fetching details...</p></div>
              ) : tableOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center"><p className="text-center text-stone-400 font-bold uppercase text-xs mb-6">No active items</p><button onClick={handleClearEmptyTable} className="text-red-600 bg-red-50 hover:bg-red-100 px-6 py-3 rounded-2xl font-bold text-sm transition-colors flex items-center gap-2 active:scale-95"><Trash2 size={16} /> Clear Empty Table</button></div>
              ) : (
                tableOrders.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl border transition-colors ${item.status === 'waiting_confirmation' ? (isSelectedTableParcel ? 'bg-purple-50 border-purple-100' : 'bg-blue-50/50 border-blue-100') : 'bg-stone-50 border-stone-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-800 leading-tight">{item.name}</p>
                          {item.status === 'waiting_confirmation' && <span className={`text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${isSelectedTableParcel ? 'bg-purple-600' : 'bg-blue-600'}`}>New</span>}
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-tighter">{!isSelectedTableParcel && `Serve ${item.serve} • `}Status: <span className={item.status === 'waiting_confirmation' ? (isSelectedTableParcel ? 'text-purple-500' : 'text-blue-500') : 'text-stone-500'}>{item.status.replace('_', ' ')}</span></p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Lock editing if billed */}
                        {!isModalBilled && (item.status === 'waiting_confirmation' || item.status === 'pending') && (
                          <button onClick={async () => { await fetch(`${apiUrl}/admin/waiter/confirm-items`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: item.id, action: 'delete' }] }) }); handleDeleteItem(item.id); }} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        )}
                        {!isModalBilled && item.status === 'waiting_confirmation' ? (
                          <div className="flex items-center bg-white rounded-xl border border-stone-200 p-1">
                            <button onClick={() => handleQuantityChange(item.id, -1)} className="p-1 text-stone-600 hover:bg-stone-50 rounded-lg"><Minus size={14} /></button>
                            <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                            <button onClick={() => handleQuantityChange(item.id, 1)} className="p-1 text-stone-600 hover:bg-stone-50 rounded-lg"><Plus size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-stone-200 text-stone-600 px-3 py-1.5 rounded-xl font-black text-sm">{item.quantity}x</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {hasItemsToConfirm && tableOrders.length > 0 && !isModalBilled && (
              <button onClick={handleConfirmAndSend} className={`w-full mt-8 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSelectedTableParcel ? 'bg-purple-600 shadow-purple-200' : 'bg-stone-900'}`}>Confirm & Send to Kitchen <ChevronRight size={18} /></button>
            )}
            
            {allItemsReadyOrServed && tableOrders.length > 0 && (
              <div className="flex gap-3 mt-8">
                <button onClick={() => setSelectedTable(null)} className="w-1/3 bg-stone-100 text-stone-600 py-4 rounded-2xl font-black active:scale-95 transition-all flex items-center justify-center">Back</button>
                
                {/* 🔥 NEW UI: Lock Request Bill button if already requested */}
                {isModalBilled ? (
                   <button disabled className="w-2/3 bg-green-100 text-green-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 cursor-not-allowed">
                     <CheckCircle2 size={18} /> {modalBilledMethod ? `Billed (${modalBilledMethod.toUpperCase()})` : "Bill Requested"}
                   </button>
                ) : (
                   <button onClick={() => setShowPaymentModal(true)} className="w-2/3 bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                     <Receipt size={18} /> Request Bill
                   </button>
                )}
              </div>
            )}
            
            {!hasItemsToConfirm && !allItemsReadyOrServed && tableOrders.length > 0 && !isModalBilled && (
              <button onClick={() => setSelectedTable(null)} className="w-full mt-8 bg-stone-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">Back to Floor <ChevronRight size={18} /></button>
            )}
            
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 p-4 transition-opacity">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-stone-900 mb-1 text-center">Customer Payment</h3>
            <div className="space-y-3 mt-6">
              <button onClick={() => executeBillRequest("upi")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-purple-500 hover:bg-purple-50"><div className="flex items-center gap-3"><Smartphone size={24} className="text-purple-600" /><span className="font-bold text-stone-900">UPI / QR Code</span></div></button>
              <button onClick={() => executeBillRequest("card")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-blue-500 hover:bg-blue-50"><div className="flex items-center gap-3"><CreditCard size={24} className="text-blue-600" /><span className="font-bold text-stone-900">Credit / Debit Card</span></div></button>
              <button onClick={() => executeBillRequest("cash")} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-stone-100 hover:border-green-500 hover:bg-green-50"><div className="flex items-center gap-3"><IndianRupee size={24} className="text-green-600" /><span className="font-bold text-stone-900">Cash</span></div></button>
            </div>
            <button onClick={() => setShowPaymentModal(false)} className="w-full mt-4 py-3 text-stone-400 font-bold hover:text-stone-600">Cancel</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-30">
        <div className="flex justify-around max-w-md mx-auto">
          <button onClick={() => setActiveTab("tasks")} className={`flex flex-col items-center p-2 transition-colors ${activeTab === "tasks" ? "text-orange-600" : "text-stone-400"}`}><div className="relative mb-1 flex items-center justify-center"><BellRing size={24} strokeWidth={activeTab === "tasks" ? 2.5 : 2} />{readyItems.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}</div><span className="text-[10px] font-bold uppercase tracking-widest">Tasks</span></button>
          <button onClick={() => setActiveTab("tables")} className={`flex flex-col items-center p-2 transition-colors ${activeTab === "tables" ? "text-orange-600" : "text-stone-400"}`}><div className="mb-1 flex items-center justify-center"><LayoutGrid size={24} strokeWidth={activeTab === "tables" ? 2.5 : 2} /></div><span className="text-[10px] font-bold uppercase tracking-widest">Floor</span></button>
        </div>
      </nav>
    </div>
  );
}