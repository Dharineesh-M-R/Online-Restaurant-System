"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Shared interfaces
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

interface CartContextType {
  cart: CartItem[];
  addToCart: (dish: Dish) => void;
  updateQuantity: (id: number, delta: number) => void;
  updateNotes: (id: number, text: string) => void;
  clearCart: () => void;
  cartCount: number;
  isLoaded: boolean; // Added to prevent hydration mismatch
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("restaurant_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to parse cart from local storage", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // 2. Save to local storage whenever cart changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("restaurant_cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

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

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, updateNotes, clearCart, cartCount, isLoaded }}>
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