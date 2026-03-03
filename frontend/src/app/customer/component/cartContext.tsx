"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Shared interfaces
export interface Dish {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg?: boolean; // Added so it translates to the cart well
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (dish: Dish) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === dish.id);
      if (existingItem) {
        // If it's already in the cart, just increase the quantity
        return prevCart.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      // If it's a new item, add it to the array
      return [
        ...prevCart,
        {
          id: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          isVeg: dish.isVeg ?? true, // Default to true if not specified
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

  // Calculate total items for the notification bubble
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, updateNotes, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to easily use the cart anywhere
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}