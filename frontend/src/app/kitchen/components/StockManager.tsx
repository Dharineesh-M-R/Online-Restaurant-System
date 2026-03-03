"use client";

import { useState } from "react";

interface StockItem {
  name: string;
  available: boolean;
}

export default function StockManager() {
  const [stock, setStock] = useState<StockItem[]>([
    { name: "Paneer Tikka", available: true },
    { name: "Veg Biryani", available: true },
    { name: "Butter Chicken", available: false },
  ]);

  const toggleStock = (index: number) => {
    setStock((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, available: !item.available }
          : item
      )
    );
  };

  return (
    <div className="mt-10 bg-white text-black p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">
        Stock Management
      </h2>

      <div className="space-y-3">
        {stock.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center border p-3 rounded-md"
          >
            <span>{item.name}</span>

            <button
              onClick={() => toggleStock(index)}
              className={`px-3 py-1 rounded-md text-white ${
                item.available
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
            >
              {item.available
                ? "Available"
                : "Out of Stock"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}