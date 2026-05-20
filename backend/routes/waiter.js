import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch items that the kitchen has marked as 'ready'
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

// 2. Mark an item as 'served' once it reaches the table
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
      const activeSession = t.table_sessions?.find(s => s.status !== 'completed' && s.status !== 'cancelled');
      
      const hasUnconfirmed = activeSession?.orders?.some(order => 
        order.order_serves?.some(serve => 
          serve.order_items?.some(item => item.status === 'waiting_confirmation')
        )
      ) || false;

      return {
        number: t.table_number,
        isOccupied: !!activeSession,
        needsHelp: activeSession?.needs_waiter || false,
        hasUnconfirmed: hasUnconfirmed,
        sessionStatus: activeSession?.status || null
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
    const { data: session, error: sessionError } = await supabase
      .from("table_sessions")
      .select("session_id, status")
      .eq("table_number", tableNumber)
      .neq("status", "completed") 
      .neq("status", "cancelled")
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

    // 🔥 FIX: Returning sessionId so the Waiter frontend can cancel ghost sessions
    res.json({ sessionId: session.session_id,sessionStatus: session.status, items: formattedItems });
  } catch (err) {
    console.error("Table Details Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Confirm, Update, or Delete items before sending to Kitchen
router.patch("/confirm-items", async (req, res) => {
  const { items } = req.body; 

  try {
    for (const item of items) {
      if (item.action === 'delete') {
        await supabase.from("order_items").delete().eq("id", item.id);
      } else if (item.action === 'confirm') {
        await supabase
          .from("order_items")
          .update({ 
            status: 'pending', 
            quantity: item.quantity 
          })
          .eq("id", item.id);
      }
    }
    res.json({ success: true, message: "Order items updated/confirmed" });
  } catch (err) {
    console.error("Confirm Items Error:", err);
    res.status(500).json({ error: "Failed to process order confirmation" });
  }
});

// 6. Clear the 'Call Waiter' alert for a specific table
router.patch("/attend-table", async (req, res) => {
  const { tableNumber } = req.body;

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ needs_waiter: false })
      .eq("table_number", tableNumber)
      .neq("status", "completed");

    if (error) throw error;

    res.json({ success: true, message: "Alert cleared" });
  } catch (err) {
    console.error("Attend Table Error:", err);
    res.status(500).json({ error: "Failed to clear alert" });
  }
});

// 7. Waiter manually requests bill for a table
router.patch("/request-bill", async (req, res) => {
  const { tableNumber, paymentMethod } = req.body; 

  try {
    const { data: session, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("session_id")
      .eq("table_number", tableNumber)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .single();

    if (sessionErr || !session) return res.status(404).json({ error: "No active session" });

    const finalStatus = paymentMethod ? `billed_${paymentMethod}` : "billed";

    const { error: updateErr } = await supabase
      .from("table_sessions")
      .update({ status: finalStatus })
      .eq("session_id", session.session_id);

    if (updateErr) throw updateErr;

    res.json({ success: true, message: "Bill requested" });
  } catch (err) {
    console.error("Request Bill Error:", err);
    res.status(500).json({ error: "Failed to request bill" });
  }
});

export default router;