import express from "express";
import supabase from "../supabase.js";

const router = express.Router();

// ==========================================
// 1. STAFF CONFIGURATION ROUTES
// ==========================================

// GET /management/hr/staff-config: Lists all staff with wage type, rates, and cutoffs
router.get("/staff-config", async (req, res) => {
  try {
    const { data: staffList, error } = await supabase
      .from("staff")
      .select(`
        id, employee_id, name, role,
        wage_type, base_rate, standard_shift_hours,
        half_day_cutoff_hours, overtime_hourly_rate,
        paid_weekly_offs_per_month, default_break_hours, is_active, created_at
      `)
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ staff: staffList || [] });
  } catch (err) {
    console.error("GET /staff-config Error:", err);
    res.status(500).json({ error: "Failed to fetch staff configurations" });
  }
});

// PATCH /management/hr/staff-config/:staffId: Updates wage type, base rate, cutoffs, OT, etc.
router.patch("/staff-config/:staffId", async (req, res) => {
  const { staffId } = req.params;
  const {
    wage_type,
    base_rate,
    standard_shift_hours,
    half_day_cutoff_hours,
    overtime_hourly_rate,
    paid_weekly_offs_per_month,
    default_break_hours,
    is_active,
    role,
    name,
  } = req.body;

  try {
    const updates = {};
    if (wage_type !== undefined) updates.wage_type = wage_type;
    if (base_rate !== undefined) updates.base_rate = Number(base_rate);
    if (standard_shift_hours !== undefined) updates.standard_shift_hours = Number(standard_shift_hours);
    if (half_day_cutoff_hours !== undefined) updates.half_day_cutoff_hours = Number(half_day_cutoff_hours);
    if (overtime_hourly_rate !== undefined) updates.overtime_hourly_rate = Number(overtime_hourly_rate);
    if (paid_weekly_offs_per_month !== undefined) updates.paid_weekly_offs_per_month = Number(paid_weekly_offs_per_month);
    if (default_break_hours !== undefined) updates.default_break_hours = Number(default_break_hours);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);
    if (role !== undefined) updates.role = role;
    if (name !== undefined) updates.name = name;

    const { data, error } = await supabase
      .from("staff")
      .update(updates)
      .eq("id", staffId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, staff: data });
  } catch (err) {
    console.error("PATCH /staff-config Error:", err);
    res.status(500).json({ error: "Failed to update staff configuration" });
  }
});

// ==========================================
// 2. DAILY ATTENDANCE & PUNCH ROUTES
// ==========================================

// GET /management/hr/attendance?date=YYYY-MM-DD: Returns daily attendance + unclosed shifts
router.get("/attendance", async (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];

  try {
    // 1. Fetch active staff with default break hours
    const { data: staffMembers, error: staffErr } = await supabase
      .from("staff")
      .select("id, employee_id, name, role, wage_type, base_rate, standard_shift_hours, half_day_cutoff_hours, overtime_hourly_rate, default_break_hours, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (staffErr) throw staffErr;

    // 2. Fetch attendance for the requested date
    const { data: attendanceList, error: attErr } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("work_date", date);

    if (attErr) throw attErr;

    const attendanceMap = new Map();
    (attendanceList || []).forEach((a) => attendanceMap.set(a.staff_id, a));

    const combined = (staffMembers || []).map((s) => {
      const record = attendanceMap.get(s.id);
      const isOnBreak = Boolean(
        record?.break_start &&
        !record?.break_end &&
        record?.clock_in &&
        !record?.clock_out
      );

      return {
        staff: s,
        attendance: record || null,
        status: record ? record.status : "not_recorded",
        isOnBreak,
        clockIn: record?.clock_in || null,
        clockOut: record?.clock_out || null,
        breakStart: record?.break_start || null,
        breakEnd: record?.break_end || null,
        breakHours: record ? Number(record.break_hours || 0) : 0,
        workedHours: record ? Number(record.worked_hours || 0) : 0,
        overtimeHours: record ? Number(record.overtime_hours || 0) : 0,
        isManualIn: record?.is_manual_in || false,
        isManualOut: record?.is_manual_out || false,
        notes: record?.notes || "",
        recordId: record?.id || null,
      };
    });

    // 3. Unclosed shifts from previous days (clock_in not null, clock_out null, work_date < date)
    const { data: unclosed, error: unclosedErr } = await supabase
      .from("staff_attendance")
      .select(`
        id, staff_id, work_date, clock_in, clock_out, break_start, break_end, break_hours, worked_hours, status, notes,
        staff:staff_id ( id, name, employee_id, role, half_day_cutoff_hours, standard_shift_hours, default_break_hours )
      `)
      .lt("work_date", date)
      .not("clock_in", "is", null)
      .is("clock_out", null)
      .order("work_date", { ascending: false });

    if (unclosedErr) console.warn("Unclosed shifts query warning:", unclosedErr.message);

    res.json({
      date,
      attendance: combined,
      unclosedShifts: unclosed || [],
    });
  } catch (err) {
    console.error("GET /attendance Error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// POST /management/hr/attendance/clock-in: Live or manual clock-in
router.post("/attendance/clock-in", async (req, res) => {
  const { staffId, workDate, clockInTime, isManual, notes } = req.body;
  if (!staffId) return res.status(400).json({ error: "Staff ID is required" });

  const targetDate = workDate || new Date().toISOString().split("T")[0];
  const finalClockIn = clockInTime || new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("staff_attendance")
      .upsert(
        {
          staff_id: staffId,
          work_date: targetDate,
          clock_in: finalClockIn,
          status: "present",
          is_manual_in: Boolean(isManual),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "staff_id, work_date" }
      )
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, attendance: data });
  } catch (err) {
    console.error("POST /attendance/clock-in Error:", err);
    res.status(500).json({ error: "Failed to record clock-in" });
  }
});

// PATCH /management/hr/attendance/break-start: Starts a mid-day break
router.patch("/attendance/break-start", async (req, res) => {
  const { staffId, workDate, customTime, notes } = req.body;
  if (!staffId) return res.status(400).json({ error: "Staff ID is required" });

  const targetDate = workDate || new Date().toISOString().split("T")[0];
  const finalBreakStart = customTime || new Date().toISOString();

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .eq("work_date", targetDate)
      .maybeSingle();

    if (!existing || !existing.clock_in) {
      return res.status(400).json({ error: "Staff member must clock in before starting a break" });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("staff_attendance")
      .update({
        break_start: finalBreakStart,
        break_end: null, // Reset break_end if starting fresh break
        notes: notes !== undefined ? notes : existing.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    res.json({ success: true, attendance: updated });
  } catch (err) {
    console.error("PATCH /attendance/break-start Error:", err);
    res.status(500).json({ error: "Failed to start break" });
  }
});

// PATCH /management/hr/attendance/break-end: Ends a mid-day break and computes break_hours
router.patch("/attendance/break-end", async (req, res) => {
  const { staffId, workDate, customTime, notes } = req.body;
  if (!staffId) return res.status(400).json({ error: "Staff ID is required" });

  const targetDate = workDate || new Date().toISOString().split("T")[0];
  const finalBreakEnd = customTime || new Date().toISOString();

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .eq("work_date", targetDate)
      .maybeSingle();

    if (!existing || !existing.break_start) {
      return res.status(400).json({ error: "No break start timestamp found for this shift" });
    }

    const startMs = new Date(existing.break_start).getTime();
    const endMs = new Date(finalBreakEnd).getTime();
    const durationMs = Math.max(0, endMs - startMs);
    const break_hours = Math.round((durationMs / 3600000) * 100) / 100;

    const { data: updated, error: updateErr } = await supabase
      .from("staff_attendance")
      .update({
        break_end: finalBreakEnd,
        break_hours,
        notes: notes !== undefined ? notes : existing.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    res.json({ success: true, attendance: updated });
  } catch (err) {
    console.error("PATCH /attendance/break-end Error:", err);
    res.status(500).json({ error: "Failed to end break" });
  }
});

// PATCH /management/hr/attendance/clock-out: Live or manual clock-out; deducts break hours from worked_hours
router.patch("/attendance/clock-out", async (req, res) => {
  const {
    staffId,
    workDate,
    clockOutTime,
    isManual,
    notes,
    statusOverride,
    breakStart,
    breakEnd,
    breakHours,
    applyDefaultBreak,
  } = req.body;

  if (!staffId) return res.status(400).json({ error: "Staff ID is required" });

  const targetDate = workDate || new Date().toISOString().split("T")[0];
  const finalClockOut = clockOutTime || new Date().toISOString();

  try {
    // 1. Fetch staff member settings
    const { data: staffMember, error: staffErr } = await supabase
      .from("staff")
      .select("id, standard_shift_hours, half_day_cutoff_hours, default_break_hours")
      .eq("id", staffId)
      .single();

    if (staffErr || !staffMember) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // 2. Fetch existing attendance row
    const { data: existing, error: fetchErr } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .eq("work_date", targetDate)
      .maybeSingle();

    if (!existing || !existing.clock_in) {
      return res.status(400).json({ error: "Cannot clock out: No clock-in record found for this date" });
    }

    // 3. Compute break hours
    let finalBreakStart = breakStart !== undefined ? breakStart : existing.break_start;
    let finalBreakEnd = breakEnd !== undefined ? breakEnd : existing.break_end;
    let finalBreakHours = 0;

    if (breakHours !== undefined && breakHours !== null) {
      finalBreakHours = Number(breakHours);
    } else if (finalBreakStart && finalBreakEnd) {
      const bStartMs = new Date(finalBreakStart).getTime();
      const bEndMs = new Date(finalBreakEnd).getTime();
      finalBreakHours = Math.max(0, Math.round(((bEndMs - bStartMs) / 3600000) * 100) / 100);
    } else if (existing.break_hours && Number(existing.break_hours) > 0) {
      finalBreakHours = Number(existing.break_hours);
    } else if (applyDefaultBreak) {
      finalBreakHours = Number(staffMember.default_break_hours !== undefined ? staffMember.default_break_hours : 2);
    }

    // 4. Compute gross span and net worked hours
    const inMs = new Date(existing.clock_in).getTime();
    const outMs = new Date(finalClockOut).getTime();
    const grossSpan = Math.max(0, (outMs - inMs) / 3600000);
    const worked_hours = Math.max(0, Math.round((grossSpan - finalBreakHours) * 100) / 100);

    // 5. Determine status and overtime strictly using NET worked hours
    const cutoff = Number(staffMember.half_day_cutoff_hours) || 5;
    const standardShift = Number(staffMember.standard_shift_hours) || 9;

    let finalStatus = statusOverride || existing.status || "present";
    let overtime_hours = 0;

    if (!statusOverride) {
      if (worked_hours < cutoff) {
        finalStatus = "half_day";
        overtime_hours = 0;
      } else {
        finalStatus = "present";
        overtime_hours = Math.max(0, Math.round((worked_hours - standardShift) * 100) / 100);
      }
    } else {
      if (finalStatus === "present" && worked_hours > standardShift) {
        overtime_hours = Math.max(0, Math.round((worked_hours - standardShift) * 100) / 100);
      }
    }

    // 6. Update row
    const updatePayload = {
      clock_out: finalClockOut,
      break_hours: finalBreakHours,
      worked_hours,
      overtime_hours,
      status: finalStatus,
      is_manual_out: Boolean(isManual),
      notes: notes !== undefined ? notes : existing.notes,
      updated_at: new Date().toISOString(),
    };
    if (finalBreakStart) updatePayload.break_start = finalBreakStart;
    if (finalBreakEnd) updatePayload.break_end = finalBreakEnd;

    const { data: updated, error: updateErr } = await supabase
      .from("staff_attendance")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    res.json({ success: true, attendance: updated });
  } catch (err) {
    console.error("PATCH /attendance/clock-out Error:", err);
    res.status(500).json({ error: "Failed to record clock-out" });
  }
});

// PUT /management/hr/attendance/manual-log: Full upsert for any past date from Monthly Register
router.put("/attendance/manual-log", async (req, res) => {
  const {
    staffId,
    workDate,
    status,
    clockIn,
    clockOut,
    breakStart,
    breakEnd,
    breakHours,
    workedHours,
    overtimeHours,
    notes,
  } = req.body;

  if (!staffId || !workDate) {
    return res.status(400).json({ error: "Staff ID and Work Date are required" });
  }

  try {
    const { data: staffMember } = await supabase
      .from("staff")
      .select("standard_shift_hours, half_day_cutoff_hours, default_break_hours")
      .eq("id", staffId)
      .single();

    const standardShift = Number(staffMember?.standard_shift_hours) || 9;
    const cutoff = Number(staffMember?.half_day_cutoff_hours) || 5;

    let computedBreak = breakHours !== undefined ? Number(breakHours) : 0;
    if (breakStart && breakEnd && breakHours === undefined) {
      const bIn = new Date(breakStart).getTime();
      const bOut = new Date(breakEnd).getTime();
      computedBreak = Math.max(0, Math.round(((bOut - bIn) / 3600000) * 100) / 100);
    }

    let computedWorked = workedHours !== undefined ? Number(workedHours) : 0;
    let computedOT = overtimeHours !== undefined ? Number(overtimeHours) : 0;

    if (clockIn && clockOut && workedHours === undefined) {
      const inMs = new Date(clockIn).getTime();
      const outMs = new Date(clockOut).getTime();
      const grossSpan = Math.max(0, (outMs - inMs) / 3600000);
      computedWorked = Math.max(0, Math.round((grossSpan - computedBreak) * 100) / 100);
      computedOT = Math.max(0, Math.round((computedWorked - standardShift) * 100) / 100);
    }

    let finalStatus = status || "present";
    if (!status && computedWorked > 0) {
      finalStatus = computedWorked < cutoff ? "half_day" : "present";
    }

    const upsertPayload = {
      staff_id: staffId,
      work_date: workDate,
      status: finalStatus,
      clock_in: clockIn || null,
      clock_out: clockOut || null,
      break_hours: computedBreak,
      worked_hours: computedWorked,
      overtime_hours: computedOT,
      is_manual_in: Boolean(clockIn),
      is_manual_out: Boolean(clockOut),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };
    if (breakStart) upsertPayload.break_start = breakStart;
    if (breakEnd) upsertPayload.break_end = breakEnd;

    const { data, error } = await supabase
      .from("staff_attendance")
      .upsert(upsertPayload, { onConflict: "staff_id, work_date" })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, attendance: data });
  } catch (err) {
    console.error("PUT /attendance/manual-log Error:", err);
    res.status(500).json({ error: "Failed to save attendance record" });
  }
});

// ==========================================
// 3. MID-MONTH ADVANCES (KHATA) ROUTES
// ==========================================

// GET /management/hr/khata: Lists advances
router.get("/khata", async (req, res) => {
  const { staffId, settled } = req.query;

  try {
    let query = supabase
      .from("staff_advances")
      .select(`
        id, staff_id, amount, advance_date, payment_method, notes, is_settled, payroll_id, created_at,
        staff:staff_id ( id, name, employee_id, role )
      `)
      .order("advance_date", { ascending: false });

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }
    if (settled !== undefined) {
      query = query.eq("is_settled", settled === "true");
    }

    const { data: advances, error } = await query;
    if (error) throw error;

    let totalUnsettledAmount = 0;
    const staffSummaryMap = new Map();

    (advances || []).forEach((adv) => {
      if (!adv.is_settled) {
        totalUnsettledAmount += Number(adv.amount || 0);
        const sid = adv.staff_id;
        const cur = staffSummaryMap.get(sid) || {
          staffId: sid,
          staffName: adv.staff?.name || "Unknown",
          employeeId: adv.staff?.employee_id || "",
          unsettledTotal: 0,
          advancesCount: 0,
        };
        cur.unsettledTotal += Number(adv.amount || 0);
        cur.advancesCount += 1;
        staffSummaryMap.set(sid, cur);
      }
    });

    res.json({
      advances: advances || [],
      totalUnsettledAmount,
      staffSummary: Array.from(staffSummaryMap.values()),
    });
  } catch (err) {
    console.error("GET /khata Error:", err);
    res.status(500).json({ error: "Failed to fetch advances" });
  }
});

// POST /management/hr/khata: Log a new advance
router.post("/khata", async (req, res) => {
  const { staffId, amount, advanceDate, paymentMethod, notes } = req.body;
  if (!staffId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "Valid staff ID and amount greater than 0 are required" });
  }

  try {
    const { data, error } = await supabase
      .from("staff_advances")
      .insert([
        {
          staff_id: staffId,
          amount: Number(amount),
          advance_date: advanceDate || new Date().toISOString().split("T")[0],
          payment_method: paymentMethod || "cash",
          notes: notes || null,
          is_settled: false,
        },
      ])
      .select(`
        id, staff_id, amount, advance_date, payment_method, notes, is_settled, created_at,
        staff:staff_id ( id, name, employee_id, role )
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, advance: data });
  } catch (err) {
    console.error("POST /khata Error:", err);
    res.status(500).json({ error: "Failed to record advance" });
  }
});

// DELETE /management/hr/khata/:id: Delete unsettled advance
router.delete("/khata/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("staff_advances")
      .select("id, is_settled")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Advance record not found" });
    }

    if (existing.is_settled) {
      return res.status(400).json({ error: "Cannot delete: This advance has already been settled in a monthly payroll." });
    }

    const { error: delErr } = await supabase
      .from("staff_advances")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;
    res.json({ success: true, message: "Advance deleted successfully" });
  } catch (err) {
    console.error("DELETE /khata Error:", err);
    res.status(500).json({ error: "Failed to delete advance" });
  }
});

// ==========================================
// 4. MONTHLY PAYROLL & SETTLEMENT ENGINE
// ==========================================

// GET /management/hr/payroll?month=M&year=YYYY: Runs calculation engine + joins advances
router.get("/payroll", async (req, res) => {
  const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  try {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // 1. Fetch active staff
    const { data: staffList, error: staffErr } = await supabase
      .from("staff")
      .select("*")
      .order("name", { ascending: true });

    if (staffErr) throw staffErr;

    // 2. Fetch all attendance for this month
    const { data: attendanceData, error: attErr } = await supabase
      .from("staff_attendance")
      .select("*")
      .gte("work_date", startDate)
      .lte("work_date", endDate);

    if (attErr) throw attErr;

    const attendanceByStaff = new Map();
    (attendanceData || []).forEach((a) => {
      const list = attendanceByStaff.get(a.staff_id) || [];
      list.push(a);
      attendanceByStaff.set(a.staff_id, list);
    });

    // 3. Fetch unsettled advances (advance_date <= endDate)
    const { data: advancesData, error: advErr } = await supabase
      .from("staff_advances")
      .select("*")
      .lte("advance_date", endDate)
      .eq("is_settled", false);

    if (advErr) throw advErr;

    const advancesByStaff = new Map();
    (advancesData || []).forEach((adv) => {
      const list = advancesByStaff.get(adv.staff_id) || [];
      list.push(adv);
      advancesByStaff.set(adv.staff_id, list);
    });

    // 4. Fetch existing monthly_payroll records for this month/year
    const { data: payrollRecords, error: payErr } = await supabase
      .from("monthly_payroll")
      .select("*")
      .eq("payroll_month", month)
      .eq("payroll_year", year);

    if (payErr) throw payErr;

    const payrollMap = new Map();
    (payrollRecords || []).forEach((p) => payrollMap.set(p.staff_id, p));

    // 5. Compute payroll for each staff
    const results = (staffList || []).map((staff) => {
      const existingSettlement = payrollMap.get(staff.id);

      if (existingSettlement && existingSettlement.settlement_status === "paid") {
        return {
          staff,
          payrollId: existingSettlement.id,
          settlementStatus: "paid",
          paidAt: existingSettlement.paid_at,
          paymentMethod: existingSettlement.payment_method,
          wageType: existingSettlement.wage_type_snapshot,
          baseRate: Number(existingSettlement.base_rate_snapshot),
          daysPresent: Number(existingSettlement.days_present),
          halfDays: Number(existingSettlement.half_days),
          weeklyOffsTaken: Number(existingSettlement.weekly_offs_taken),
          deductibleAbsences: Number(existingSettlement.deductible_absences),
          totalHours: Number(existingSettlement.total_hours),
          overtimeHours: Number(existingSettlement.overtime_hours),
          grossWage: Number(existingSettlement.gross_wage),
          overtimePay: Number(existingSettlement.overtime_pay),
          khataDeducted: Number(existingSettlement.khata_deducted),
          bonusAmount: Number(existingSettlement.bonus_amount),
          otherDeductions: Number(existingSettlement.other_deductions),
          netPayable: Number(existingSettlement.net_payable),
          notes: existingSettlement.notes || "",
          unsettledAdvancesList: [],
        };
      }

      // Dynamic calculation
      const staffAtt = attendanceByStaff.get(staff.id) || [];
      const staffAdv = advancesByStaff.get(staff.id) || [];

      let fullPresentDays = 0;
      let halfDays = 0;
      let weeklyOffsTaken = 0;
      let paidLeaveDays = 0;
      let explicitAbsentDays = 0;
      let totalWorkedHours = 0;
      let totalOvertimeHours = 0;

      staffAtt.forEach((a) => {
        totalWorkedHours += Number(a.worked_hours || 0);
        totalOvertimeHours += Number(a.overtime_hours || 0);

        if (a.status === "present") fullPresentDays += 1;
        else if (a.status === "half_day") halfDays += 1;
        else if (a.status === "weekly_off") weeklyOffsTaken += 1;
        else if (a.status === "paid_leave") paidLeaveDays += 1;
        else if (a.status === "absent") explicitAbsentDays += 1;
      });

      const totalRecordedDays = fullPresentDays + halfDays + weeklyOffsTaken + paidLeaveDays + explicitAbsentDays;
      const totalAbsentDays = explicitAbsentDays + Math.max(0, daysInMonth - totalRecordedDays);

      const wageType = staff.wage_type || "monthly";
      const baseRate = Number(staff.base_rate) || 0;
      const otRate = Number(staff.overtime_hourly_rate) || 0;
      const paidWeeklyOffsPerMonth = Number(staff.paid_weekly_offs_per_month) || 4;

      let grossWage = 0;
      let deductibleAbsences = 0;

      if (wageType === "monthly") {
        const dailyRate = daysInMonth > 0 ? baseRate / daysInMonth : 0;
        deductibleAbsences = Math.max(0, totalAbsentDays - paidWeeklyOffsPerMonth);
        grossWage = Math.max(0, baseRate - (deductibleAbsences * dailyRate) - (halfDays * 0.5 * dailyRate));
      } else if (wageType === "daily") {
        grossWage = (fullPresentDays + (halfDays * 0.5) + paidLeaveDays) * baseRate;
      } else if (wageType === "hourly") {
        const regularHours = Math.max(0, totalWorkedHours - totalOvertimeHours);
        grossWage = regularHours * baseRate;
      }

      grossWage = Math.round(grossWage);
      const overtimePay = Math.round(totalOvertimeHours * otRate);

      const khataDeducted = staffAdv.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      const bonusAmount = existingSettlement ? Number(existingSettlement.bonus_amount || 0) : 0;
      const otherDeductions = existingSettlement ? Number(existingSettlement.other_deductions || 0) : 0;

      const netPayable = Math.max(0, Math.round(grossWage + overtimePay + bonusAmount - khataDeducted - otherDeductions));

      return {
        staff,
        payrollId: existingSettlement?.id || null,
        settlementStatus: "unpaid",
        paidAt: null,
        paymentMethod: null,
        wageType,
        baseRate,
        daysPresent: fullPresentDays,
        halfDays,
        weeklyOffsTaken,
        deductibleAbsences,
        totalHours: Math.round(totalWorkedHours * 100) / 100,
        overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
        grossWage,
        overtimePay,
        khataDeducted,
        bonusAmount,
        otherDeductions,
        netPayable,
        notes: existingSettlement?.notes || "",
        unsettledAdvancesList: staffAdv,
      };
    });

    res.json({
      month,
      year,
      daysInMonth,
      payroll: results,
    });
  } catch (err) {
    console.error("GET /payroll Error:", err);
    res.status(500).json({ error: "Failed to calculate payroll" });
  }
});

// POST /management/hr/payroll/settle: Locks payroll row as paid & marks advances as settled
router.post("/payroll/settle", async (req, res) => {
  const {
    staffId,
    payrollMonth,
    payrollYear,
    paymentMethod,
    bonusAmount,
    otherDeductions,
    notes,
  } = req.body;

  if (!staffId || !payrollMonth || !payrollYear) {
    return res.status(400).json({ error: "Staff ID, month, and year are required" });
  }

  try {
    const month = parseInt(payrollMonth, 10);
    const year = parseInt(payrollYear, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // 1. Fetch staff
    const { data: staff, error: staffErr } = await supabase
      .from("staff")
      .select("*")
      .eq("id", staffId)
      .single();

    if (staffErr || !staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // 2. Fetch attendance
    const { data: staffAtt } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staffId)
      .gte("work_date", startDate)
      .lte("work_date", endDate);

    let fullPresentDays = 0;
    let halfDays = 0;
    let weeklyOffsTaken = 0;
    let paidLeaveDays = 0;
    let explicitAbsentDays = 0;
    let totalWorkedHours = 0;
    let totalOvertimeHours = 0;

    (staffAtt || []).forEach((a) => {
      totalWorkedHours += Number(a.worked_hours || 0);
      totalOvertimeHours += Number(a.overtime_hours || 0);

      if (a.status === "present") fullPresentDays += 1;
      else if (a.status === "half_day") halfDays += 1;
      else if (a.status === "weekly_off") weeklyOffsTaken += 1;
      else if (a.status === "paid_leave") paidLeaveDays += 1;
      else if (a.status === "absent") explicitAbsentDays += 1;
    });

    const totalRecordedDays = fullPresentDays + halfDays + weeklyOffsTaken + paidLeaveDays + explicitAbsentDays;
    const totalAbsentDays = explicitAbsentDays + Math.max(0, daysInMonth - totalRecordedDays);

    const wageType = staff.wage_type || "monthly";
    const baseRate = Number(staff.base_rate) || 0;
    const otRate = Number(staff.overtime_hourly_rate) || 0;
    const paidWeeklyOffsPerMonth = Number(staff.paid_weekly_offs_per_month) || 4;

    let grossWage = 0;
    let deductibleAbsences = 0;

    if (wageType === "monthly") {
      const dailyRate = daysInMonth > 0 ? baseRate / daysInMonth : 0;
      deductibleAbsences = Math.max(0, totalAbsentDays - paidWeeklyOffsPerMonth);
      grossWage = Math.max(0, baseRate - (deductibleAbsences * dailyRate) - (halfDays * 0.5 * dailyRate));
    } else if (wageType === "daily") {
      grossWage = (fullPresentDays + (halfDays * 0.5) + paidLeaveDays) * baseRate;
    } else if (wageType === "hourly") {
      const regularHours = Math.max(0, totalWorkedHours - totalOvertimeHours);
      grossWage = regularHours * baseRate;
    }

    grossWage = Math.round(grossWage);
    const overtimePay = Math.round(totalOvertimeHours * otRate);

    // 3. Fetch unsettled advances
    const { data: unsettledAdvances } = await supabase
      .from("staff_advances")
      .select("*")
      .eq("staff_id", staffId)
      .lte("advance_date", endDate)
      .eq("is_settled", false);

    const khataDeducted = (unsettledAdvances || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const finalBonus = Number(bonusAmount || 0);
    const finalOtherDeductions = Number(otherDeductions || 0);
    const netPayable = Math.max(0, Math.round(grossWage + overtimePay + finalBonus - khataDeducted - finalOtherDeductions));

    // 4. Upsert into monthly_payroll
    const { data: payrollRow, error: payErr } = await supabase
      .from("monthly_payroll")
      .upsert(
        {
          staff_id: staffId,
          payroll_month: month,
          payroll_year: year,
          wage_type_snapshot: wageType,
          base_rate_snapshot: baseRate,
          days_present: fullPresentDays,
          half_days: halfDays,
          weekly_offs_taken: weeklyOffsTaken,
          deductible_absences: deductibleAbsences,
          total_hours: Math.round(totalWorkedHours * 100) / 100,
          overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
          gross_wage: grossWage,
          overtime_pay: overtimePay,
          khata_deducted: khataDeducted,
          bonus_amount: finalBonus,
          other_deductions: finalOtherDeductions,
          net_payable: netPayable,
          settlement_status: "paid",
          payment_method: paymentMethod || "cash",
          paid_at: new Date().toISOString(),
          notes: notes || null,
        },
        { onConflict: "staff_id, payroll_month, payroll_year" }
      )
      .select()
      .single();

    if (payErr) throw payErr;

    // 5. Mark unsettled advances as settled and link to payroll
    if (unsettledAdvances && unsettledAdvances.length > 0) {
      const advanceIds = unsettledAdvances.map((a) => a.id);
      await supabase
        .from("staff_advances")
        .update({
          is_settled: true,
          payroll_id: payrollRow.id,
        })
        .in("id", advanceIds);
    }

    res.json({ success: true, payroll: payrollRow });
  } catch (err) {
    console.error("POST /payroll/settle Error:", err);
    res.status(500).json({ error: "Failed to settle payroll" });
  }
});

export default router;
