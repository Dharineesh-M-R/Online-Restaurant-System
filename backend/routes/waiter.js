import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch items that the kitchen has marked as 'ready' (No changes needed here)
router.get("/tasks", async (req, res) => {
  try {
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

    const formattedTasks = readyItems.map((item) => ({
      id: item.id,
      name: item.menu_items?.name || "Unknown Item",
      quantity: item.quantity,
      tableNumber: item.order_serves?.orders?.tables?.table_number || 0,
      serveNumber: item.order_serves?.serve_number || 1,
    }));

    res.json({ tasks: formattedTasks });
  } catch (err) {
    console.error("Waiter Tasks Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch waiter tasks" });
  }
});

// 2. Mark an item as 'served' (No changes needed here)
router.patch("/update-item", async (req, res) => {
  const { itemId, status } = req.body;
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

/**
 * NEW WORKFLOW UPDATES BELOW
 */

// 3. Fetch Floor Plan - Updated to detect unconfirmed orders
router.get("/floor-plan", async (req, res) => {
  try {
    // We deep-select down to order_items to see if any are 'waiting_confirmation'
    const { data: tables, error } = await supabase
      .from("tables")
      .select(`
        table_number,
        status,
        table_sessions (
          status,
          needs_waiter,
          orders (
            order_serves (
              order_items ( status )
            )
          )
        )
      `)
      .order('table_number', { ascending: true });

    if (error) throw error;

    const floorData = tables.map(t => {
      const activeSession = t.table_sessions?.find(s => s.status === 'active');
      
      // Check if this table has any items that the customer placed but waiter hasn't confirmed
      const hasUnconfirmed = activeSession?.orders?.some(order => 
        order.order_serves?.some(serve => 
          serve.order_items?.some(item => item.status === 'waiting_confirmation')
        )
      ) || false;

      return {
        number: t.table_number,
        isOccupied: !!activeSession,
        needsHelp: activeSession?.needs_waiter || false,
        hasUnconfirmed: hasUnconfirmed // This triggers the pulsing blue/different color
      };
    });

    res.json({ tables: floorData });
  } catch (err) {
    console.error("Floor Plan Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch floor plan" });
  }
});

// 4. Fetch Table Details - Updated to include ALL items (confirmed and unconfirmed)
router.get("/table-details/:tableNumber", async (req, res) => {
  const { tableNumber } = req.params;

  try {
    const { data: session, error: sessionError } = await supabase
      .from("table_sessions")
      .select("session_id")
      .eq("table_number", tableNumber)
      .eq("status", "active")
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "No active session found" });
    }

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
      .eq("order_serves.orders.session_id", session.session_id)
      // Sort by status so unconfirmed items appear at the top for the waiter
      .order('status', { ascending: false });

    if (itemsError) throw itemsError;

    const formattedItems = items.map(item => ({
      id: item.id,
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

// 5. NEW: Confirm, Update, or Delete items before sending to Kitchen
router.patch("/confirm-items", async (req, res) => {
  const { items } = req.body; 
  // items expected: Array of { id, quantity, action: 'confirm' | 'delete' | 'update' }

  try {
    for (const item of items) {
      if (item.action === 'delete') {
        await supabase.from("order_items").delete().eq("id", item.id);
      } else {
        // If action is 'confirm', we change status to 'pending' (this makes it show in Kitchen)
        // We also update the quantity in case the waiter changed it
        const updateData = { quantity: item.quantity };
        if (item.action === 'confirm') {
          updateData.status = 'pending';
        }

        await supabase
          .from("order_items")
          .update(updateData)
          .eq("id", item.id);
      }
    }
    res.json({ success: true, message: "Order items updated/confirmed" });
  } catch (err) {
    console.error("Confirm Items Error:", err);
    res.status(500).json({ error: "Failed to process order confirmation" });
  }
});

// 6. Clear 'Call Waiter' (No changes needed here)
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