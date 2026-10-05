"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Plus, Edit, Trash2, X } from "lucide-react";

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
  const [menuForm, setMenuForm] = useState({ name: "", description: "", price: "", category_id: "", is_available: true });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch(`${apiUrl}/management/menu`),
        fetch(`${apiUrl}/management/categories`)
      ]);
      if (menuRes.ok) setMenuItems((await menuRes.json()).items);
      if (catRes.ok) {
        const cats = (await catRes.json()).categories;
        setCategories(cats);
        if (cats.length > 0) setMenuForm(prev => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (error) {
      console.error("Failed to fetch menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const toggleStock = async (id: string, currentStatus: boolean) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, is_available: !currentStatus } : item));
    try {
      await fetch(`${apiUrl}/management/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !currentStatus })
      });
    } catch (err) {
      console.error("Failed to update stock", err);
      fetchData(); 
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    setMenuItems(prev => prev.filter(item => item.id !== id));
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
    const url = isEdit ? `${apiUrl}/management/menu/${editingItem.id}` : `${apiUrl}/management/menu`;

    try {
      const payload = {
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        category_id: menuForm.category_id,
        is_available: menuForm.is_available
      };
      
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setMenuItems(prev => prev.map(item => item.id === data.item.id ? data.item : item));
        } else {
          setMenuItems(prev => [...prev, data.item]);
        }
        setIsMenuModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to save menu item", err);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setMenuForm({ name: "", description: "", price: "", category_id: categories.length > 0 ? categories[0].id : "", is_available: true });
    setIsMenuModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({ name: item.name, description: item.description, price: item.price.toString(), category_id: item.category_id, is_available: item.is_available });
    setIsMenuModalOpen(true);
  };

  const displayMenu = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCat = menuCategoryFilter === "All" || item.category_name === menuCategoryFilter;
    return matchesSearch && matchesCat;
  });

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400 font-bold">Loading Menu Data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search menu item..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-gray-900 placeholder:text-gray-400" value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" value={menuCategoryFilter} onChange={(e) => setMenuCategoryFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button onClick={openAddModal} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-orange-600 transition shadow-md shadow-orange-500/20 active:scale-95">
            <Plus size={18} strokeWidth={3} /> Add Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-widest font-black">
                <th className="p-5">Item Name & Desc</th><th className="p-5">Category</th><th className="p-5">Price</th><th className="p-5">Status (Live)</th><th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayMenu.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="p-5">
                    <span className="font-black text-gray-900 text-base block">{item.name}</span>
                    <span className="text-xs font-bold text-gray-400 mt-1 block truncate max-w-62.5">{item.description}</span>
                  </td>
                  <td className="p-5 text-gray-600 font-bold text-sm">{item.category_name}</td>
                  <td className="p-5 font-black text-gray-900 text-lg">₹{item.price}</td>
                  <td className="p-5">
                    <button onClick={() => toggleStock(item.id, item.is_available)} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${item.is_available ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${item.is_available ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                    <span className={`ml-3 text-xs font-bold uppercase tracking-widest ${item.is_available ? 'text-green-600' : 'text-gray-400'}`}>{item.is_available ? 'In Stock' : 'Out'}</span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"><Edit size={18} /></button>
                      <button onClick={() => deleteMenuItem(item.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayMenu.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">No menu items found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black text-gray-900">{editingItem ? "Edit Menu Item" : "Add New Item"}</h3>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveMenu} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Item Name</label>
                <input required type="text" value={menuForm.name} onChange={(e) => setMenuForm({...menuForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea required rows={2} value={menuForm.description} onChange={(e) => setMenuForm({...menuForm, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold text-gray-900 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Price (₹)</label>
                  <input required type="number" value={menuForm.price} onChange={(e) => setMenuForm({...menuForm, price: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 font-black text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                  <select required value={menuForm.category_id} onChange={(e) => setMenuForm({...menuForm, category_id: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold text-gray-900">
                    <option value="" disabled>Select Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-black tracking-wider uppercase hover:bg-orange-600 transition shadow-lg shadow-orange-500/30">{editingItem ? "Save Changes" : "Add Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}