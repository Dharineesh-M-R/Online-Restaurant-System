import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// GET all menu items
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("menu")
      .select("*");

    if (error) {
      return res.status(500).json(error);
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;