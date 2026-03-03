export type Category =
  | "Starters"
  | "Curries"
  | "Rices"
  | "Noodles"
  | "Biryanis";

export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Ready"
  | "Completed";

export interface OrderItem {
  name: string;
  category: Category;
}

export interface Order {
  id: number;
  table: number;
  items: OrderItem[];
  status: OrderStatus;
}