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
      .eq("status", "active")
      .maybeSingle(); 

    if (fetchError) throw fetchError;

    if (activeSession) {
      return res.json({ sessionId: activeSession.session_id, cart: activeSession.cart_items });
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

// 2. The Master Sync Route (Pulls from NORMALIZED tables)
router.get("/:sessionId/sync", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // A. Get the Shared Cart & Table Number
    const { data: sessionData, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("table_number, cart_items")
      .eq("session_id", sessionId)
      .single();

    if (sessionErr || !sessionData) return res.status(404).json({ error: "Session not found" });

    // B. Get the Table UUID
    const { data: tableInfo, error: tableErr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", sessionData.table_number)
      .single();

    if (tableErr) throw tableErr;

    // C. Get the Active Order and all its serves & items
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
            menu_items (name)
          )
        )
      `)
      .eq("table_id", tableInfo.id)
      .eq("session_id", sessionId) // Strict match to this specific session
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderErr) throw orderErr;

    // Reconstruct the data into the format the frontend expects
    const formattedServes = [];
    if (activeOrder && activeOrder.order_serves) {
      for (const serve of activeOrder.order_serves) {
        let serveTotal = 0;
        const formattedItems = serve.order_items.map(item => {
          serveTotal += Number(item.price) * item.quantity;
          return {
            id: item.menu_item_id, // This is the UUID
            name: item.menu_items?.name || "Unknown Item",
            price: item.price,
            quantity: item.quantity,
            notes: item.notes
          };
        });

        formattedServes.push({
          serveNumber: serve.serve_number,
          items: formattedItems,
          serveTotal: serveTotal,
          sessionId: sessionId
        });
      }
    }

    // Sort serves by number just to be safe
    formattedServes.sort((a, b) => a.serveNumber - b.serveNumber);

    res.json({
      cart: sessionData.cart_items || [],
      serves: formattedServes
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

// 4. Place a New Order (NORMALIZED WORKFLOW)
router.post("/:sessionId/orders", async (req, res) => {
  const { sessionId } = req.params;
  const { serveNumber, items, serveTotal } = req.body;

  try {
    // A. Get the Table Info
    const { data: session, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("table_number")
      .eq("session_id", sessionId)
      .single();
    if (sessionErr) throw sessionErr;

    const { data: tableInfo, error: tableErr } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", session.table_number)
      .single();
    if (tableErr) throw tableErr;

    // B. Find an active Order, or create one
    let orderId;
    const { data: existingOrder, error: orderFetchErr } = await supabase
      .from("orders")
      .select("id, serve_count, total_amount")
      .eq("table_id", tableInfo.id)
      .eq("session_id", sessionId) // Bind strictly to this session
      .neq("order_status", "completed")
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderFetchErr) throw orderFetchErr;

    if (existingOrder) {
      orderId = existingOrder.id;
      // Update the total and serve count of the master order
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          serve_count: existingOrder.serve_count + 1,
          total_amount: Number(existingOrder.total_amount) + Number(serveTotal)
        })
        .eq("id", orderId);
      
      if (updateErr) throw updateErr;
    } else {
      // Create a brand new order for the table and link the session_id
      const { data: newOrder, error: newOrderErr } = await supabase
        .from("orders")
        .insert([{
          table_id: tableInfo.id,
          session_id: sessionId, // <-- Linked correctly here
          total_amount: serveTotal,
          serve_count: 1,
          order_status: "pending"
        }])
        .select("id")
        .single();
      
      if (newOrderErr) throw newOrderErr;
      orderId = newOrder.id;
    }

    // C. Create the Order Serve (Let Supabase generate the UUID, then we fetch it back)
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

    // D. Insert the Individual Items
    const orderItemsData = items.map(item => ({
      menu_item_id: item.id, // Must be the UUID from your menu_items table
      quantity: item.quantity,
      price: item.price,
      serve_id: serveId,
      notes: item.notes || null,
      status: "pending"
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemsData);
    
    if (itemsErr) throw itemsErr;

    // E. Clear the Shared Cart since it has been successfully placed
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

export default router;