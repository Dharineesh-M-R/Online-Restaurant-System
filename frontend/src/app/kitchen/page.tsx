"use client";

import { useState } from "react";
import { Order, Category } from "./types";
import OrderCard from "./components/OrderCard";
import CategoryTabs from "./components/CategoryTabs";
import StockManager from "./components/StockManager";

const mockOrders: Order[] = [
  {
    id: 1,
    table: 4,
    items: [
      { name: "Paneer Tikka", category: "Starters" },
      { name: "Veg Biryani", category: "Biryanis" },
    ],
    status: "Pending",
  },
  {
    id: 2,
    table: 2,
    items: [
      { name: "Butter Chicken", category: "Curries" },
      { name: "Hakka Noodles", category: "Noodles" },
    ],
    status: "Preparing",
  },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedCategory, setSelectedCategory] =
    useState<Category | "All">("All");

  const updateOrderStatus = (
    id: number,
    newStatus: Order["status"]
  ) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    );
  };

  const filteredOrders =
    selectedCategory === "All"
      ? orders
      : orders.filter((order) =>
          order.items.some(
            (item) => item.category === selectedCategory
          )
        );

  return (
    <div className="min-h-screen bg-gray-100 text-black p-8">
      <h1 className="text-3xl font-bold mb-6">
        Kitchen Dashboard
      </h1>

      <CategoryTabs
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            updateOrderStatus={updateOrderStatus}
          />
        ))}
      </div>

      <StockManager />
    </div>
  );
}