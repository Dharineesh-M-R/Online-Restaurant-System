import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import sessionRoutes from "./routes/sessions.js";
import billingRoutes from "./routes/billing.js"; // <-- Add this import
import kitchenRoutes from "./routes/kitchen.js"; // <-- Add this import
import waiterRoutes from "./routes/waiter.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
  res.send("Server running with Supabase 🚀");
});

// Routes
app.use("/menu", menuRoutes);
app.use("/orders", orderRoutes);
app.use("/sessions", sessionRoutes); // <-- Mount the new route
app.use("/admin/billing", billingRoutes); // <-- Mount the new route
app.use("/admin/kitchen", kitchenRoutes);
app.use("/admin/waiter", waiterRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});