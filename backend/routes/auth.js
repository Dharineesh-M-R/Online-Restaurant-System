import express from "express";
import supabase from "../supabase.js";
import { loadRosterStore, DEFAULT_STAFF } from "../rosterStore.js";

const router = express.Router();

// POST /admin/auth/login
router.post("/login", async (req, res) => {
  const { employeeId, pin } = req.body;

  if (!employeeId || !pin) {
    return res.status(400).json({ error: "Employee ID and PIN are required." });
  }

  const cleanEmpId = employeeId.trim().toUpperCase();
  const cleanPin = String(pin).trim();

  try {
    let staffMember = null;

    // 1. Try finding in Supabase DB
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, employee_id, role, name, pin, is_active")
        .ilike("employee_id", cleanEmpId)
        .maybeSingle();

      if (!error && data) {
        staffMember = data;
      }
    } catch (dbErr) {
      console.warn("DB Auth lookup error:", dbErr.message);
    }

    // 2. Fallback to local roster store / DEFAULT_STAFF if not found in DB
    if (!staffMember) {
      const store = loadRosterStore();
      const localStaff = Array.isArray(store.staff) && store.staff.length > 0 ? store.staff : DEFAULT_STAFF;
      staffMember = localStaff.find(
        (s) => s.employee_id && s.employee_id.toUpperCase() === cleanEmpId
      );
    }

    if (!staffMember) {
      return res.status(401).json({ error: "Invalid Employee ID." });
    }

    if (staffMember.is_active === false || staffMember.status === "inactive") {
      return res.status(403).json({ error: "This staff account is deactivated. Please contact management." });
    }

    // 3. Check PIN
    if (String(staffMember.pin).trim() !== cleanPin) {
      return res.status(401).json({ error: "Invalid PIN." });
    }

    // 4. Return staff details & authenticated role ('waiter', 'kitchen', 'billing', 'manager')
    res.json({
      success: true,
      id: staffMember.id,
      staffId: staffMember.id,
      role: staffMember.role,
      name: staffMember.name,
      employeeId: staffMember.employee_id,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

export default router;
