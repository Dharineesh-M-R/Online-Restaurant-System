import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import sessionRoutes from "./routes/sessions.js";
import billingRoutes from "./routes/billing.js";
import kitchenRoutes from "./routes/kitchen.js";
import waiterRoutes from "./routes/waiter.js";
import authRoutes from "./routes/auth.js";
import managementRoutes from "./routes/management.js";
import attendanceRoutes from "./routes/attendance.js";
import feedbackRoutes from "./routes/feedback.js";

dotenv.config();

const app = express();

// Full CORS & Private Network Access support for LAN/WiFi/Localhost devices
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Private-Network", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors());
app.use(express.json());

// Test API
app.get("/", (req, res) => {
  res.send("Server running with Supabase 🚀");
});

// Routes
app.use("/menu", menuRoutes);
app.use("/orders", orderRoutes);
app.use("/sessions", sessionRoutes);
app.use("/admin/billing", billingRoutes);
app.use("/admin/kitchen", kitchenRoutes);
app.use("/admin/waiter", waiterRoutes);
app.use("/admin/auth", authRoutes);
app.use("/management/hr", attendanceRoutes);
app.use("/management", managementRoutes);
app.use("/feedback", feedbackRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
