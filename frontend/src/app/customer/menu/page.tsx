"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Info,
  ReceiptText,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Flame,
  Leaf,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Dish } from "@/types/cart";

export default function MenuPage() {
  const { cart, addToCart, updateQuantity, cartCount, isLoaded, tableNumber } =
    useCart();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  const [categories, setCategories] = useState<string[]>(["All"]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Waiter call state & feedback
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterNotified, setWaiterNotified] = useState(false);

  // Veg only filter toggle
  const [vegOnly, setVegOnly] = useState(false);

  const isParcel = Number(tableNumber) > 100;

  const callWaiter = async () => {
    if (isCallingWaiter || waiterNotified) return;
    setIsCallingWaiter(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/menu/call-waiter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      if (res.ok) {
        setWaiterNotified(true);
        setTimeout(() => setWaiterNotified(false), 5000);
      }
    } catch (err) {
      console.error("Error calling waiter", err);
    } finally {
      setIsCallingWaiter(false);
    }
  };

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const categoryRes = await fetch(`${apiUrl}/menu/categories`);
        if (!categoryRes.ok) throw new Error("Failed to fetch categories");
        const categoryData = await categoryRes.json();
        const categoryNames = categoryData.categories.map((c: any) => c.name);
        setCategories(["All", ...categoryNames]);

        const menuRes = await fetch(`${apiUrl}/menu/items`);
        if (!menuRes.ok) throw new Error("Failed to fetch menu items");
        const menuData = await menuRes.json();
        setDishes(menuData.menuItems);
      } catch (error) {
        console.error("Error fetching menu:", error);
        setError("Failed to load the menu. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
    const interval = setInterval(fetchMenuData, 6000);
    return () => clearInterval(interval);
  }, []);

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name
      .toLowerCase()
      .includes(search.toLowerCase()) ||
      (dish.description && dish.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory =
      selectedCategory === "All" || dish.category === selectedCategory;

    const isDishVeg = dish.isVeg ?? (!dish.category?.toLowerCase().includes("non veg"));
    const matchesVeg = !vegOnly || isDishVeg;

    return matchesSearch && matchesCategory && matchesVeg;
  });

  const getDishQuantity = (dishId: number) => {
    const cartItem = cart.find((item) => item.id === dishId);
    return cartItem ? cartItem.quantity : 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center text-stone-900 font-sans p-6">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4 animate-bounce">
          <Loader2 size={28} className="animate-spin" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-stone-800">Preparing Delicious Menu</h2>
        <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mt-1">Syncing with kitchen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#faf9f6]">
        <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-sm max-w-sm w-full">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={24} />
          </div>
          <h3 className="text-lg font-black text-stone-900 mb-1">Unable to Load Menu</h3>
          <p className="text-stone-500 text-xs mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 pb-36 font-sans selection:bg-orange-500/20">
      
      {/* Toast Notification for Waiter Call */}
      {waiterNotified && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-top-4 duration-300">
          <div className="bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-700 max-w-sm w-full">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold">Waiter Alerted!</p>
              <p className="text-[11px] text-stone-400">A service member has been assigned to your table.</p>
            </div>
            <button onClick={() => setWaiterNotified(false)} className="text-stone-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-stone-200/60 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="group">
            <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs group-hover:bg-stone-100 transition">
              <span className="text-lg font-black leading-none">🍽️</span>
            </div>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 leading-none">
              Foodie Menu
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isParcel ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {isParcel ? `Takeaway #${Number(tableNumber) - 100}` : `Table #${tableNumber}`}
              </span>
              <span className="text-stone-400 text-[10px] font-medium hidden sm:inline">• Live Ordering</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Call Waiter Action Button */}
          {!isParcel && (
            <button
              onClick={callWaiter}
              disabled={isCallingWaiter || waiterNotified}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border active:scale-95 ${
                waiterNotified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:text-stone-900 shadow-2xs"
              }`}
            >
              {isCallingWaiter ? (
                <Loader2 size={15} className="animate-spin text-orange-600" />
              ) : waiterNotified ? (
                <CheckCircle2 size={15} className="text-emerald-600" />
              ) : (
                <BellRing size={15} className="text-orange-600" />
              )}
              <span className="hidden sm:inline">
                {waiterNotified ? "Notified" : "Call Waiter"}
              </span>
            </button>
          )}

          {/* Quick Bill Link */}
          <Link href={`/customer/getbill?table=${tableNumber}`}>
            <button className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl font-black text-xs shadow-xs transition-all active:scale-95 shrink-0">
              <ReceiptText size={15} />
              <span>Bill</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Search & Dietary Filter Section */}
      <div className="px-4 sm:px-6 pt-4 pb-2 max-w-6xl mx-auto">
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search delicious starters, biryanis, breads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs focus:border-orange-500 focus:bg-white focus:outline-none text-sm font-medium text-stone-900 placeholder:text-stone-400 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Pure Veg Toggle Chip */}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl border font-black text-xs transition-all active:scale-95 shrink-0 ${
              vegOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                : "bg-white text-stone-600 border-stone-200/80 hover:bg-stone-50"
            }`}
          >
            <div className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center ${vegOnly ? "border-white" : "border-emerald-600"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${vegOnly ? "bg-white" : "bg-emerald-600"}`} />
            </div>
            <span className="hidden sm:inline">Pure Veg</span>
          </button>
        </div>
      </div>

      {/* Categories Horizontal Sticky Pill Bar */}
      <div className="sticky top-[73px] z-20 bg-[#faf9f6]/95 backdrop-blur-md py-2.5 border-b border-stone-200/40">
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

      {/* Menu Dishes Grid */}
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
            <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
              We couldn't find anything matching your search. Try adjusting filters or searching a different term.
            </p>
            {(search || vegOnly || selectedCategory !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setVegOnly(false);
                  setSelectedCategory("All");
                }}
                className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDishes.map((dish) => {
              const quantity = getDishQuantity(dish.id);
              const isDishVeg = dish.isVeg ?? (!dish.category?.toLowerCase().includes("non veg"));

              return (
                <div
                  key={dish.id}
                  className="bg-white rounded-3xl p-3.5 border border-stone-200/70 shadow-xs hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between group"
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
                        <div className={`w-3 h-3 border rounded-xs flex items-center justify-center ${isDishVeg ? "border-emerald-600" : "border-rose-600"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isDishVeg ? "bg-emerald-600" : "bg-rose-600"}`} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-stone-700">
                          {isDishVeg ? "Veg" : "Non-Veg"}
                        </span>
                      </div>

                      {/* Sold Out Badge */}
                      {dish.isAvailable === false && (
                        <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                          Out of Stock
                        </div>
                      )}

                      {/* Category tag */}
                      <div className="absolute bottom-2.5 left-2.5 bg-stone-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[9px] font-bold text-white shadow-xs">
                        {dish.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-black text-stone-900 leading-snug group-hover:text-orange-600 transition-colors line-clamp-1">
                          {dish.name}
                        </h3>
                      </div>

                      <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed mb-3 min-h-8">
                        {dish.description || "Authentic chef's recipe made with fresh ingredients and signature spices."}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action Row */}
                  <div className="px-1 pt-3 border-t border-stone-100 flex items-center justify-between gap-2 mt-auto">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block leading-none">Price</span>
                      <span className="text-lg font-black text-stone-900">
                        ₹{dish.price}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDish(dish)}
                        className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                        title="Dish details"
                      >
                        <Info size={16} />
                      </button>

                      {dish.isAvailable === false ? (
                        <span className="bg-rose-50 border border-rose-200 text-rose-600 font-black text-[10px] px-2.5 py-2 rounded-xl uppercase tracking-wider select-none">
                          Sold Out
                        </span>
                      ) : quantity === 0 ? (
                        <button
                          onClick={() => addToCart(dish)}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow-xs hover:shadow-md hover:shadow-orange-600/20 active:scale-90 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={3} />
                          <span>ADD</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-stone-900 text-white rounded-xl p-0.5 shadow-md shadow-stone-900/20">
                          <button
                            onClick={() => updateQuantity(dish.id, -1)}
                            className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors active:scale-90 text-stone-200"
                          >
                            <Minus size={14} strokeWidth={3} />
                          </button>
                          <span className="w-6 text-center font-black text-xs text-white">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(dish.id, 1)}
                            className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors active:scale-90 text-stone-200"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Pill */}
      {isLoaded && cartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 flex justify-center animate-in slide-in-from-bottom-5 duration-300">
          <Link
            href={`/customer/cart?table=${tableNumber}`}
            className="flex items-center justify-between w-full max-w-md bg-stone-900 hover:bg-black text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-stone-900/30 border border-stone-800 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                <ShoppingBag size={18} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black leading-none text-white">
                  {cartCount} {cartCount === 1 ? "Item" : "Items"} in Cart
                </span>
                <span className="text-[11px] font-bold text-orange-400 mt-1 leading-none">
                  Total: ₹{cartTotal}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 group-hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs font-black transition">
              <span>View Order</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* Dish Info Dialog Modal */}
      {selectedDish && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
            
            <div className="relative rounded-2xl overflow-hidden aspect-16/10 mb-4 bg-stone-100">
              <img
                src={selectedDish.image || "/dish.jpg"}
                alt={selectedDish.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/dish.jpg";
                }}
              />
              <button
                onClick={() => setSelectedDish(null)}
                className="absolute top-3 right-3 bg-stone-900/80 hover:bg-stone-900 text-white p-2 rounded-full transition-colors shadow-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-0.5">
                  {selectedDish.category}
                </span>
                <h2 className="text-xl font-black text-stone-900 leading-tight">
                  {selectedDish.name}
                </h2>
              </div>
              <span className="text-2xl font-black text-stone-900">
                ₹{selectedDish.price}
              </span>
            </div>

            <p className="text-stone-600 text-sm leading-relaxed mb-6">
              {selectedDish.description || "Prepared fresh to order by our master chefs with regional seasonings and authentic ingredients."}
            </p>

            <div className="pt-4 border-t border-stone-100">
              {getDishQuantity(selectedDish.id) === 0 ? (
                <button
                  onClick={() => addToCart(selectedDish)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-orange-600/25 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>Add to My Order • ₹{selectedDish.price}</span>
                </button>
              ) : (
                <div className="flex items-center justify-between bg-stone-100 rounded-2xl p-2 border border-stone-200">
                  <button
                    onClick={() => updateQuantity(selectedDish.id, -1)}
                    className="bg-white text-stone-800 p-2.5 rounded-xl shadow-xs hover:bg-stone-50 transition active:scale-90"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      In Your Order
                    </span>
                    <span className="text-xl font-black text-stone-900">
                      {getDishQuantity(selectedDish.id)}
                    </span>
                  </div>
                  <button
                    onClick={() => updateQuantity(selectedDish.id, 1)}
                    className="bg-orange-600 text-white p-2.5 rounded-xl shadow-xs hover:bg-orange-700 transition active:scale-90"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
