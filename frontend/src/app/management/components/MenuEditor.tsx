"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  X,
  UtensilsCrossed,
  Check,
  AlertCircle,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  category_name: string;
  is_available: boolean;
}

export default function MenuEditor() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("All");

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    is_available: true,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch(`${apiUrl}/management/menu`),
        fetch(`${apiUrl}/management/categories`),
      ]);
      if (menuRes.ok) setMenuItems((await menuRes.json()).items);
      if (catRes.ok) {
        const cats = (await catRes.json()).categories;
        setCategories(cats);
        if (cats.length > 0)
          setMenuForm((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (error) {
      console.error("Failed to fetch menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const toggleStock = async (id: string, currentStatus: boolean) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_available: !currentStatus } : item
      )
    );
    try {
      await fetch(`${apiUrl}/management/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !currentStatus }),
      });
    } catch (err) {
      console.error("Failed to update stock", err);
      fetchData();
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this menu item?")) return;
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`${apiUrl}/management/menu/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete", err);
      fetchData();
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingItem;
    const url = isEdit
      ? `${apiUrl}/management/menu/${editingItem.id}`
      : `${apiUrl}/management/menu`;

    try {
      const payload = {
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        category_id: menuForm.category_id,
        is_available: menuForm.is_available,
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setMenuItems((prev) =>
            prev.map((item) => (item.id === data.item.id ? data.item : item))
          );
        } else {
          setMenuItems((prev) => [...prev, data.item]);
        }
        setIsMenuModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save menu item", err);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setMenuForm({
      name: "",
      description: "",
      price: "",
      category_id: categories.length > 0 ? categories[0].id : "",
      is_available: true,
    });
    setIsMenuModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category_id: item.category_id,
      is_available: item.is_available,
    });
    setIsMenuModalOpen(true);
  };

  const displayMenu = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(menuSearch.toLowerCase());
    const matchesCat =
      menuCategoryFilter === "All" || item.category_name === menuCategoryFilter;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-stone-400 font-bold text-xs uppercase tracking-widest">
        <UtensilsCrossed size={32} className="animate-bounce mb-2 text-orange-500" />
        <span>Loading Menu Catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Filter and Add Bar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-2xs flex flex-col md:flex-row gap-3 justify-between items-center">
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
          <input
            type="text"
            placeholder="Search dish title or recipe..."
            className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
          />
          {menuSearch && (
            <button
              onClick={() => setMenuSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative">
            <select
              className="appearance-none bg-stone-50 border border-stone-200 text-stone-800 py-2.5 pl-4 pr-9 rounded-2xl text-xs font-black outline-none focus:border-orange-500 cursor-pointer"
              value={menuCategoryFilter}
              onChange={(e) => setMenuCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>

          <button
            onClick={openAddModal}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-orange-600/20 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Add Dish</span>
          </button>
        </div>

      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200/80 text-stone-400 text-[10px] uppercase tracking-widest font-black">
                <th className="py-4 px-5">Dish Title & Description</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Price</th>
                <th className="py-4 px-5">Live Availability</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {displayMenu.map((item) => (
                <tr key={item.id} className="hover:bg-[#faf9f6] transition">
                  <td className="py-4 px-5 max-w-xs">
                    <span className="font-black text-stone-900 text-sm block leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium block truncate mt-0.5">
                      {item.description || "No description provided"}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="bg-stone-100 text-stone-700 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                      {item.category_name}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-black text-stone-900 text-sm">
                    ₹{item.price}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleStock(item.id, item.is_available)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          item.is_available ? "bg-emerald-500" : "bg-stone-300"
                        }`}
                        title="Toggle availability"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            item.is_available ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          item.is_available ? "text-emerald-700" : "text-stone-400"
                        }`}
                      >
                        {item.is_available ? "In Stock" : "Unavailable"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
                        title="Edit details"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                        title="Delete dish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayMenu.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400 font-bold">
                    No dishes found in menu catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Menu Item Dialog Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-[#faf9f6]">
              <h3 className="text-lg font-black text-stone-900">
                {editingItem ? "Edit Dish Recipe" : "Add New Menu Item"}
              </h3>
              <button
                onClick={() => setIsMenuModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1 ml-1">
                  Dish Title
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Malai Kofta"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1 ml-1">
                  Short Description
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Appetizing description of ingredients and spices..."
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1 ml-1">
                    Price (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="250"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1 ml-1">
                    Category
                  </label>
                  <select
                    required
                    value={menuForm.category_id}
                    onChange={(e) => setMenuForm({ ...menuForm, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 outline-none focus:bg-white focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-orange-600/20 transition cursor-pointer"
                >
                  {editingItem ? "Save Changes" : "Create Dish"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
