import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Get All Tables and their Current Status
router.get("/tables", async (req, res) => {
  try {
    // 🔥 UPDATE: Added menu_items (name) to the query
    const { data: tables, error } = await supabase
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
                menu_items ( name )
              )
            )
          )
        )
      `)
      .order('table_number', { ascending: true });

    if (error) throw error;

    const formattedTables = tables.map(t => {
      const activeSession = t.table_sessions?.find(s => s.status !== 'completed' && s.status !== 'cancelled');
      
      let dynamicTotal = 0;
      let orderId = null;
      let rawItems = [];

      // Calculate total and extract items
      if (activeSession && activeSession.orders && activeSession.orders.length > 0) {
        const currentOrder = activeSession.orders[0];
        orderId = currentOrder.id;
        
        currentOrder.order_serves?.forEach(serve => {
          serve.order_items?.forEach(item => {
            const itemTotal = Number(item.price) * Number(item.quantity);
            dynamicTotal += itemTotal;
            
            if (item.menu_items) {
               rawItems.push({
                 name: item.menu_items.name,
                 quantity: item.quantity,
                 price: itemTotal // Store the total price for this specific row
               });
            }
          });
        });
      }

      // 🔥 NEW: Consolidate duplicate items for a cleaner bill
      // (e.g., if they ordered "Water" twice in two different serves, combine them)
      const consolidatedItems = Object.values(rawItems.reduce((acc, curr) => {
        if (acc[curr.name]) {
            acc[curr.name].quantity += curr.quantity;
            acc[curr.name].price += curr.price;
        } else {
            acc[curr.name] = { ...curr };
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
        items: consolidatedItems // 👈 Send the formatted receipt items to the frontend
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