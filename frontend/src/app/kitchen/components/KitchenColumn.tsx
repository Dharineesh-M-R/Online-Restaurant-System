"use client";

import { Order } from "../types";
import OrderCard from "./OrderCard";

interface Props {
  title: string;
  color: string;
  orders: Order[];
  updateStatus: (id: number, status: Order["status"]) => void;
}

export default function KitchenColumn({
  title,
  color,
  orders,
  updateStatus,
}: Props) {
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border-t-4 ${color}`}>
      <h2 className="text-xl font-semibold mb-4">
        {title} ({orders.length})
      </h2>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            updateStatus={updateStatus}
          />
        ))}

        {orders.length === 0 && (
          <p className="text-gray-400 text-sm">
            No orders here
          </p>
        )}
      </div>
    </div>
  );
}