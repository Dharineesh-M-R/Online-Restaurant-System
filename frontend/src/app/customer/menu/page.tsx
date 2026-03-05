"use client";

import { useEffect, useState } from "react";
import { 
  Search, 
  ShoppingBag, 
  X, 
  Plus, 
  Info, 
  Home, 
  ReceiptText // Added this icon for the bill button
} from "lucide-react";
import Link from "next/link";
import { useCart, Dish } from "../component/cartContext";

export default function MenuPage() {
  const { addToCart, cartCount, isLoaded } = useCart();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  const [categories, setCategories] = useState<string[]>(["All"]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableNumber = 12;

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        /* ---------------- FETCH CATEGORIES ---------------- */
        const categoryRes = await fetch(`${apiUrl}/menu/categories`);
        if (!categoryRes.ok) throw new Error("Failed to fetch categories");
        const categoryData = await categoryRes.json();
        const categoryNames = categoryData.categories.map((c: any) => c.name);
        setCategories(["All", ...categoryNames]);

        /* ---------------- FETCH MENU ITEMS ---------------- */
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
    const matchesSearch = dish.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || dish.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      {/* Header */}
      {/* Changed items-end to items-center for better vertical alignment with the button */}
      <header className="px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 hover:bg-orange-600 hover:text-white transition-all shrink-0"
          >
            <Home size={20} />
          </Link>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-stone-900">
              Our Menu
            </h1>
            <p className="text-stone-500 font-medium text-sm">
              Table: <span className="text-orange-600 font-bold">{tableNumber}</span>
            </p>
          </div>
        </div>

        {/* Get Bill Button Added Here */}
        {/* If you have a bill page route, you can change this <button> to a <Link href="/customer/bill"> */}
        <Link href="/customer/getbill">
        <button 
          onClick={() => console.log("Get Bill Clicked!")}
          className="flex items-center gap-2 bg-orange-100/80 text-orange-700 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-orange-200 transition-colors shadow-sm border border-orange-200/50 active:scale-95 shrink-0"
        >
          <ReceiptText size={18} />
          <span className="hidden sm:inline">Get Bill</span>
          <span className="sm:hidden">Bill</span>
        </button>
        </Link>
      </header>

      {/* Search Bar */}
      <div className="px-6 mb-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search for something tasty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-transparent shadow-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto px-6 pb-6 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-stone-900 text-white shadow-lg"
                : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dish Grid */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDishes.length === 0 ? (
          <p className="text-center col-span-full text-stone-400 text-lg">
            No dishes found
          </p>
        ) : (
          filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="bg-white rounded-[2.5rem] p-3 shadow-sm border border-stone-100"
            >
              <div className="relative rounded-4xl overflow-hidden mb-4 aspect-video">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                  {dish.category}
                </div>
              </div>

              <div className="px-2 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-lg font-bold leading-tight">{dish.name}</h3>
                  <p className="text-orange-600 font-black">₹{dish.price}</p>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => setSelectedDish(dish)}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <Info size={16} />
                    Details
                  </button>

                  <button
                    onClick={() => addToCart(dish)}
                    className="bg-stone-900 text-white p-3 rounded-2xl hover:bg-orange-600 hover:shadow-lg transition-all active:scale-90"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Button */}
      {isLoaded && cartCount > 0 && (
        <div className="fixed bottom-8 right-6 left-6 flex justify-center z-40">
          <Link
            href="/customer/cart"
            className="flex items-center gap-4 bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-3xl shadow-[0_8px_30px_rgb(234,88,12,0.3)] transition-all active:scale-95"
          >
            <div className="relative">
              <ShoppingBag size={22} />
              <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-lg">View Order</span>
          </Link>
        </div>
      )}

      {/* Dish Modal */}
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
            
            <button
              onClick={() => {
                addToCart(selectedDish);
                setSelectedDish(null);
              }}
              className="w-full bg-stone-900 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg transition-colors shadow-lg active:scale-[0.98]"
            >
              Add to My Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}