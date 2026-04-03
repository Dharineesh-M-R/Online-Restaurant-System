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
// 3. Fetch all tables and their current occupancy status
router.get("/floor-plan", async (req, res) => {
  try {
    const { data: tables, error } = await supabase
      .from("tables")
      .select(`
        table_number,
        status,
        table_sessions (
          status,
          needs_waiter
        )
      `)
      .order('table_number', { ascending: true });

    if (error) throw error;

    // Process data to identify "Live" status
    const floorData = tables.map(t => {
      // A table is truly "Occupied" if it has an active session
      const activeSession = t.table_sessions?.find(s => s.status === 'active');
      
      return {
        number: t.table_number,
        isOccupied: !!activeSession,
        needsHelp: activeSession?.needs_waiter || false
      };
    });

    res.json({ tables: floorData });
  } catch (err) {
    console.error("Floor Plan Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch floor plan" });
  }
});

// 4. Fetch active order items for a specific table
router.get("/table-details/:tableNumber", async (req, res) => {
  const { tableNumber } = req.params;

  try {
    // Get the active session for this table
    const { data: session, error: sessionError } = await supabase
      .from("table_sessions")
      .select("session_id")
      .eq("table_number", tableNumber)
      .eq("status", "active")
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "No active session found" });
    }

    // Get all items belonging to this session's orders
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        status,
        notes,
        menu_items ( name ),
        order_serves!inner (
          serve_number,
          orders!inner ( session_id )
        )
      `)
      .eq("order_serves.orders.session_id", session.session_id);

    if (itemsError) throw itemsError;

    // Format for frontend
    const formattedItems = items.map(item => ({
      name: item.menu_items.name,
      quantity: item.quantity,
      status: item.status,
      serve: item.order_serves.serve_number,
      notes: item.notes
    }));

    res.json({ items: formattedItems });
  } catch (err) {
    console.error("Table Details Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Clear the 'Call Waiter' alert for a specific table
router.patch("/attend-table", async (req, res) => {
  const { tableNumber } = req.body;

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ needs_waiter: false })
      .eq("table_number", tableNumber)
      .eq("status", "active");

    if (error) throw error;

    res.json({ success: true, message: "Alert cleared" });
  } catch (err) {
    console.error("Attend Table Error:", err);
    res.status(500).json({ error: "Failed to clear alert" });
  }
});

export default router;