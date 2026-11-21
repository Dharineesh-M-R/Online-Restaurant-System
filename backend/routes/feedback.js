import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// POST /feedback: Saves feedback from either standalone QR (qr_standee) or bill page (bill_request)
router.post("/", async (req, res) => {
  const {
    source = "qr_standee",
    sessionId,
    tableNumber,
    overallRating,
    foodRating,
    serviceRating,
    ambienceRating,
    tags,
    comment,
    customerName,
    customerPhone,
  } = req.body;

  // 1. Validation
  const numericOverall = parseInt(overallRating, 10);
  if (!numericOverall || numericOverall < 1 || numericOverall > 5) {
    return res.status(400).json({ error: "Overall rating must be an integer between 1 and 5." });
  }

  try {
    let resolvedOrderId = null;
    let resolvedWaiterId = null;
    let resolvedTableNumber = tableNumber ? parseInt(tableNumber, 10) : null;

    // 2. If sessionId is provided, check for duplicate submission
    if (sessionId) {
      const { data: existingFeedback } = await supabase
        .from("guest_feedback")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existingFeedback) {
        return res.status(409).json({
          error: "Feedback has already been recorded for this dining session. Thank you!",
        });
      }

      // Auto-attribute order and waiter from active session
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, waiter_id, table_id, tables(table_number)")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orderData) {
          resolvedOrderId = orderData.id;
          resolvedWaiterId = orderData.waiter_id || null;
          if (!resolvedTableNumber && orderData.tables?.table_number) {
            resolvedTableNumber = orderData.tables.table_number;
          }
        }
      } catch (orderErr) {
        console.warn("Could not auto-attribute order/waiter from session:", orderErr.message);
      }
    }

    // 3. Insert feedback row
    const insertPayload = {
      source: source === "bill_request" ? "bill_request" : "qr_standee",
      order_id: resolvedOrderId,
      session_id: sessionId || null,
      table_number: resolvedTableNumber || null,
      waiter_id: resolvedWaiterId,
      overall_rating: numericOverall,
      food_rating: foodRating ? parseInt(foodRating, 10) : null,
      service_rating: serviceRating ? parseInt(serviceRating, 10) : null,
      ambience_rating: ambienceRating ? parseInt(ambienceRating, 10) : null,
      tags: Array.isArray(tags) ? tags : [],
      comment: comment ? String(comment).trim() : null,
      customer_name: customerName ? String(customerName).trim() : null,
      customer_phone: customerPhone ? String(customerPhone).trim() : null,
      is_resolved: false,
    };

    const { data: newFeedback, error: insertErr } = await supabase
      .from("guest_feedback")
      .insert([insertPayload])
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully. Thank you!",
      feedback: newFeedback,
    });
  } catch (err) {
    console.error("POST /feedback Error:", err);
    res.status(500).json({ error: err.message || "Failed to save feedback." });
  }
});

// GET /feedback/session/:sessionId: Returns whether feedback has been submitted for this session
router.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required." });
  }

  try {
    const { data: feedback, error } = await supabase
      .from("guest_feedback")
      .select("id, overall_rating, created_at, tags")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      submitted: Boolean(feedback),
      feedback: feedback || null,
    });
  } catch (err) {
    console.error("GET /feedback/session/:sessionId Error:", err);
    res.status(500).json({ error: "Failed to check session feedback status." });
  }
});

// GET /feedback/management: Summary KPIs + full review feed joined with waiter name
router.get("/management", async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from("guest_feedback")
      .select(`
        id, source, order_id, session_id, table_number, waiter_id,
        overall_rating, food_rating, service_rating, ambience_rating,
        tags, comment, customer_name, customer_phone, is_resolved, created_at,
        staff:waiter_id ( id, name, employee_id )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const list = reviews || [];
    const totalCount = list.length;

    // Compute averages
    let sumOverall = 0;
    let sumFood = 0;
    let countFood = 0;
    let sumService = 0;
    let countService = 0;
    let sumAmbience = 0;
    let countAmbience = 0;
    let unresolvedLowCount = 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    list.forEach((r) => {
      const overall = Number(r.overall_rating);
      sumOverall += overall;
      if (ratingDistribution[overall] !== undefined) {
        ratingDistribution[overall] += 1;
      }

      if (r.food_rating) {
        sumFood += Number(r.food_rating);
        countFood += 1;
      }
      if (r.service_rating) {
        sumService += Number(r.service_rating);
        countService += 1;
      }
      if (r.ambience_rating) {
        sumAmbience += Number(r.ambience_rating);
        countAmbience += 1;
      }

      if (overall <= 3 && !r.is_resolved) {
        unresolvedLowCount += 1;
      }
    });

    const avgOverall = totalCount > 0 ? Number((sumOverall / totalCount).toFixed(1)) : 0;
    const avgFood = countFood > 0 ? Number((sumFood / countFood).toFixed(1)) : 0;
    const avgService = countService > 0 ? Number((sumService / countService).toFixed(1)) : 0;
    const avgAmbience = countAmbience > 0 ? Number((sumAmbience / countAmbience).toFixed(1)) : 0;

    res.json({
      kpis: {
        totalCount,
        avgOverall,
        avgFood,
        avgService,
        avgAmbience,
        unresolvedLowCount,
        ratingDistribution,
      },
      reviews: list,
    });
  } catch (err) {
    console.error("GET /feedback/management Error:", err);
    res.status(500).json({ error: "Failed to fetch feedback records." });
  }
});

// PATCH /feedback/management/:id/resolve: Toggles or updates is_resolved status
router.patch("/management/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const { is_resolved } = req.body;

  try {
    let targetResolved = is_resolved;

    // If is_resolved not explicitly passed in body, toggle current value
    if (targetResolved === undefined) {
      const { data: current, error: fetchErr } = await supabase
        .from("guest_feedback")
        .select("is_resolved")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;
      targetResolved = !current?.is_resolved;
    }

    const { data: updated, error } = await supabase
      .from("guest_feedback")
      .update({ is_resolved: Boolean(targetResolved) })
      .eq("id", id)
      .select(`
        id, source, order_id, session_id, table_number, waiter_id,
        overall_rating, food_rating, service_rating, ambience_rating,
        tags, comment, customer_name, customer_phone, is_resolved, created_at,
        staff:waiter_id ( id, name, employee_id )
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, feedback: updated });
  } catch (err) {
    console.error("PATCH /feedback/management/:id/resolve Error:", err);
    res.status(500).json({ error: "Failed to update feedback resolution status." });
  }
});

// GET /feedback/public-highlights
// Returns top 5 best sellers (most ordered available dishes) + public 4-5 star reviews + average rating
router.get("/public-highlights", async (req, res) => {
  try {
    const [orderItemsRes, menuRes, reviewsRes, statsRes] = await Promise.all([
      // 1. Order items for ranking best sellers (excluding cancelled)
      supabase
        .from("order_items")
        .select("menu_item_id, quantity, status")
        .neq("status", "cancelled"),

      // 2. All live available dishes (respects Kitchen Out-of-Stock toggles)
      supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, categories ( name )")
        .eq("is_available", true),

      // 3. Top 3 recent public reviews (4+ stars with a comment; NO phone numbers or private data)
      supabase
        .from("guest_feedback")
        .select("id, overall_rating, comment, tags, customer_name, created_at")
        .gte("overall_rating", 4)
        .not("comment", "is", null)
        .neq("comment", "")
        .order("created_at", { ascending: false })
        .limit(3),

      // 4. Overall rating average & count
      supabase
        .from("guest_feedback")
        .select("overall_rating"),
    ]);

    // Rank menu items by total ordered quantity
    const qtyMap = new Map();
    (orderItemsRes.data || []).forEach((item) => {
      if (item.menu_item_id) {
        const qty = Number(item.quantity) || 1;
        qtyMap.set(item.menu_item_id, (qtyMap.get(item.menu_item_id) || 0) + qty);
      }
    });

    const sortedMenuItemIds = Array.from(qtyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const availableDishes = menuRes.data || [];
    const dishMap = new Map(availableDishes.map((d) => [d.id, d]));

    const bestSellers = [];
    const seenIds = new Set();

    // 1. Add ranked ordered dishes that are currently available
    for (const itemId of sortedMenuItemIds) {
      const dish = dishMap.get(itemId);
      if (dish && !seenIds.has(dish.id)) {
        bestSellers.push(dish);
        seenIds.add(dish.id);
        if (bestSellers.length === 5) break;
      }
    }

    // 2. If fewer than 5 have order history, fill remaining slots with available dishes
    if (bestSellers.length < 5) {
      for (const dish of availableDishes) {
        if (!seenIds.has(dish.id)) {
          bestSellers.push(dish);
          seenIds.add(dish.id);
          if (bestSellers.length === 5) break;
        }
      }
    }

    const ratings = statsRes.data || [];
    const totalReviews = ratings.length;
    const avgRating =
      totalReviews > 0
        ? Number((ratings.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    res.json({
      dishes: bestSellers,
      reviews: reviewsRes.data || [],
      stats: { avgRating, totalReviews },
    });
  } catch (err) {
    console.error("Landing Highlights Error:", err);
    res.status(500).json({ error: "Failed to load landing highlights" });
  }
});

export default router;
