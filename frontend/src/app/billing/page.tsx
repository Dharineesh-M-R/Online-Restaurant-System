"use client";

import { useState } from "react";
import { TableOrder } from "@/types/billing";
import InvoiceModal from "@/components/features/billing/InvoiceModal";
import { LayoutGrid, Bell } from "lucide-react";

// Initial Mock Data
const INITIAL_DATA: TableOrder[] = [
  {
    id: "ord_1",
    tableNumber: "01",
    status: "bill_requested",
    openedAt: new Date(),
    items: [
      { id: "1", name: "Classic Burger", price: 12.00, quantity: 2 },
      { id: "2", name: "Fries", price: 4.50, quantity: 1 }
    ]
  },
  {
    id: "ord_2",
    tableNumber: "15",
    status: "dining",
    openedAt: new Date(),
    items: [
      { id: "3", name: "Sushi Platter", price: 35.00, quantity: 1 }
    ]
  }
];

export default function BillingPage() {
  const [tables, setTables] = useState<TableOrder[]>(INITIAL_DATA);
  const [activeTable, setActiveTable] = useState<TableOrder | null>(null);

  const handleGenerateBill = (orderId: string) => {
    // Logic: Remove table from active list (or update status to 'paid')
    setTables(prev => prev.filter(t => t.id !== orderId));
    setActiveTable(null);
    alert("Bill Processed & Inventory Updated!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Billing Dashboard</h1>
            <p className="text-slate-500 mt-1 font-medium">Select a table to settle payment.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white p-3 rounded-2xl border shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
              <span className="text-sm font-bold">{tables.length} Active Tables</span>
            </div>
          </div>
        </header>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tables.map((table) => (
            <div 
              key={table.id}
              className={`bg-white rounded-3xl p-6 border-2 transition-all cursor-pointer hover:border-indigo-500 hover:shadow-xl group ${
                table.status === 'bill_requested' ? 'border-yellow-400 bg-yellow-50/30' : 'border-transparent'
              }`}
              onClick={() => setActiveTable(table)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition">
                  {table.tableNumber}
                </div>
                {table.status === 'bill_requested' && (
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1">
                    <Bell size={10} /> Bill Requested
                  </span>
                )}
              </div>
              
              <p className="text-slate-400 text-sm font-medium">{table.items.length} Items ordered</p>
              <button className="mt-4 w-full py-3 bg-slate-900 text-white rounded-2xl font-bold group-hover:bg-indigo-600 transition">
                Get Bill
              </button>
            </div>
          ))}
        </div>

        {/* Modal Logic */}
        {activeTable && (
          <InvoiceModal 
            table={activeTable} 
            onClose={() => setActiveTable(null)} 
            onGenerate={handleGenerateBill}
          />
        )}
      </div>
    </div>
  );
}