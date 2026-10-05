import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// ==========================================
// BILLING ROUTES
// ==========================================
router.get("/billing/history", async (req, res) => {
  try {
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id, total_amount, created_at, serve_count,
        tables ( table_number ),
        payments ( payment_method, payment_status )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formattedOrders = ordersData.map((order) => {
      const paymentInfo = Array.isArray(order.payments) ? order.payments[0] : order.payments;
      return {
        id: `ORD-${order.id.substring(0, 6).toUpperCase()}`,
        tableNumber: order.tables?.table_number || 0,
        totalAmount: order.total_amount,
        paymentMethod: paymentInfo?.payment_method || "pending",
        paymentStatus: paymentInfo?.payment_status || "pending",
        createdAt: order.created_at,
        serveCount: order.serve_count
      };
    });

    res.json({ orders: formattedOrders });
  } catch (err) {
    console.error("Fetch Billing History Error:", err);
    res.status(500).json({ error: "Failed to fetch billing history" });
  }
});


// ==========================================
// MENU EDITOR ROUTES
// ==========================================

// GET: Fetch all Categories dynamically
router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    res.json({ categories: data });
  } catch (err) {
    console.error("Fetch Categories Error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET: Fetch all menu items (JOIN with categories table)
router.get("/menu", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        id, name, description, price, is_available, image_url, category_id,
        categories ( name )
      `)
      .order("name"); // Removed .order("category") which was crashing the query!

    if (error) throw error;

    // Flatten the category name so the frontend can read it easily
    const formattedData = data.map(item => ({
      ...item,
      category_name: item.categories?.name || "Unknown Category"
    }));

    res.json({ items: formattedData });
  } catch (err) {
    console.error("Fetch Menu Error:", err);
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// POST: Add a new menu item
router.post("/menu", async (req, res) => {
  try {
    const { name, description, price, category_id, is_available } = req.body;
    
    const { data, error } = await supabase
      .from("menu_items")
      .insert([{ name, description, price, category_id, is_available }])
      .select(`*, categories(name)`);

    if (error) throw error;

    const formattedItem = { ...data[0], category_name: data[0].categories?.name };
    res.json({ message: "Item added", item: formattedItem });
  } catch (err) {
    console.error("Add Menu Item Error:", err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// PATCH: Update an existing menu item
router.patch("/menu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from("menu_items")
      .update(updates)
      .eq("id", id)
      .select(`*, categories(name)`);

    if (error) throw error;
    
    const formattedItem = { ...data[0], category_name: data[0].categories?.name };
    res.json({ message: "Item updated", item: formattedItem });
  } catch (err) {
    console.error("Update Menu Item Error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// DELETE: Delete a menu item
router.delete("/menu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Delete Menu Item Error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;