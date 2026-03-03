"use client";

import { useState } from "react";
import { Order } from "./types";
import KitchenColumn from "./components/KitchenColumn";

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
    items: [{ name: "Butter Chicken", category: "Curries" }],
    status: "Preparing",
  },
  {
    id: 3,
    table: 6,
    items: [{ name: "Hakka Noodles", category: "Noodles" }],
    status: "Ready",
  },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const updateStatus = (id: number, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <h1 className="text-4xl font-bold mb-10">
        🍽 Kitchen Live Board
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        <KitchenColumn
          title="Pending"
          color="border-yellow-500"
          orders={orders.filter((o) => o.status === "Pending")}
          updateStatus={updateStatus}
        />

        <KitchenColumn
          title="Preparing"
          color="border-blue-500"
          orders={orders.filter((o) => o.status === "Preparing")}
          updateStatus={updateStatus}
        />

        <KitchenColumn
          title="Ready"
          color="border-green-500"
          orders={orders.filter((o) => o.status === "Ready")}
          updateStatus={updateStatus}
        />
      </div>
    </div>
  );
}