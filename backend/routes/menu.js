import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

router.get("/categories", async(req,res)=> {
  try{
    const{data: categories, error} = await supabase
    .from("categories")
    .select("*");

    if(error){
      return res.status(500).json({error: error.message});
    }

    const categoryOrder = [
      "Veg Starters",
      "Non Veg Starters",
      "Breads",
      "Rices/Noodles",
      "Biryanies",
      "Veg Gravies",
      "Non Veg Gravies",
      "Soups",
      "Desserts",
    ];

    const sortedCategories = categoryOrder
    .map((name) => categories.find((c)=> c.name === name))
    .filter(Boolean);

    res.json({categories: sortedCategories,});
  }catch (err){
    res.status(500).json({error: "Server error"})
  }
});
router.get("/items", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        is_available,
        categories (
          name
        )
      `)
      .eq("is_available", true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Format data for frontend
    const menuItems = data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image_url,
      category: item.categories.name,
    }));

    res.json({ menuItems });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Call Waiter from Customer side
router.patch("/call-waiter", async (req, res) => {
  const { tableNumber } = req.body;
  try {
    const { error } = await supabase
      .from("table_sessions")
      .update({ needs_waiter: true })
      .eq("table_number", tableNumber)
      .eq("status", "active");

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to call waiter" });
  }
});

export default router;