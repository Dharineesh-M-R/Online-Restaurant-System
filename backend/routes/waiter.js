import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch items that the kitchen has marked as 'ready' (including which chef cooked them)
router.get("/tasks", async (req, res) => {
  try {
    let readyItems = null;
    
    // Attempt enriched query with chef tracking join
    const { data: enrichedData, error: enrichedError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        menu_items ( name ),
        staff:chef_id ( id, name, employee_id ),
        order_serves (
          serve_number,
          orders (
            tables ( table_number )
          )
        )
      `)
      .eq("status", "ready");

    if (enrichedError) {
      // Fallback if chef_id column or foreign key not yet added in DB
      const { data: fallbackData, error: fallbackError } = await supabase
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

      if (fallbackError) throw fallbackError;
      readyItems = fallbackData;
    } else {
      readyItems = enrichedData;
    }

    const formattedTasks = (readyItems || []).map((item) => ({
      id: item.id,
      name: item.menu_items?.name || "Unknown Item",
      quantity: item.quantity,
      tableNumber: item.order_serves?.orders?.tables?.table_number || 0,
      serveNumber: item.order_serves?.serve_number || 1,
      chefName: item.staff?.name || null,
      chefEmployeeId: item.staff?.employee_id || null,
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

// 3. Fetch all tables, occupancy status, and which waiter is assigned
router.get("/floor-plan", async (req, res) => {
  try {
    let tables = null;

    // Enriched query with assigned waiter
    const { data: enrichedTables, error: enrichedError } = await supabase
      .from("tables")
      .select(`
        table_number,
        status,
        table_sessions (
          status,
          needs_waiter,
          assigned_waiter_id,
          staff:assigned_waiter_id ( id, name, employee_id ),
          orders (
            waiter_id,
            order_serves (
              order_items ( status, notes, menu_items ( name ) )
            )
          )
        )
      `)
      .order('table_number', { ascending: true });

    if (enrichedError) {
      // Fallback query if assigned_waiter_id column is not yet present
      const { data: fallbackTables, error: fallbackError } = await supabase
        .from("tables")
        .select(`
          table_number,
          status,
          table_sessions (
            status,
            needs_waiter,
            orders (
              order_serves (
                order_items ( status, notes, menu_items ( name ) )
              )
            )
          )
        `)
        .order('table_number', { ascending: true });

      if (fallbackError) throw fallbackError;
      tables = fallbackTables;
    } else {
      tables = enrichedTables;
    }

    const floorData = (tables || []).map(t => {
      const activeSession = t.table_sessions?.find(s => s.status !== 'completed' && s.status !== 'cancelled');
      
      let hasUnconfirmed = false;
      let hasOutOfStock = false;
      const outOfStockItems = [];

      activeSession?.orders?.forEach(order => {
        order.order_serves?.forEach(serve => {
          serve.order_items?.forEach(item => {
            if (item.status === 'waiting_confirmation') {
              hasUnconfirmed = true;
            }
            if (item.status === 'out_of_stock' || (item.notes && item.notes.includes('[OUT OF STOCK'))) {
              hasOutOfStock = true;
              if (item.menu_items?.name && !outOfStockItems.includes(item.menu_items.name)) {
                outOfStockItems.push(item.menu_items.name);
              }
            }
          });
        });
      });

      const assignedWaiter = activeSession?.staff ? {
        id: activeSession.staff.id,
        name: activeSession.staff.name,
        employeeId: activeSession.staff.employee_id
      } : null;

      return {
        number: t.table_number,
        isOccupied: !!activeSession,
        needsHelp: activeSession?.needs_waiter || false,
        hasUnconfirmed: hasUnconfirmed,
        hasOutOfStock: hasOutOfStock,
        outOfStockItems: outOfStockItems,
        sessionStatus: activeSession?.status || null,
        assignedWaiter: assignedWaiter
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
    let session = null;
    
    // Try query with assigned waiter
    const { data: enrichedSession, error: enrichedErr } = await supabase
      .from("table_sessions")
      .select("session_id, status, assigned_waiter_id, staff:assigned_waiter_id ( id, name, employee_id )")
      .eq("table_number", tableNumber)
      .neq("status", "completed") 
      .neq("status", "cancelled")
      .maybeSingle();

    if (enrichedErr || !enrichedSession) {
      const { data: fallbackSession, error: sessionError } = await supabase
        .from("table_sessions")
        .select("session_id, status")
        .eq("table_number", tableNumber)
        .neq("status", "completed") 
        .neq("status", "cancelled")
        .maybeSingle();

      if (sessionError || !fallbackSession) {
        return res.status(404).json({ error: "No active session found" });
      }
      session = fallbackSession;
    } else {
      session = enrichedSession;
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

    const formattedItems = (items || []).map(item => ({
      id: item.id, 
      name: item.menu_items?.name || "Unknown Dish",
      quantity: item.quantity,
      status: item.status,
      isOutOfStock: item.status === 'out_of_stock' || (item.notes && item.notes.includes('[OUT OF STOCK')),
      serve: item.order_serves?.serve_number || 1,
      notes: item.notes
    }));

    res.json({ 
      sessionId: session.session_id,
      sessionStatus: session.status,
      assignedWaiter: session.staff ? {
        id: session.staff.id,
        name: session.staff.name,
        employeeId: session.staff.employee_id
      } : null,
      items: formattedItems 
    });
  } catch (err) {
    console.error("Table Details Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Confirm, Update, or Delete items before sending to Kitchen (and assign waiter)
router.patch("/confirm-items", async (req, res) => {
  const { items, waiterId, tableNumber } = req.body; 

  try {
    for (const item of (items || [])) {
      if (item.action === 'delete') {
        // Fetch item details before deletion to recalculate order total
        const { data: itemToDelete } = await supabase
          .from("order_items")
          .select(`
            id,
            price,
            quantity,
            order_serves (
              order_id,
              orders ( id, total_amount, session_id )
            )
          `)
          .eq("id", item.id)
          .single();

        await supabase.from("order_items").delete().eq("id", item.id);

        if (itemToDelete?.order_serves?.orders) {
          const order = itemToDelete.order_serves.orders;
          const cost = Number(itemToDelete.price || 0) * Number(itemToDelete.quantity || 1);
          const newTotal = Math.max(0, Number(order.total_amount || 0) - cost);
          await supabase.from("orders").update({ total_amount: newTotal }).eq("id", order.id);

          // Clear needs_waiter on the session if no more out-of-stock items remain
          if (order.session_id) {
            const { data: remainingOos } = await supabase
              .from("order_items")
              .select("id, order_serves!inner(order_id, orders!inner(session_id))")
              .eq("order_serves.orders.session_id", order.session_id)
              .eq("status", "out_of_stock");

            if (!remainingOos || remainingOos.length === 0) {
              await supabase
                .from("table_sessions")
                .update({ needs_waiter: false })
                .eq("session_id", order.session_id);
            }
          }
        }
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

    // If waiterId was provided, update table_sessions and orders to record which waiter confirmed the order
    if (waiterId && tableNumber) {
      try {
        await supabase
          .from("table_sessions")
          .update({ assigned_waiter_id: waiterId })
          .eq("table_number", tableNumber)
          .neq("status", "completed")
          .neq("status", "cancelled");

        // Also record waiter on active order
        const { data: activeSession } = await supabase
          .from("table_sessions")
          .select("session_id")
          .eq("table_number", tableNumber)
          .neq("status", "completed")
          .neq("status", "cancelled")
          .maybeSingle();

        if (activeSession) {
          await supabase
            .from("orders")
            .update({ waiter_id: waiterId })
            .eq("session_id", activeSession.session_id);
        }
      } catch (assignErr) {
        console.warn("Could not record assigned_waiter_id (columns may not exist yet):", assignErr.message);
      }
    }

    res.json({ success: true, message: "Order items updated/confirmed" });
  } catch (err) {
    console.error("Confirm Items Error:", err);
    res.status(500).json({ error: "Failed to process order confirmation" });
  }
});

// 6. Clear the 'Call Waiter' alert for a specific table (and assign waiter)
router.patch("/attend-table", async (req, res) => {
  const { tableNumber, waiterId } = req.body;

  try {
    const updatePayload = { needs_waiter: false };
    if (waiterId) {
      updatePayload.assigned_waiter_id = waiterId;
    }

    // Try with assigned_waiter_id
    const { error } = await supabase
      .from("table_sessions")
      .update(updatePayload)
      .eq("table_number", tableNumber)
      .neq("status", "completed");

    if (error) {
      // Fallback without assigned_waiter_id if column not created yet
      await supabase
        .from("table_sessions")
        .update({ needs_waiter: false })
        .eq("table_number", tableNumber)
        .neq("status", "completed");
    }

    res.json({ success: true, message: "Alert cleared and table attended" });
  } catch (err) {
    console.error("Attend Table Error:", err);
    res.status(500).json({ error: "Failed to clear alert" });
  }
});

// 7. Explicitly assign/claim a table by a waiter
router.patch("/assign-waiter", async (req, res) => {
  const { tableNumber, waiterId } = req.body;

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ assigned_waiter_id: waiterId || null })
      .eq("table_number", tableNumber)
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (error) throw error;

    // Also update order if session exists
    const { data: session } = await supabase
      .from("table_sessions")
      .select("session_id")
      .eq("table_number", tableNumber)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .maybeSingle();

    if (session && waiterId) {
      try {
        await supabase
          .from("orders")
          .update({ waiter_id: waiterId })
          .eq("session_id", session.session_id);
      } catch (oErr) {}
    }

    res.json({ success: true, message: waiterId ? "Table assigned to you" : "Table unassigned" });
  } catch (err) {
    console.error("Assign Waiter Error:", err);
    res.status(500).json({ error: "Failed to assign waiter to table" });
  }
});

// 8. Waiter manually requests bill for a table
router.patch("/request-bill", async (req, res) => {
  const { tableNumber, paymentMethod, waiterId } = req.body; 

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
    const updatePayload = { status: finalStatus };
    if (waiterId) updatePayload.assigned_waiter_id = waiterId;

    try {
      await supabase
        .from("table_sessions")
        .update(updatePayload)
        .eq("session_id", session.session_id);
    } catch (e) {
      await supabase
        .from("table_sessions")
        .update({ status: finalStatus })
        .eq("session_id", session.session_id);
    }

    res.json({ success: true, message: "Bill requested" });
  } catch (err) {
    console.error("Request Bill Error:", err);
    res.status(500).json({ error: "Failed to request bill" });
  }
});

export default router;
