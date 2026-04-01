import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// POST /admin/auth/login
router.post("/login", async (req, res) => {
  const { employeeId, pin } = req.body;

  if (!employeeId || !pin) {
    return res.status(400).json({ error: "Employee ID and PIN are required." });
  }

  try {
    // 1. Find the employee in the database
    const { data: staff, error } = await supabase
      .from("staff")
      .select("id, employee_id, role, name, pin")
      .eq("employee_id", employeeId.toUpperCase())
      .maybeSingle();

    if (error || !staff) {
      return res.status(401).json({ error: "Invalid Employee ID." });
    }

    // 2. Check the PIN
    // Note: In a production app, you would use a library like 'bcrypt' to compare hashed passwords.
    // For this prototype, we are matching the exact string from the SQL setup.
    if (staff.pin !== pin) {
      return res.status(401).json({ error: "Invalid PIN." });
    }

    // 3. Success! Send back the staff details and their specific role
    res.json({
      success: true,
      role: staff.role,     // 'waiter', 'kitchen', or 'billing'
      name: staff.name,
      employeeId: staff.employee_id
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

export default router;