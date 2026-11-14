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
          tab_name,
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
            tab_name,
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

    const formattedTables = [];

    (tables || []).forEach(t => {
      const activeSessions = (t.table_sessions || []).filter(
        s => s.status !== 'completed' && s.status !== 'cancelled'
      );

      if (activeSessions.length === 0) {
        formattedTables.push({
          id: t.id,
          tableNumber: t.table_number,
          tabName: "Main",
          status: "Available",
          paymentMethod: null,
          sessionId: null,
          orderId: null,
          itemTotal: 0,
          waiterName: null,
          chefs: [],
          items: []
        });
      } else {
        // One billing card per active party session
        activeSessions.forEach(activeSession => {
          let dynamicTotal = 0;
          let orderId = null;
          let rawItems = [];
          let chefSet = new Set();

          const assignedWaiter = activeSession?.staff?.name || 
            (activeSession?.orders?.[0]?.staff?.name) || 
            null;

          if (activeSession.orders && activeSession.orders.length > 0) {
            const currentOrder = activeSession.orders[0];
            orderId = currentOrder.id;
            
            currentOrder.order_serves?.forEach(serve => {
              serve.order_items?.forEach(item => {
                const isOOS = item.status === 'out_of_stock' || (item.notes && item.notes.includes('[OUT OF STOCK'));
                
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

          const isBilled = activeSession.status.startsWith("billed");
          let paymentMethod = null;
          if (isBilled && activeSession.status.includes("_")) {
            paymentMethod = activeSession.status.split("_")[1];
          }

          formattedTables.push({
            id: activeSession.session_id, // unique per sub-tab session
            tableId: t.id,
            tableNumber: t.table_number,
            tabName: activeSession.tab_name || "Main",
            isSubTab: Boolean(activeSession.tab_name && activeSession.tab_name !== "Main"),
            status: isBilled ? "Billed" : "Occupied",
            paymentMethod: paymentMethod,
            sessionId: activeSession.session_id,
            orderId: orderId,
            itemTotal: dynamicTotal,
            waiterName: assignedWaiter,
            chefs: Array.from(chefSet),
            items: consolidatedItems
          });
        });
      }
    });

    res.json({ tables: formattedTables });
  } catch (err) {
    console.error("Billing Tables Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// 2. Process Checkout & Free the Table
router.post("/checkout", async (req, res) => {
  const { orderId, sessionId, tableNumber, paymentMethod, finalAmount, originalAmount, discountAmount } = req.body;

  try {
    // A. Update Order to Completed (save final amount, original price, and offer discount)
    const orderUpdatePayload = {
      order_status: "completed",
      total_amount: Number(finalAmount),
    };
    if (originalAmount !== undefined && originalAmount !== null) {
      orderUpdatePayload.original_amount = Number(originalAmount);
    }
    if (discountAmount !== undefined && discountAmount !== null) {
      orderUpdatePayload.discount_amount = Number(discountAmount);
    }

    await supabase
      .from("orders")
      .update(orderUpdatePayload)
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

    // D. Free the physical table if no other active sessions/sub-tabs remain for this table
    if (tableNumber) {
      const { data: remainingSessions } = await supabase
        .from("table_sessions")
        .select("session_id")
        .eq("table_number", Number(tableNumber))
        .neq("session_id", sessionId)
        .neq("status", "completed")
        .neq("status", "cancelled");

      if (!remainingSessions || remainingSessions.length === 0) {
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("table_number", Number(tableNumber));
      }
    }

    res.json({ success: true, message: "Payment successful. Table is now available." });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
