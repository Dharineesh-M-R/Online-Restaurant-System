import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// 1. Fetch live kitchen orders (Tickets) with Chef and Waiter monitoring
router.get("/orders", async (req, res) => {
  try {
    let orderItems = null;

    // Enriched query with chef and waiter details
    const { data: enrichedItems, error: enrichedError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        status,
        notes,
        staff:chef_id ( id, name, employee_id ),
        menu_item_id,
        menu_items (
          id,
          name,
          categories ( name )
        ),
        order_serves (
          id,
          serve_number,
          created_at,
          orders (
            waiter_id,
            session_id,
            staff:waiter_id ( id, name, employee_id ),
            tables ( table_number ),
            table_sessions:session_id ( tab_name )
          )
        )
      `)
      .in("status", ["pending", "preparing", "ready"]);

    if (enrichedError) {
      // Fallback query if chef_id / waiter_id relations not yet added
      const { data: fallbackItems, error: fallbackError } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          status,
          notes,
          menu_item_id,
          menu_items (
            id,
            name,
            categories ( name )
          ),
          order_serves (
            id,
            serve_number,
            created_at,
            orders (
              tables ( table_number )
            )
          )
        `)
        .in("status", ["pending", "preparing", "ready"]);

      if (fallbackError) throw fallbackError;
      orderItems = fallbackItems;
    } else {
      orderItems = enrichedItems;
    }

    const ticketsMap = {};

    (orderItems || []).forEach((item) => {
      if (!item.order_serves || !item.order_serves.orders || !item.order_serves.orders.tables) return;

      // Filter out items marked out of stock so they don't remain on the kitchen KDS screen
      const isOos = item.status === "out_of_stock" || (item.notes && item.notes.includes("[OUT OF STOCK"));
      if (isOos) return;

      const serveId = item.order_serves.id;

      if (!ticketsMap[serveId]) {
        const sessionInfo = item.order_serves.orders.table_sessions;
        const rawTabName = Array.isArray(sessionInfo) ? sessionInfo[0]?.tab_name : sessionInfo?.tab_name;
        const tabName = (rawTabName && rawTabName !== "Main") ? rawTabName : null;

        ticketsMap[serveId] = {
          serveId: serveId,
          tableNumber: item.order_serves.orders.tables.table_number,
          tabName: tabName,
          serveNumber: item.order_serves.serve_number,
          orderTime: item.order_serves.created_at,
          waiterName: item.order_serves.orders.staff?.name || null,
          waiterEmployeeId: item.order_serves.orders.staff?.employee_id || null,
          items: [],
        };
      }

      ticketsMap[serveId].items.push({
        id: item.id,
        menuItemId: item.menu_item_id || item.menu_items?.id,
        name: item.menu_items?.name || "Unknown Item",
        quantity: item.quantity,
        notes: item.notes,
        status: item.status,
        category: item.menu_items?.categories?.name || "Uncategorized",
        chefName: item.staff?.name || null,
        chefEmployeeId: item.staff?.employee_id || null,
        chefId: item.staff?.id || null,
      });
    });

    const tickets = Object.values(ticketsMap).sort(
      (a, b) => new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime()
    );

    res.json({ tickets });
  } catch (err) {
    console.error("Kitchen Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch kitchen orders" });
  }
});

// 2. Update a specific item's cooking status and record WHICH chef is cooking it
// Handles Out-of-Stock workflow: updates menu availability, adjusts order total, alerts waiter
router.patch("/update-item", async (req, res) => {
  const { itemId, status, chefId, menuItemId, dishName } = req.body;

  try {
    if (status === "out_of_stock") {
      // 1. Fetch item details to identify dish, order, and table session
      const { data: itemData, error: itemFetchErr } = await supabase
        .from("order_items")
        .select(`
          id,
          price,
          quantity,
          menu_item_id,
          notes,
          menu_items ( id, name ),
          order_serves (
            order_id,
            orders (
              id,
              table_id,
              session_id,
              total_amount,
              tables ( table_number )
            )
          )
        `)
        .eq("id", itemId)
        .single();

      if (itemFetchErr) throw itemFetchErr;

      const finalDishName = dishName || itemData?.menu_items?.name || "Dish";
      const targetMenuItemId = menuItemId || itemData?.menu_item_id || itemData?.menu_items?.id;
      const orderObj = itemData?.order_serves?.orders;
      const tableNumber = orderObj?.tables?.table_number;

      // 2. Mark dish as OUT OF STOCK in menu_items table (both by ID and by name)
      if (targetMenuItemId) {
        await supabase
          .from("menu_items")
          .update({ is_available: false })
          .eq("id", targetMenuItemId);
      }
      if (finalDishName && finalDishName !== "Dish") {
        await supabase
          .from("menu_items")
          .update({ is_available: false })
          .ilike("name", finalDishName.trim());
      }

      // 3. Update order_items status to 'out_of_stock'
      const noteAppend = `[OUT OF STOCK - Kitchen Alert]`;
      const updatedNotes = itemData.notes
        ? (itemData.notes.includes(noteAppend) ? itemData.notes : `${itemData.notes} ${noteAppend}`)
        : noteAppend;

      let { error: statusErr } = await supabase
        .from("order_items")
        .update({
          status: "out_of_stock",
          notes: updatedNotes,
        })
        .eq("id", itemId);

      // Fallback if DB check constraint does not permit 'out_of_stock' yet
      if (statusErr) {
        console.warn("DB check constraint rejected 'out_of_stock', updating notes fallback:", statusErr.message);
        await supabase
          .from("order_items")
          .update({
            notes: updatedNotes,
          })
          .eq("id", itemId);
      }

      // 4. Adjust order total (subtract out-of-stock item so customer is not charged)
      if (orderObj) {
        const itemCost = Number(itemData.price || 0) * Number(itemData.quantity || 1);
        const newTotal = Math.max(0, Number(orderObj.total_amount || 0) - itemCost);
        await supabase
          .from("orders")
          .update({ total_amount: newTotal })
          .eq("id", orderObj.id);

        // 5. Trigger needs_waiter on the table session so waiter is urgently alerted
        if (orderObj.session_id) {
          await supabase
            .from("table_sessions")
            .update({ needs_waiter: true })
            .eq("session_id", orderObj.session_id);
        }
      }

      return res.json({
        success: true,
        outOfStock: true,
        dishName: finalDishName,
        tableNumber,
        message: `${finalDishName} marked out of stock and table #${tableNumber} alerted.`,
      });
    }

    // Normal status progression (preparing, ready, served)
    const updatePayload = { status };
    if (chefId && (status === "preparing" || status === "ready")) {
      updatePayload.chef_id = chefId;
    }

    let { error } = await supabase
      .from("order_items")
      .update(updatePayload)
      .eq("id", itemId);

    // If error occurs because chef_id column is not in DB yet, fallback without chef_id
    if (error && error.message?.includes("chef_id")) {
      const fallbackResult = await supabase
        .from("order_items")
        .update({ status })
        .eq("id", itemId);
      error = fallbackResult.error;
    }

    if (error) throw error;

    res.json({ success: true, message: `Item updated to ${status}` });
  } catch (err) {
    console.error("Kitchen Update Error:", err);
    res.status(500).json({ error: "Failed to update item status" });
  }
});

// 3. Chef Stock Management: Fetch all menu items with stock status
router.get("/stock", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        id,
        name,
        description,
        price,
        is_available,
        categories ( name )
      `)
      .order("name", { ascending: true });

    if (error) throw error;

    const formattedStock = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      isAvailable: item.is_available,
      category: item.categories?.name || "Uncategorized",
    }));

    res.json({ items: formattedStock });
  } catch (err) {
    console.error("Fetch Kitchen Stock Error:", err);
    res.status(500).json({ error: "Failed to fetch kitchen stock" });
  }
});

// 4. Chef Stock Toggle: Give chef full permission to toggle dish stock on/off
router.patch("/toggle-stock", async (req, res) => {
  const { menuItemId, isAvailable } = req.body;

  if (!menuItemId || typeof isAvailable !== "boolean") {
    return res.status(400).json({ error: "menuItemId and isAvailable boolean are required" });
  }

  try {
    const { data, error } = await supabase
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", menuItemId)
      .select("id, name, is_available")
      .single();

    if (error) throw error;

    res.json({
      success: true,
      item: data,
      message: `${data.name} is now ${isAvailable ? "In Stock" : "Out of Stock"}`,
    });
  } catch (err) {
    console.error("Toggle Stock Error:", err);
    res.status(500).json({ error: "Failed to update dish stock status" });
  }
});

export default router;
