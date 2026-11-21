"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  X,
  Info,
  ChevronRight,
  Flame,
  Leaf,
  Loader2,
  UtensilsCrossed,
  QrCode,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getApiUrl } from "@/lib/utils";

interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg?: boolean;
  isAvailable?: boolean;
}

export default function PublicViewOnlyMenuPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);

  const [categories, setCategories] = useState<string[]>(["All"]);
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Veg only filter toggle
  const [vegOnly, setVegOnly] = useState(false);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const apiUrl = getApiUrl();

        const [catRes, menuRes] = await Promise.all([
          fetch(`${apiUrl}/menu/categories`),
          fetch(`${apiUrl}/menu/items`),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          const names = Array.isArray(catData.categories)
            ? catData.categories.map((c: any) => c.name)
            : [];
          setCategories(["All", ...names]);
        }

        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setDishes(menuData.menuItems || []);
        } else {
          throw new Error("Failed to load menu items");
        }
      } catch (err: any) {
        console.error("Error fetching public menu:", err);
        setError("Failed to load the menu. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
    const interval = setInterval(fetchMenuData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync category from URL parameter (e.g. ?category=Desserts)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      if (catParam) {
        setSelectedCategory(catParam);
      }
    }
  }, []);

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch =
      dish.name.toLowerCase().includes(search.toLowerCase()) ||
      (dish.description && dish.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || dish.category === selectedCategory;

    const isDishVeg =
      dish.isVeg ?? (!dish.category?.toLowerCase().includes("non veg"));
    const matchesVeg = !vegOnly || isDishVeg;

    return matchesSearch && matchesCategory && matchesVeg;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center text-stone-900 font-sans p-6">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 animate-bounce">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-stone-800">
          Preparing Delicious Menu
        </h2>
        <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mt-1">
          Syncing live kitchen catalog...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#faf9f6] font-sans">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-sm max-w-sm w-full">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={24} />
          </div>
          <h3 className="text-lg font-black text-stone-900 mb-1">Unable to Load Menu</h3>
          <p className="text-stone-500 text-xs mb-6 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-stone-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 font-sans selection:bg-orange-500/20 pb-20">
      
      {/* 1. SLIM TOP DINE-IN INFO STRIP */}
      <div className="bg-orange-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
        <Sparkles size={14} className="shrink-0" />
        <span>
          Browsing Live Menu — Scan the QR code at your dining table to order, or{" "}
          <Link
            href="/customer/parcel"
            className="underline underline-offset-2 hover:text-orange-100 font-black inline-flex items-center gap-0.5"
          >
            <span>Order Takeaway Parcel</span>
            <ArrowRight size={12} />
          </Link>
        </span>
      </div>

      {/* 2. STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-stone-200/60 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-stone-900 leading-tight block">
                Foodie Delight
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  View-Only Menu
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Action: Direct Takeaway Parcel CTA */}
        <div className="flex items-center gap-2">
          <Link href="/customer/parcel">
            <button className="flex items-center gap-1.5 bg-stone-900 hover:bg-black text-white px-3.5 py-2 rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer">
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">Order</span> Takeaway
            </button>
          </Link>
        </div>
      </header>

      {/* 3. SEARCH & DIETARY FILTER BAR */}
      <div className="px-4 sm:px-6 pt-4 pb-2 max-w-6xl mx-auto">
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search starters, biryanis, curries, desserts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs focus:border-orange-500 focus:bg-white focus:outline-none text-sm font-medium text-stone-900 placeholder:text-stone-400 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Pure Veg Toggle Chip */}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl border font-black text-xs transition-all active:scale-95 shrink-0 cursor-pointer ${
              vegOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                : "bg-white text-stone-600 border-stone-200/80 hover:bg-stone-50"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center ${
                vegOnly ? "border-white" : "border-emerald-600"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  vegOnly ? "bg-white" : "bg-emerald-600"
                }`}
              />
            </div>
            <span className="hidden sm:inline">Pure Veg</span>
          </button>
        </div>
      </div>

      {/* 4. CATEGORIES HORIZONTAL STICKY PILL BAR */}
      <div className="sticky top-[61px] sm:top-[65px] z-20 bg-[#faf9f6]/95 backdrop-blur-md py-2.5 border-b border-stone-200/40">
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-6 no-scrollbar max-w-6xl mx-auto">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-stone-900 text-white shadow-md shadow-stone-900/15 scale-102"
                    : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200/80 hover:border-stone-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. MENU ITEMS SHOWCASE */}
      <div className="px-4 sm:px-6 pt-5 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-black uppercase text-stone-400 tracking-wider">
            {selectedCategory} ({filteredDishes.length} Items)
          </p>
        </div>

        {filteredDishes.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-stone-200/80 p-8">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
              <Search size={28} />
            </div>
            <h3 className="text-base font-black text-stone-800">No matching dishes</h3>
            <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto font-medium">
              We couldn't find anything matching your search. Try adjusting filters or searching a different term.
            </p>
            {(search || vegOnly || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setVegOnly(false);
                  setSelectedCategory("All");
                }}
                className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 5a. Mobile Horizontal List (< 768px - Compact Swiggy/Zomato style) */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredDishes.map((dish) => {
                const isDishVeg =
                  dish.isVeg ?? (!dish.category?.toLowerCase().includes("non veg"));

                return (
                  <div
                    key={dish.id}
                    onClick={() => setSelectedDish(dish)}
                    className={`bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer ${
                      dish.isAvailable === false
                        ? "opacity-60 bg-stone-50/60"
                        : "hover:border-stone-300"
                    }`}
                  >
                    {/* Left Column (flex-1 min-w-0 pr-2) */}
                    <div className="flex-1 min-w-0 pr-2">
                      {/* Veg / Non-Veg Indicator + Category */}
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center shrink-0 ${
                            isDishVeg ? "border-emerald-600" : "border-rose-600"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDishVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>
                        {dish.category && (
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider truncate">
                            {dish.category}
                          </span>
                        )}
                      </div>

                      {/* Dish Name */}
                      <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">
                        {dish.name}
                      </h3>

                      {/* Price Directly Below (No uppercase label) */}
                      <p className="font-black text-gray-900 text-sm mt-0.5">
                        ₹{dish.price}
                      </p>

                      {/* 2-line Description */}
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                        {dish.description ||
                          "Authentic chef's recipe made with fresh ingredients and signature spices."}
                      </p>
                    </div>

                    {/* Right Column: Square Photo with subtle status badge */}
                    <div className="relative w-[108px] h-[108px] shrink-0 mb-1">
                      <img
                        src={dish.image || "/dish.jpg"}
                        alt={dish.name}
                        className="w-full h-full object-cover rounded-2xl bg-stone-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/dish.jpg";
                        }}
                      />

                      {dish.isAvailable === false ? (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[88px] bg-rose-50 border border-rose-200 text-rose-600 font-black text-[9px] py-1 rounded-xl uppercase tracking-wider text-center select-none shadow-xs">
                          Unavailable
                        </div>
                      ) : (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[88px] bg-white/95 border border-stone-200 text-stone-600 font-bold text-[9px] py-0.5 rounded-xl uppercase tracking-wider text-center select-none shadow-xs">
                          View Dish
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5b. Desktop & Tablet Grid (>= 768px) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDishes.map((dish) => {
                const isDishVeg =
                  dish.isVeg ?? (!dish.category?.toLowerCase().includes("non veg"));

                return (
                  <div
                    key={dish.id}
                    onClick={() => setSelectedDish(dish)}
                    className="bg-white rounded-3xl p-3.5 border border-stone-200/70 shadow-xs hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Dish Image Container */}
                      <div className="relative rounded-2xl overflow-hidden mb-3 aspect-4/3 bg-stone-100">
                        <img
                          src={dish.image || "/dish.jpg"}
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/dish.jpg";
                          }}
                        />

                        {/* Dietary Tag Badge */}
                        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                          <div
                            className={`w-3 h-3 border rounded-xs flex items-center justify-center ${
                              isDishVeg ? "border-emerald-600" : "border-rose-600"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDishVeg ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                            {isDishVeg ? "Veg" : "Non-Veg"}
                          </span>
                        </div>

                        {/* Unavailable Badge */}
                        {dish.isAvailable === false && (
                          <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                            Unavailable
                          </div>
                        )}

                        {/* Category tag */}
                        <div className="absolute bottom-2.5 left-2.5 bg-stone-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[9px] font-bold text-white shadow-xs">
                          {dish.category}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="px-1">
                        <h3 className="text-base font-black text-stone-900 leading-snug group-hover:text-orange-600 transition-colors line-clamp-1 mb-1">
                          {dish.name}
                        </h3>

                        <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed mb-3 min-h-8">
                          {dish.description ||
                            "Authentic chef's recipe made with fresh ingredients and signature spices."}
                        </p>
                      </div>
                    </div>

                    {/* Price & Details Footer (Read-Only) */}
                    <div className="px-1 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 mt-auto">
                      <div>
                        <span className="text-lg font-black text-stone-900">
                          ₹{dish.price}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-black text-stone-500 group-hover:text-orange-600 transition-colors">
                        <span>Details</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 6. DISH DETAIL BOTTOM SHEET / MODAL (Slide-up on mobile, centered modal on desktop) */}
      {selectedDish && (
        <div
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDish(null)}
        >
          <div
            className="bg-white w-full md:max-w-md rounded-t-[2rem] md:rounded-3xl shadow-2xl border border-stone-200 max-h-[88vh] overflow-y-auto flex flex-col animate-in slide-in-from-bottom duration-300 md:animate-in md:zoom-in-95 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-3 md:hidden shrink-0" />

            {/* Close button */}
            <button
              onClick={() => setSelectedDish(null)}
              className="absolute top-3 right-3 bg-stone-900/80 hover:bg-stone-900 text-white p-2 rounded-full transition-colors shadow-md z-10 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
              {/* Large Dish Image */}
              <div className="relative rounded-2xl overflow-hidden aspect-16/10 mb-4 bg-stone-100">
                <img
                  src={selectedDish.image || "/dish.jpg"}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/dish.jpg";
                  }}
                />

                {/* Veg / Non-Veg Tag */}
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                  <div
                    className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center ${
                      (selectedDish.isVeg ?? !selectedDish.category?.toLowerCase().includes("non veg"))
                        ? "border-emerald-600"
                        : "border-rose-600"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        (selectedDish.isVeg ?? !selectedDish.category?.toLowerCase().includes("non veg"))
                          ? "bg-emerald-600"
                          : "bg-rose-600"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                    {(selectedDish.isVeg ?? !selectedDish.category?.toLowerCase().includes("non veg"))
                      ? "Veg"
                      : "Non-Veg"}
                  </span>
                </div>

                {selectedDish.isAvailable === false && (
                  <div className="absolute top-2.5 right-12 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                    Unavailable
                  </div>
                )}
              </div>

              {/* Category, Title, Price */}
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-0.5">
                    {selectedDish.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                    {selectedDish.name}
                  </h2>
                </div>
                <span className="text-2xl font-black text-stone-900 shrink-0">
                  ₹{selectedDish.price}
                </span>
              </div>

              {/* Full Untruncated Description */}
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                {selectedDish.description ||
                  "Prepared fresh to order by our master chefs with regional seasonings and authentic ingredients."}
              </p>

              {/* Helpful Ordering Guide Box (No Add button, No Chef Notes) */}
              <div className="bg-orange-50/80 border border-orange-200/80 rounded-2xl p-4 text-xs mb-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode size={16} />
                  </div>
                  <div>
                    <h4 className="font-black text-stone-900 text-xs mb-0.5">
                      How to Order This Dish
                    </h4>
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      If seated in the restaurant, scan your tabletop standee QR code to start live ordering. Or place an order for express parcel pickup below.
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-orange-200/60 flex items-center justify-end">
                  <Link
                    href="/customer/parcel"
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black text-center shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} />
                    <span>Order for Takeaway Parcel</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
