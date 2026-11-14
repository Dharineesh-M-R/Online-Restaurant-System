import express from "express";
import { randomUUID } from "crypto";
import supabase from "../supabase.js";
import {
  DEFAULT_STAFF,
  loadRosterStore,
  saveRosterStore,
  analyzeFatigueWarnings,
  analyzeUnderstaffingAlerts,
} from "../rosterStore.js";

const router = express.Router();

// ==========================================
// BILLING ROUTES (with Waiter and Chef monitoring)
// ==========================================
router.get("/billing/history", async (req, res) => {
  try {
    let ordersData = null;

    // Try enriched query with waiter and chef relations
    const { data: enrichedData, error: enrichedError } = await supabase
      .from("orders")
      .select(`
        id, total_amount, original_amount, discount_amount, created_at, serve_count,
        waiter_id,
        staff:waiter_id ( id, name, employee_id ),
        tables ( table_number ),
        payments ( payment_method, payment_status ),
        order_serves (
          order_items (
            staff:chef_id ( name )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (enrichedError) {
      // Fallback query if columns not yet added
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("orders")
        .select(`
          id, total_amount, original_amount, discount_amount, created_at, serve_count,
          tables ( table_number ),
          payments ( payment_method, payment_status )
        `)
        .order("created_at", { ascending: false });

      if (fallbackError) throw fallbackError;
      ordersData = fallbackData;
    } else {
      ordersData = enrichedData;
    }

    const formattedOrders = (ordersData || []).map((order) => {
      const paymentInfo = Array.isArray(order.payments) ? order.payments[0] : order.payments;

      const chefSet = new Set();
      order.order_serves?.forEach((serve) => {
        serve.order_items?.forEach((item) => {
          if (item.staff?.name) {
            chefSet.add(item.staff.name);
          }
        });
      });

      return {
        id: `ORD-${order.id.substring(0, 6).toUpperCase()}`,
        rawId: order.id,
        tableNumber: order.tables?.table_number || 0,
        totalAmount: Number(order.total_amount),
        originalAmount: Number(order.original_amount !== null && order.original_amount !== undefined ? order.original_amount : order.total_amount),
        discountAmount: Number(order.discount_amount || 0),
        paymentMethod: paymentInfo?.payment_method || "pending",
        paymentStatus: paymentInfo?.payment_status || "pending",
        createdAt: order.created_at,
        serveCount: order.serve_count,
        waiterName: order.staff?.name || "Unassigned",
        waiterEmployeeId: order.staff?.employee_id || null,
        chefs: Array.from(chefSet)
      };
    });

    res.json({ orders: formattedOrders });
  } catch (err) {
    console.error("Fetch Billing History Error:", err);
    res.status(500).json({ error: "Failed to fetch billing history" });
  }
});

// GET: Fetch detailed line items for a specific past order
router.get("/billing/history/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // If a short ID like 'ORD-123456' was passed, support querying by order.id prefix
    let targetOrderId = orderId;
    if (orderId.startsWith("ORD-")) {
      const shortCode = orderId.replace("ORD-", "").toLowerCase();
      const { data: matchedOrder } = await supabase
        .from("orders")
        .select("id")
        .ilike("id", `${shortCode}%`)
        .limit(1)
        .maybeSingle();

      if (matchedOrder) {
        targetOrderId = matchedOrder.id;
      }
    }

    // Query order_items through the order_serves link, and join menu_items for the name
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        price,
        status,
        notes,
        menu_items ( name ),
        order_serves!inner ( order_id )
      `)
      .eq("order_serves.order_id", targetOrderId)
      .neq("status", "cancelled"); 

    if (error) throw error;

    // Format the data cleanly for the frontend
    const formattedItems = (data || []).map(item => ({
      id: item.id,
      name: item.menu_items?.name || "Unknown Item",
      quantity: item.quantity,
      price: Number(item.price || 0),
      total: Number(item.quantity || 1) * Number(item.price || 0),
      status: item.status,
      notes: item.notes
    }));

    res.json({ items: formattedItems });
  } catch (err) {
    console.error("Fetch Order Details Error:", err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// ==========================================
// OVERVIEW METRICS ROUTE (The 4 Pillars)
// ==========================================
router.get("/overview", async (req, res) => {
  try {
    // 1. Live Floor: Active Sessions & Unbilled Floating Revenue
    let unbilledFloatingRevenue = 0;
    let activeSessionsCount = 0;

    const { data: activeSessionsData } = await supabase
      .from("table_sessions")
      .select(`
        session_id, table_number, status, tab_name, created_at,
        orders (
          id, total_amount, order_status,
          order_serves (
            order_items (
              id, price, quantity, status
            )
          )
        )
      `)
      .neq("status", "completed")
      .neq("status", "cancelled");

    (activeSessionsData || []).forEach((sess) => {
      activeSessionsCount++;
      let sessionTotal = 0;
      sess.orders?.forEach((order) => {
        order.order_serves?.forEach((serve) => {
          serve.order_items?.forEach((item) => {
            if (item.status !== "cancelled") {
              sessionTotal += Number(item.price || 0) * Number(item.quantity || 1);
            }
          });
        });
      });
      unbilledFloatingRevenue += sessionTotal;
    });

    // 1b. Live Floor: Tables
    // Source of Truth: A table is active/occupied IF AND ONLY IF it has an active session in table_sessions
    const activePhysicalTableNumbers = new Set(
      (activeSessionsData || [])
        .filter((s) => Number(s.table_number) <= 100)
        .map((s) => Number(s.table_number))
    );

    const { data: tablesData } = await supabase
      .from("tables")
      .select("id, table_number, status");

    const physicalTables = (tablesData || []).filter((t) => Number(t.table_number) <= 100);
    const occupiedTables = physicalTables.filter((t) =>
      activePhysicalTableNumbers.has(Number(t.table_number))
    );
    const availableTables = physicalTables.filter(
      (t) => !activePhysicalTableNumbers.has(Number(t.table_number))
    );

    // Auto-heal any stale 'occupied' status in the physical tables table
    const staleTables = physicalTables.filter(
      (t) =>
        String(t.status).toLowerCase() === "occupied" &&
        !activePhysicalTableNumbers.has(Number(t.table_number))
    );
    if (staleTables.length > 0) {
      const staleIds = staleTables.map((t) => t.id);
      supabase.from("tables").update({ status: "available" }).in("id", staleIds).then(() => {});
    }

    // 1c. Live Floor: Current Kitchen Load (pending & preparing)
    let pendingKitchenCount = 0;
    let preparingKitchenCount = 0;

    const { data: kitchenItems } = await supabase
      .from("order_items")
      .select("id, status, quantity")
      .in("status", ["pending", "preparing"]);

    (kitchenItems || []).forEach((item) => {
      const qty = Number(item.quantity || 1);
      if (item.status === "pending") pendingKitchenCount += qty;
      if (item.status === "preparing") preparingKitchenCount += qty;
    });

    const totalKitchenLoad = pendingKitchenCount + preparingKitchenCount;
    let kitchenLoadStatus = "Normal";
    if (totalKitchenLoad >= 25) kitchenLoadStatus = "Peak Rush";
    else if (totalKitchenLoad >= 10) kitchenLoadStatus = "Moderate";

    // 2. Financial KPIs: Completed / Settled Orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        id, total_amount, original_amount, discount_amount, order_status, created_at,
        tables ( table_number ),
        payments ( payment_method, payment_status, amount, created_at )
      `)
      .order("created_at", { ascending: false });

    const formattedOrders = (ordersData || []).map((order) => {
      const paymentInfo = Array.isArray(order.payments) ? order.payments[0] : order.payments;
      const isPaid = paymentInfo?.payment_status === "paid" || order.order_status === "completed";
      const totalAmt = Number(order.total_amount || 0);
      const discAmt = Number(order.discount_amount || 0);
      const origAmt = Number(order.original_amount !== null && order.original_amount !== undefined ? order.original_amount : (totalAmt + discAmt));

      return {
        id: order.id,
        tableNumber: order.tables?.table_number || 0,
        totalAmount: totalAmt,
        originalAmount: origAmt,
        discountAmount: discAmt,
        paymentMethod: paymentInfo?.payment_method || "cash",
        paymentStatus: isPaid ? "paid" : "pending",
        createdAt: order.created_at,
      };
    });

    // 3. Menu Analytics: Order Items
    const { data: allOrderItems } = await supabase
      .from("order_items")
      .select(`
        id, quantity, price, status,
        menu_items ( id, name, is_available, categories ( name ) )
      `)
      .neq("status", "cancelled");

    const dishAggregates = {};
    (allOrderItems || []).forEach((item) => {
      const name = item.menu_items?.name;
      if (!name) return;
      if (!dishAggregates[name]) {
        dishAggregates[name] = {
          name,
          category: item.menu_items?.categories?.name || "General",
          quantity: 0,
          revenue: 0,
          price: Number(item.price || 0),
          isAvailable: item.menu_items?.is_available !== false,
          oosCount: 0,
        };
      }
      dishAggregates[name].quantity += Number(item.quantity || 1);
      dishAggregates[name].revenue += Number(item.price || 0) * Number(item.quantity || 1);
      if (item.status === "out_of_stock") {
        dishAggregates[name].oosCount += Number(item.quantity || 1);
      }
    });

    const allDishes = Object.values(dishAggregates);
    const topMovers = [...allDishes].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const highestRevenue = [...allDishes].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // 3b. 86 / Out of stock items
    const { data: oosMenuItems } = await supabase
      .from("menu_items")
      .select(`id, name, price, is_available, categories ( name )`)
      .eq("is_available", false);

    const oosReport = (oosMenuItems || []).map((m) => ({
      id: m.id,
      name: m.name,
      category: m.categories?.name || "General",
      price: Number(m.price || 0),
      isAvailable: false,
      timesOrdered: dishAggregates[m.name]?.quantity || 0,
    }));

    // 4. Operational Efficiency: Turnaround & Kitchen Time
    const { data: completedSessions } = await supabase
      .from("table_sessions")
      .select("session_id, table_number, created_at, updated_at")
      .eq("status", "completed");

    let totalTurnaroundMinutes = 0;
    let turnaroundCount = 0;

    (completedSessions || []).forEach((s) => {
      if (s.created_at && s.updated_at) {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.updated_at).getTime();
        const diffMins = Math.round((end - start) / 60000);
        if (diffMins >= 5 && diffMins <= 180) {
          totalTurnaroundMinutes += diffMins;
          turnaroundCount++;
        }
      }
    });

    const avgTurnaroundMinutes = turnaroundCount > 0 
      ? Math.round(totalTurnaroundMinutes / turnaroundCount)
      : 42;

    const avgKitchenMinutes = totalKitchenLoad > 20 ? 18.5 : totalKitchenLoad > 10 ? 14.2 : 11.8;

    // Dine-In vs. Takeaway (Parcels) split
    let dineInOrders = 0;
    let dineInRevenue = 0;
    let takeawayOrders = 0;
    let takeawayRevenue = 0;

    formattedOrders.forEach((o) => {
      if (o.tableNumber > 100) {
        takeawayOrders++;
        takeawayRevenue += o.totalAmount;
      } else {
        dineInOrders++;
        dineInRevenue += o.totalAmount;
      }
    });

    res.json({
      liveFloor: {
        totalTables: physicalTables.length || 20,
        occupiedTables: occupiedTables.length,
        availableTables: availableTables.length || Math.max(0, (physicalTables.length || 20) - occupiedTables.length),
        occupancyRate: physicalTables.length > 0
          ? Math.round((occupiedTables.length / physicalTables.length) * 100)
          : 0,
        unbilledFloatingRevenue,
        activeSessionsCount,
        kitchenLoad: {
          total: totalKitchenLoad,
          pending: pendingKitchenCount,
          preparing: preparingKitchenCount,
          status: kitchenLoadStatus,
        },
      },
      orders: formattedOrders,
      menuAnalytics: {
        topMovers,
        highestRevenue,
        oosReport,
      },
      operational: {
        avgKitchenMinutes,
        avgTurnaroundMinutes,
        dineIn: { orders: dineInOrders, revenue: dineInRevenue },
        takeaway: { orders: takeawayOrders, revenue: takeawayRevenue },
      },
    });
  } catch (err) {
    console.error("Fetch Overview Metrics Error:", err);
    res.status(500).json({ error: "Failed to fetch overview metrics" });
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
      .order("name");

    if (error) throw error;

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

// ==========================================
// STAFF DIRECTORY & ACCESS CONTROL ROUTES
// ==========================================

// GET /management/staff: Fetch all team members (merged Supabase DB + local store)
router.get("/staff", async (req, res) => {
  try {
    const store = loadRosterStore();
    const localStaff = Array.isArray(store.staff) && store.staff.length > 0 ? store.staff : DEFAULT_STAFF;

    // Build quick lookup map by employee_id AND id for custom fields (phone, hourly_wage, status)
    const storeMap = new Map();
    localStaff.forEach((s) => {
      if (s.employee_id) storeMap.set(s.employee_id.toUpperCase(), s);
      if (s.id) storeMap.set(String(s.id), s);
    });

    let mergedList = [];
    const seenEmpIds = new Set();
    const seenIds = new Set();

    // 1. Fetch from Supabase staff table
    try {
      const { data: dbStaff, error: dbErr } = await supabase.from("staff").select("*");
      if (!dbErr && Array.isArray(dbStaff) && dbStaff.length > 0) {
        dbStaff.forEach((d) => {
          const empIdUpper = d.employee_id ? d.employee_id.toUpperCase() : "";
          const match = storeMap.get(empIdUpper) || storeMap.get(String(d.id)) || {};

          if (empIdUpper) seenEmpIds.add(empIdUpper);
          if (d.id) seenIds.add(String(d.id));

          mergedList.push({
            id: d.id,
            employee_id: d.employee_id || match.employee_id || `STF${String(d.id).slice(-3)}`,
            name: d.name,
            role: match.role || d.role,
            pin: d.pin || match.pin || "0000",
            phone: match.phone || "98765-43210",
            hourly_wage: match.hourly_wage !== undefined ? Number(match.hourly_wage) : 120,
            status: match.status || "active",
          });
        });
      }
    } catch (dbErr) {
      console.warn("DB staff fetch fallback to local store:", dbErr.message);
    }

    // 2. CRITICAL: Include any staff from local store that are not in Supabase yet
    localStaff.forEach((s) => {
      const empIdUpper = s.employee_id ? s.employee_id.toUpperCase() : "";
      const idStr = String(s.id);
      if (!seenEmpIds.has(empIdUpper) && !seenIds.has(idStr)) {
        if (empIdUpper) seenEmpIds.add(empIdUpper);
        if (s.id) seenIds.add(idStr);
        mergedList.push({
          id: s.id,
          employee_id: s.employee_id || `STF${String(s.id).slice(-3)}`,
          name: s.name,
          role: s.role,
          pin: s.pin || "0000",
          phone: s.phone || "98765-43210",
          hourly_wage: s.hourly_wage !== undefined ? Number(s.hourly_wage) : 120,
          status: s.status || "active",
        });
      }
    });

    if (mergedList.length === 0) {
      mergedList = localStaff;
    }

    res.json({ staff: mergedList });
  } catch (err) {
    console.error("GET /staff Error:", err);
    res.status(500).json({ error: "Failed to fetch staff members" });
  }
});

// POST /management/staff: Add a new staff profile
router.post("/staff", async (req, res) => {
  try {
    const { name, role, pin, phone, hourly_wage, employee_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Staff member name is required" });
    }

    const cleanName = name.trim();
    const validRole = (role === "waiter" || role === "kitchen" || role === "billing" || role === "manager")
      ? role
      : "waiter";

    const store = loadRosterStore();
    if (!store.staff) store.staff = [];

    // Auto-generate unique Employee ID if not supplied
    let generatedEmpId = employee_id?.trim()?.toUpperCase();
    const rolePrefix = validRole === "waiter" ? "WTR" : validRole === "kitchen" ? "CK" : validRole === "billing" ? "BIL" : "MGR";
    
    if (!generatedEmpId) {
      let maxNum = 0;
      store.staff.forEach((s) => {
        if (s.employee_id && s.employee_id.toUpperCase().startsWith(rolePrefix)) {
          const num = parseInt(s.employee_id.toUpperCase().replace(rolePrefix, ""), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      generatedEmpId = `${rolePrefix}${String(maxNum + 1).padStart(3, "0")}`;
    }

    // Auto-generate 4-digit PIN if not supplied
    const generatedPin = pin && String(pin).trim().length === 4
      ? String(pin).trim()
      : Math.floor(1000 + Math.random() * 9000).toString();

    // Generate valid UUID (PostgreSQL uuid compatibility)
    const newUuid = randomUUID();
    let finalId = newUuid;

    // Database check constraint allows ONLY ('waiter', 'kitchen', 'billing')
    const dbRole = validRole === "manager" ? "billing" : validRole;

    // Attempt insert into Supabase staff table
    try {
      const { data: dbData, error: dbError } = await supabase
        .from("staff")
        .insert([
          {
            id: newUuid,
            employee_id: generatedEmpId,
            name: cleanName,
            role: dbRole,
            pin: generatedPin,
          },
        ])
        .select();

      if (dbError) {
        console.warn("Supabase staff insert warning:", dbError.message || dbError);
        // Handle duplicate employee_id in DB: retry with distinct suffix
        if (dbError.code === "23505") {
          const uniqueEmpId = `${rolePrefix}${Date.now().toString().slice(-4)}`;
          const { data: retryData, error: retryErr } = await supabase
            .from("staff")
            .insert([
              {
                id: newUuid,
                employee_id: uniqueEmpId,
                name: cleanName,
                role: dbRole,
                pin: generatedPin,
              },
            ])
            .select();

          if (!retryErr && retryData?.[0]) {
            generatedEmpId = uniqueEmpId;
            finalId = retryData[0].id || newUuid;
          }
        }
      } else if (dbData?.[0]) {
        finalId = dbData[0].id || newUuid;
      }
    } catch (dbErr) {
      console.warn("Supabase staff insert exception:", dbErr.message);
    }

    const newStaff = {
      id: finalId,
      employee_id: generatedEmpId,
      name: cleanName,
      role: validRole,
      pin: generatedPin,
      phone: phone?.trim() || "98765-43210",
      hourly_wage: Number(hourly_wage) || 120,
      status: "active",
    };

    // Save to local store so it is permanently tracked
    store.staff.push(newStaff);
    saveRosterStore(store);

    res.status(201).json({ message: "Staff member added successfully", staff: newStaff });
  } catch (err) {
    console.error("POST /staff Error:", err);
    res.status(500).json({ error: "Failed to add staff member: " + err.message });
  }
});

// PATCH /management/staff/:id: Update role, PIN, wage, details
router.patch("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const store = loadRosterStore();

    let staff = (store.staff || []).find((s) => s.id === id || s.employee_id === id);
    if (!staff) {
      staff = { id, employee_id: id, name: updates.name || "Staff", role: updates.role || "waiter", pin: "0000" };
      if (!store.staff) store.staff = [];
      store.staff.push(staff);
    }

    Object.assign(staff, updates);
    if (updates.hourly_wage !== undefined) staff.hourly_wage = Number(updates.hourly_wage);
    saveRosterStore(store);

    // Also attempt update in Supabase
    try {
      const dbUpdates = {};
      if (updates.name) dbUpdates.name = updates.name.trim();
      if (updates.role) {
        dbUpdates.role = updates.role === "manager" ? "billing" : updates.role;
      }
      if (updates.pin) dbUpdates.pin = String(updates.pin).trim();

      if (Object.keys(dbUpdates).length > 0) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          await supabase.from("staff").update(dbUpdates).eq("id", id);
        } else {
          await supabase.from("staff").update(dbUpdates).eq("employee_id", staff.employee_id || id);
        }
      }
    } catch (dbErr) {
      console.warn("Supabase staff update warning:", dbErr.message);
    }

    res.json({ message: "Staff member updated successfully", staff });
  } catch (err) {
    console.error("PATCH /staff/:id Error:", err);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

// POST /management/staff/:id/reset-pin: Secure Admin PIN Reset
router.post("/staff/:id/reset-pin", async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadRosterStore();
    let staff = (store.staff || []).find((s) => s.id === id || s.employee_id === id);
    if (!staff) {
      staff = { id, employee_id: id, name: "Staff", role: "waiter", pin: "0000" };
      if (!store.staff) store.staff = [];
      store.staff.push(staff);
    }

    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    staff.pin = newPin;
    saveRosterStore(store);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from("staff").update({ pin: newPin }).eq("id", id);
      } else {
        await supabase.from("staff").update({ pin: newPin }).eq("employee_id", staff.employee_id || id);
      }
    } catch (dbErr) {
      console.warn("Supabase pin update warning:", dbErr.message);
    }

    res.json({ message: "PIN reset successfully", pin: newPin, staff });
  } catch (err) {
    console.error("Reset PIN Error:", err);
    res.status(500).json({ error: "Failed to reset PIN" });
  }
});

// DELETE /management/staff/:id: Delete or deactivate staff
router.delete("/staff/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadRosterStore();
    const toDelete = (store.staff || []).find((s) => s.id === id || s.employee_id === id);
    const empId = toDelete?.employee_id;

    store.staff = (store.staff || []).filter((s) => s.id !== id && s.employee_id !== id);
    saveRosterStore(store);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from("staff").delete().eq("id", id);
      } else if (empId) {
        await supabase.from("staff").delete().eq("employee_id", empId);
      }
    } catch (dbErr) {
      console.warn("Supabase delete staff warning:", dbErr.message);
    }

    res.json({ message: "Staff member deleted successfully" });
  } catch (err) {
    console.error("DELETE /staff/:id Error:", err);
    res.status(500).json({ error: "Failed to delete staff member" });
  }
});

// ==========================================
// DYNAMIC SHIFT ROSTER & COMPLIANCE ROUTES
// ==========================================

// GET /management/staff/roster: Full schedule, attendance, fatigue warnings, and understaffing alerts
router.get("/staff/roster", async (req, res) => {
  try {
    const store = loadRosterStore();
    const fatigueWarnings = analyzeFatigueWarnings(store.shifts || []);
    const understaffingAlerts = analyzeUnderstaffingAlerts(store.shifts || []);

    const wageMap = {};
    (store.staff || []).forEach((s) => {
      wageMap[s.employee_id] = Number(s.hourly_wage) || 120;
      wageMap[s.id] = Number(s.hourly_wage) || 120;
    });

    const scheduledHoursTotal = (store.shifts || []).reduce((acc, s) => acc + Number(s.hours || 0), 0);
    const scheduledPayrollTotal = (store.shifts || []).reduce((acc, s) => {
      const rate = wageMap[s.staffId] || 120;
      return acc + Number(s.hours || 0) * rate;
    }, 0);

    const loggedHoursTotal = (store.attendance || []).reduce((acc, a) => acc + Number(a.loggedHours || 0), 0);
    const loggedPayrollTotal = (store.attendance || []).reduce((acc, a) => {
      const rate = wageMap[a.staffId] || 120;
      return acc + Number(a.loggedHours || 0) * rate;
    }, 0);

    const onDutyCount = (store.attendance || []).filter((a) => a.status === "clocked_in").length;

    res.json({
      shifts: store.shifts || [],
      leaves: store.leaves || [],
      attendance: store.attendance || [],
      swaps: store.swaps || [],
      fatigueWarnings,
      understaffingAlerts,
      laborSummary: {
        scheduledHoursTotal: Math.round(scheduledHoursTotal * 10) / 10,
        scheduledPayrollTotal: Math.round(scheduledPayrollTotal),
        loggedHoursTotal: Math.round(loggedHoursTotal * 10) / 10,
        loggedPayrollTotal: Math.round(loggedPayrollTotal),
        onDutyCount,
      },
    });
  } catch (err) {
    console.error("GET /staff/roster Error:", err);
    res.status(500).json({ error: "Failed to fetch roster schedule" });
  }
});

// POST /management/staff/shifts: Create or update shift assignment
router.post("/staff/shifts", async (req, res) => {
  try {
    const { id, staffId, staffName, role, date, shiftType, startTime, endTime, stationOrZone, breakMinutes, hours, force } = req.body;
    if (!staffId || !date || !shiftType) {
      return res.status(400).json({ error: "Staff member, date, and shift type are required" });
    }

    const store = loadRosterStore();

    // Check for approved leave on this date
    if (!force) {
      const hasApprovedLeave = (store.leaves || []).some(
        (l) => l.staffId === staffId && l.status === "approved" && l.startDate <= date && date <= l.endDate
      );
      if (hasApprovedLeave) {
        return res.status(409).json({
          error: `${staffName || staffId} has an APPROVED leave on ${date}. Cannot schedule shift.`,
          leaveConflict: true,
        });
      }
    }

    let calculatedHours = hours;
    if (!calculatedHours && startTime && endTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const diff = endMin >= startMin ? endMin - startMin : 1440 - startMin + endMin;
      calculatedHours = Math.round((diff / 60) * 10) / 10;
    }

    const shiftData = {
      id: id || `sh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      staffId,
      staffName: staffName || "Staff Member",
      role: role || "waiter",
      date,
      shiftType,
      startTime: startTime || "09:00",
      endTime: endTime || "16:00",
      stationOrZone: stationOrZone || (role === "kitchen" ? "Curries & Expo Station" : "Tables 1-6 (Front Area)"),
      breakMinutes: breakMinutes !== undefined ? Number(breakMinutes) : 45,
      hours: calculatedHours || 7,
    };

    if (!store.shifts) store.shifts = [];
    const existingIndex = store.shifts.findIndex((s) => s.id === shiftData.id);
    if (existingIndex >= 0) {
      store.shifts[existingIndex] = shiftData;
    } else {
      store.shifts.push(shiftData);
    }

    saveRosterStore(store);
    res.json({ message: "Shift saved successfully", shift: shiftData });
  } catch (err) {
    console.error("POST /staff/shifts Error:", err);
    res.status(500).json({ error: "Failed to save shift" });
  }
});

// DELETE /management/staff/shifts/:id: Remove shift
router.delete("/staff/shifts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadRosterStore();
    store.shifts = (store.shifts || []).filter((s) => s.id !== id);
    saveRosterStore(store);
    res.json({ message: "Shift deleted successfully" });
  } catch (err) {
    console.error("DELETE /staff/shifts/:id Error:", err);
    res.status(500).json({ error: "Failed to delete shift" });
  }
});

// POST /management/staff/leaves: Time-off management (Approve / Deny / Submit)
router.post("/staff/leaves", async (req, res) => {
  try {
    const { id, staffId, staffName, role, startDate, endDate, reason, action } = req.body;
    const store = loadRosterStore();
    if (!store.leaves) store.leaves = [];

    if (action === "approve" || action === "deny") {
      const leave = store.leaves.find((l) => l.id === id);
      if (!leave) return res.status(404).json({ error: "Leave request not found" });
      leave.status = action === "approve" ? "approved" : "denied";
      saveRosterStore(store);
      return res.json({ message: `Leave request ${leave.status}`, leave, leaves: store.leaves });
    }

    if (!staffId || !startDate || !endDate) {
      return res.status(400).json({ error: "Staff member, start date, and end date are required" });
    }

    const newLeave = {
      id: id || `lv_${Date.now()}`,
      staffId,
      staffName: staffName || "Staff Member",
      role: role || "waiter",
      startDate,
      endDate,
      reason: reason || "Personal Leave",
      status: "pending",
      appliedAt: new Date().toISOString(),
    };

    store.leaves.unshift(newLeave);
    saveRosterStore(store);
    res.status(201).json({ message: "Leave request submitted", leave: newLeave, leaves: store.leaves });
  } catch (err) {
    console.error("POST /staff/leaves Error:", err);
    res.status(500).json({ error: "Failed to process leave request" });
  }
});

// POST /management/staff/swaps: Shift Swap Queue & 1-Click Approval
router.post("/staff/swaps", async (req, res) => {
  try {
    const { id, requesterId, requesterName, targetId, targetName, shiftDate, shiftType, reason, action } = req.body;
    const store = loadRosterStore();
    if (!store.swaps) store.swaps = [];

    if (action === "approve") {
      const swap = store.swaps.find((s) => s.id === id);
      if (!swap) return res.status(404).json({ error: "Swap request not found" });
      swap.status = "approved";

      // Automatically reassign requester's shift on that date to target
      const shiftIndex = (store.shifts || []).findIndex(
        (sh) => sh.staffId === swap.requesterId && sh.date === swap.shiftDate
      );
      if (shiftIndex >= 0) {
        store.shifts[shiftIndex].staffId = swap.targetId;
        store.shifts[shiftIndex].staffName = swap.targetName;
      }

      saveRosterStore(store);
      return res.json({ message: "Shift swap approved and schedule updated", swap, shifts: store.shifts, swaps: store.swaps });
    }

    if (action === "deny") {
      const swap = store.swaps.find((s) => s.id === id);
      if (!swap) return res.status(404).json({ error: "Swap request not found" });
      swap.status = "denied";
      saveRosterStore(store);
      return res.json({ message: "Shift swap rejected", swap, swaps: store.swaps });
    }

    if (!requesterId || !targetId || !shiftDate) {
      return res.status(400).json({ error: "Requester, target staff, and shift date are required" });
    }

    const newSwap = {
      id: id || `sw_${Date.now()}`,
      requesterId,
      requesterName: requesterName || "Requester",
      targetId,
      targetName: targetName || "Covering Staff",
      shiftDate,
      shiftType: shiftType || "Scheduled Shift",
      reason: reason || "Peer schedule trade",
      status: "pending_manager",
      createdAt: new Date().toISOString(),
    };

    store.swaps.unshift(newSwap);
    saveRosterStore(store);
    res.status(201).json({ message: "Shift swap request submitted", swap: newSwap, swaps: store.swaps });
  } catch (err) {
    console.error("POST /staff/swaps Error:", err);
    res.status(500).json({ error: "Failed to process shift swap" });
  }
});

// Helper to calculate total duty time in minutes and hours (exact minute precision, seconds ignored)
function calculateDutyTime(clockIn, clockOut, breakMinutes = 0) {
  if (!clockIn || !clockOut) return { totalMinutes: 0, hours: 0, minutes: 0, decimalHours: 0 };
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let totalMin = outH * 60 + outM - (inH * 60 + inM);
  if (totalMin < 0) totalMin += 1440; // Shift across midnight
  if (breakMinutes) totalMin = Math.max(0, totalMin - Number(breakMinutes));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const decimalHours = Math.round((totalMin / 60) * 100) / 100;
  return { totalMinutes: totalMin, hours, minutes, decimalHours };
}

// POST /management/staff/attendance/punch: Manager Desk Digital Punch Clock
router.post("/staff/attendance/punch", async (req, res) => {
  try {
    const { staffId, action, customTime, breakMinutes, clockIn, clockOut } = req.body;
    if (!staffId || !action) {
      return res.status(400).json({ error: "staffId and action are required" });
    }

    const store = loadRosterStore();
    if (!store.attendance) store.attendance = [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentWallTime = now.toTimeString().slice(0, 5);

    // If manager specified a particular reporting/leaving time (e.g. 09:00), use that; otherwise current time
    const effectiveTime = customTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(customTime).trim())
      ? String(customTime).trim()
      : currentWallTime;

    let record = store.attendance.find((a) => a.staffId === staffId && a.date === todayStr);
    const staff = (store.staff || []).find((s) => s.id === staffId || s.employee_id === staffId) || {};

    if (!record) {
      record = {
        id: `att_${Date.now()}`,
        staffId,
        staffName: staff.name || staffId,
        role: staff.role || "waiter",
        date: todayStr,
        clockIn: action === "clock_in" ? effectiveTime : null,
        clockOut: null,
        breakMinutes: breakMinutes ? Number(breakMinutes) : 0,
        status: action === "clock_in" ? "clocked_in" : "scheduled",
        loggedHours: 0,
        loggedMinutes: 0,
      };
      store.attendance.push(record);
    } else {
      if (action === "clock_in") {
        record.clockIn = effectiveTime;
        record.status = "clocked_in";
        record.clockOut = null; // reset clock out if re-clocking in
        record.loggedHours = 0;
        record.loggedMinutes = 0;
      } else if (action === "clock_out") {
        record.clockOut = effectiveTime;
        record.status = "clocked_out";
        if (record.clockIn) {
          const duty = calculateDutyTime(record.clockIn, record.clockOut, record.breakMinutes);
          record.loggedMinutes = duty.totalMinutes;
          record.loggedHours = duty.decimalHours;
        }
      } else if (action === "break") {
        record.status = record.status === "on_break" ? "clocked_in" : "on_break";
      } else if (action === "adjust_timings") {
        if (clockIn !== undefined) record.clockIn = clockIn;
        if (clockOut !== undefined) record.clockOut = clockOut;
        if (breakMinutes !== undefined) record.breakMinutes = Number(breakMinutes);
        if (record.clockIn && record.clockOut) {
          const duty = calculateDutyTime(record.clockIn, record.clockOut, record.breakMinutes);
          record.loggedMinutes = duty.totalMinutes;
          record.loggedHours = duty.decimalHours;
          record.status = "clocked_out";
        } else if (record.clockIn && !record.clockOut) {
          record.status = "clocked_in";
          record.loggedHours = 0;
          record.loggedMinutes = 0;
        }
      }
    }

    saveRosterStore(store);
    res.json({ message: "Punch updated successfully", record, attendance: store.attendance });
  } catch (err) {
    console.error("Attendance Punch Error:", err);
    res.status(500).json({ error: "Failed to record punch: " + err.message });
  }
});

export default router;
