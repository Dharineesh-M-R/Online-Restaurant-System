"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Phone,
  Trash2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  UtensilsCrossed,
  Timer,
  Check,
  LogIn,
  LogOut,
  RotateCcw,
  DollarSign
} from "lucide-react";

interface StaffMember {
  id: string;
  employee_id: string;
  name: string;
  role: "waiter" | "kitchen" | "billing" | "manager";
  pin: string;
  phone: string;
  hourly_wage: number;
  status: string;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  loggedHours?: number;
  loggedMinutes?: number;
  status: "clocked_in" | "on_break" | "clocked_out" | "scheduled";
}

interface LaborSummary {
  scheduledHoursTotal: number;
  scheduledPayrollTotal: number;
  loggedHoursTotal: number;
  loggedPayrollTotal: number;
  onDutyCount: number;
}

// Convert 24h format (HH:MM) to 12h AM/PM format (seconds ignored)
function formatTime12h(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

// Calculate exact difference in minutes between two HH:MM time strings (seconds ignored)
function getMinutesBetween(clockIn: string | null | undefined, clockOut: string | null | undefined): number {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let totalMin = outH * 60 + outM - (inH * 60 + inM);
  if (totalMin < 0) totalMin += 1440; // Shift crossed midnight
  return totalMin;
}

// Format total minutes to exact "X hrs Y mins" or "Y mins"
function formatMinutesToHoursAndMins(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 mins";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}`;
}

// Calculate exact wage from minutes (every minute calculated precisely)
function calculateWageFromMinutes(totalMinutes: number, hourlyWage: number): number {
  if (!totalMinutes || totalMinutes <= 0 || !hourlyWage) return 0;
  return Math.round((totalMinutes / 60) * hourlyWage);
}

export default function StaffRoster() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Sub-tabs: Attendance & Directory
  const [subTab, setSubTab] = useState<"attendance" | "directory">("attendance");

  // Core Data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [laborSummary, setLaborSummary] = useState<LaborSummary>({
    scheduledHoursTotal: 0,
    scheduledPayrollTotal: 0,
    loggedHoursTotal: 0,
    loggedPayrollTotal: 0,
    onDutyCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Live wall clock (updates every second for display, minutes used for duty calculation)
  const [liveClock, setLiveClock] = useState<string>("");
  const [currentMinuteHHMM, setCurrentMinuteHHMM] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
      setCurrentMinuteHHMM(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "waiter" as "waiter" | "kitchen" | "billing" | "manager",
    phone: "",
    hourly_wage: 120,
    pin: "",
  });

  // Toast Helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch staff list & live attendance
  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, rosterRes] = await Promise.all([
        fetch(`${apiUrl}/management/staff`, { cache: "no-store" }),
        fetch(`${apiUrl}/management/staff/roster`, { cache: "no-store" }),
      ]);

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData.staff || []);
      }

      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setAttendance(rosterData.attendance || []);
        if (rosterData.laborSummary) {
          setLaborSummary(rosterData.laborSummary);
        }
      }
    } catch (err) {
      console.error("Error loading staff data:", err);
      showToast("Failed to fetch staff data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Role Change
  const handleRoleChange = async (staffId: string, newRole: string) => {
    try {
      const res = await fetch(`${apiUrl}/management/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast("Role updated successfully");
        fetchData();
      } else {
        showToast("Failed to update role", "error");
      }
    } catch {
      showToast("Error updating role", "error");
    }
  };

  // Reset PIN
  const handleResetPin = async (staffId: string, staffName: string) => {
    try {
      const res = await fetch(`${apiUrl}/management/staff/${staffId}/reset-pin`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`New PIN for ${staffName}: ${data.pin}`, "success");
        setRevealedPins((prev) => ({ ...prev, [staffId]: true }));
        fetchData();
      } else {
        showToast("Failed to reset PIN", "error");
      }
    } catch {
      showToast("Error resetting PIN", "error");
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from the team roster?`)) return;
    try {
      const res = await fetch(`${apiUrl}/management/staff/${staffId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`${staffName} removed successfully`);
        setStaff((prev) => prev.filter((s) => s.id !== staffId && s.employee_id !== staffId));
        fetchData();
      } else {
        showToast("Failed to delete staff member", "error");
      }
    } catch {
      showToast("Error deleting staff member", "error");
    }
  };

  // Submit New Staff Form
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.name.trim()) {
      showToast("Please enter staff member's name", "error");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/management/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Staff profile created! Default PIN: ${data.staff?.pin}`);
        setShowAddStaffModal(false);
        setStaffForm({ name: "", role: "waiter", phone: "", hourly_wage: 120, pin: "" });
        if (data.staff) {
          setStaff((prev) => {
            const exists = prev.some((s) => s.id === data.staff.id || s.employee_id === data.staff.employee_id);
            return exists ? prev : [...prev, data.staff];
          });
        }
        fetchData();
      } else {
        showToast(data.error || "Failed to create staff member", "error");
      }
    } catch {
      showToast("Error creating staff profile", "error");
    }
  };

  // Manager Desk Punch: Clock In / Clock Out
  const handlePunch = async (staffId: string, action: "clock_in" | "clock_out") => {
    try {
      const res = await fetch(`${apiUrl}/management/staff/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        const actionLabel = action === "clock_in" ? "Clocked In" : "Clocked Out";
        showToast(`Marked ${actionLabel} successfully!`);
        fetchData();
      } else {
        showToast(data.error || "Punch update failed", "error");
      }
    } catch {
      showToast("Error recording punch", "error");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "waiter":
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">Waiter</span>;
      case "kitchen":
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">Kitchen Chef</span>;
      case "billing":
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">Billing Cashier</span>;
      case "manager":
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">Floor Manager</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700">{role}</span>;
    }
  };

  // Grand totals across all staff (calculated with exact minute precision)
  const {
    grandTotalTodayMinutes,
    grandTotalTodayWage,
    grandTotalAllTimeMinutes,
    grandTotalAllTimeWage
  } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const wageMap = new Map<string, number>();
    staff.forEach((s) => {
      wageMap.set(s.employee_id, Number(s.hourly_wage) || 120);
      wageMap.set(s.id, Number(s.hourly_wage) || 120);
    });

    let todayMins = 0;
    let todayPay = 0;
    let allMins = 0;
    let allPay = 0;

    staff.forEach((person) => {
      const staffRecords = attendance.filter(
        (a) => a.staffId === person.employee_id || a.staffId === person.id
      );
      const todayRec = staffRecords.find((a) => a.date === todayStr);
      const isClockedIn = todayRec?.status === "clocked_in" || todayRec?.status === "on_break";
      const isClockedOut = todayRec?.status === "clocked_out";

      // Today's exact minutes for this person
      let pTodayMin = 0;
      if (isClockedOut && todayRec?.clockIn && todayRec?.clockOut) {
        pTodayMin = getMinutesBetween(todayRec.clockIn, todayRec.clockOut);
      } else if (isClockedIn && todayRec?.clockIn) {
        pTodayMin = getMinutesBetween(todayRec.clockIn, currentMinuteHHMM || "00:00");
      } else if (todayRec?.loggedHours) {
        pTodayMin = Math.round(Number(todayRec.loggedHours) * 60);
      }

      // Past historical minutes
      const pPastMin = staffRecords
        .filter((a) => a.date !== todayStr)
        .reduce((sum, a) => {
          let m = 0;
          if (a.clockIn && a.clockOut) {
            m = getMinutesBetween(a.clockIn, a.clockOut);
          } else if (a.loggedHours) {
            m = Math.round(Number(a.loggedHours) * 60);
          }
          return sum + m;
        }, 0);

      const pTotalMin = pPastMin + pTodayMin;
      const rate = wageMap.get(person.employee_id) || 120;

      todayMins += pTodayMin;
      todayPay += calculateWageFromMinutes(pTodayMin, rate);

      allMins += pTotalMin;
      allPay += calculateWageFromMinutes(pTotalMin, rate);
    });

    return {
      grandTotalTodayMinutes: todayMins,
      grandTotalTodayWage: todayPay,
      grandTotalAllTimeMinutes: allMins,
      grandTotalAllTimeWage: allPay,
    };
  }, [staff, attendance, currentMinuteHHMM]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all border ${
            toast.type === "error"
              ? "bg-rose-900 text-white border-rose-800"
              : toast.type === "info"
              ? "bg-sky-900 text-white border-sky-800"
              : "bg-stone-900 text-white border-stone-800"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} className="text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner: Manager Attendance Desk */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider">
              Manager Desk
            </span>
            <span className="text-xs font-bold text-stone-400">
              Daily Attendance & Duty Punch
            </span>
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight mt-1">
            Employee Attendance & Wage Calculation Desk
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Staff report to the manager desk upon arrival in the morning (Clock-In) and before leaving (Clock-Out). Total duty time and earned wages are computed automatically down to the exact minute.
          </p>
        </div>

        {/* Live Clock Card */}
        <div className="bg-stone-50 px-5 py-3 rounded-2xl border border-stone-200 text-right shrink-0">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
          <div className="text-xl font-black font-mono text-stone-900 tracking-wider">
            {liveClock || "10:00:00 AM"}
          </div>
          <p className="text-[10px] text-stone-400 font-medium mt-0.5">Seconds ignored • Exact minutes calculated</p>
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Live On-Duty Headcount */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Live On-Duty</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{laborSummary.onDutyCount}</span>
              <span className="text-xs text-stone-500 font-bold">/ {staff.length} staff</span>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Currently Clocked In</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
            <UserCheck size={20} />
          </div>
        </div>

        {/* Today's Total Duty Time */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Today's Total Duty</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-stone-900">{formatMinutesToHoursAndMins(grandTotalTodayMinutes)}</span>
            </div>
            <p className="text-[10px] font-bold text-stone-400 mt-0.5">Total Minutes: {grandTotalTodayMinutes}m</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Timer size={20} />
          </div>
        </div>

        {/* Today's Earned Wages */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Today's Wage Payroll</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-stone-900">₹{grandTotalTodayWage.toLocaleString()}</span>
            </div>
            <p className="text-[10px] font-bold text-orange-600 mt-0.5">Exact Minute Duty Pay</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Cumulative All-Time Duty Wages */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Total Duty Wages</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-600">₹{grandTotalAllTimeWage.toLocaleString()}</span>
            </div>
            <p className="text-[10px] font-bold text-stone-400 mt-0.5">{formatMinutesToHoursAndMins(grandTotalAllTimeMinutes)} all-time</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs & Action Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab("attendance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              subTab === "attendance"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Clock size={15} />
            <span>Attendance & Punch Desk</span>
          </button>

          <button
            onClick={() => setSubTab("directory")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              subTab === "directory"
                ? "bg-stone-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <Users size={15} />
            <span>Personnel Directory & PINs</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={fetchData}
            title="Refresh Attendance"
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ATTENDANCE & MANAGER DESK PUNCH TABLE */}
      {/* ========================================================================= */}
      {subTab === "attendance" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          
          <div className="p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>Employee Daily Duty Roster & Minute-Accurate Wages</span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-xs font-bold">
                  {staff.length} Employees
                </span>
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                Staff report directly to manager desk. Manager marks Clock-In upon morning arrival and Clock-Out before departure. Every minute is calculated precisely (seconds ignored).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{laborSummary.onDutyCount} Staff Currently Clocked In</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4">Hourly Wage</th>
                  <th className="py-3.5 px-4">Reporting Status</th>
                  <th className="py-3.5 px-4">Clock-In</th>
                  <th className="py-3.5 px-4">Clock-Out</th>
                  <th className="py-3.5 px-4">Total Duty Time</th>
                  <th className="py-3.5 px-4">Total Wage</th>
                  <th className="py-3.5 px-5 text-right">Manager Desk Punch Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {staff.map((person) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  
                  // All attendance punch records for this staff member
                  const staffRecords = attendance.filter(
                    (a) => a.staffId === person.employee_id || a.staffId === person.id
                  );
                  
                  const todayRec = staffRecords.find((a) => a.date === todayStr);
                  const isClockedIn = todayRec?.status === "clocked_in" || todayRec?.status === "on_break";
                  const isClockedOut = todayRec?.status === "clocked_out";

                  // Calculate exact duty minutes for today's shift (ignoring seconds)
                  let todayDutyMinutes = 0;
                  if (isClockedOut && todayRec?.clockIn && todayRec?.clockOut) {
                    todayDutyMinutes = getMinutesBetween(todayRec.clockIn, todayRec.clockOut);
                  } else if (isClockedIn && todayRec?.clockIn) {
                    todayDutyMinutes = getMinutesBetween(todayRec.clockIn, currentMinuteHHMM || "00:00");
                  } else if (todayRec?.loggedHours) {
                    todayDutyMinutes = Math.round(Number(todayRec.loggedHours) * 60);
                  }

                  // Historical past duty minutes (excluding today)
                  const pastDutyMinutes = staffRecords
                    .filter((a) => a.date !== todayStr)
                    .reduce((sum, a) => {
                      let m = 0;
                      if (a.clockIn && a.clockOut) {
                        m = getMinutesBetween(a.clockIn, a.clockOut);
                      } else if (a.loggedHours) {
                        m = Math.round(Number(a.loggedHours) * 60);
                      }
                      return sum + m;
                    }, 0);

                  // Cumulative all-time total duty time in minutes
                  const cumulativeDutyMinutes = pastDutyMinutes + todayDutyMinutes;

                  // Wage calculation for this employee based on exact minutes
                  const wageRate = Number(person.hourly_wage) || 120;
                  const todayWage = calculateWageFromMinutes(todayDutyMinutes, wageRate);
                  const cumulativeWage = calculateWageFromMinutes(cumulativeDutyMinutes, wageRate);

                  return (
                    <tr key={person.id} className="hover:bg-stone-50/60 transition">
                      
                      {/* Column 1: Staff Member */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {person.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-stone-900">{person.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-stone-500">
                                {person.employee_id}
                              </span>
                              <span>•</span>
                              {getRoleBadge(person.role)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Hourly Wage */}
                      <td className="py-4 px-4 font-bold text-stone-800">
                        ₹{person.hourly_wage}/hr
                      </td>

                      {/* Column 3: Reporting Status */}
                      <td className="py-4 px-4">
                        {isClockedIn ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 w-max">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Clocked In</span>
                          </span>
                        ) : isClockedOut ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 w-max flex items-center gap-1">
                            <Check size={11} className="text-emerald-600" />
                            <span>Clocked Out</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-50 text-stone-400 border border-stone-200 w-max">
                            Not Reported Yet
                          </span>
                        )}
                      </td>

                      {/* Column 4: Clock-In */}
                      <td className="py-4 px-4 font-mono font-bold text-stone-900">
                        {todayRec?.clockIn ? (
                          <span className="px-2.5 py-1 bg-stone-100 rounded-lg">
                            {formatTime12h(todayRec.clockIn)}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* Column 5: Clock-Out */}
                      <td className="py-4 px-4 font-mono font-bold text-stone-900">
                        {todayRec?.clockOut ? (
                          <span className="px-2.5 py-1 bg-stone-100 rounded-lg">
                            {formatTime12h(todayRec.clockOut)}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* Column 6: Total Duty Time (Exact hours and minutes, seconds ignored) */}
                      <td className="py-4 px-4">
                        {isClockedOut ? (
                          <div>
                            <p className="font-black text-stone-900 text-sm">
                              {formatMinutesToHoursAndMins(todayDutyMinutes)}
                            </p>
                            <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                              Cumulative: {formatMinutesToHoursAndMins(cumulativeDutyMinutes)}
                            </p>
                          </div>
                        ) : isClockedIn ? (
                          <div>
                            <p className="font-bold text-emerald-600 text-xs flex items-center gap-1">
                              <Timer size={12} className="animate-spin" />
                              <span>{formatMinutesToHoursAndMins(todayDutyMinutes)} (Active)</span>
                            </p>
                            <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                              Cumulative: {formatMinutesToHoursAndMins(cumulativeDutyMinutes)}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-stone-700 text-xs">
                              {cumulativeDutyMinutes > 0 ? formatMinutesToHoursAndMins(cumulativeDutyMinutes) : "0 mins"}
                            </p>
                            <p className="text-[10px] text-stone-400 font-medium">
                              {cumulativeDutyMinutes > 0 ? "Past Duty" : "No duty logged"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Column 7: Total Wage (Calculated with minute precision) */}
                      <td className="py-4 px-4">
                        {isClockedOut ? (
                          <div>
                            <p className="font-black text-emerald-600 text-sm">
                              ₹{todayWage.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                              Cumulative: ₹{cumulativeWage.toLocaleString()}
                            </p>
                          </div>
                        ) : isClockedIn ? (
                          <div>
                            <p className="font-bold text-emerald-600 text-sm">
                              ₹{todayWage.toLocaleString()}{" "}
                              <span className="text-[10px] font-medium text-emerald-700">(live)</span>
                            </p>
                            <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                              Cumulative: ₹{cumulativeWage.toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-stone-800 text-xs">
                              ₹{cumulativeWage.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-stone-400 font-medium">
                              {cumulativeWage > 0 ? "Cumulative Pay" : "₹0 earned"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Column 8: Manager Desk Punch Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* When not clocked in: Manager marks Clock In */}
                          {!isClockedIn && !isClockedOut && (
                            <button
                              onClick={() => handlePunch(person.employee_id || person.id, "clock_in")}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <LogIn size={13} />
                              <span>Clock In</span>
                            </button>
                          )}

                          {/* When clocked in: Manager marks Clock Out */}
                          {isClockedIn && (
                            <button
                              onClick={() => handlePunch(person.employee_id || person.id, "clock_out")}
                              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <LogOut size={13} />
                              <span>Clock Out</span>
                            </button>
                          )}

                          {/* When clocked out: Shift is completed */}
                          {isClockedOut && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-400">Shift Completed</span>
                              <button
                                onClick={() => handlePunch(person.employee_id || person.id, "clock_in")}
                                title="Re-clock in for second shift"
                                className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                              >
                                <RotateCcw size={13} />
                              </button>
                            </div>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}

                {staff.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 font-medium">
                      No staff members registered. Click "+ Add Team Member" to onboard employees.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Grand Total Summary Footer Row */}
              {staff.length > 0 && (
                <tfoot className="bg-stone-50/90 border-t-2 border-stone-200 text-xs font-black">
                  <tr>
                    <td className="py-4 px-5 text-stone-900" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] uppercase tracking-wider">
                          Grand Total
                        </span>
                        <span>All Staff Operations</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-emerald-700">
                      {laborSummary.onDutyCount} On-Duty
                    </td>
                    <td className="py-4 px-4 text-stone-400">—</td>
                    <td className="py-4 px-4 text-stone-400">—</td>
                    <td className="py-4 px-4 text-stone-900">
                      <p className="text-sm font-black">{formatMinutesToHoursAndMins(grandTotalTodayMinutes)}</p>
                      <p className="text-[10px] text-stone-500 font-bold">Total: {formatMinutesToHoursAndMins(grandTotalAllTimeMinutes)}</p>
                    </td>
                    <td className="py-4 px-4 text-emerald-600">
                      <p className="text-sm font-black">₹{grandTotalTodayWage.toLocaleString()}</p>
                      <p className="text-[10px] text-stone-500 font-bold">Total: ₹{grandTotalAllTimeWage.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-5 text-right text-stone-400 font-medium">
                      {staff.length} Active Employees
                    </td>
                  </tr>
                </tfoot>
              )}

            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PERSONNEL DIRECTORY & ACCESS CONTROL */}
      {/* ========================================================================= */}
      {subTab === "directory" && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          
          <div className="p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-stone-900">Personnel Directory & Access Control</h3>
              <p className="text-xs text-stone-500 font-medium">
                Manage roles, contact details, hourly wages, and 4-digit system login PINs for all staff.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold">
                {staff.length} Active Profiles
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Hourly Wage</th>
                  <th className="py-3 px-4">Login PIN (4-Digit)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {staff.map((person) => {
                  const isPinRevealed = Boolean(revealedPins[person.id] || revealedPins[person.employee_id]);

                  return (
                    <tr key={person.id} className="hover:bg-stone-50/60 transition">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-stone-900 text-white font-black text-xs flex items-center justify-center">
                            {person.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-stone-900">{person.name}</p>
                            <p className="text-[10px] text-stone-400 font-bold uppercase">{person.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-700">
                        {person.employee_id}
                      </td>

                      {/* System Role Selector */}
                      <td className="py-3.5 px-4">
                        <select
                          value={person.role}
                          onChange={(e) => handleRoleChange(person.id, e.target.value)}
                          className="text-xs font-bold bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                        >
                          <option value="waiter">Waiter (Floor POS)</option>
                          <option value="kitchen">Kitchen Chef (KDS)</option>
                          <option value="billing">Billing Cashier (POS)</option>
                          <option value="manager">Floor Manager (Admin)</option>
                        </select>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-medium text-stone-600 flex items-center gap-1.5 mt-2">
                        <Phone size={13} className="text-stone-400" />
                        <span>{person.phone || "—"}</span>
                      </td>

                      {/* Hourly Wage */}
                      <td className="py-3.5 px-4 font-bold text-stone-900">
                        ₹{person.hourly_wage}/hr
                      </td>

                      {/* 4-Digit PIN Management */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm px-2.5 py-1 bg-stone-100 rounded-lg tracking-widest text-stone-800 min-w-[55px] text-center">
                            {isPinRevealed ? person.pin : "••••"}
                          </span>

                          <button
                            onClick={() =>
                              setRevealedPins((prev) => ({
                                ...prev,
                                [person.id]: !isPinRevealed,
                                [person.employee_id]: !isPinRevealed,
                              }))
                            }
                            title={isPinRevealed ? "Hide PIN" : "Reveal PIN"}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 cursor-pointer"
                          >
                            {isPinRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          <button
                            onClick={() => handleResetPin(person.id, person.name)}
                            title="Generate New PIN"
                            className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 cursor-pointer"
                          >
                            <Key size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDeleteStaff(person.id, person.name)}
                          title="Remove Staff Member"
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {staff.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 font-medium">
                      No staff members registered. Click "+ Add Team Member" to onboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TEAM MEMBER */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900">Add Team Member Profile</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Manish Sharma"
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                  System Role
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5"
                >
                  <option value="waiter">Waiter (Floor POS)</option>
                  <option value="kitchen">Kitchen Chef (KDS)</option>
                  <option value="billing">Billing Cashier (POS)</option>
                  <option value="manager">Floor Manager (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="98765-43210"
                  className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                    Hourly Wage (₹)
                  </label>
                  <input
                    type="number"
                    value={staffForm.hourly_wage}
                    onChange={(e) => setStaffForm({ ...staffForm, hourly_wage: Number(e.target.value) })}
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-1">
                    4-Digit PIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={staffForm.pin}
                    onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
                >
                  Create Member Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
