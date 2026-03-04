import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";

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


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});