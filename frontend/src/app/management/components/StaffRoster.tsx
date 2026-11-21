"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  CreditCard,
  Download,
  Trash2,
  UserCheck,
  Users,
  Check,
  X,
  FileText,
  Settings,
  AlertCircle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  Save,
  LogIn,
  LogOut,
  Sliders,
  DollarSign,
  ShieldCheck,
  FileSpreadsheet,
  Coffee,
  Play,
  Pause,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface StaffConfig {
  id: string;
  employee_id: string;
  name: string;
  role: "waiter" | "kitchen" | "billing" | "manager";
  wage_type: "monthly" | "daily" | "hourly";
  base_rate: number;
  standard_shift_hours: number;
  default_break_hours: number;
  half_day_cutoff_hours: number;
  overtime_hourly_rate: number;
  paid_weekly_offs_per_month: number;
  is_active: boolean;
  pin?: string;
  phone?: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_start?: string | null;
  break_end?: string | null;
  break_hours?: number;
  worked_hours: number;
  overtime_hours: number;
  status: "present" | "half_day" | "absent" | "weekly_off" | "paid_leave";
  is_manual_in: boolean;
  is_manual_out: boolean;
  notes: string | null;
}

export interface StaffDailyAttendance {
  staff: StaffConfig;
  attendance: AttendanceRecord | null;
  status: string;
  isOnBreak: boolean;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakHours: number;
  workedHours: number;
  overtimeHours: number;
  isManualIn: boolean;
  isManualOut: boolean;
  notes: string;
  recordId: string | null;
}

export interface UnclosedShift {
  id: string;
  staff_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string | null;
  worked_hours: number;
  status: string;
  notes: string | null;
  staff?: StaffConfig;
}

export interface AdvanceRecord {
  id: string;
  staff_id: string;
  amount: number;
  advance_date: string;
  payment_method: "cash" | "upi" | "bank_transfer";
  notes: string | null;
  is_settled: boolean;
  created_at?: string;
  staff?: {
    id: string;
    name: string;
    employee_id: string;
    role: string;
  };
}

export interface AdvanceStaffSummary {
  staffId: string;
  staffName: string;
  employeeId: string;
  unsettledTotal: number;
  advancesCount: number;
}

export interface PayrollRow {
  staff: StaffConfig;
  payrollId: string | null;
  settlementStatus: "unpaid" | "paid";
  paidAt: string | null;
  paymentMethod: string | null;
  wageType: "monthly" | "daily" | "hourly";
  baseRate: number;
  daysPresent: number;
  halfDays: number;
  weeklyOffsTaken: number;
  deductibleAbsences: number;
  totalHours: number;
  overtimeHours: number;
  grossWage: number;
  overtimePay: number;
  khataDeducted: number;
  bonusAmount: number;
  otherDeductions: number;
  netPayable: number;
  notes: string;
  unsettledAdvancesList: AdvanceRecord[];
}

// Helpers with explicit Asia/Kolkata (IST) conversion
function formatTime12h(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function toISTTimeInput(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }); // Returns "HH:MM" in IST
  } catch {
    return "";
  }
}

// Alias for backwards compatibility
const toLocalTimeInputValue = toISTTimeInput;

export default function StaffRoster() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Active Top Tab (5 Tabs)
  const [activeTab, setActiveTab] = useState<"today" | "register" | "khata" | "payroll" | "team">("today");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Shared Data: Staff Config
  const [staffConfigs, setStaffConfigs] = useState<StaffConfig[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // -------------------------------------------------------------
  // TAB 1: TODAY'S DESK STATE
  // -------------------------------------------------------------
  const [todayDate, setTodayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [todayAttendance, setTodayAttendance] = useState<StaffDailyAttendance[]>([]);
  const [unclosedShifts, setUnclosedShifts] = useState<UnclosedShift[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // Manual Punch Modal State (Clock In, Clock Out, Mid-Day Break Start/End)
  const [punchModal, setPunchModal] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    action: "clock_in" | "clock_out" | "break_start" | "break_end";
    workDate: string;
    defaultTime: string;
    breakHours?: number;
    deductDefaultBreak?: boolean;
    notes: string;
    statusOverride?: string;
  }>({
    isOpen: false,
    staffId: "",
    staffName: "",
    action: "clock_in",
    workDate: todayDate,
    defaultTime: "",
    breakHours: 2,
    deductDefaultBreak: true,
    notes: "",
  });

  // -------------------------------------------------------------
  // TAB 2: MONTHLY REGISTER STATE
  // -------------------------------------------------------------
  const [registerDate, setRegisterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [registerAttendance, setRegisterAttendance] = useState<StaffDailyAttendance[]>([]);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [registerSearch, setRegisterSearch] = useState("");
  const [editingRows, setEditingRows] = useState<Record<string, {
    status: "present" | "half_day" | "absent" | "weekly_off" | "paid_leave";
    clockIn: string;
    clockOut: string;
    breakHours: number;
    workedHours: number;
    notes: string;
  }>>({});

  // -------------------------------------------------------------
  // TAB 3: KHATA (ADVANCES) STATE
  // -------------------------------------------------------------
  const [advancesList, setAdvancesList] = useState<AdvanceRecord[]>([]);
  const [unsettledTotal, setUnsettledTotal] = useState(0);
  const [staffKhataSummary, setStaffKhataSummary] = useState<AdvanceStaffSummary[]>([]);
  const [loadingKhata, setLoadingKhata] = useState(false);
  const [khataStaffFilter, setKhataStaffFilter] = useState("all");

  const [newAdvanceForm, setNewAdvanceForm] = useState<{
    staffId: string;
    amount: string;
    advanceDate: string;
    paymentMethod: "cash" | "upi" | "bank_transfer";
    notes: string;
  }>({
    staffId: "",
    amount: "",
    advanceDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });
  const [submittingAdvance, setSubmittingAdvance] = useState(false);

  // -------------------------------------------------------------
  // TAB 4: PAYROLL & WAGE CONFIG STATE
  // -------------------------------------------------------------
  const [payrollSubTab, setPayrollSubTab] = useState<"settlement" | "config">("settlement");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<PayrollRow[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Settle Wage Modal State
  const [settleModal, setSettleModal] = useState<{
    isOpen: boolean;
    row: PayrollRow | null;
    bonusAmount: number;
    otherDeductions: number;
    paymentMethod: "cash" | "upi" | "bank_transfer";
    notes: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    row: null,
    bonusAmount: 0,
    otherDeductions: 0,
    paymentMethod: "cash",
    notes: "",
    isSubmitting: false,
  });

  // Wage Settings Editing State
  const [editingStaffConfig, setEditingStaffConfig] = useState<Record<string, Partial<StaffConfig>>>({});
  const [savingConfigId, setSavingConfigId] = useState<string | null>(null);

  // Add New Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    role: "waiter",
    phone: "",
    wage_type: "monthly",
    base_rate: 18000,
    standard_shift_hours: 9,
    default_break_hours: 2,
    half_day_cutoff_hours: 5,
    overtime_hourly_rate: 100,
    paid_weekly_offs_per_month: 4,
    pin: "",
  });

  // -------------------------------------------------------------
  // TAB 5: TEAM & CREDENTIALS STATE
  // -------------------------------------------------------------
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("all");
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Edit Staff Profile & Credentials Modal State
  const [editStaffModal, setEditStaffModal] = useState<{
    isOpen: boolean;
    staffId: string;
    name: string;
    employee_id: string;
    role: "waiter" | "kitchen" | "billing" | "manager";
    pin: string;
    phone: string;
    is_active: boolean;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    staffId: "",
    name: "",
    employee_id: "",
    role: "waiter",
    pin: "",
    phone: "",
    is_active: true,
    isSubmitting: false,
  });

  // ==========================================
  // DATA FETCHING FUNCTIONS
  // ==========================================

  // Fetch Staff Config
  const fetchStaffConfigs = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch(`${apiUrl}/management/hr/staff-config`);
      if (res.ok) {
        const data = await res.json();
        setStaffConfigs(data.staff || []);
      }
    } catch {
      showToast("Error loading staff configuration", "error");
    } finally {
      setLoadingStaff(false);
    }
  }, [apiUrl]);

  // Fetch Today's Desk
  const fetchTodayDesk = useCallback(async () => {
    try {
      setLoadingToday(true);
      const res = await fetch(`${apiUrl}/management/hr/attendance?date=${todayDate}`);
      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data.attendance || []);
        setUnclosedShifts(data.unclosedShifts || []);
      }
    } catch {
      showToast("Error loading daily attendance", "error");
    } finally {
      setLoadingToday(false);
    }
  }, [apiUrl, todayDate]);

  // Fetch Monthly Register
  const fetchRegister = useCallback(async () => {
    try {
      setLoadingRegister(true);
      const res = await fetch(`${apiUrl}/management/hr/attendance?date=${registerDate}`);
      if (res.ok) {
        const data = await res.json();
        setRegisterAttendance(data.attendance || []);
        // Initialize editing state
        const initialEdits: Record<string, any> = {};
        (data.attendance || []).forEach((row: StaffDailyAttendance) => {
          initialEdits[row.staff.id] = {
            status: row.status === "not_recorded" ? "present" : row.status,
            clockIn: toLocalTimeInputValue(row.clockIn),
            clockOut: toLocalTimeInputValue(row.clockOut),
            breakHours: row.breakHours !== undefined && row.breakHours !== null ? row.breakHours : (row.staff.default_break_hours ?? 2),
            workedHours: row.workedHours,
            notes: row.notes || "",
          };
        });
        setEditingRows(initialEdits);
      }
    } catch {
      showToast("Error loading register for date", "error");
    } finally {
      setLoadingRegister(false);
    }
  }, [apiUrl, registerDate]);

  // Fetch Khata Advances
  const fetchKhata = useCallback(async () => {
    try {
      setLoadingKhata(true);
      const res = await fetch(`${apiUrl}/management/hr/khata`);
      if (res.ok) {
        const data = await res.json();
        setAdvancesList(data.advances || []);
        setUnsettledTotal(data.totalUnsettledAmount || 0);
        setStaffKhataSummary(data.staffSummary || []);
      }
    } catch {
      showToast("Error loading advances register", "error");
    } finally {
      setLoadingKhata(false);
    }
  }, [apiUrl]);

  // Fetch Monthly Payroll
  const fetchPayroll = useCallback(async () => {
    try {
      setLoadingPayroll(true);
      const res = await fetch(`${apiUrl}/management/hr/payroll?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollData(data.payroll || []);
      }
    } catch {
      showToast("Error calculating payroll", "error");
    } finally {
      setLoadingPayroll(false);
    }
  }, [apiUrl, selectedMonth, selectedYear]);

  // Initial Load & Tab Switching
  useEffect(() => {
    fetchStaffConfigs();
  }, [fetchStaffConfigs]);

  useEffect(() => {
    if (activeTab === "today") fetchTodayDesk();
    if (activeTab === "register") fetchRegister();
    if (activeTab === "khata") {
      fetchKhata();
      fetchStaffConfigs();
    }
    if (activeTab === "payroll") fetchPayroll();
    if (activeTab === "team") fetchStaffConfigs();
  }, [activeTab, fetchTodayDesk, fetchRegister, fetchKhata, fetchPayroll, fetchStaffConfigs]);

  // -------------------------------------------------------------
  // TAB 1 ACTIONS (Today's Desk: Live Punches & Mid-Day Breaks)
  // -------------------------------------------------------------

  const handleLiveClockIn = async (staffId: string) => {
    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: todayDate,
          isManual: false,
        }),
      });
      if (res.ok) {
        showToast("Clocked in successfully!");
        fetchTodayDesk();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to clock in", "error");
      }
    } catch {
      showToast("Error executing punch", "error");
    }
  };

  const handleLiveBreakStart = async (staffId: string) => {
    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/break-start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: todayDate,
        }),
      });
      if (res.ok) {
        showToast("☕ Shift paused! Mid-day break started.");
        fetchTodayDesk();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to start break", "error");
      }
    } catch {
      showToast("Error starting break", "error");
    }
  };

  const handleLiveBreakEnd = async (staffId: string) => {
    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/break-end`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: todayDate,
        }),
      });
      if (res.ok) {
        showToast("Break ended! Resumed active duty.");
        fetchTodayDesk();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to end break", "error");
      }
    } catch {
      showToast("Error ending break", "error");
    }
  };

  const handleLiveClockOut = async (staffId: string, applyDefaultBreak = true) => {
    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/clock-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: todayDate,
          isManual: false,
          applyDefaultBreak,
        }),
      });
      if (res.ok) {
        showToast("Clocked out successfully!");
        fetchTodayDesk();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to clock out", "error");
      }
    } catch {
      showToast("Error executing punch", "error");
    }
  };

  const handleSaveManualPunch = async () => {
    const { staffId, action, workDate, defaultTime, notes, statusOverride, deductDefaultBreak, breakHours } = punchModal;
    if (!defaultTime) {
      showToast("Please enter a time value", "error");
      return;
    }

    // Construct full ISO timestamp string
    const isoString = `${workDate}T${defaultTime}:00`;

    try {
      if (action === "clock_in") {
        const res = await fetch(`${apiUrl}/management/hr/attendance/clock-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            workDate,
            clockInTime: isoString,
            isManual: true,
            notes,
          }),
        });
        if (res.ok) {
          showToast("Sheet Clock-In recorded!");
          setPunchModal((p) => ({ ...p, isOpen: false }));
          fetchTodayDesk();
        } else {
          const d = await res.json();
          showToast(d.error || "Error recording manual time", "error");
        }
      } else if (action === "break_start") {
        const res = await fetch(`${apiUrl}/management/hr/attendance/break-start`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            workDate,
            customTime: isoString,
            notes,
          }),
        });
        if (res.ok) {
          showToast("Break start time recorded!");
          setPunchModal((p) => ({ ...p, isOpen: false }));
          fetchTodayDesk();
        } else {
          const d = await res.json();
          showToast(d.error || "Error recording break start", "error");
        }
      } else if (action === "break_end") {
        const res = await fetch(`${apiUrl}/management/hr/attendance/break-end`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            workDate,
            customTime: isoString,
            notes,
          }),
        });
        if (res.ok) {
          showToast("Break ended & net break duration computed!");
          setPunchModal((p) => ({ ...p, isOpen: false }));
          fetchTodayDesk();
        } else {
          const d = await res.json();
          showToast(d.error || "Error recording break end", "error");
        }
      } else {
        const res = await fetch(`${apiUrl}/management/hr/attendance/clock-out`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId,
            workDate,
            clockOutTime: isoString,
            isManual: true,
            notes,
            statusOverride,
            breakHours: deductDefaultBreak !== false && breakHours !== undefined ? Number(breakHours) : (deductDefaultBreak === false ? 0 : undefined),
            applyDefaultBreak: deductDefaultBreak !== false,
          }),
        });
        if (res.ok) {
          showToast("Sheet Clock-Out recorded & net hours computed!");
          setPunchModal((p) => ({ ...p, isOpen: false }));
          fetchTodayDesk();
        } else {
          const d = await res.json();
          showToast(d.error || "Error recording manual clock out", "error");
        }
      }
    } catch {
      showToast("Network error saving manual punch", "error");
    }
  };

  // Quick mark status for today (Weekly off, Absent, Paid leave)
  const handleQuickStatusToday = async (staffId: string, status: "weekly_off" | "absent" | "paid_leave") => {
    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/manual-log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: todayDate,
          status,
          workedHours: 0,
          overtimeHours: 0,
          notes: `Marked ${status} from Today's Desk`,
        }),
      });
      if (res.ok) {
        showToast(`Marked as ${status.replace("_", " ")}`);
        fetchTodayDesk();
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS (Monthly Register)
  // -------------------------------------------------------------

  const handleSaveRegisterRow = async (staffId: string) => {
    const edit = editingRows[staffId];
    if (!edit) return;

    let fullIn: string | null = null;
    let fullOut: string | null = null;
    if (edit.clockIn) fullIn = `${registerDate}T${edit.clockIn}:00`;
    if (edit.clockOut) fullOut = `${registerDate}T${edit.clockOut}:00`;

    try {
      const res = await fetch(`${apiUrl}/management/hr/attendance/manual-log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          workDate: registerDate,
          status: edit.status,
          clockIn: fullIn,
          clockOut: fullOut,
          breakHours: Number(edit.breakHours) || 0,
          notes: edit.notes,
        }),
      });
      if (res.ok) {
        showToast("Register row updated successfully!");
        fetchRegister();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update register", "error");
      }
    } catch {
      showToast("Error updating register row", "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 3 ACTIONS (Khata Advances)
  // -------------------------------------------------------------

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvanceForm.staffId) {
      showToast("Please select an employee", "error");
      return;
    }
    const amt = parseFloat(newAdvanceForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid advance amount greater than 0", "error");
      return;
    }

    try {
      setSubmittingAdvance(true);
      const res = await fetch(`${apiUrl}/management/hr/khata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: newAdvanceForm.staffId,
          amount: amt,
          advanceDate: newAdvanceForm.advanceDate,
          paymentMethod: newAdvanceForm.paymentMethod,
          notes: newAdvanceForm.notes,
        }),
      });
      if (res.ok) {
        showToast("Advance logged successfully in Khata!");
        setNewAdvanceForm({
          staffId: "",
          amount: "",
          advanceDate: new Date().toISOString().split("T")[0],
          paymentMethod: "cash",
          notes: "",
        });
        fetchKhata();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to log advance", "error");
      }
    } catch {
      showToast("Error submitting advance", "error");
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const handleDeleteAdvance = async (id: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete this unsettled advance of ₹${amount}?`)) return;

    try {
      const res = await fetch(`${apiUrl}/management/hr/khata/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Advance record removed");
        fetchKhata();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to delete advance", "error");
      }
    } catch {
      showToast("Error deleting advance", "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 4 ACTIONS (Payroll & Wage Config)
  // -------------------------------------------------------------

  const handleSaveStaffConfig = async (staffId: string) => {
    const edits = editingStaffConfig[staffId];
    if (!edits) return;

    try {
      setSavingConfigId(staffId);
      const res = await fetch(`${apiUrl}/management/hr/staff-config/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (res.ok) {
        showToast("Staff wage configuration updated!");
        fetchStaffConfigs();
        fetchPayroll();
        setEditingStaffConfig((prev) => {
          const next = { ...prev };
          delete next[staffId];
          return next;
        });
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update configuration", "error");
      }
    } catch {
      showToast("Error saving wage config", "error");
    } finally {
      setSavingConfigId(null);
    }
  };

  const handleSettlePayroll = async () => {
    if (!settleModal.row) return;
    try {
      setSettleModal((s) => ({ ...s, isSubmitting: true }));
      const res = await fetch(`${apiUrl}/management/hr/payroll/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: settleModal.row.staff.id,
          payrollMonth: selectedMonth,
          payrollYear: selectedYear,
          paymentMethod: settleModal.paymentMethod,
          bonusAmount: settleModal.bonusAmount,
          otherDeductions: settleModal.otherDeductions,
          notes: settleModal.notes,
        }),
      });
      if (res.ok) {
        showToast(`Settled salary for ${settleModal.row.staff.name} as PAID!`);
        setSettleModal({
          isOpen: false,
          row: null,
          bonusAmount: 0,
          otherDeductions: 0,
          paymentMethod: "cash",
          notes: "",
          isSubmitting: false,
        });
        fetchPayroll();
        fetchKhata();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to settle payroll", "error");
      }
    } catch {
      showToast("Error submitting payroll settlement", "error");
    } finally {
      setSettleModal((s) => ({ ...s, isSubmitting: false }));
    }
  };

  // CSV Export
  const exportPayrollCSV = () => {
    if (payrollData.length === 0) {
      showToast("No payroll data to export", "info");
      return;
    }

    const headers = [
      "Employee ID",
      "Staff Name",
      "Role",
      "Wage Type",
      "Base Rate",
      "Days Present",
      "Half Days",
      "Weekly Offs Taken",
      "Deductible Absences",
      "Total Logged Hours",
      "Overtime Hours",
      "Gross Wage",
      "Overtime Pay",
      "Khata Deducted",
      "Bonus Amount",
      "Other Deductions",
      "Net Payable",
      "Settlement Status",
      "Payment Method",
      "Paid At",
    ];

    const rows = payrollData.map((p) => [
      `"${p.staff.employee_id}"`,
      `"${p.staff.name}"`,
      `"${p.staff.role}"`,
      `"${p.wageType}"`,
      p.baseRate,
      p.daysPresent,
      p.halfDays,
      p.weeklyOffsTaken,
      p.deductibleAbsences,
      p.totalHours,
      p.overtimeHours,
      p.grossWage,
      p.overtimePay,
      p.khataDeducted,
      p.bonusAmount,
      p.otherDeductions,
      p.netPayable,
      `"${p.settlementStatus}"`,
      `"${p.paymentMethod || ""}"`,
      `"${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_M${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Payroll ledger exported to CSV!");
  };

  // Handle Add Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name.trim()) {
      showToast("Please enter staff member's name", "error");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/management/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaffForm),
      });
      if (res.ok) {
        showToast("New staff profile created!");
        setShowAddStaffModal(false);
        setNewStaffForm({
          name: "",
          role: "waiter",
          phone: "",
          wage_type: "monthly",
          base_rate: 18000,
          standard_shift_hours: 9,
          default_break_hours: 2,
          half_day_cutoff_hours: 5,
          overtime_hourly_rate: 100,
          paid_weekly_offs_per_month: 4,
          pin: "",
        });
        fetchStaffConfigs();
        if (activeTab === "today") fetchTodayDesk();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to create staff member", "error");
      }
    } catch {
      showToast("Error creating staff profile", "error");
    }
  };

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    if (khataStaffFilter === "all") return advancesList;
    return advancesList.filter((a) => a.staff_id === khataStaffFilter);
  }, [advancesList, khataStaffFilter]);

  // Total summary for Payroll
  const payrollTotals = useMemo(() => {
    return payrollData.reduce(
      (acc, r) => {
        acc.gross += r.grossWage;
        acc.overtime += r.overtimePay;
        acc.khata += r.khataDeducted;
        acc.net += r.netPayable;
        if (r.settlementStatus === "paid") acc.paidCount += 1;
        return acc;
      },
      { gross: 0, overtime: 0, khata: 0, net: 0, paidCount: 0 }
    );
  }, [payrollData]);

  // -------------------------------------------------------------
  // TAB 5 ACTIONS & FILTERING (Team & Credentials)
  // -------------------------------------------------------------

  const filteredTeamMembers = useMemo(() => {
    return staffConfigs.filter((s) => {
      const search = teamSearch.toLowerCase().trim();
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.employee_id.toLowerCase().includes(search) ||
        s.role.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search));

      const matchesRole = teamRoleFilter === "all" || s.role === teamRoleFilter;
      const matchesStatus =
        teamStatusFilter === "all" ||
        (teamStatusFilter === "active" && s.is_active !== false) ||
        (teamStatusFilter === "inactive" && s.is_active === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffConfigs, teamSearch, teamRoleFilter, teamStatusFilter]);

  const togglePinVisibility = (staffId: string) => {
    setRevealedPins((prev) => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  const handleToggleStaffActive = async (staff: StaffConfig) => {
    const newActive = !staff.is_active;
    try {
      const res = await fetch(`${apiUrl}/management/hr/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (res.ok) {
        showToast(`Staff member marked as ${newActive ? "Active" : "Inactive"}`);
        fetchStaffConfigs();
        if (activeTab === "today") fetchTodayDesk();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update staff status", "error");
      }
    } catch {
      showToast("Error updating staff status", "error");
    }
  };

  const handleOpenEditStaff = (staff: StaffConfig) => {
    setEditStaffModal({
      isOpen: true,
      staffId: staff.id,
      name: staff.name,
      employee_id: staff.employee_id,
      role: staff.role,
      pin: staff.pin || "0000",
      phone: staff.phone || "",
      is_active: staff.is_active !== false,
      isSubmitting: false,
    });
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaffModal.name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    if (!editStaffModal.employee_id.trim()) {
      showToast("Employee ID is required", "error");
      return;
    }
    if (editStaffModal.pin && !/^\d{4}$/.test(editStaffModal.pin.trim())) {
      showToast("PIN must be exactly 4 digits", "error");
      return;
    }

    try {
      setEditStaffModal((prev) => ({ ...prev, isSubmitting: true }));
      const res = await fetch(`${apiUrl}/management/hr/staff/${editStaffModal.staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStaffModal.name.trim(),
          employee_id: editStaffModal.employee_id.trim().toUpperCase(),
          role: editStaffModal.role,
          pin: editStaffModal.pin.trim(),
          phone: editStaffModal.phone.trim(),
          is_active: editStaffModal.is_active,
        }),
      });

      if (res.ok) {
        showToast("Employee profile and credentials updated!");
        setEditStaffModal((prev) => ({ ...prev, isOpen: false }));
        fetchStaffConfigs();
        if (activeTab === "today") fetchTodayDesk();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update employee", "error");
      }
    } catch {
      showToast("Error saving employee details", "error");
    } finally {
      setEditStaffModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* Toast Alert */}
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

      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider">
              Management Portal
            </span>
            <span className="text-xs font-bold text-stone-400">
              Staff Roster & Scheduling Hub
            </span>
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight mt-1">
            Attendance, Khata & Monthly Payroll Desk
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Live punch clock, paper-sheet manual logging, mid-month advances (Khata), mixed wage models & automated settlement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddStaffModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: "today", label: "Today's Desk", icon: Clock },
          { id: "register", label: "Monthly Register", icon: Calendar },
          { id: "khata", label: `Khata Advances (₹${unsettledTotal.toLocaleString()})`, icon: CreditCard },
          { id: "payroll", label: "Monthly Settlement & Wage Config", icon: FileSpreadsheet },
          { id: "team", label: "Team & Credentials", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. TODAY'S DESK (LIVE + PAPER SHEET ENTRY) */}
      {/* ========================================================================= */}
      {activeTab === "today" && (
        <div className="space-y-5">
          
          {/* Unclosed Shifts Banner */}
          {unclosedShifts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-900">
                    Unclosed Shifts from Yesterday ({unclosedShifts.length} Staff)
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                    Employees forgot to clock out on previous dates. Fill from physical paper sheet to close shifts cleanly.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {unclosedShifts.map((sh) => (
                  <button
                    key={sh.id}
                    onClick={() =>
                      setPunchModal({
                        isOpen: true,
                        staffId: sh.staff_id,
                        staffName: sh.staff?.name || "Staff",
                        action: "clock_out",
                        workDate: sh.work_date,
                        defaultTime: "22:00",
                        notes: `Backfilled unclosed shift of ${sh.work_date}`,
                      })
                    }
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Fill {sh.staff?.name} ({sh.work_date})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Today's Desk Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <span>Daily Punch & Paper Sheet Desk</span>
                  <span className="text-xs text-stone-400 font-mono">({todayDate})</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  1-Click live punch or manual sheet entries. Half-day status and overtime are computed automatically.
                </p>
              </div>
              <button
                onClick={fetchTodayDesk}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={14} className={loadingToday ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-4">Wage Type & Cutoff</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Clock In</th>
                    <th className="py-3.5 px-4">Mid-Day Break</th>
                    <th className="py-3.5 px-4">Clock Out</th>
                    <th className="py-3.5 px-4">Net Logged / OT</th>
                    <th className="py-3.5 px-5 text-right">Desk Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {todayAttendance.map((row) => {
                    const isClockedIn = Boolean(row.clockIn && !row.clockOut);
                    const isClockedOut = Boolean(row.clockIn && row.clockOut);
                    const isOnBreak = Boolean(row.isOnBreak);

                    return (
                      <tr key={row.staff.id} className="hover:bg-stone-50/60 transition">
                        
                        {/* Staff */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {row.staff.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-stone-900">{row.staff.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] font-bold text-stone-500">
                                  {row.staff.employee_id}
                                </span>
                                <span>•</span>
                                <span className="capitalize text-[10px] font-bold text-stone-600">
                                  {row.staff.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Wage Type */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700">
                              {row.staff.wage_type}
                            </span>
                            <p className="text-[10px] text-stone-400 font-bold">
                              Shift: {row.staff.standard_shift_hours}h • Cutoff: {row.staff.half_day_cutoff_hours}h
                            </p>
                            <p className="text-[10px] text-stone-500 font-medium">
                              Std Break: {row.staff.default_break_hours ?? 2}h
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {isOnBreak ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 w-max shadow-2xs">
                              <Coffee size={12} className="text-amber-700 animate-pulse" />
                              <span>On Break {row.breakStart ? `(${formatTime12h(row.breakStart)})` : ""}</span>
                            </span>
                          ) : isClockedIn ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 w-max">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span>Working</span>
                            </span>
                          ) : row.status === "half_day" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 w-max">
                              Half Day
                            </span>
                          ) : row.status === "weekly_off" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 w-max">
                              Weekly Off
                            </span>
                          ) : row.status === "absent" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 w-max">
                              Absent
                            </span>
                          ) : isClockedOut ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 w-max flex items-center gap-1">
                              <Check size={11} className="text-emerald-600" />
                              <span>Present</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-50 text-stone-400 border border-stone-200 w-max">
                              Not Logged
                            </span>
                          )}
                        </td>

                        {/* Clock In */}
                        <td className="py-4 px-4 font-mono font-bold text-stone-900">
                          {row.clockIn ? (
                            <div className="flex items-center gap-1.5">
                              <span>{formatTime12h(row.clockIn)}</span>
                              {row.isManualIn && (
                                <span className="text-[9px] font-sans font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                                  Sheet
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Mid-Day Break Window */}
                        <td className="py-4 px-4">
                          {isOnBreak ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-700 font-bold font-mono text-xs flex items-center gap-1">
                                <Coffee size={12} />
                                <span>From {formatTime12h(row.breakStart)}</span>
                              </span>
                              <p className="text-[10px] text-amber-600 font-bold">Duty Paused</p>
                            </div>
                          ) : row.breakStart && row.breakEnd ? (
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-stone-800 text-[11px]">
                                {formatTime12h(row.breakStart)} - {formatTime12h(row.breakEnd)}
                              </span>
                              <p className="text-[10px] text-stone-500 font-semibold">
                                ({row.breakHours}h deducted)
                              </p>
                            </div>
                          ) : row.breakHours > 0 ? (
                            <span className="font-bold text-stone-700 text-xs">
                              {row.breakHours}h break deducted
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Clock Out */}
                        <td className="py-4 px-4 font-mono font-bold text-stone-900">
                          {row.clockOut ? (
                            <div className="flex items-center gap-1.5">
                              <span>{formatTime12h(row.clockOut)}</span>
                              {row.isManualOut && (
                                <span className="text-[9px] font-sans font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                                  Sheet
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        {/* Worked Hours / OT */}
                        <td className="py-4 px-4">
                          <div>
                            <span className="font-black text-stone-900 text-sm">
                              {row.workedHours} hrs net
                            </span>
                            {row.breakHours > 0 && (
                              <span className="block text-[10px] text-stone-400 font-bold">
                                ({row.breakHours}h break excluded)
                              </span>
                            )}
                            {row.overtimeHours > 0 && (
                              <p className="text-[10px] font-bold text-emerald-600">
                                +{row.overtimeHours} hrs OT
                              </p>
                            )}
                            {row.status === "half_day" && (
                              <p className="text-[10px] font-bold text-amber-600">
                                Below {row.staff.half_day_cutoff_hours}h cutoff
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            
                            {/* 1. When not clocked in */}
                            {!row.clockIn && (
                              <>
                                <button
                                  onClick={() => handleLiveClockIn(row.staff.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <LogIn size={13} />
                                  <span>Clock In</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setPunchModal({
                                      isOpen: true,
                                      staffId: row.staff.id,
                                      staffName: row.staff.name,
                                      action: "clock_in",
                                      workDate: todayDate,
                                      defaultTime: "09:00",
                                      notes: "",
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="Manual Paper Sheet Entry"
                                >
                                  Manual In
                                </button>
                                <button
                                  onClick={() => handleQuickStatusToday(row.staff.id, "weekly_off")}
                                  className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black transition cursor-pointer"
                                  title="Mark Weekly Off"
                                >
                                  Off
                                </button>
                              </>
                            )}

                            {/* 2. When Clocked In and ON BREAK */}
                            {isOnBreak && (
                              <>
                                <button
                                  onClick={() => handleLiveBreakEnd(row.staff.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="End break and resume active duty"
                                >
                                  <Play size={13} />
                                  <span>Resume Work</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setPunchModal({
                                      isOpen: true,
                                      staffId: row.staff.id,
                                      staffName: row.staff.name,
                                      action: "break_end",
                                      workDate: todayDate,
                                      defaultTime: "17:00",
                                      notes: "",
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="Manual Break End (Paper Sheet)"
                                >
                                  Manual Resume
                                </button>
                                <button
                                  onClick={() => handleLiveClockOut(row.staff.id)}
                                  className="px-2.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Clock out directly from break"
                                >
                                  <LogOut size={13} />
                                  <span>Clock Out</span>
                                </button>
                              </>
                            )}

                            {/* 3. When Clocked In and WORKING (Not on break) */}
                            {isClockedIn && !isOnBreak && (
                              <>
                                <button
                                  onClick={() => handleLiveBreakStart(row.staff.id)}
                                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Start mid-day rest break (pause shift)"
                                >
                                  <Coffee size={13} />
                                  <span>Start Break</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setPunchModal({
                                      isOpen: true,
                                      staffId: row.staff.id,
                                      staffName: row.staff.name,
                                      action: "break_start",
                                      workDate: todayDate,
                                      defaultTime: "15:00",
                                      notes: "",
                                    })
                                  }
                                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[10px] font-bold transition cursor-pointer"
                                  title="Manual Break Start (Paper Sheet)"
                                >
                                  Sheet Break
                                </button>
                                <button
                                  onClick={() => handleLiveClockOut(row.staff.id)}
                                  className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1"
                                  title="Clock out for today"
                                >
                                  <LogOut size={13} />
                                  <span>Clock Out</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setPunchModal({
                                      isOpen: true,
                                      staffId: row.staff.id,
                                      staffName: row.staff.name,
                                      action: "clock_out",
                                      workDate: todayDate,
                                      defaultTime: "22:00",
                                      breakHours: row.staff.default_break_hours ?? 2,
                                      deductDefaultBreak: true,
                                      notes: "",
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="Manual Paper Sheet Out"
                                >
                                  Manual Out
                                </button>
                              </>
                            )}

                            {/* 4. When Shift Completed (Clocked Out) */}
                            {isClockedOut && (
                              <button
                                onClick={() =>
                                  setPunchModal({
                                    isOpen: true,
                                    staffId: row.staff.id,
                                    staffName: row.staff.name,
                                    action: "clock_out",
                                    workDate: todayDate,
                                    defaultTime: toLocalTimeInputValue(row.clockOut) || "22:00",
                                    breakHours: row.breakHours ?? (row.staff.default_break_hours ?? 2),
                                    deductDefaultBreak: (row.breakHours ?? 0) > 0,
                                    notes: row.notes,
                                  })
                                }
                                className="px-2.5 py-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                Edit Time
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTHLY REGISTER (PAST DATES BACKFILL & EDITABLE GRID) */}
      {/* ========================================================================= */}
      {activeTab === "register" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(registerDate);
                  d.setDate(d.getDate() - 1);
                  setRegisterDate(d.toISOString().split("T")[0]);
                }}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-orange-600" />
                <input
                  type="date"
                  value={registerDate}
                  onChange={(e) => setRegisterDate(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-900"
                />
              </div>

              <button
                onClick={() => {
                  const d = new Date(registerDate);
                  d.setDate(d.getDate() + 1);
                  setRegisterDate(d.toISOString().split("T")[0]);
                }}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Editable Register Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Clock In (HH:MM)</th>
                    <th className="py-3.5 px-4">Clock Out (HH:MM)</th>
                    <th className="py-3.5 px-4">Break (hrs)</th>
                    <th className="py-3.5 px-4">Net Logged</th>
                    <th className="py-3.5 px-4">Notes / Sheet Tag</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {registerAttendance
                    .filter((r) => r.staff.name.toLowerCase().includes(registerSearch.toLowerCase()))
                    .map((row) => {
                      const edit = editingRows[row.staff.id] || {
                        status: row.status,
                        clockIn: toLocalTimeInputValue(row.clockIn),
                        clockOut: toLocalTimeInputValue(row.clockOut),
                        workedHours: row.workedHours,
                        notes: row.notes || "",
                      };

                      return (
                        <tr key={row.staff.id} className="hover:bg-stone-50/50 transition">
                          
                          {/* Staff */}
                          <td className="py-3 px-5 font-bold text-stone-900">
                            <div>
                              <span>{row.staff.name}</span>
                              <span className="block font-mono text-[10px] text-stone-400">
                                {row.staff.employee_id} • {row.staff.wage_type}
                              </span>
                            </div>
                          </td>

                          {/* Status Dropdown */}
                          <td className="py-3 px-4">
                            <select
                              value={edit.status}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.staff.id]: { ...edit, status: e.target.value as any },
                                }))
                              }
                              className="px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-800"
                            >
                              <option value="present">Present</option>
                              <option value="half_day">Half Day</option>
                              <option value="weekly_off">Weekly Off</option>
                              <option value="paid_leave">Paid Leave</option>
                              <option value="absent">Absent</option>
                            </select>
                          </td>

                          {/* Clock In */}
                          <td className="py-3 px-4">
                            <input
                              type="time"
                              value={edit.clockIn}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.staff.id]: { ...edit, clockIn: e.target.value },
                                }))
                              }
                              className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold"
                            />
                          </td>

                          {/* Clock Out */}
                          <td className="py-3 px-4">
                            <input
                              type="time"
                              value={edit.clockOut}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.staff.id]: { ...edit, clockOut: e.target.value },
                                }))
                              }
                              className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold"
                            />
                          </td>

                          {/* Break Duration (Hours) */}
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={edit.breakHours ?? 0}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.staff.id]: { ...edit, breakHours: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold"
                            />
                          </td>

                          {/* Hours */}
                          <td className="py-3 px-4 font-mono font-bold text-stone-800">
                            {row.workedHours}h {row.overtimeHours > 0 ? `(+${row.overtimeHours}h OT)` : ""}
                            {row.breakHours > 0 && (
                              <span className="block text-[10px] text-stone-400 font-sans font-medium">
                                ({row.breakHours}h break)
                              </span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={edit.notes}
                              onChange={(e) =>
                                setEditingRows((prev) => ({
                                  ...prev,
                                  [row.staff.id]: { ...edit, notes: e.target.value },
                                }))
                              }
                              className="px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs w-full max-w-xs"
                            />
                          </td>

                          {/* Action */}
                          <td className="py-3 px-5 text-right">
                            <button
                              onClick={() => handleSaveRegisterRow(row.staff.id)}
                              className="p-1.5 rounded-lg bg-stone-900 hover:bg-black text-white transition cursor-pointer"
                              title="Save register row"
                            >
                              <Save size={13} />
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. KHATA (ADVANCES) TAB */}
      {/* ========================================================================= */}
      {activeTab === "khata" && (
        <div className="space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                Total Unsettled Khata
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">
                ₹{unsettledTotal.toLocaleString()}
              </p>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                Automatically deducted on month-end settlement
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                Active Borrowers
              </span>
              <p className="text-2xl font-black text-stone-900 mt-1">
                {staffKhataSummary.length} Employees
              </p>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                Have mid-month advances pending deduction
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                Total Advances Logged
              </span>
              <p className="text-2xl font-black text-stone-900 mt-1">
                {advancesList.length} Transactions
              </p>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                Across current and past pay cycles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Log Advance Form Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs h-fit">
              <h3 className="text-sm font-black text-stone-900 mb-1">
                Record Mid-Month Cash/UPI Advance
              </h3>
              <p className="text-xs text-stone-500 font-medium mb-4">
                Staff advances are stored in Khata and will be subtracted from Net Payable upon salary payout.
              </p>

              <form onSubmit={handleCreateAdvance} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Select Staff Member *
                  </label>
                  <select
                    value={newAdvanceForm.staffId}
                    onChange={(e) => setNewAdvanceForm((f) => ({ ...f, staffId: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffConfigs
                      .filter((s) => s.is_active !== false)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.employee_id} • {s.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Advance Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2000"
                    value={newAdvanceForm.amount}
                    onChange={(e) => setNewAdvanceForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                      Payment Method
                    </label>
                    <select
                      value={newAdvanceForm.paymentMethod}
                      onChange={(e) => setNewAdvanceForm((f) => ({ ...f, paymentMethod: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                      Advance Date
                    </label>
                    <input
                      type="date"
                      value={newAdvanceForm.advanceDate}
                      onChange={(e) => setNewAdvanceForm((f) => ({ ...f, advanceDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Family emergency, groceries"
                    value={newAdvanceForm.notes}
                    onChange={(e) => setNewAdvanceForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
                >
                  {submittingAdvance ? "Logging..." : "Record Advance in Khata"}
                </button>
              </form>
            </div>

            {/* Advances Ledger List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black text-stone-900">
                  Unsettled Khata Ledger
                </h3>
                <select
                  value={khataStaffFilter}
                  onChange={(e) => setKhataStaffFilter(e.target.value)}
                  className="px-3 py-1 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                >
                  <option value="all">All Employees</option>
                  {staffConfigs
                    .filter((s) => s.is_active !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employee_id})
                      </option>
                    ))}
                </select>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-stone-50/50 transition">
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {adv.staff?.name || "Staff"}
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-mono">
                          {adv.advance_date}
                        </td>
                        <td className="py-3 px-4 font-black text-rose-600">
                          ₹{adv.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-black text-stone-600">
                          {adv.payment_method}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px] max-w-xs truncate">
                          {adv.notes || "—"}
                        </td>
                        <td className="py-3 px-4">
                          {adv.is_settled ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-stone-100 text-stone-600">
                              Settled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Unsettled
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!adv.is_settled && (
                            <button
                              onClick={() => handleDeleteAdvance(adv.id, adv.amount)}
                              className="p-1 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete unsettled advance"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredAdvances.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-400 font-medium">
                          No advances found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MONTHLY SETTLEMENT & WAGE CONFIG TAB */}
      {/* ========================================================================= */}
      {activeTab === "payroll" && (
        <div className="space-y-5">
          
          {/* Top Month-Year & Sub-tabs Picker */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setPayrollSubTab("settlement")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    payrollSubTab === "settlement" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                  }`}
                >
                  Monthly Settlement
                </button>
                <button
                  onClick={() => setPayrollSubTab("config")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    payrollSubTab === "config" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                  }`}
                >
                  Wage & Cutoff Settings
                </button>
              </div>
            </div>

            {payrollSubTab === "settlement" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black"
                  >
                    {[
                      { m: 1, name: "January" },
                      { m: 2, name: "February" },
                      { m: 3, name: "March" },
                      { m: 4, name: "April" },
                      { m: 5, name: "May" },
                      { m: 6, name: "June" },
                      { m: 7, name: "July" },
                      { m: 8, name: "August" },
                      { m: 9, name: "September" },
                      { m: 10, name: "October" },
                      { m: 11, name: "November" },
                      { m: 12, name: "December" },
                    ].map((mo) => (
                      <option key={mo.m} value={mo.m}>
                        {mo.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <button
                  onClick={exportPayrollCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black transition cursor-pointer"
                  title="Export to CSV"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            )}

          </div>

          {/* SUB-TAB 4A: WAGE & CUTOFF SETTINGS */}
          {payrollSubTab === "config" && (
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-100">
                <h3 className="text-sm font-black text-stone-900">
                  Staff Wage Models & Cutoff Parameters
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Configure monthly salary, daily wage, or hourly rate. Edit standard shift length, half-day cutoff hours, and protected weekly offs.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-3">Wage Model</th>
                      <th className="py-3 px-3">Base Rate (₹)</th>
                      <th className="py-3 px-3">Standard Shift</th>
                      <th className="py-3 px-3">Default Break</th>
                      <th className="py-3 px-3">Half-Day Cutoff</th>
                      <th className="py-3 px-3">OT Rate (₹/h)</th>
                      <th className="py-3 px-3">Paid Offs/Mo</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {staffConfigs.map((staff) => {
                      const edit = editingStaffConfig[staff.id] || staff;
                      const hasChanges = Boolean(editingStaffConfig[staff.id]);

                      return (
                        <tr key={staff.id} className="hover:bg-stone-50/50 transition">
                          
                          <td className="py-3 px-4 font-bold text-stone-900">
                            <div>
                              <span>{staff.name}</span>
                              <span className="block font-mono text-[10px] text-stone-400 uppercase">
                                {staff.employee_id} • {staff.role}
                              </span>
                            </div>
                          </td>

                          {/* Wage Type */}
                          <td className="py-3 px-3">
                            <select
                              value={edit.wage_type}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, wage_type: e.target.value as any },
                                }))
                              }
                              className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold capitalize"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="daily">Daily</option>
                              <option value="hourly">Hourly</option>
                            </select>
                          </td>

                          {/* Base Rate */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={edit.base_rate}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, base_rate: Number(e.target.value) },
                                }))
                              }
                              className="w-24 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Standard Shift */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={edit.standard_shift_hours}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, standard_shift_hours: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Default Break (Hours) */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={edit.default_break_hours ?? staff.default_break_hours ?? 2}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, default_break_hours: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Half-Day Cutoff */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={edit.half_day_cutoff_hours}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, half_day_cutoff_hours: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Overtime Rate */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={edit.overtime_hourly_rate}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, overtime_hourly_rate: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Paid Weekly Offs */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              value={edit.paid_weekly_offs_per_month}
                              onChange={(e) =>
                                setEditingStaffConfig((prev) => ({
                                  ...prev,
                                  [staff.id]: { ...edit, paid_weekly_offs_per_month: Number(e.target.value) },
                                }))
                              }
                              className="w-14 px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900"
                            />
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            {hasChanges && (
                              <button
                                onClick={() => handleSaveStaffConfig(staff.id)}
                                disabled={savingConfigId === staff.id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-2xs transition cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Save size={12} />
                                <span>Save</span>
                              </button>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 4B: MONTHLY SETTLEMENT TABLE */}
          {payrollSubTab === "settlement" && (
            <div className="space-y-4">
              
              {/* Payroll KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-stone-400">Total Gross Wages</span>
                  <p className="text-xl font-black text-stone-900 mt-0.5">₹{payrollTotals.gross.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-stone-400">Total Overtime Pay</span>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">₹{payrollTotals.overtime.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-stone-400">Khata Deductions</span>
                  <p className="text-xl font-black text-rose-600 mt-0.5">-₹{payrollTotals.khata.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-stone-400">Net Payable Amount</span>
                  <p className="text-xl font-black text-stone-900 mt-0.5">₹{payrollTotals.net.toLocaleString()}</p>
                </div>
              </div>

              {/* Settlement Table */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5">Staff Member</th>
                        <th className="py-3.5 px-4">Wage Model</th>
                        <th className="py-3.5 px-4">Attendance Breakdown</th>
                        <th className="py-3.5 px-4">Hours / OT</th>
                        <th className="py-3.5 px-4">Gross Wage</th>
                        <th className="py-3.5 px-4">Khata Deducted</th>
                        <th className="py-3.5 px-4">Net Payable</th>
                        <th className="py-3.5 px-5 text-right">Status & Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payrollData.map((row) => {
                        const isPaid = row.settlementStatus === "paid";

                        return (
                          <tr key={row.staff.id} className="hover:bg-stone-50/50 transition">
                            
                            {/* Staff */}
                            <td className="py-4 px-5">
                              <div>
                                <span className="font-black text-stone-900">{row.staff.name}</span>
                                <span className="block font-mono text-[10px] text-stone-400">
                                  {row.staff.employee_id} • {row.staff.role}
                                </span>
                              </div>
                            </td>

                            {/* Wage Model */}
                            <td className="py-4 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-stone-100 text-stone-700">
                                {row.wageType}: ₹{row.baseRate}
                              </span>
                            </td>

                            {/* Attendance Breakdown */}
                            <td className="py-4 px-4">
                              <div className="text-[11px] font-bold space-y-0.5">
                                <p className="text-stone-800">
                                  {row.daysPresent} Present • {row.halfDays} Half
                                </p>
                                <p className="text-stone-400 text-[10px]">
                                  {row.weeklyOffsTaken} Offs • {row.deductibleAbsences} Deductible Abs
                                </p>
                              </div>
                            </td>

                            {/* Hours / OT */}
                            <td className="py-4 px-4 font-mono font-bold text-stone-800">
                              <div>
                                <span>{row.totalHours}h</span>
                                {row.overtimeHours > 0 && (
                                  <p className="text-emerald-600 font-sans text-[10px]">
                                    +{row.overtimeHours}h OT (₹{row.overtimePay})
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Gross Wage */}
                            <td className="py-4 px-4 font-black text-stone-900">
                              ₹{row.grossWage.toLocaleString()}
                            </td>

                            {/* Khata Deducted */}
                            <td className="py-4 px-4 font-bold text-rose-600">
                              {row.khataDeducted > 0 ? `-₹${row.khataDeducted.toLocaleString()}` : "₹0"}
                            </td>

                            {/* Net Payable */}
                            <td className="py-4 px-4 font-black text-emerald-600 text-sm">
                              ₹{row.netPayable.toLocaleString()}
                            </td>

                            {/* Status & Action */}
                            <td className="py-4 px-5 text-right">
                              {isPaid ? (
                                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <Check size={12} />
                                  <span>Paid ({row.paymentMethod})</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    setSettleModal({
                                      isOpen: true,
                                      row,
                                      bonusAmount: row.bonusAmount || 0,
                                      otherDeductions: row.otherDeductions || 0,
                                      paymentMethod: "cash",
                                      notes: "",
                                      isSubmitting: false,
                                    })
                                  }
                                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
                                >
                                  Settle & Pay
                                </button>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TEAM & CREDENTIALS TAB (PERSONNEL DIRECTORY & SYSTEM ACCESS) */}
      {/* ========================================================================= */}
      {activeTab === "team" && (
        <div className="space-y-4">
          
          {/* Top Controls: Search, Filters, Stats & Add */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search name, ID (e.g. WTR001)..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:bg-white"
                />
              </div>

              {/* Role Filter */}
              <select
                value={teamRoleFilter}
                onChange={(e) => setTeamRoleFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
              >
                <option value="all">All Roles</option>
                <option value="waiter">Waiters</option>
                <option value="kitchen">Kitchen Chefs</option>
                <option value="billing">Billing Cashiers</option>
                <option value="manager">Floor Managers</option>
              </select>

              {/* Status Filter */}
              <select
                value={teamStatusFilter}
                onChange={(e) => setTeamStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Quick Stats Badges & Add Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-black">
                Total: {staffConfigs.length}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                Active: {staffConfigs.filter((s) => s.is_active !== false).length}
              </span>
              {staffConfigs.filter((s) => s.is_active === false).length > 0 && (
                <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                  Inactive: {staffConfigs.filter((s) => s.is_active === false).length}
                </span>
              )}
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Team Member</span>
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Users size={16} className="text-orange-600" />
                  <span>Team Directory & Portal Access Credentials</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Manage login PINs, staff roles, and activate/deactivate personnel across Antigravity terminals.
                </p>
              </div>
              <button
                onClick={fetchStaffConfigs}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                title="Refresh staff list"
              >
                <RefreshCw size={14} className={loadingStaff ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-100 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Staff Member</th>
                    <th className="py-3.5 px-4">Employee ID</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Wage Model</th>
                    <th className="py-3.5 px-4">Login PIN</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTeamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 font-medium">
                        No team members matching your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamMembers.map((staff) => {
                      const isPinVisible = Boolean(revealedPins[staff.id]);
                      const isActive = staff.is_active !== false;

                      return (
                        <tr
                          key={staff.id}
                          className={`hover:bg-stone-50/60 transition ${
                            !isActive ? "opacity-60 bg-stone-50/30" : ""
                          }`}
                        >
                          {/* Name & Phone */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                                  !isActive
                                    ? "bg-stone-400"
                                    : staff.role === "manager"
                                    ? "bg-blue-600"
                                    : staff.role === "kitchen"
                                    ? "bg-amber-600"
                                    : staff.role === "billing"
                                    ? "bg-purple-600"
                                    : "bg-stone-900"
                                }`}
                              >
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                                  <span>{staff.name}</span>
                                  {!isActive && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-stone-200 text-stone-600">
                                      Former
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-stone-400 font-medium">
                                  {staff.phone || "No phone linked"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono font-black text-stone-800">
                              {staff.employee_id}
                            </span>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                                staff.role === "manager"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : staff.role === "kitchen"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : staff.role === "billing"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {staff.role}
                            </span>
                          </td>

                          {/* Wage Model */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-stone-700 capitalize">
                                {staff.wage_type}
                              </span>
                              <p className="text-[10px] text-stone-400 font-bold">
                                ₹{staff.base_rate?.toLocaleString()} ({staff.standard_shift_hours || 9}h shift)
                              </p>
                            </div>
                          </td>

                          {/* Login PIN with Eye toggle */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border tracking-widest ${
                                  isPinVisible
                                    ? "bg-amber-50 text-amber-900 border-amber-200"
                                    : "bg-stone-50 text-stone-500 border-stone-200"
                                }`}
                              >
                                {isPinVisible ? (staff.pin || "0000") : "••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(staff.id)}
                                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                title={isPinVisible ? "Hide PIN" : "Show PIN"}
                              >
                                {isPinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </td>

                          {/* Account Status */}
                          <td className="py-3.5 px-4">
                            {isActive ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active (Can Login)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-200 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                <span>Disabled</span>
                              </span>
                            )}
                          </td>

                          {/* Actions: Edit & Toggle Active */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditStaff(staff)}
                                className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Edit Profile & Reset PIN"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleToggleStaffActive(staff)}
                                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer border ${
                                  isActive
                                    ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                                title={isActive ? "Disable employee login" : "Re-activate employee"}
                              >
                                {isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL PUNCH (Today's Desk: In, Out, Break Start, Break End) */}
      {/* ========================================================================= */}
      {punchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
              <h3 className="text-sm font-black text-stone-900">
                {punchModal.action === "clock_in"
                  ? "Manual Clock-In (Paper Sheet)"
                  : punchModal.action === "break_start"
                  ? "Manual Mid-Day Break Start (Paper Sheet)"
                  : punchModal.action === "break_end"
                  ? "Manual Break End / Resume (Paper Sheet)"
                  : "Manual Clock-Out (Paper Sheet)"}
              </h3>
              <button
                onClick={() => setPunchModal((p) => ({ ...p, isOpen: false }))}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <p className="text-xs font-bold text-stone-500">Employee</p>
                <p className="text-sm font-black text-stone-900">{punchModal.staffName}</p>
                <p className="text-[10px] text-stone-400 font-mono">Date: {punchModal.workDate}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  {punchModal.action === "clock_in"
                    ? "Clock-In Time (HH:MM) *"
                    : punchModal.action === "break_start"
                    ? "Break Start Time (HH:MM) *"
                    : punchModal.action === "break_end"
                    ? "Break End / Resume Time (HH:MM) *"
                    : "Clock-Out Time (HH:MM) *"}
                </label>
                <input
                  type="time"
                  value={punchModal.defaultTime}
                  onChange={(e) => setPunchModal((p) => ({ ...p, defaultTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold"
                  required
                />
              </div>

              {punchModal.action === "clock_out" && (
                <div className="space-y-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                      <Coffee size={14} className="text-amber-600" />
                      <span>Mid-Day Break Deduction</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                      <input
                        type="checkbox"
                        checked={punchModal.deductDefaultBreak !== false}
                        onChange={(e) =>
                          setPunchModal((p) => ({
                            ...p,
                            deductDefaultBreak: e.target.checked,
                            breakHours: e.target.checked ? (p.breakHours || 2) : 0,
                          }))
                        }
                        className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span>Deduct Break</span>
                    </label>
                  </div>

                  {punchModal.deductDefaultBreak !== false && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                        Break Duration (Hours)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={punchModal.breakHours ?? 2}
                        onChange={(e) => setPunchModal((p) => ({ ...p, breakHours: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold"
                      />
                      <p className="text-[10px] text-stone-500 font-medium mt-1">
                        Net worked hours = Gross span - Break hours. Prevents false overtime.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                      Status Override (Optional)
                    </label>
                    <select
                      value={punchModal.statusOverride || ""}
                      onChange={(e) => setPunchModal((p) => ({ ...p, statusOverride: e.target.value || undefined }))}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                    >
                      <option value="">Auto-compute from net cutoff hours</option>
                      <option value="present">Present (Full Day)</option>
                      <option value="half_day">Half Day</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backfilled from register sheet"
                  value={punchModal.notes}
                  onChange={(e) => setPunchModal((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPunchModal((p) => ({ ...p, isOpen: false }))}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualPunch}
                  className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                >
                  {punchModal.action === "clock_in"
                    ? "Confirm Sheet Clock-In"
                    : punchModal.action === "break_start"
                    ? "Confirm Break Start"
                    : punchModal.action === "break_end"
                    ? "Confirm Resume Work"
                    : "Confirm Sheet Clock-Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SETTLE PAYROLL WAGE */}
      {/* ========================================================================= */}
      {settleModal.isOpen && settleModal.row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900">
                Settle Monthly Wage: {settleModal.row.staff.name}
              </h3>
              <button
                onClick={() => setSettleModal((s) => ({ ...s, isOpen: false }))}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Financial Breakdown Summary */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-bold">Gross Wage ({settleModal.row.wageType}):</span>
                  <span className="font-black text-stone-900">₹{settleModal.row.grossWage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-bold">Overtime Pay ({settleModal.row.overtimeHours}h):</span>
                  <span className="font-black text-emerald-600">+₹{settleModal.row.overtimePay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-bold">Khata Advance Deductions:</span>
                  <span className="font-black text-rose-600">-₹{settleModal.row.khataDeducted.toLocaleString()}</span>
                </div>
              </div>

              {/* Adjustments: Bonus & Other Deductions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Bonus / Incentive (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settleModal.bonusAmount}
                    onChange={(e) => setSettleModal((s) => ({ ...s, bonusAmount: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Other Deductions (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settleModal.otherDeductions}
                    onChange={(e) => setSettleModal((s) => ({ ...s, otherDeductions: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-rose-700"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Payout Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "upi", label: "UPI" },
                    { id: "bank_transfer", label: "Bank Transfer" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSettleModal((s) => ({ ...s, paymentMethod: m.id as any }))}
                      className={`py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                        settleModal.paymentMethod === m.id
                          ? "bg-stone-900 text-white border-stone-900"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Settlement Notes / Transaction Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via PhonePe / cash envelope"
                  value={settleModal.notes}
                  onChange={(e) => setSettleModal((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>

              {/* Final Net Payable Calculation */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                    Final Net Payable
                  </span>
                  <p className="text-2xl font-black text-emerald-900 mt-0.5">
                    ₹{Math.max(
                      0,
                      Math.round(
                        settleModal.row.grossWage +
                          settleModal.row.overtimePay +
                          settleModal.bonusAmount -
                          settleModal.row.khataDeducted -
                          settleModal.otherDeductions
                      )
                    ).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={settleModal.isSubmitting}
                  onClick={handleSettlePayroll}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
                >
                  {settleModal.isSubmitting ? "Settling..." : "Confirm & Mark Paid"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW STAFF MEMBER */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900">
                Onboard New Team Member
              </h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newStaffForm.name}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">System Role *</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="billing">Billing Cashier</option>
                    <option value="manager">Floor Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Wage Model *</label>
                  <select
                    value={newStaffForm.wage_type}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, wage_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    <option value="monthly">Monthly Salary</option>
                    <option value="daily">Daily Wage</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Base Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStaffForm.base_rate}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, base_rate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Shift (Hrs)</label>
                  <input
                    type="number"
                    value={newStaffForm.standard_shift_hours}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, standard_shift_hours: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Break (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newStaffForm.default_break_hours}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, default_break_hours: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Cutoff (Hrs)</label>
                  <input
                    type="number"
                    value={newStaffForm.half_day_cutoff_hours}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, half_day_cutoff_hours: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">OT Rate (₹)</label>
                  <input
                    type="number"
                    value={newStaffForm.overtime_hourly_rate}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, overtime_hourly_rate: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="98765-43210"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    4-Digit PIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 1234"
                    value={newStaffForm.pin}
                    onChange={(e) => setNewStaffForm((f) => ({ ...f, pin: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STAFF PROFILE & CREDENTIALS */}
      {/* ========================================================================= */}
      {editStaffModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-stone-100">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <Key size={18} className="text-orange-600" />
                <span>Edit Profile & Credentials</span>
              </h3>
              <button
                onClick={() => setEditStaffModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStaffModal.name}
                    onChange={(e) => setEditStaffModal((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStaffModal.employee_id}
                    onChange={(e) => setEditStaffModal((prev) => ({ ...prev, employee_id: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    System Role *
                  </label>
                  <select
                    value={editStaffModal.role}
                    onChange={(e) => setEditStaffModal((prev) => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold capitalize"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="billing">Billing Cashier</option>
                    <option value="manager">Floor Manager</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98765-43210"
                    value={editStaffModal.phone}
                    onChange={(e) => setEditStaffModal((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Login PIN with Quick Random Generator */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <Key size={14} className="text-amber-600" />
                    <span>Terminal Login PIN (4 Digits)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                      setEditStaffModal((prev) => ({ ...prev, pin: randomPin }));
                    }}
                    className="text-[11px] font-black text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition cursor-pointer"
                  >
                    🎲 Generate Random PIN
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={editStaffModal.pin}
                  onChange={(e) => setEditStaffModal((prev) => ({ ...prev, pin: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm font-mono font-black text-stone-900 tracking-widest text-center"
                />
                <p className="text-[10px] text-stone-500 font-medium">
                  Staff members use this 4-digit PIN to authenticate on the POS, KDS, or Waiter portal.
                </p>
              </div>

              {/* Active Toggle Checkbox */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  id="staffActiveToggle"
                  checked={editStaffModal.is_active}
                  onChange={(e) => setEditStaffModal((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-stone-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="staffActiveToggle" className="text-xs font-bold text-stone-800 cursor-pointer">
                  Account Active (Uncheck to soft-deactivate former employee)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStaffModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editStaffModal.isSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-xs shadow-orange-600/20 transition cursor-pointer"
                >
                  {editStaffModal.isSubmitting ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
