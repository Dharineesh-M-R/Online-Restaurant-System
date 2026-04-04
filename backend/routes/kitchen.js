import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch live kitchen orders (Tickets)
router.get("/orders", async (req, res) => {
  try {
    // This query is where your database schema shines!
    // We fetch items that aren't served yet, and pull all their parent data at the same time.
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
      .in("status", ["pending", "preparing", "ready"]); // We don't need 'served' items in the kitchen

    if (error) throw error;

    // We get a flat list of items from the DB, but our KDS frontend expects them grouped into "Tickets".
    // Let's group them by serve_id!
    const ticketsMap = {};

    orderItems.forEach((item) => {
      // Safety check just in case there's bad data
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

    // Convert our grouped map into an array, and sort it so the oldest orders are at the top!
    const tickets = Object.values(ticketsMap).sort(
      (a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime()
    );

    res.json({ tickets });
  } catch (err) {
    console.error("Kitchen Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch kitchen orders" });
  }
});

// 2. Update a specific item's cooking status (Pending -> Preparing -> Ready)
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