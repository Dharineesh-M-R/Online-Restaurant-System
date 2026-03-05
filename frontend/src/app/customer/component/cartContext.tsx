"use client";

import { createContext, useContext, useState, useEffect, ReactNode, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";

export interface Dish {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg?: boolean;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  notes?: string;
}

export interface PlacedServe {
  serveNumber: number;
  items: CartItem[];
  serveTotal: number;
  sessionId: string;
}

interface CartContextType {
  cart: CartItem[];
  sessionId: string | null;
  tableNumber: string;
  addToCart: (dish: Dish) => void;
  updateQuantity: (id: number, delta: number) => void;
  updateNotes: (id: number, text: string) => void;
  clearCart: () => void;
  clearCurrentCart: () => void;
  cartCount: number;
  isLoaded: boolean;
  serveCount: number;
  placedServes: PlacedServe[];
  placeCurrentOrder: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function CartProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const urlTable = searchParams.get("table");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://172.18.170.244:5000";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [placedServes, setPlacedServes] = useState<PlacedServe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serveCount, setServeCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string>("0");
  const [tableError, setTableError] = useState<string | null>(null);

  // --- 1. INITIALIZE SESSION ---
  useEffect(() => {
    let activeTable = urlTable;
    if (activeTable) {
      localStorage.setItem("restaurant_table", activeTable);
    } else {
      activeTable = localStorage.getItem("restaurant_table");
    }

    if (!activeTable) {
      setTableError("Please scan the QR code on your table to view the menu and place an order.");
      setIsLoaded(true);
      return; 
    }

    setTableNumber(activeTable);

    const initializeSession = async () => {
      try {
        const res = await fetch(`${apiUrl}/sessions?table=${activeTable}`);
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        
        setSessionId(data.sessionId);
        localStorage.setItem("restaurant_sessionId", data.sessionId);
      } catch (err) {
        console.error("Session Initialization Error:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeSession();
  }, [urlTable, apiUrl]);

  // --- 2. GLOBAL POLLING (SYNCS EVERY 3 SECONDS) ---
  useEffect(() => {
    if (!sessionId) return;

    const syncTableData = async () => {
      try {
        const res = await fetch(`${apiUrl}/sessions/${sessionId}/sync`);
        if (res.ok) {
          const data = await res.json();
          setCart(data.cart);
          setPlacedServes(data.serves);
          setServeCount(data.serves.length);
        }
      } catch (err) {
        console.error("Failed to sync table data", err);
      }
    };

    syncTableData(); // Initial fetch
    const interval = setInterval(syncTableData, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [sessionId, apiUrl]);


  // --- 3. HELPER: PUSH CART UPDATES TO SERVER ---
  const updateSharedCart = async (newCart: CartItem[]) => {
    setCart(newCart); // Update UI immediately
    if (!sessionId) return;
    try {
      await fetch(`${apiUrl}/sessions/${sessionId}/cart`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: newCart })
      });
    } catch (error) {
      console.error("Failed to update shared cart", error);
    }
  };

  // --- 4. CART ACTIONS ---
  const addToCart = (dish: Dish) => {
    let newCart;
    const existingItem = cart.find((item) => item.id === dish.id);
    if (existingItem) {
      newCart = cart.map((item) => item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item);
    } else {
      newCart = [...cart, { ...dish, quantity: 1, isVeg: dish.isVeg ?? true, notes: "" }];
    }
    updateSharedCart(newCart);
  };

  const updateQuantity = (id: number, delta: number) => {
    const newCart = cart.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
                        .filter((item) => item.quantity > 0);
    updateSharedCart(newCart);
  };

  const updateNotes = (id: number, text: string) => {
    const newCart = cart.map((item) => (item.id === id ? { ...item, notes: text } : item));
    updateSharedCart(newCart);
  };

  const clearCurrentCart = () => {
    updateSharedCart([]);
  };

  const placeCurrentOrder = async () => {
    if (cart.length === 0 || !sessionId) return;

    const serveTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const newServeNum = serveCount + 1;

    const newServe: PlacedServe = {
      serveNumber: newServeNum,
      items: [...cart],
      serveTotal: serveTotal,
      sessionId: sessionId,
    };

    try {
      // Optimistic UI update
      setPlacedServes((prev) => [...prev, newServe]);
      setServeCount(newServeNum);
      setCart([]); // Clear local instantly
      
      await fetch(`${apiUrl}/sessions/${sessionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newServe)
      });
    } catch (err) {
      console.error("Order Placement Error:", err);
    }
  };

  const clearCart = () => {
    setCart([]);
    setPlacedServes([]);
    setServeCount(0);
    setSessionId(null);
    localStorage.removeItem("restaurant_table");
    localStorage.removeItem("restaurant_sessionId");
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (tableError) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-red-100">
          <span className="text-red-500 text-4xl font-black">!</span>
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">Table Not Found</h2>
        <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">{tableError}</p>
      </div>
    );
  }

  return (
    <CartContext.Provider 
      value={{ 
        cart, sessionId, tableNumber, addToCart, updateQuantity, updateNotes, 
        clearCart, clearCurrentCart, cartCount, isLoaded, serveCount, 
        placedServes, placeCurrentOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center font-bold text-stone-500">Loading Session...</div>}>
      <CartProviderInner>{children}</CartProviderInner>
    </Suspense>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error("useCart must be used within a CartProvider");
  return context;
}