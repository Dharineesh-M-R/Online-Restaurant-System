export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "Completed";

export interface OrderItem {
  name: string;
  category: string;
}

export interface Order {
  id: number;
  table: number;
  items: OrderItem[];
  status: OrderStatus;
}