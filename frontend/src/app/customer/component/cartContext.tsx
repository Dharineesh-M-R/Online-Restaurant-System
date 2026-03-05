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

// New interface to store completed serves
export interface PlacedServe {
  serveNumber: number;
  items: CartItem[];
  serveTotal: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (dish: Dish) => void;
  updateQuantity: (id: number, delta: number) => void;
  updateNotes: (id: number, text: string) => void;
  clearCart: () => void;
  cartCount: number;
  isLoaded: boolean;
  serveCount: number;
  placedServes: PlacedServe[]; // Added this
  placeCurrentOrder: () => void; // Replaced incrementServeCount with this
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placedServes, setPlacedServes] = useState<PlacedServe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serveCount, setServeCount] = useState(0);

  useEffect(() => {
    const savedCart = localStorage.getItem("restaurant_cart");
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedServeCount = localStorage.getItem("restaurant_serveCount");
    if (savedServeCount) setServeCount(parseInt(savedServeCount, 10));

    const savedServes = localStorage.getItem("restaurant_serves");
    if (savedServes) setPlacedServes(JSON.parse(savedServes));

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("restaurant_cart", JSON.stringify(cart));
      localStorage.setItem("restaurant_serves", JSON.stringify(placedServes));
    }
  }, [cart, placedServes, isLoaded]);

  // Moves the active cart into a new "Serve" block
  const placeCurrentOrder = () => {
    if (cart.length === 0) return;

    const serveTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const newServeNum = serveCount + 1;

    const newServe: PlacedServe = {
      serveNumber: newServeNum,
      items: [...cart],
      serveTotal: serveTotal,
    };

    setPlacedServes((prev) => [...prev, newServe]);
    setServeCount(newServeNum);
    localStorage.setItem("restaurant_serveCount", newServeNum.toString());

    // Clear active cart so they can start fresh for the next round
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

  // Completely resets everything (used after paying the bill)
  const clearCart = () => {
    setCart([]);
    setPlacedServes([]);
    setServeCount(0);
    localStorage.removeItem("restaurant_cart");
    localStorage.removeItem("restaurant_serves");
    localStorage.removeItem("restaurant_serveCount");
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
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