"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  sessionId: string; // Tied to the active session
}

interface CartContextType {
  cart: CartItem[];
  sessionId: string | null; // Added session tracking
  tableNumber: number;      // Added table tracking
  addToCart: (dish: Dish) => void;
  updateQuantity: (id: number, delta: number) => void;
  updateNotes: (id: number, text: string) => void;
  clearCart: () => void;
  cartCount: number;
  isLoaded: boolean;
  serveCount: number;
  placedServes: PlacedServe[];
  placeCurrentOrder: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placedServes, setPlacedServes] = useState<PlacedServe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serveCount, setServeCount] = useState(0);
  
  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<number>(12); // Mocking table 12 from QR code

  useEffect(() => {
    // 1. Handle Session Initialization
    let activeSession = localStorage.getItem("restaurant_sessionId");
    
    if (!activeSession) {
      // Simulate backend session creation: System creates active session
      // In a real app, you would fetch this from your DB/API here
      activeSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("restaurant_sessionId", activeSession);
      
      // Simulate backend call: POST /api/sessions { table_number: 12, status: 'active' }
      console.log(`[System] New Session Created: ${activeSession} for Table ${tableNumber}`);
    }
    setSessionId(activeSession);

    // 2. Load Cart Data
    const savedCart = localStorage.getItem("restaurant_cart");
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedServeCount = localStorage.getItem("restaurant_serveCount");
    if (savedServeCount) setServeCount(parseInt(savedServeCount, 10));

    const savedServes = localStorage.getItem("restaurant_serves");
    if (savedServes) setPlacedServes(JSON.parse(savedServes));

    setIsLoaded(true);
  }, [tableNumber]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("restaurant_cart", JSON.stringify(cart));
      localStorage.setItem("restaurant_serves", JSON.stringify(placedServes));
    }
  }, [cart, placedServes, isLoaded]);

  const placeCurrentOrder = () => {
    if (cart.length === 0 || !sessionId) return;

    const serveTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const newServeNum = serveCount + 1;

    const newServe: PlacedServe = {
      serveNumber: newServeNum,
      items: [...cart],
      serveTotal: serveTotal,
      sessionId: sessionId, // Tie this order to the session
    };

    setPlacedServes((prev) => [...prev, newServe]);
    setServeCount(newServeNum);
    localStorage.setItem("restaurant_serveCount", newServeNum.toString());

    setCart([]);
  };

  const addToCart = (dish: Dish) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === dish.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          isVeg: dish.isVeg ?? true,
          notes: "",
        },
      ];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateNotes = (id: number, text: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: text } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setPlacedServes([]);
    setServeCount(0);
    setSessionId(null); 
    
    localStorage.removeItem("restaurant_cart");
    localStorage.removeItem("restaurant_serves");
    localStorage.removeItem("restaurant_serveCount");
    localStorage.removeItem("restaurant_sessionId"); // Clear session on bill payment
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        sessionId,
        tableNumber,
        addToCart, 
        updateQuantity, 
        updateNotes, 
        clearCart, 
        cartCount, 
        isLoaded,
        serveCount,
        placedServes,
        placeCurrentOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}