import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Get Active Session (or Create a New One)
router.get("/", async (req, res) => {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: "Table number is required" });

  try {
    const { data: activeSession, error: fetchError } = await supabase
      .from("table_sessions")
      .select("session_id, cart_items")
      .eq("table_number", table)
      .neq("status", "completed") 
      .neq("status", "cancelled") 
      .order("created_at", { ascending: false }) // 🔥 FIX 1: Sort by newest first
      .limit(1)                                  // 🔥 FIX 2: Force only 1 row to fix PGRST116
      .maybeSingle(); 

    if (fetchError) throw fetchError;

    if (activeSession) {
      return res.json({ sessionId: activeSession.session_id, cart: activeSession.cart_items || [] });
    }

    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { error: insertError } = await supabase
      .from("table_sessions")
      .insert([{ session_id: newSessionId, table_number: table, status: "active", cart_items: [] }]);

    if (insertError) throw insertError;
    res.json({ sessionId: newSessionId, cart: [] });

  } catch (err) {
    console.error("Get Session Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. The Master Sync Route
router.get("/:sessionId/sync", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { data: sessionData, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("table_number, cart_items, status")
      .eq("session_id", sessionId)
      .neq("status", "completed")
      .neq("status", "cancelled") // 🔥 FIX: Forces a 404 if the session was force closed!
      .single();

    if (sessionErr || !sessionData) return res.status(404).json({ error: "Session not found" });

    const { data: tableInfo, error: tableErr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", sessionData.table_number)
      .single();

    if (tableErr) throw tableErr;

    const { data: activeOrder, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        order_serves (
          id,
          serve_number,
          order_items (
            menu_item_id,
            quantity,
            price,
            notes,
            status,
            menu_items (name)
          )
        )
      `)
      .eq("table_id", tableInfo.id)
      .eq("session_id", sessionId)
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderErr) throw orderErr;

    const formattedServes = [];
    if (activeOrder && activeOrder.order_serves) {
      for (const serve of activeOrder.order_serves) {
        let serveTotal = 0;
        
        const formattedItems = serve.order_items
          .filter(item => item !== null) 
          .map(item => {
            serveTotal += Number(item.price) * item.quantity;
            return {
              id: item.menu_item_id, 
              name: item.menu_items?.name || "Unknown Item",
              price: item.price,
              quantity: item.quantity,
              notes: item.notes,
              status: item.status 
            };
          });

        if (formattedItems.length > 0) {
          formattedServes.push({
            serveNumber: serve.serve_number,
            items: formattedItems,
            serveTotal: serveTotal,
            sessionId: sessionId
          });
        }
      }
    }

    formattedServes.sort((a, b) => a.serveNumber - b.serveNumber);

    res.json({
      cart: sessionData.cart_items || [],
      serves: formattedServes,
      sessionStatus: sessionData.status
    });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Sync error" });
  }
});

// 3. Update the Shared Cart
router.patch("/:sessionId/cart", async (req, res) => {
  const { sessionId } = req.params;
  const { cart } = req.body;

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ cart_items: cart })
      .eq("session_id", sessionId);
    
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error("Cart Update Error:", err);
    res.status(500).json({ error: "Cart update error" });
  }
});

// 4. Place a New Order
router.post("/:sessionId/orders", async (req, res) => {
  const { sessionId } = req.params;
  const { serveNumber, items, serveTotal } = req.body;

  try {
    const { data: session, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("table_number")
      .eq("session_id", sessionId)
      .neq("status", "completed")
      .neq("status", "cancelled") 
      .single();
      
    if (sessionErr) throw sessionErr;

    const { data: tableInfo, error: tableErr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", session.table_number)
      .single();
    if (tableErr) throw tableErr;

    let orderId;
    const { data: existingOrder, error: orderFetchErr } = await supabase
      .from("orders")
      .select("id, serve_count, total_amount")
      .eq("table_id", tableInfo.id)
      .eq("session_id", sessionId)
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderFetchErr) throw orderFetchErr;

    if (existingOrder) {
      orderId = existingOrder.id;
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          serve_count: existingOrder.serve_count + 1,
          total_amount: Number(existingOrder.total_amount) + Number(serveTotal)
        })
        .eq("id", orderId);
      
      if (updateErr) throw updateErr;
    } else {
      const { data: newOrder, error: newOrderErr } = await supabase
        .from("orders")
        .insert([{
          table_id: tableInfo.id,
          session_id: sessionId, 
          total_amount: serveTotal,
          serve_count: 1,
          order_status: "pending" 
        }])
        .select("id")
        .single();
      
      if (newOrderErr) throw newOrderErr;
      orderId = newOrder.id;
    }

    const { data: newServe, error: serveErr } = await supabase
      .from("order_serves")
      .insert([{
        order_id: orderId,
        serve_number: serveNumber,
        status: "received"
      }])
      .select("id")
      .single();
    
    if (serveErr) throw serveErr;
    const serveId = newServe.id;

    const orderItemsData = items.map(item => ({
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
      serve_id: serveId,
      notes: item.notes || null,
      status: item.status || "waiting_confirmation"
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsData);
    
    if (itemsErr) throw itemsErr;

    const { error: clearCartErr } = await supabase
      .from("table_sessions")
      .update({ cart_items: [] })
      .eq("session_id", sessionId);
    
    if (clearCartErr) throw clearCartErr;

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Order Placement Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 5. Request Bill
router.post("/:sessionId/bill", async (req, res) => {
  const { sessionId } = req.params;
  const { paymentMethod } = req.body; 

  try {
    const finalStatus = paymentMethod ? `billed_${paymentMethod}` : "billed";

    const { error: sessionErr } = await supabase
      .from("table_sessions")
      .update({ status: finalStatus })
      .eq("session_id", sessionId);

    if (sessionErr) throw sessionErr;

    res.json({ success: true, message: "Bill requested successfully." });
  } catch (err) {
    console.error("Billing Error:", err);
    res.status(500).json({ error: "Failed to request bill" });
  }
});

// 6. Cancel Session
router.post("/:sessionId/cancel", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ status: "cancelled" })
      .eq("session_id", sessionId);

    if (error) throw error;

    res.json({ success: true, message: "Session cancelled." });
  } catch (err) {
    console.error("Cancel Error:", err);
    res.status(500).json({ error: "Failed to cancel session" });
  }
});

// 🔥 NEW & IMPROVED: Fetch available parcel tokens (Tables > 100)
router.get("/available-parcels", async (req, res) => {
  try {
    // 1. Get all parcel tables
    const { data: tables, error: tablesErr } = await supabase
      .from("tables")
      .select("table_number")
      .gt("table_number", 100)
      .order("table_number", { ascending: true });

    if (tablesErr) throw tablesErr;

    // 2. Get active sessions for parcels
    const { data: activeSessions, error: sessionsErr } = await supabase
      .from("table_sessions")
      .select("table_number")
      .gt("table_number", 100)
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (sessionsErr) throw sessionsErr;

    // 3. Filter out tables that already have an active session
    const busyTableNumbers = activeSessions.map(s => s.table_number);
    const availableParcels = tables
        .map(t => t.table_number)
        .filter(num => !busyTableNumbers.includes(num));

    res.json({ parcels: availableParcels });
  } catch (err) {
    console.error("Fetch Parcels Error:", err);
    res.status(500).json({ error: "Failed to fetch parcels" });
  }
});

export default router;