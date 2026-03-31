import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch items that the kitchen has marked as 'ready'
router.get("/tasks", async (req, res) => {
  try {
    // We only want items that are 'ready' to be served.
    // We also need to pull the connected menu item name, serve number, and table number!
    const { data: readyItems, error } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        menu_items ( name ),
        order_serves (
          serve_number,
          orders (
            tables ( table_number )
          )
        )
      `)
      .eq("status", "ready");

    if (error) throw error;

    // Flatten the nested Supabase data into the clean array your frontend expects
    const formattedTasks = readyItems.map((item) => ({
      id: item.id,
      name: item.menu_items?.name || "Unknown Item",
      quantity: item.quantity,
      // Safely dig into the relations to grab the numbers
      tableNumber: item.order_serves?.orders?.tables?.table_number || 0,
      serveNumber: item.order_serves?.serve_number || 1,
    }));

    res.json({ tasks: formattedTasks });
  } catch (err) {
    console.error("Waiter Tasks Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch waiter tasks" });
  }
});

// 2. Mark an item as 'served' once it reaches the table
router.patch("/update-item", async (req, res) => {
  const { itemId, status } = req.body;

  // Security check: Waiters should only be changing things to 'served'
  if (status !== "served") {
    return res.status(400).json({ error: "Invalid status update" });
  }

  try {
    const { error } = await supabase
      .from("order_items")
      .update({ status: "served" })
      .eq("id", itemId);

    if (error) throw error;

    res.json({ success: true, message: "Item successfully served!" });
  } catch (err) {
    console.error("Waiter Update Error:", err);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;