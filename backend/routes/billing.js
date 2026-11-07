import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Get All Tables and their Current Status (including Assigned Waiter and Chef details)
router.get("/tables", async (req, res) => {
  try {
    let tables = null;

    // Enriched query with waiter and chef relationships
    const { data: enrichedTables, error: enrichedError } = await supabase
      .from("tables")
      .select(`
        id,
        table_number,
        status,
        table_sessions (
          session_id,
          status,
          assigned_waiter_id,
          staff:assigned_waiter_id ( id, name, employee_id ),
          orders (
            id,
            waiter_id,
            staff:waiter_id ( id, name, employee_id ),
            order_serves (
              order_items (
                price,
                quantity,
                status,
                notes,
                menu_items ( name ),
                staff:chef_id ( id, name, employee_id )
              )
            )
          )
        )
      `)
      .order('table_number', { ascending: true });

    if (enrichedError) {
      // Fallback query if columns do not exist yet
      const { data: fallbackTables, error: fallbackError } = await supabase
        .from("tables")
        .select(`
          id,
          table_number,
          status,
          table_sessions (
            session_id,
            status,
            orders (
              id,
              order_serves (
                order_items (
                  price,
                  quantity,
                  status,
                  notes,
                  menu_items ( name )
                )
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

    const formattedTables = (tables || []).map(t => {
      const activeSession = t.table_sessions?.find(s => s.status !== 'completed' && s.status !== 'cancelled');
      
      let dynamicTotal = 0;
      let orderId = null;
      let rawItems = [];
      let chefSet = new Set();

      // Extract waiter info
      const assignedWaiter = activeSession?.staff?.name || 
        (activeSession?.orders?.[0]?.staff?.name) || 
        null;

      // Calculate total and extract items
      if (activeSession && activeSession.orders && activeSession.orders.length > 0) {
        const currentOrder = activeSession.orders[0];
        orderId = currentOrder.id;
        
        currentOrder.order_serves?.forEach(serve => {
          serve.order_items?.forEach(item => {
            const isOOS = item.status === 'out_of_stock' || (item.notes && item.notes.includes('[OUT OF STOCK'));
            
            // Only bill items that are NOT out of stock
            if (!isOOS) {
              const itemTotal = Number(item.price) * Number(item.quantity);
              dynamicTotal += itemTotal;
              
              if (item.staff?.name) {
                chefSet.add(item.staff.name);
              }

              if (item.menu_items) {
                 rawItems.push({
                   name: item.menu_items.name,
                   quantity: item.quantity,
                   price: itemTotal,
                   chefName: item.staff?.name || null
                 });
              }
            }
          });
        });
      }

      // Consolidate duplicate items for a cleaner bill
      const consolidatedItems = Object.values(rawItems.reduce((acc, curr) => {
        if (acc[curr.name]) {
            acc[curr.name].quantity += curr.quantity;
            acc[curr.name].price += curr.price;
            if (curr.chefName && !acc[curr.name].chefs?.includes(curr.chefName)) {
              acc[curr.name].chefs = [...(acc[curr.name].chefs || []), curr.chefName];
            }
        } else {
            acc[curr.name] = { 
              ...curr,
              chefs: curr.chefName ? [curr.chefName] : [] 
            };
        }
        return acc;
      }, {}));

      // Determine Table Status
      let displayStatus = "Available";
      let paymentMethod = null;

      if (activeSession) {
        displayStatus = "Occupied";
        if (activeSession.status.startsWith("billed")) {
          displayStatus = "Billed";
          if (activeSession.status.includes("_")) {
            paymentMethod = activeSession.status.split("_")[1];
          }
        }
      }

      return {
        id: t.id,
        tableNumber: t.table_number,
        status: displayStatus,
        paymentMethod: paymentMethod,
        sessionId: activeSession?.session_id || null,
        orderId: orderId,
        itemTotal: dynamicTotal,
        waiterName: assignedWaiter,
        chefs: Array.from(chefSet),
        items: consolidatedItems
      };
    });

    res.json({ tables: formattedTables });
  } catch (err) {
    console.error("Billing Tables Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// 2. Process Checkout & Free the Table
router.post("/checkout", async (req, res) => {
  const { orderId, sessionId, tableNumber, paymentMethod, finalAmount } = req.body;

  try {
    // A. Update Order to Completed
    await supabase
      .from("orders")
      .update({ order_status: "completed" })
      .eq("id", orderId);

    // B. Save Payment Record
    await supabase
      .from("payments")
      .insert([{
        order_id: orderId,
        payment_method: paymentMethod, // 'cash', 'card', or 'upi'
        amount: finalAmount,
        payment_status: "paid"
      }]);

    // C. Close the Table Session fully
    await supabase
      .from("table_sessions")
      .update({ status: "completed" })
      .eq("session_id", sessionId);

    res.json({ success: true, message: "Payment successful. Table is now available." });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
