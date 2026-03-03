"use client";

import { Order } from "../types";

interface Props {
  order: Order;
  updateStatus: (id: number, status: Order["status"]) => void;
}

export default function OrderCard({
  order,
  updateStatus,
}: Props) {
  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-md hover:scale-105 transition duration-200">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">
          Order #{order.id}
        </h3>
        <span className="text-sm text-gray-300">
          Table {order.table}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((item, index) => (
          <li key={index}>
            • {item.name}
          </li>
        ))}
      </ul>

      <div className="flex gap-2 mt-4">
        {order.status === "Pending" && (
          <button
            onClick={() =>
              updateStatus(order.id, "Preparing")
            }
            className="bg-yellow-500 text-black px-3 py-1 rounded-md font-medium"
          >
            Start
          </button>
        )}

        {order.status === "Preparing" && (
          <button
            onClick={() =>
              updateStatus(order.id, "Ready")
            }
            className="bg-green-500 text-black px-3 py-1 rounded-md font-medium"
          >
            Mark Ready
          </button>
        )}
      </div>
    </div>
  );
}