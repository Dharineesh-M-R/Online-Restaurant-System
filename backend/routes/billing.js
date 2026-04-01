import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Get All Tables and their Current Status
router.get("/tables", async (req, res) => {
  try {
    // Fetch all tables
    const { data: tables, error: tableErr } = await supabase
      .from("tables")
      .select("*")
      .order("table_number", { ascending: true });

    if (tableErr) throw tableErr;

    // Fetch active/billed sessions
    const { data: activeSessions, error: sessionErr } = await supabase
      .from("table_sessions")
      .select("*")
      .in("status", ["active", "billed", "billed_cash", "billed_card", "billed_upi"]);

    if (sessionErr) throw sessionErr;

    // Fetch active orders to get the current total amounts
    const { data: activeOrders, error: orderErr } = await supabase
      .from("orders")
      .select("id, table_id, total_amount, session_id")
      .neq("order_status", "completed")
      .neq("order_status", "cancelled");

    if (orderErr) throw orderErr;

    // Map the data together for the frontend
    const dashboardData = tables.map((table) => {
      // Find if this table has an active or billed session
      const session = activeSessions.find(s => s.table_number === table.table_number);
      // Find the order associated with this table
      const order = activeOrders.find(o => o.table_id === table.id);

      return {
        id: table.id,
        tableNumber: table.table_number,
        status: session ? (session.status.startsWith("billed") ? "Billed" : "Occupied") : "Available",
        paymentMethod: session && session.status.startsWith("billed_") ? session.status.split("_")[1] : null,
        sessionId: session ? session.session_id : null,
        orderId: order ? order.id : null,
        itemTotal: order ? Number(order.total_amount) : 0,
      };
    });

    res.json({ tables: dashboardData });
  } catch (err) {
    console.error("Billing Dashboard Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
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