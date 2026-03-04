import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// Create order
router.post("/", async (req, res) => {
  try {
    const { table_number, items, total } = req.body;

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          table_number,
          items,
          total
        }
      ]);

    if (error) {
      return res.status(500).json(error);
    }

    res.json({
      message: "Order placed successfully",
      data
    });

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;