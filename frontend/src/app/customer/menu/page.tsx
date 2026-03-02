"use client";

import { useState } from "react";
import { Search, ShoppingBag, X, Plus, Info, Home } from "lucide-react";
import Link from "next/link";

interface Dish {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
}

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  const tableNumber = 12;

  const categories = [
    "All",
    "Starters",
    "Main Course",
    "Desserts",
    "Beverages",
  ];

  const dishes: Dish[] = [
    {
      id: 1,
      name: "Paneer Butter Masala",
      price: 220,
      category: "Main Course",
      description:
        "Rich creamy tomato gravy with soft paneer cubes, finished with butter and fresh cream.",
      image:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=400",
    },
    {
      id: 2,
      name: "Veg Manchurian",
      price: 180,
      category: "Starters",
      description:
        "Crispy vegetable balls tossed in a tangy, spicy, and slightly sweet Indo-Chinese sauce.",
      image:
        "https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?auto=format&fit=crop&q=80&w=400",
    },
    {
      id: 3,
      name: "Chocolate Brownie",
      price: 150,
      category: "Desserts",
      description:
        "Warm, gooey chocolate brownie served with a scoop of premium vanilla bean ice cream.",
      image:
        "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=400",
    },
  ];

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch = dish.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || dish.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (dish: Dish) => {
    // Replace with your actual cart logic later
    console.log(`Added ${dish.name} to cart`);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-28">
      {/* Header */}
      {/* Header */}
      <header className="px-6 py-8 flex justify-between items-end">
        <div className="flex items-center gap-4">
          {/* Home Button */}
          <Link
            href="/"
            className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 hover:bg-orange-600 hover:text-white transition-all"
          >
            <Home size={20} />
          </Link>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-stone-900">
              Our Menu
            </h1>
            <p className="text-stone-500 font-medium">
              Table No: <span className="text-orange-600">{tableNumber}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-6 mb-8">
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search for something tasty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-transparent shadow-sm focus:border-orange-500 focus:outline-none transition-all text-stone-800 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto px-6 pb-6 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-200 ${
              selectedCategory === cat
                ? "bg-stone-900 text-white shadow-lg shadow-stone-200"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dish Grid */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDishes.map((dish) => (
          <div
            key={dish.id}
            className="bg-white rounded-[2.5rem] p-3 shadow-sm border border-stone-100 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="relative rounded-[2rem] overflow-hidden mb-4 aspect-square sm:aspect-video">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-800">
                {dish.category}
              </div>
            </div>

            <div className="px-2 pb-2">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-lg font-bold text-stone-800">
                  {dish.name}
                </h3>
                <p className="text-lg font-black text-orange-600">
                  ₹{dish.price}
                </p>
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setSelectedDish(dish)}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-tight"
                >
                  <Info size={14} />
                  Details
                </button>
                <button
                  onClick={() => addToCart(dish)}
                  className="bg-stone-900 text-white p-3 rounded-2xl hover:bg-orange-600 transition-colors shadow-lg active:scale-90"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed View Cart Button */}
      <div className="fixed bottom-8 right-6 left-6 flex justify-center pointer-events-none">
        <Link
          href="/customer/cart"
          className="pointer-events-auto flex items-center gap-4 bg-orange-600 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 group"
        >
          <div className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
              3
            </span>
          </div>
          <span className="font-bold text-lg">View Order</span>
        </Link>
      </div>

      {/* Modal */}
      {selectedDish && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
          <div className="bg-white p-8 rounded-t-[3rem] sm:rounded-[3rem] max-w-md w-full shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-stone-900 leading-tight">
                  {selectedDish.name}
                </h2>
                <p className="text-orange-600 font-black text-xl mt-1">
                  ₹{selectedDish.price}
                </p>
              </div>
              <button
                onClick={() => setSelectedDish(null)}
                className="p-2 bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-stone-500 leading-relaxed text-lg mb-8">
              {selectedDish.description}
            </p>

            <button
              onClick={() => {
                addToCart(selectedDish);
                setSelectedDish(null);
              }}
              className="w-full bg-stone-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-stone-200 active:scale-95 transition-transform"
            >
              Add to My Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
