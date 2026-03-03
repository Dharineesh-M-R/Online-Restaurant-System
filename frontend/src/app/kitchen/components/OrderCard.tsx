"use client";

import { Order } from "../types";
import StatusBadge from "./StatusBadge";

interface Props {
  order: Order;
  updateOrderStatus: (
    id: number,
    status: Order["status"]
  ) => void;
}

export default function OrderCard({
  order,
  updateOrderStatus,
}: Props) {
  return (
    <div className="bg-white text-black p-6 rounded-xl shadow-md">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">
          Order #{order.id}
        </h2>
        <StatusBadge status={order.status} />
      </div>

      <p className="text-sm mt-1">
        Table: {order.table}
      </p>

      <ul className="mt-3 space-y-1">
        {order.items.map((item, index) => (
          <li key={index}>
            • {item.name} ({item.category})
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() =>
            updateOrderStatus(order.id, "Preparing")
          }
          className="bg-yellow-500 text-white px-3 py-1 rounded-md"
        >
          Preparing
        </button>

        <button
          onClick={() =>
            updateOrderStatus(order.id, "Ready")
          }
          className="bg-green-600 text-white px-3 py-1 rounded-md"
        >
          Ready
        </button>

        <button
          onClick={() =>
            updateOrderStatus(order.id, "Completed")
          }
          className="bg-gray-700 text-white px-3 py-1 rounded-md"
        >
          Done
        </button>
      </div>
    </div>
  );
}