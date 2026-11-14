"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Users,
  UtensilsCrossed,
  ChefHat,
  Flame,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Percent,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowUpRight,
  Layers,
  Award,
} from "lucide-react";

interface OverviewData {
  liveFloor: {
    totalTables: number;
    occupiedTables: number;
    availableTables: number;
    occupancyRate: number;
    unbilledFloatingRevenue: number;
    activeSessionsCount: number;
    kitchenLoad: {
      total: number;
      pending: number;
      preparing: number;
      status: string;
    };
  };
  orders: {
    id: string;
    tableNumber: number;
    totalAmount: number;
    originalAmount: number;
    discountAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  menuAnalytics: {
    topMovers: {
      name: string;
      category: string;
      quantity: number;
      revenue: number;
      price: number;
    }[];
    highestRevenue: {
      name: string;
      category: string;
      quantity: number;
      revenue: number;
      price: number;
    }[];
    oosReport: {
      id: string | number;
      name: string;
      category: string;
      price: number;
      isAvailable: boolean;
      timesOrdered: number;
    }[];
  };
  operational: {
    avgKitchenMinutes: number;
    avgTurnaroundMinutes: number;
    dineIn: { orders: number; revenue: number };
    takeaway: { orders: number; revenue: number };
  };
}

export default function OverviewMetrics() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "yesterday" | "week" | "month" | "all"
  >("today");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchOverview = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`${apiUrl}/management/overview`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch overview metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => fetchOverview(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Parse date safely as UTC
  const parseDatabaseDate = (dateString: string) => {
    if (!dateString) return new Date();
    const safeString = dateString.replace(" ", "T") + (dateString.includes("Z") ? "" : "Z");
    return new Date(safeString);
  };

  // Filter orders by selected timeframe
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return data.orders.filter((order) => {
      const orderDate = parseDatabaseDate(order.createdAt);

      if (selectedPeriod === "today") {
        return orderDate >= startOfToday;
      }
      if (selectedPeriod === "yesterday") {
        return orderDate >= startOfYesterday && orderDate < startOfToday;
      }
      if (selectedPeriod === "week") {
        return orderDate >= sevenDaysAgo;
      }
      if (selectedPeriod === "month") {
        return orderDate >= thirtyDaysAgo;
      }
      return true; // "all"
    });
  }, [data?.orders, selectedPeriod]);

  // Derived financial metrics for selected period
  const financialMetrics = useMemo(() => {
    let grossRevenue = 0;
    let discountsGiven = 0;
    let netRevenue = 0;

    let upiAmount = 0;
    let upiCount = 0;
    let cardAmount = 0;
    let cardCount = 0;
    let cashAmount = 0;
    let cashCount = 0;

    filteredOrders.forEach((o) => {
      const net = Number(o.totalAmount || 0);
      const disc = Number(o.discountAmount || 0);
      const gross = Number(o.originalAmount || net + disc);

      grossRevenue += gross;
      discountsGiven += disc;
      netRevenue += net;

      const method = String(o.paymentMethod || "").toLowerCase();
      if (method === "upi") {
        upiAmount += net;
        upiCount++;
      } else if (method === "card") {
        cardAmount += net;
        cardCount++;
      } else {
        cashAmount += net;
        cashCount++;
      }
    });

    const ordersCount = filteredOrders.length;
    const aov = ordersCount > 0 ? Math.round(netRevenue / ordersCount) : 0;
    const discountRate = grossRevenue > 0 ? ((discountsGiven / grossRevenue) * 100).toFixed(1) : "0";

    const totalTenderAmount = upiAmount + cardAmount + cashAmount || 1;
    const upiPct = Math.round((upiAmount / totalTenderAmount) * 100);
    const cardPct = Math.round((cardAmount / totalTenderAmount) * 100);
    const cashPct = Math.max(0, 100 - (upiPct + cardPct));

    return {
      grossRevenue,
      discountsGiven,
      netRevenue,
      ordersCount,
      aov,
      discountRate,
      tenders: {
        upi: { amount: upiAmount, count: upiCount, pct: upiPct },
        card: { amount: cardAmount, count: cardCount, pct: cardPct },
        cash: { amount: cashAmount, count: cashCount, pct: cashPct },
      },
    };
  }, [filteredOrders]);

  if (loading && !data) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-stone-400 gap-3">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
          Compiling Real-Time Overview Metrics...
        </p>
      </div>
    );
  }

  const liveFloor = data?.liveFloor || {
    totalTables: 20,
    occupiedTables: 0,
    availableTables: 20,
    occupancyRate: 0,
    unbilledFloatingRevenue: 0,
    activeSessionsCount: 0,
    kitchenLoad: { total: 0, pending: 0, preparing: 0, status: "Normal" },
  };

  const menuAnalytics = data?.menuAnalytics || {
    topMovers: [],
    highestRevenue: [],
    oosReport: [],
  };

  const operational = data?.operational || {
    avgKitchenMinutes: 14,
    avgTurnaroundMinutes: 42,
    dineIn: { orders: 0, revenue: 0 },
    takeaway: { orders: 0, revenue: 0 },
  };

  const totalDineRevenue = operational.dineIn.revenue + operational.takeaway.revenue || 1;
  const dineInPct = Math.round((operational.dineIn.revenue / totalDineRevenue) * 100);
  const takeawayPct = Math.max(0, 100 - dineInPct);

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (liveFloor.occupancyRate / 100) * circumference;

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Overview Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-black text-stone-900 uppercase tracking-tight">
              Executive Pulse & Operational Metrics
            </h2>
          </div>
          <p className="text-xs text-stone-400 font-bold mt-0.5">
            Auto-refreshing live dashboard • Synced across POS, Waiter & KDS
          </p>
        </div>

        <button
          onClick={() => fetchOverview(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin text-orange-600" : ""} />
          <span>{refreshing ? "Syncing..." : "Sync Live Pulse"}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. THE LIVE FLOOR (REAL-TIME PULSE) */}
      {/* ========================================================= */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
            1
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              The Live Floor (Real-Time Pulse)
            </h3>
            <p className="text-[11px] font-bold text-stone-400">
              Live capacity, unbilled active tables, and kitchen pressure right now
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1A: Active Occupancy Donut */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex items-center gap-5">
            {/* Donut Chart */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-stone-100"
                  strokeWidth="11"
                  fill="transparent"
                />
                {/* Occupied Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-orange-600 transition-all duration-1000 ease-out"
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-stone-900 leading-none">
                  {liveFloor.occupancyRate}%
                </span>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">
                  Occupied
                </span>
              </div>
            </div>

            {/* Legend & Details */}
            <div className="flex-1 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                Floor Capacity
              </span>
              <div className="space-y-1.5 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0" />
                    <span>Occupied</span>
                  </span>
                  <span className="font-black text-stone-900">{liveFloor.occupiedTables} Tables</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-200 shrink-0" />
                    <span>Available</span>
                  </span>
                  <span className="font-black text-stone-700">{liveFloor.availableTables} Tables</span>
                </div>
              </div>
              <div className="pt-2 border-t border-stone-100 text-[10px] text-stone-400 font-bold">
                Total Dining: {liveFloor.totalTables} Physical Tables
              </div>
            </div>
          </div>

          {/* Card 1B: Unbilled Floating Revenue */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Unbilled Floating Revenue
                </span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  ₹{liveFloor.unbilledFloatingRevenue.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500 font-bold">
                {liveFloor.activeSessionsCount} active tables ordering
              </span>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                60m Cash Forecast
              </span>
            </div>
          </div>

          {/* Card 1C: Current Kitchen Load */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Current Kitchen Load
                </span>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                    {liveFloor.kitchenLoad.total}
                  </p>
                  <span className="text-xs font-bold text-stone-400 uppercase">dishes on queue</span>
                </div>
              </div>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  liveFloor.kitchenLoad.total >= 25
                    ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                    : liveFloor.kitchenLoad.total >= 10
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-orange-50 text-orange-600 border-orange-200"
                }`}
              >
                {liveFloor.kitchenLoad.total >= 15 ? <Flame size={20} /> : <ChefHat size={20} />}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
              <span className="text-stone-500">
                {liveFloor.kitchenLoad.pending} Pending • {liveFloor.kitchenLoad.preparing} Cooking
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                  liveFloor.kitchenLoad.total >= 25
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : liveFloor.kitchenLoad.total >= 10
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {liveFloor.kitchenLoad.status}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. FINANCIAL KPIS (THE MONEY) */}
      {/* ========================================================= */}
      <section className="space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
              2
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                Financial KPIs & Register Reconciliation
              </h3>
              <p className="text-[11px] font-bold text-stone-400">
                Gross sales, applied discounts, Average Order Value, and tender breakdown
              </p>
            </div>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPeriod(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedPeriod === tab.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 2A: Gross vs. Net Revenue */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Net Realized Revenue
                </span>
                <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  ₹{financialMetrics.netRevenue.toLocaleString("en-IN")}
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                {financialMetrics.ordersCount} Bills Settled
              </span>
            </div>

            {/* Gross & Discounts Breakdown */}
            <div className="bg-[#faf9f6] p-3 rounded-2xl border border-stone-200/60 space-y-1.5 text-xs font-bold">
              <div className="flex justify-between text-stone-600">
                <span>Gross Value (Pre-discount):</span>
                <span className="text-stone-900 font-black">
                  ₹{financialMetrics.grossRevenue.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span className="flex items-center gap-1">
                  <Percent size={12} /> Discounts Absorbed:
                </span>
                <span className="font-black">
                  -₹{financialMetrics.discountsGiven.toLocaleString("en-IN")} ({financialMetrics.discountRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2B: Average Order Value (AOV) */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Average Order Value (AOV)
                </span>
                <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  ₹{financialMetrics.aov.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1 text-xs">
              <p className="font-bold text-stone-700">
                Calculated across {financialMetrics.ordersCount} closed guest checks
              </p>
              <p className="text-[10px] font-bold text-stone-400">
                Target AOV: ₹800 • Rising AOV indicates successful upselling
              </p>
            </div>
          </div>

          {/* Card 2C: Revenue by Tender Type */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                Tender Type Breakdown
              </span>
              <p className="text-xs font-bold text-stone-500">
                Quick register settlement by payment channel
              </p>
            </div>

            {/* Segmented Horizontal Bar */}
            <div className="w-full h-3 rounded-full bg-stone-100 flex overflow-hidden">
              <div
                style={{ width: `${financialMetrics.tenders.upi.pct}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
                title={`UPI: ${financialMetrics.tenders.upi.pct}%`}
              />
              <div
                style={{ width: `${financialMetrics.tenders.card.pct}%` }}
                className="bg-blue-600 h-full transition-all duration-500"
                title={`Card: ${financialMetrics.tenders.card.pct}%`}
              />
              <div
                style={{ width: `${financialMetrics.tenders.cash.pct}%` }}
                className="bg-emerald-600 h-full transition-all duration-500"
                title={`Cash: ${financialMetrics.tenders.cash.pct}%`}
              />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-700 font-black text-[10px] uppercase mb-0.5">
                  <Smartphone size={11} /> UPI ({financialMetrics.tenders.upi.pct}%)
                </div>
                <p className="font-black text-purple-900 text-xs">
                  ₹{financialMetrics.tenders.upi.amount.toLocaleString("en-IN")}
                </p>
                <span className="text-[9px] text-purple-600 font-bold block">
                  {financialMetrics.tenders.upi.count} txns
                </span>
              </div>

              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-700 font-black text-[10px] uppercase mb-0.5">
                  <CreditCard size={11} /> Card ({financialMetrics.tenders.card.pct}%)
                </div>
                <p className="font-black text-blue-900 text-xs">
                  ₹{financialMetrics.tenders.card.amount.toLocaleString("en-IN")}
                </p>
                <span className="text-[9px] text-blue-600 font-bold block">
                  {financialMetrics.tenders.card.count} txns
                </span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-700 font-black text-[10px] uppercase mb-0.5">
                  <Banknote size={11} /> Cash ({financialMetrics.tenders.cash.pct}%)
                </div>
                <p className="font-black text-emerald-900 text-xs">
                  ₹{financialMetrics.tenders.cash.amount.toLocaleString("en-IN")}
                </p>
                <span className="text-[9px] text-emerald-600 font-bold block">
                  {financialMetrics.tenders.cash.count} txns
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. MENU ANALYTICS (PRODUCT PERFORMANCE) */}
      {/* ========================================================= */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
            3
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Menu Analytics (Product Performance)
            </h3>
            <p className="text-[11px] font-bold text-stone-400">
              High-velocity dishes, top revenue generators, and the Out-of-Stock "86" log
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* 3A: Top 5 Movers (Volume) */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <span className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                <Award size={15} className="text-orange-600" />
                <span>Top 5 Movers (Volume)</span>
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Quantity Sold</span>
            </div>

            <div className="space-y-2.5">
              {menuAnalytics.topMovers.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center font-bold">No dish sales recorded yet</p>
              ) : (
                menuAnalytics.topMovers.map((dish, i) => {
                  const maxQty = menuAnalytics.topMovers[0]?.quantity || 1;
                  const pct = Math.round((dish.quantity / maxQty) * 100);

                  return (
                    <div key={dish.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-900 flex items-center gap-1.5 truncate max-w-[70%]">
                          <span className="w-4 text-center font-black text-orange-600 shrink-0">#{i + 1}</span>
                          <span className="truncate">{dish.name}</span>
                        </span>
                        <span className="font-black text-stone-900 shrink-0">
                          {dish.quantity} <span className="text-[10px] text-stone-400 font-bold">sold</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-orange-600 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3B: Highest Revenue Drivers */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <span className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                <DollarSign size={15} className="text-emerald-600" />
                <span>Highest Revenue Drivers</span>
              </span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Gross Sales</span>
            </div>

            <div className="space-y-2.5">
              {menuAnalytics.highestRevenue.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center font-bold">No dish sales recorded yet</p>
              ) : (
                menuAnalytics.highestRevenue.map((dish, i) => {
                  const maxRev = menuAnalytics.highestRevenue[0]?.revenue || 1;
                  const pct = Math.round((dish.revenue / maxRev) * 100);

                  return (
                    <div key={dish.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-900 flex items-center gap-1.5 truncate max-w-[65%]">
                          <span className="w-4 text-center font-black text-emerald-600 shrink-0">#{i + 1}</span>
                          <span className="truncate">{dish.name}</span>
                        </span>
                        <span className="font-black text-emerald-700 shrink-0">
                          ₹{dish.revenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3C: The "86" Report (Out-of-Stock Monitor) */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <span className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-rose-600" />
                <span>The "86" Report (OOS Monitor)</span>
              </span>
              <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                {menuAnalytics.oosReport.length} Flagged
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {menuAnalytics.oosReport.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={28} className="text-emerald-500 mb-1.5" />
                  <p className="text-xs font-black text-stone-800">100% Menu Available</p>
                  <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                    No dishes currently 86'd or marked out-of-stock
                  </p>
                </div>
              ) : (
                menuAnalytics.oosReport.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-black text-xs text-rose-950">{item.name}</p>
                      <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                        {item.category} • ₹{item.price}
                      </p>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded-md shrink-0">
                      86'd
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. OPERATIONAL EFFICIENCY (TIME & STAFF) */}
      {/* ========================================================= */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
            4
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              Operational Efficiency (Time & Turnaround)
            </h3>
            <p className="text-[11px] font-bold text-stone-400">
              Kitchen ticket prep speed, table seating turnaround, and takeaway split
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 4A: Average Kitchen Ticket Time */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Avg Kitchen Ticket Time
                </span>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                    {operational.avgKitchenMinutes}
                  </p>
                  <span className="text-xs font-bold text-stone-400 uppercase">minutes</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                <Clock size={20} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
              <span className="text-stone-500">Waiter submit → Plated ready</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Optimal Speed
              </span>
            </div>
          </div>

          {/* Card 4B: Average Table Turnaround */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                  Avg Table Turnaround
                </span>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                    {operational.avgTurnaroundMinutes}
                  </p>
                  <span className="text-xs font-bold text-stone-400 uppercase">minutes</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Users size={20} />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold">
              <span className="text-stone-500">Seating scan → Final checkout</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                ~1.6 turns/shift
              </span>
            </div>
          </div>

          {/* Card 4C: Takeaway vs. Dine-in Split */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-2xs space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">
                Takeaway vs. Dine-in Split
              </span>
              <p className="text-xs font-bold text-stone-500">
                Revenue split from parcel tokens vs physical tables
              </p>
            </div>

            {/* Split Visual Bar */}
            <div className="w-full h-3 rounded-full bg-stone-100 flex overflow-hidden">
              <div
                style={{ width: `${dineInPct}%` }}
                className="bg-orange-600 h-full transition-all duration-500"
                title={`Dine-in: ${dineInPct}%`}
              />
              <div
                style={{ width: `${takeawayPct}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
                title={`Takeaway: ${takeawayPct}%`}
              />
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-orange-50/70 p-2.5 rounded-xl border border-orange-200 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-700 font-black text-[10px] uppercase mb-0.5">
                  <UtensilsCrossed size={11} /> Dine-in ({dineInPct}%)
                </div>
                <p className="font-black text-orange-950 text-xs">
                  ₹{operational.dineIn.revenue.toLocaleString("en-IN")}
                </p>
                <span className="text-[9px] text-orange-600 font-bold block">
                  {operational.dineIn.orders} tables
                </span>
              </div>

              <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-700 font-black text-[10px] uppercase mb-0.5">
                  <ShoppingBag size={11} /> Takeaway ({takeawayPct}%)
                </div>
                <p className="font-black text-purple-950 text-xs">
                  ₹{operational.takeaway.revenue.toLocaleString("en-IN")}
                </p>
                <span className="text-[9px] text-purple-600 font-bold block">
                  {operational.takeaway.orders} parcels
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
