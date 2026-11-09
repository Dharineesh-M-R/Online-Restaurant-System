import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch items that the kitchen has marked as 'ready' (including which chef cooked them and parcel payment status)
router.get("/tasks", async (req, res) => {
  try {
    let readyItems = null;
    
    // Attempt enriched query with chef tracking join and payments join
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
            id,
            tables ( table_number ),
            payments ( payment_status )
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
              id,
              tables ( table_number ),
              payments ( payment_status )
            )
          )
        `)
        .eq("status", "ready");

      if (fallbackError) throw fallbackError;
      readyItems = fallbackData;
    } else {
      readyItems = enrichedData;
    }

    const formattedTasks = (readyItems || []).map((item) => {
      const order = item.order_serves?.orders;
      const tableNumber = order?.tables?.table_number || 0;
      const isParcel = tableNumber > 100;
      const paymentInfo = order?.payments;
      const paymentStatus = Array.isArray(paymentInfo)
        ? paymentInfo[0]?.payment_status
        : paymentInfo?.payment_status;

      return {
        id: item.id,
        name: item.menu_items?.name || "Unknown Item",
        quantity: item.quantity,
        tableNumber: tableNumber,
        serveNumber: item.order_serves?.serve_number || 1,
        chefName: item.staff?.name || null,
        chefEmployeeId: item.staff?.employee_id || null,
        isParcel: isParcel,
        paymentStatus: paymentStatus || "pending",
      };
    });

    res.json({ tasks: formattedTasks });
  } catch (err) {
    console.error("Waiter Tasks Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch waiter tasks" });
  }
});

// 2. Mark an item as 'served' once it reaches the table (or handover parcel)
router.patch("/update-item", async (req, res) => {
  const { itemId, status } = req.body;

  if (status !== "served") {
    return res.status(400).json({ error: "Invalid status update" });
  }

  try {
    // Digital Gatekeeper: Verify if it's a parcel and whether it's paid
    const { data: itemData, error: itemErr } = await supabase
      .from("order_items")
      .select(`
        id,
        order_serves (
          orders (
            id,
            tables ( table_number ),
            payments ( payment_status )
          )
        )
      `)
      .eq("id", itemId)
      .single();

    if (!itemErr && itemData) {
      const tableNumber = itemData.order_serves?.orders?.tables?.table_number || 0;
      const isParcel = tableNumber > 100;

      if (isParcel) {
        const paymentInfo = itemData.order_serves?.orders?.payments;
        const paymentStatus = Array.isArray(paymentInfo)
          ? paymentInfo[0]?.payment_status
          : paymentInfo?.payment_status;

        if (paymentStatus !== "paid") {
          return res.status(403).json({
            error: "Digital Gatekeeper: Cannot handover unpaid parcel. Payment must be settled at the billing counter first.",
          });
        }
      }
    }

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
          session_id,
          status,
          tab_name,
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
            session_id,
            status,
            tab_name,
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
      const activeSessions = (t.table_sessions || []).filter(
        s => s.status !== 'completed' && s.status !== 'cancelled'
      );
      const activeSession = activeSessions[0] || null;
      
      let hasUnconfirmed = false;
      let hasOutOfStock = false;
      const outOfStockItems = [];

      // Check across ALL active sessions for this table
      activeSessions.forEach(session => {
        session.orders?.forEach(order => {
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
      });

      const needsHelp = activeSessions.some(s => s.needs_waiter);

      const assignedWaiter = activeSession?.staff ? {
        id: activeSession.staff.id,
        name: activeSession.staff.name,
        employeeId: activeSession.staff.employee_id
      } : null;

      return {
        number: t.table_number,
        isOccupied: activeSessions.length > 0,
        sharedPartiesCount: activeSessions.length,
        activeTabs: activeSessions.map(s => ({
          sessionId: s.session_id,
          tabName: s.tab_name || "Main",
          status: s.status,
        })),
        needsHelp: needsHelp,
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

// 4. Fetch active order items for a specific table (with Virtual Sub-Tab support)
router.get("/table-details/:tableNumber", async (req, res) => {
  const { tableNumber } = req.params;
  const { sessionId } = req.query;

  try {
    let activeSessions = null;
    
    // Try query with assigned waiter and tab_name
    const { data: enrichedSessions, error: enrichedErr } = await supabase
      .from("table_sessions")
      .select("session_id, status, tab_name, assigned_waiter_id, staff:assigned_waiter_id ( id, name, employee_id )")
      .eq("table_number", tableNumber)
      .neq("status", "completed") 
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (enrichedErr || !enrichedSessions || enrichedSessions.length === 0) {
      const { data: fallbackSessions, error: sessionError } = await supabase
        .from("table_sessions")
        .select("session_id, status, tab_name")
        .eq("table_number", tableNumber)
        .neq("status", "completed") 
        .neq("status", "cancelled")
        .order("created_at", { ascending: true });

      if (sessionError || !fallbackSessions || fallbackSessions.length === 0) {
        return res.status(404).json({ error: "No active session found" });
      }
      activeSessions = fallbackSessions;
    } else {
      activeSessions = enrichedSessions;
    }

    // Pick target session (either requested sessionId or first one)
    const targetSession = sessionId
      ? activeSessions.find(s => s.session_id === sessionId) || activeSessions[0]
      : activeSessions[0];

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
      .eq("order_serves.orders.session_id", targetSession.session_id)
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
      sessionId: targetSession.session_id,
      sessionStatus: targetSession.status,
      tabName: targetSession.tab_name || "Main",
      availableTabs: activeSessions.map(s => ({
        sessionId: s.session_id,
        tabName: s.tab_name || "Main",
        status: s.status,
        assignedWaiter: s.staff ? {
          id: s.staff.id,
          name: s.staff.name,
          employeeId: s.staff.employee_id
        } : null
      })),
      assignedWaiter: targetSession.staff ? {
        id: targetSession.staff.id,
        name: targetSession.staff.name,
        employeeId: targetSession.staff.employee_id
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
            status,
            notes,
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
          const isOos = itemToDelete.status === 'out_of_stock' || (itemToDelete.notes && itemToDelete.notes.includes('[OUT OF STOCK'));

          // Only subtract cost if kitchen hasn't already subtracted it when marking out-of-stock
          if (!isOos) {
            const cost = Number(itemToDelete.price || 0) * Number(itemToDelete.quantity || 1);
            const newTotal = Math.max(0, Number(order.total_amount || 0) - cost);
            await supabase.from("orders").update({ total_amount: newTotal }).eq("id", order.id);
          }

          // Clear needs_waiter on the session if no more out-of-stock items remain
          if (order.session_id) {
            const { data: remainingItems } = await supabase
              .from("order_items")
              .select("id, status, notes, order_serves!inner(order_id, orders!inner(session_id))")
              .eq("order_serves.orders.session_id", order.session_id);

            const hasAnyOos = (remainingItems || []).some(
              i => i.status === 'out_of_stock' || (i.notes && i.notes.includes('[OUT OF STOCK'))
            );

            if (!hasAnyOos) {
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

// 8. Waiter manually requests bill for a table (or specific sub-tab session)
router.patch("/request-bill", async (req, res) => {
  const { tableNumber, sessionId, paymentMethod, waiterId } = req.body; 

  try {
    const finalStatus = paymentMethod ? `billed_${paymentMethod}` : "billed";
    let targetSessionId = sessionId;

    // If sessionId was not provided, look up newest active session for tableNumber
    if (!targetSessionId && tableNumber !== undefined && tableNumber !== null) {
      const { data: session, error: sessionErr } = await supabase
        .from("table_sessions")
        .select("session_id")
        .eq("table_number", Number(tableNumber))
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionErr || !session) {
        return res.status(404).json({ error: "No active session found for this table" });
      }
      targetSessionId = session.session_id;
    }

    if (!targetSessionId) {
      return res.status(400).json({ error: "Either sessionId or tableNumber is required" });
    }

    // 1. Update session status
    const updatePayload = { status: finalStatus };
    if (waiterId) updatePayload.assigned_waiter_id = waiterId;

    const { error: updateErr } = await supabase
      .from("table_sessions")
      .update(updatePayload)
      .eq("session_id", targetSessionId);

    if (updateErr) {
      // Fallback in case assigned_waiter_id column has relation or UUID issue
      const { error: fallbackErr } = await supabase
        .from("table_sessions")
        .update({ status: finalStatus })
        .eq("session_id", targetSessionId);
      if (fallbackErr) throw fallbackErr;
    }

    // 2. Also record waiter on active order if provided
    if (waiterId) {
      try {
        await supabase
          .from("orders")
          .update({ waiter_id: waiterId })
          .eq("session_id", targetSessionId);
      } catch (oErr) {}
    }

    res.json({
      success: true,
      message: "Bill requested successfully",
      status: finalStatus,
      sessionId: targetSessionId
    });
  } catch (err) {
    console.error("Request Bill Error:", err);
    res.status(500).json({ error: "Failed to request bill" });
  }
});

// 9. Spawn a new Virtual Sub-Tab for Table Sharing
router.post("/create-sub-tab", async (req, res) => {
  const { tableNumber, tabName, waiterId } = req.body;
  if (!tableNumber) return res.status(400).json({ error: "tableNumber is required" });

  try {
    const { data: tableData, error: tableErr } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("table_number", Number(tableNumber))
      .single();

    if (tableErr || !tableData) return res.status(404).json({ error: "Table not found" });

    // Count existing active tabs to generate a smart default name if omitted
    const { data: existingTabs } = await supabase
      .from("table_sessions")
      .select("session_id")
      .eq("table_number", Number(tableNumber))
      .neq("status", "completed")
      .neq("status", "cancelled");

    const tabCount = (existingTabs || []).length;
    const finalTabName = (tabName && tabName.trim()) 
      ? tabName.trim() 
      : `Party ${String.fromCharCode(66 + tabCount)}`; // Party B, Party C...

    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { data: insertedSession, error: insertErr } = await supabase
      .from("table_sessions")
      .insert([{
        session_id: newSessionId,
        table_number: Number(tableNumber),
        status: "active",
        cart_items: [],
        tab_name: finalTabName,
        assigned_waiter_id: waiterId || null
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Ensure physical table is marked occupied
    await supabase
      .from("tables")
      .update({ status: "occupied" })
      .eq("id", tableData.id);

    res.status(201).json({
      success: true,
      sessionId: newSessionId,
      tabName: finalTabName,
      tableNumber: Number(tableNumber),
    });
  } catch (err) {
    console.error("Create Sub-Tab Error:", err);
    res.status(500).json({ error: "Failed to create shared party sub-tab" });
  }
});

// 10. Waiter manually places an order on behalf of the customer (Mini-POS Fast-Entry)
router.post("/place-order", async (req, res) => {
  const { tableNumber, sessionId: passedSessionId, waiterId, items } = req.body;

  if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "tableNumber and items are required" });
  }

  try {
    // 1. Find the active session for this table (support passed sessionId for sub-tabs)
    let session = null;
    if (passedSessionId) {
      const { data: s } = await supabase
        .from("table_sessions")
        .select("session_id")
        .eq("session_id", passedSessionId)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .maybeSingle();
      session = s;
    }

    if (!session) {
      const { data: activeSession } = await supabase
        .from("table_sessions")
        .select("session_id")
        .eq("table_number", Number(tableNumber))
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      session = activeSession;
    }

    // Auto-create session if the table was completely empty
    if (!session) {
      const newSessionId = `sess_${Date.now()}_w${tableNumber}`;
      await supabase.from("table_sessions").insert([
        {
          session_id: newSessionId,
          table_number: Number(tableNumber),
          assigned_waiter_id: waiterId || null,
          status: "active",
          cart_items: [],
          tab_name: "Main"
        }
      ]);
      session = { session_id: newSessionId };
    }

    // Ensure physical table is marked occupied
    const { data: tableData } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", Number(tableNumber))
      .maybeSingle();

    if (tableData) {
      await supabase
        .from("tables")
        .update({ status: "occupied" })
        .eq("id", tableData.id);
    }

    // 2. Find or Create the Order
    let { data: order } = await supabase
      .from("orders")
      .select("id, serve_count, total_amount, waiter_id")
      .eq("session_id", session.session_id)
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const orderTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    let orderId;
    let newServeCount = 1;

    if (order) {
      orderId = order.id;
      newServeCount = (order.serve_count || 1) + 1;
      // Update existing order total and serve count
      await supabase.from("orders").update({
        total_amount: Number(order.total_amount || 0) + orderTotal,
        serve_count: newServeCount,
        waiter_id: waiterId || order.waiter_id
      }).eq("id", orderId);
    } else {
      // Create new order
      const { data: newOrder, error: newOrderErr } = await supabase.from("orders").insert([{
        table_id: tableData?.id,
        session_id: session.session_id,
        waiter_id: waiterId || null,
        total_amount: orderTotal,
        serve_count: 1,
        order_status: "preparing"
      }]).select("id").single();

      if (newOrderErr) throw newOrderErr;
      orderId = newOrder.id;
    }

    // 3. Create the Serve Round
    const { data: serve, error: serveErr } = await supabase.from("order_serves").insert([{
      order_id: orderId,
      serve_number: newServeCount,
      status: "preparing"
    }]).select("id").single();

    if (serveErr) throw serveErr;

    // 4. Insert items DIRECTLY as 'pending' (Skipping 'waiting_confirmation')
    const orderItems = items.map(item => ({
      menu_item_id: item.menuItemId || item.id,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes || "",
      serve_id: serve.id,
      status: "pending" // <-- Straight to kitchen!
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw itemsErr;

    res.json({ success: true, sessionId: session.session_id, message: "Order sent to kitchen!" });
  } catch (err) {
    console.error("Waiter Order Error:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// 11. Waiter Mini-POS: Punch order directly for a session
router.post("/punch-order", async (req, res) => {
  const { sessionId, tableNumber, waiterId, items } = req.body;
  if (!sessionId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "sessionId and items are required" });
  }

  try {
    const { data: tableData, error: tableErr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", Number(tableNumber))
      .single();

    if (tableErr || !tableData) throw new Error("Table not found");

    const orderTotal = items.reduce(
      (sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)),
      0
    );

    // Find or create active order for this session
    let { data: activeOrder } = await supabase
      .from("orders")
      .select("id, serve_count, total_amount, waiter_id")
      .eq("session_id", sessionId)
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeOrder) {
      const { data: newOrder, error: newOrderErr } = await supabase
        .from("orders")
        .insert([{
          table_id: tableData.id,
          session_id: sessionId,
          order_status: "preparing",
          waiter_id: waiterId || null,
          serve_count: 1,
          total_amount: orderTotal
        }])
        .select("id, serve_count, total_amount")
        .single();

      if (newOrderErr) throw newOrderErr;
      activeOrder = newOrder;
    } else {
      await supabase
        .from("orders")
        .update({
          total_amount: Number(activeOrder.total_amount || 0) + orderTotal,
          serve_count: (activeOrder.serve_count || 1) + 1,
          waiter_id: waiterId || activeOrder.waiter_id
        })
        .eq("id", activeOrder.id);
    }

    const nextServeNum = activeOrder.serve_count || 1;
    const { data: newServe, error: serveErr } = await supabase
      .from("order_serves")
      .insert([{
        order_id: activeOrder.id,
        serve_number: nextServeNum,
        status: "preparing"
      }])
      .select("id")
      .single();

    if (serveErr) throw serveErr;

    // Insert order items directly with status "pending" so kitchen receives it immediately!
    const orderItemsToInsert = items.map((item) => ({
      menu_item_id: item.menuItemId || item.id,
      quantity: item.quantity,
      price: item.price,
      serve_id: newServe.id,
      notes: item.notes || null,
      status: "pending"
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsErr) throw itemsErr;

    res.status(201).json({ success: true, message: "Order sent directly to kitchen!" });
  } catch (err) {
    console.error("Punch Order Error:", err);
    res.status(500).json({ error: "Failed to punch order" });
  }
});

export default router;
