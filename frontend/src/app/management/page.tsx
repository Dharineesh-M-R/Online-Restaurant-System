"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Receipt, UtensilsCrossed, Users, Star, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// Import our new components
import BillingHistory from "./components/BillingHistory";
import MenuEditor from "./components/MenuEditor";

export default function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState("billing");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  // Auth Check
  useEffect(() => {
    const role = localStorage.getItem("staff_role");
    if (role !== "billing" && role !== "manager") {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center">Authenticating...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-3xl font-black text-orange-600 tracking-tight leading-none">Foodie<br/>Admin</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Management Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
            { id: "billing", icon: Receipt, label: "Billing History" },
            { id: "menu", icon: UtensilsCrossed, label: "Menu Editor" },
            { id: "staff", icon: Users, label: "Staff Access" },
            { id: "reviews", icon: Star, label: "Customer Reviews" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition">
            <LogOut size={18} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-black text-gray-900 capitalize tracking-tight">{activeTab.replace("-", " ")}</h2>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {activeTab === "billing" && <BillingHistory />}
          {activeTab === "menu" && <MenuEditor />}
          
          {activeTab !== "billing" && activeTab !== "menu" && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <LayoutDashboard size={80} className="opacity-10 mb-6" />
              <h3 className="text-2xl font-black text-gray-700">Module in Development</h3>
              <p className="mt-2 text-base font-medium">The {activeTab} section will be available soon.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}