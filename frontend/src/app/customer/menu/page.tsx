"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Info,
  Home,
  ReceiptText,
  BellRing,
} from "lucide-react";
import Link from "next/link";
import { useCart, Dish } from "../component/cartContext";

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
  const callWaiter = async () => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://172.18.170.244:5000";
      const res = await fetch(`${apiUrl}/menu/call-waiter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      if (res.ok) {
        alert("A waiter has been notified!");
      }
    } catch (err) {
      console.error("Error calling waiter", err);
    }
  };

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://172.18.170.244:5000";

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
  }, []);

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || dish.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getDishQuantity = (dishId: number) => {
    const cartItem = cart.find((item) => item.id === dishId);
    return cartItem ? cartItem.quantity : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-bold bg-stone-50 text-stone-900">
        Loading Menu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 font-bold p-6 text-center bg-stone-50">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28">
      <header className="px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* ... Home Link ... */}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 leading-none">
              Our Menu
            </h1>
            <p className="text-stone-500 font-medium text-xs mt-1">
              Table:{" "}
              <span className="text-orange-600 font-bold">{tableNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* NEW CALL WAITER BUTTON */}
          <button
            onClick={callWaiter}
            className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-2.5 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors border border-red-100 active:scale-95"
          >
            <BellRing size={16} />
            <span>Call Waiter</span>
          </button>

          <Link href={`/customer/getbill?table=${tableNumber}`}>
            <button className="flex items-center gap-1.5 bg-orange-100/80 text-orange-700 px-3 py-2.5 rounded-xl font-bold text-xs hover:bg-orange-200 transition-colors border border-orange-200/50 active:scale-95 shrink-0">
              <ReceiptText size={16} />
              <span>Bill</span>
            </button>
          </Link>
        </div>
      </header>

      <div className="px-4 mb-6">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search for something tasty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border-2 border-transparent shadow-sm focus:border-orange-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-stone-900 text-white shadow-md"
                : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredDishes.length === 0 ? (
          <p className="text-center col-span-full text-stone-400 text-sm mt-4">
            No dishes found
          </p>
        ) : (
          filteredDishes.map((dish) => {
            const quantity = getDishQuantity(dish.id);

            return (
              <div
                key={dish.id}
                className="bg-white rounded-3xl p-2 shadow-sm border border-stone-100 flex flex-col"
              >
                <div className="relative rounded-[1.25rem] overflow-hidden mb-3 aspect-square bg-stone-100">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-stone-700 shadow-sm truncate max-w-[80%]">
                    {dish.category}
                  </div>
                </div>

                <div className="px-1 pb-1 flex-1 flex flex-col justify-between">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold leading-tight text-stone-900 line-clamp-2 mb-1">
                      {dish.name}
                    </h3>
                    <p className="text-orange-600 font-black text-sm">
                      ₹{dish.price}
                    </p>
                  </div>

                  <div className="flex justify-between items-end gap-1 mt-auto">
                    <button
                      onClick={() => setSelectedDish(dish)}
                      className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-stone-700 transition-colors pb-1"
                    >
                      <Info size={12} />
                      Info
                    </button>

                    {quantity === 0 ? (
                      <button
                        onClick={() => addToCart(dish)}
                        className="bg-stone-900 text-white p-2 rounded-xl hover:bg-orange-600 hover:shadow-lg transition-all active:scale-90"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    ) : (
                      <div className="flex items-center bg-orange-600 text-white rounded-xl p-0.5 shadow-md shadow-orange-200 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => updateQuantity(dish.id, -1)}
                          className="p-1.5 hover:bg-orange-700 rounded-lg transition-colors active:scale-90"
                        >
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(dish.id, 1)}
                          className="p-1.5 hover:bg-orange-700 rounded-lg transition-colors active:scale-90"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isLoaded && cartCount > 0 && (
        <div className="fixed bottom-6 right-4 left-4 flex justify-center z-40">
          <Link
            href={`/customer/cart?table=${tableNumber}`}
            className="flex items-center justify-between w-full max-w-sm bg-orange-600 hover:bg-orange-700 text-white px-5 py-4 rounded-2xl shadow-[0_8px_30px_rgb(234,88,12,0.3)] transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-orange-200 uppercase tracking-wide leading-none">
                  {cartCount} {cartCount === 1 ? "Item" : "Items"} Added
                </span>
                <span className="font-bold text-sm leading-none mt-1">
                  View Order
                </span>
              </div>
            </div>
            <div className="bg-white/20 p-2 rounded-xl">
              <Plus size={16} className="rotate-45" />
            </div>
          </Link>
        </div>
      )}

      {selectedDish && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-black text-stone-900 leading-tight mb-1">
                  {selectedDish.name}
                </h2>
                <p className="text-orange-600 font-black text-xl">
                  ₹{selectedDish.price}
                </p>
              </div>
              <button
                onClick={() => setSelectedDish(null)}
                className="bg-stone-100 p-2 rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-stone-500 font-medium text-sm leading-relaxed mb-8">
              {selectedDish.description}
            </p>

            {getDishQuantity(selectedDish.id) === 0 ? (
              <button
                onClick={() => addToCart(selectedDish)}
                className="w-full bg-stone-900 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg transition-colors shadow-lg active:scale-[0.98]"
              >
                Add to My Order
              </button>
            ) : (
              <div className="flex items-center justify-between bg-orange-50 rounded-2xl p-2 border border-orange-100">
                <button
                  onClick={() => updateQuantity(selectedDish.id, -1)}
                  className="bg-white text-orange-600 p-3 rounded-xl shadow-sm hover:bg-orange-100 transition-colors active:scale-90"
                >
                  <Minus size={20} strokeWidth={3} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
                    Quantity
                  </span>
                  <span className="text-2xl font-black text-stone-900">
                    {getDishQuantity(selectedDish.id)}
                  </span>
                </div>
                <button
                  onClick={() => updateQuantity(selectedDish.id, 1)}
                  className="bg-orange-600 text-white p-3 rounded-xl shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors active:scale-90"
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
