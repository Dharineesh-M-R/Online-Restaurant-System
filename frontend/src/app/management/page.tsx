"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Users,
  Star,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
            Authenticating Manager Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex font-sans selection:bg-orange-500/20">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-stone-200/80 hidden md:flex flex-col justify-between">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-stone-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20 font-black">
              FD
            </div>
            <div>
              <h1 className="text-base font-black text-stone-900 leading-none">
                Foodie Admin
              </h1>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">
                Management Portal
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: "billing", icon: Receipt, label: "Billing & Revenue" },
              { id: "menu", icon: UtensilsCrossed, label: "Menu Catalog" },
              { id: "dashboard", icon: LayoutDashboard, label: "Overview Metrics" },
              { id: "staff", icon: Users, label: "Staff Roster" },
              { id: "reviews", icon: Star, label: "Guest Feedback" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-sm"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-100 space-y-2">
          <Link
            href="/billing"
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 transition"
          >
            <span className="flex items-center gap-2">
              <Receipt size={14} className="text-orange-600" />
              <span>Cashier Desk</span>
            </span>
            <ChevronRight size={14} className="text-stone-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs transition"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="bg-white border-b border-stone-200/80 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-stone-900 capitalize tracking-tight">
                {activeTab === "billing" ? "Billing History & Financials" : activeTab === "menu" ? "Menu Item Catalog" : activeTab}
              </h2>
            </div>
            <p className="text-xs text-stone-400 font-medium">
              Real-time enterprise overview and menu management
            </p>
          </div>

          {/* Mobile Tab Pills */}
          <div className="flex md:hidden gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("billing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                activeTab === "billing" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
              }`}
            >
              Billing
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                activeTab === "menu" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
              }`}
            >
              Menu
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === "billing" && <BillingHistory />}
          {activeTab === "menu" && <MenuEditor />}

          {activeTab !== "billing" && activeTab !== "menu" && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-base font-black text-stone-800">Module Under Construction</h3>
              <p className="text-xs text-stone-500 max-w-xs mt-1">
                The {activeTab} analytics module is scheduled for release in the next enterprise update.
              </p>
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
