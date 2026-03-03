import { OrderStatus } from "../types";

interface Props {
  status: OrderStatus;
}

export default function StatusBadge({ status }: Props) {
  const colors: Record<OrderStatus, string> = {
    Pending: "bg-red-500",
    Preparing: "bg-yellow-500",
    Ready: "bg-green-500",
    Completed: "bg-gray-500",
  };

  return (
    <span
      className={`${colors[status]} text-white text-xs px-3 py-1 rounded-full`}
    >
      {status}
    </span>
  );
}