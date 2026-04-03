import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch live kitchen orders (Tickets)
// Updated to EXCLUDE 'waiting_confirmation' items
router.get("/orders", async (req, res) => {
  try {
    // We only fetch items that have been confirmed by a waiter (status: pending)
    // or are already being worked on (preparing/ready).
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        status,
        notes,
        menu_items (
          name,
          categories ( name )
        ),
        order_serves (
          id,
          serve_number,
          created_at,
          orders (
            tables ( table_number )
          )
        )
      `)
      .in("status", ["pending", "preparing", "ready"]); 

    if (error) throw error;

    // Group the flat list of items into "Tickets" by serveId
    const ticketsMap = {};

    orderItems.forEach((item) => {
      // Safety check for relations
      if (!item.order_serves || !item.order_serves.orders || !item.order_serves.orders.tables) return;

      const serveId = item.order_serves.id;

      if (!ticketsMap[serveId]) {
        ticketsMap[serveId] = {
          serveId: serveId,
          tableNumber: item.order_serves.orders.tables.table_number,
          serveNumber: item.order_serves.serve_number,
          orderTime: item.order_serves.created_at,
          items: [],
        };
      }

      ticketsMap[serveId].items.push({
        id: item.id,
        name: item.menu_items?.name || "Unknown Item",
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        category: item.menu_items?.categories?.name || "Uncategorized",
      });
    });

    // Convert map to array and sort by oldest order first
    const tickets = Object.values(ticketsMap).sort(
      (a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime()
    );

    res.json({ tickets });
  } catch (err) {
    console.error("Kitchen Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch kitchen orders" });
  }
});

// 2. Update a specific item's cooking status (e.g., Pending -> Preparing -> Ready)
router.patch("/update-item", async (req, res) => {
  const { itemId, status } = req.body;

  try {
    const { error } = await supabase
      .from("order_items")
      .update({ status })
      .eq("id", itemId);

    if (error) throw error;

    res.json({ success: true, message: `Item updated to ${status}` });
  } catch (err) {
    console.error("Kitchen Update Error:", err);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

export default router;