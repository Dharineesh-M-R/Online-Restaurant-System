import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "data", "roster_store.json");

// Default initial team members
export const DEFAULT_STAFF = [
  {
    id: "f1a2b3c4-1111-4000-8000-000000000001",
    employee_id: "WTR001",
    name: "Rahul Verma",
    role: "waiter",
    pin: "1111",
    phone: "98765-43210",
    hourly_wage: 120,
    status: "active",
  },
  {
    id: "f1a2b3c4-1111-4000-8000-000000000002",
    employee_id: "WTR002",
    name: "Amit Kumar",
    role: "waiter",
    pin: "1212",
    phone: "98765-43211",
    hourly_wage: 120,
    status: "active",
  },
  {
    id: "f1a2b3c4-1111-4000-8000-000000000003",
    employee_id: "WTR003",
    name: "Rohit Gupta",
    role: "waiter",
    pin: "1313",
    phone: "98765-43212",
    hourly_wage: 115,
    status: "active",
  },
  {
    id: "f1a2b3c4-2222-4000-8000-000000000001",
    employee_id: "CK001",
    name: "Chef Vikram Singh",
    role: "kitchen",
    pin: "2222",
    phone: "98765-43220",
    hourly_wage: 180,
    status: "active",
  },
  {
    id: "f1a2b3c4-2222-4000-8000-000000000002",
    employee_id: "CK002",
    name: "Chef Ananya Joshi",
    role: "kitchen",
    pin: "2323",
    phone: "98765-43221",
    hourly_wage: 155,
    status: "active",
  },
  {
    id: "f1a2b3c4-2222-4000-8000-000000000003",
    employee_id: "CK003",
    name: "Chef Karan Malhotra",
    role: "kitchen",
    pin: "2424",
    phone: "98765-43222",
    hourly_wage: 160,
    status: "active",
  },
  {
    id: "f1a2b3c4-3333-4000-8000-000000000001",
    employee_id: "BIL001",
    name: "Priya Sharma",
    role: "billing",
    pin: "3333",
    phone: "98765-43230",
    hourly_wage: 140,
    status: "active",
  },
  {
    id: "f1a2b3c4-4444-4000-8000-000000000001",
    employee_id: "MGR001",
    name: "Suresh Rao",
    role: "manager",
    pin: "4444",
    phone: "98765-43240",
    hourly_wage: 220,
    status: "active",
  },
];

// Helper to seed demo roster
function generateInitialStore() {
  const today = new Date();
  const getOffsetDate = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const dayMinus2 = getOffsetDate(-2);
  const dayMinus1 = getOffsetDate(-1);
  const day0 = getOffsetDate(0);
  const dayPlus1 = getOffsetDate(1);
  const dayPlus2 = getOffsetDate(2);
  const dayPlus3 = getOffsetDate(3);

  return {
    staff: JSON.parse(JSON.stringify(DEFAULT_STAFF)),
    shifts: [
      // Day -1 (Yesterday)
      {
        id: "sh_101",
        staffId: "WTR001",
        staffName: "Rahul Verma",
        role: "waiter",
        date: dayMinus1,
        shiftType: "Evening Shift",
        startTime: "16:00",
        endTime: "23:00",
        stationOrZone: "Tables 1-6 (Front Area)",
        breakMinutes: 45,
        hours: 7,
      },
      // Day 0 (Today)
      {
        id: "sh_102",
        staffId: "WTR001",
        staffName: "Rahul Verma",
        role: "waiter",
        date: day0,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Tables 1-6 (Front Area)",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_103",
        staffId: "WTR002",
        staffName: "Amit Kumar",
        role: "waiter",
        date: day0,
        shiftType: "Evening Shift",
        startTime: "16:00",
        endTime: "23:00",
        stationOrZone: "Tables 7-12 (Central Hall)",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_104",
        staffId: "CK001",
        staffName: "Chef Vikram Singh",
        role: "kitchen",
        date: day0,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Curries & Expo Station",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_105",
        staffId: "CK002",
        staffName: "Chef Ananya Joshi",
        role: "kitchen",
        date: day0,
        shiftType: "Evening Shift",
        startTime: "16:00",
        endTime: "23:00",
        stationOrZone: "Starters & Fryer Station",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_106",
        staffId: "BIL001",
        staffName: "Priya Sharma",
        role: "billing",
        date: day0,
        shiftType: "Full Day",
        startTime: "10:00",
        endTime: "21:00",
        stationOrZone: "Front Billing Desk",
        breakMinutes: 60,
        hours: 11,
      },
      {
        id: "sh_107",
        staffId: "MGR001",
        staffName: "Suresh Rao",
        role: "manager",
        date: day0,
        shiftType: "Evening Shift",
        startTime: "15:00",
        endTime: "23:00",
        stationOrZone: "Floor Operations Lead",
        breakMinutes: 45,
        hours: 8,
      },
      // Tomorrow (Day +1)
      {
        id: "sh_108",
        staffId: "WTR001",
        staffName: "Rahul Verma",
        role: "waiter",
        date: dayPlus1,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Tables 1-6 (Front Area)",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_109",
        staffId: "WTR002",
        staffName: "Amit Kumar",
        role: "waiter",
        date: dayPlus1,
        shiftType: "Evening Shift",
        startTime: "16:00",
        endTime: "23:00",
        stationOrZone: "Tables 7-12 (Central Hall)",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_110",
        staffId: "CK001",
        staffName: "Chef Vikram Singh",
        role: "kitchen",
        date: dayPlus1,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Curries & Expo Station",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_111",
        staffId: "CK003",
        staffName: "Chef Karan Malhotra",
        role: "kitchen",
        date: dayPlus1,
        shiftType: "Evening Shift",
        startTime: "16:00",
        endTime: "23:00",
        stationOrZone: "Tandoor & Breads Station",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_112",
        staffId: "BIL001",
        staffName: "Priya Sharma",
        role: "billing",
        date: dayPlus1,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Front Billing Desk",
        breakMinutes: 45,
        hours: 7,
      },
      // Day +2
      {
        id: "sh_113",
        staffId: "WTR003",
        staffName: "Rohit Gupta",
        role: "waiter",
        date: dayPlus2,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Tables 13-20 (Family Section)",
        breakMinutes: 45,
        hours: 7,
      },
      {
        id: "sh_114",
        staffId: "CK002",
        staffName: "Chef Ananya Joshi",
        role: "kitchen",
        date: dayPlus2,
        shiftType: "Morning Shift",
        startTime: "09:00",
        endTime: "16:00",
        stationOrZone: "Starters & Fryer Station",
        breakMinutes: 45,
        hours: 7,
      },
    ],
    leaves: [
      {
        id: "lv_201",
        staffId: "WTR003",
        staffName: "Rohit Gupta",
        role: "waiter",
        startDate: day0,
        endDate: day0,
        reason: "Student University Semester Exam",
        status: "approved",
        appliedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "lv_202",
        staffId: "CK003",
        staffName: "Chef Karan Malhotra",
        role: "kitchen",
        startDate: dayPlus2,
        endDate: dayPlus3,
        reason: "Family Wedding Ceremony",
        status: "pending",
        appliedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
    attendance: [
      {
        id: "att_301",
        staffId: "WTR001",
        staffName: "Rahul Verma",
        role: "waiter",
        date: day0,
        clockIn: "08:58",
        clockOut: null,
        status: "clocked_in",
        loggedHours: 5.2,
      },
      {
        id: "att_302",
        staffId: "CK001",
        staffName: "Chef Vikram Singh",
        role: "kitchen",
        date: day0,
        clockIn: "08:52",
        clockOut: null,
        status: "clocked_in",
        loggedHours: 5.3,
      },
      {
        id: "att_303",
        staffId: "BIL001",
        staffName: "Priya Sharma",
        role: "billing",
        date: day0,
        clockIn: "09:02",
        clockOut: null,
        status: "clocked_in",
        loggedHours: 5.1,
      },
      {
        id: "att_304",
        staffId: "WTR002",
        staffName: "Amit Kumar",
        role: "waiter",
        date: day0,
        clockIn: null,
        clockOut: null,
        status: "scheduled",
        loggedHours: 0,
      },
    ],
    swaps: [
      {
        id: "sw_401",
        requesterId: "WTR002",
        requesterName: "Amit Kumar",
        targetId: "WTR003",
        targetName: "Rohit Gupta",
        shiftDate: dayPlus1,
        shiftType: "Evening Shift (16:00 - 23:00)",
        reason: "Personal urgent medical checkup appointment",
        status: "pending_manager",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

// Load Roster Store
export function loadRosterStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = generateInitialStore();
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const content = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(content);
    if (!parsed.staff || !Array.isArray(parsed.staff)) {
      parsed.staff = JSON.parse(JSON.stringify(DEFAULT_STAFF));
    }
    return parsed;
  } catch (err) {
    console.error("Error loading roster store, fallback to memory:", err);
    return generateInitialStore();
  }
}

// Save Roster Store
export function saveRosterStore(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving roster store:", err);
  }
}

// Fatigue & Compliance Automated Warnings
export function analyzeFatigueWarnings(shifts) {
  const warnings = [];
  const shiftsByStaff = {};

  shifts.forEach((s) => {
    if (!shiftsByStaff[s.staffId]) shiftsByStaff[s.staffId] = [];
    shiftsByStaff[s.staffId].push(s);
  });

  Object.entries(shiftsByStaff).forEach(([staffId, staffShifts]) => {
    const sorted = [...staffShifts].sort((a, b) => new Date(a.date) - new Date(b.date));
    const staffName = sorted[0]?.staffName || staffId;

    // 1. Clopening Warning: Closes late (>= 22:00), opens early next day (<= 10:00)
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const curDate = new Date(current.date);
      const nextDate = new Date(next.date);
      const dayDiff = Math.round((nextDate - curDate) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        const curEndHour = parseInt(current.endTime.split(":")[0]);
        const nextStartHour = parseInt(next.startTime.split(":")[0]);

        if (curEndHour >= 22 && nextStartHour <= 10) {
          warnings.push({
            id: `clopen_${current.id}_${next.id}`,
            type: "clopening",
            staffId,
            staffName,
            severity: "high",
            title: `⚠️ "Clopening" Risk for ${staffName}`,
            description: `Scheduled to close at ${current.endTime} on ${current.date} and open at ${next.startTime} on ${next.date} (< 11 hours rest).`,
          });
        }
      }
    }

    // 2. Weekly Overtime Warning (> 48 hours in week)
    const totalWeeklyHours = sorted.reduce((sum, s) => sum + Number(s.hours || 7), 0);
    if (totalWeeklyHours > 48) {
      warnings.push({
        id: `ot_${staffId}`,
        type: "overtime",
        staffId,
        staffName,
        severity: "medium",
        title: `Overtime Warning: ${staffName}`,
        description: `Scheduled for ${totalWeeklyHours} hours this week (Threshold: 48 hours).`,
      });
    }
  });

  return warnings;
}

// Understaffing Automated Warnings
export function analyzeUnderstaffingAlerts(shifts) {
  const alerts = [];
  const shiftsByDateAndType = {};

  shifts.forEach((s) => {
    const key = `${s.date}_${s.shiftType}`;
    if (!shiftsByDateAndType[key]) {
      shiftsByDateAndType[key] = {
        date: s.date,
        shiftType: s.shiftType,
        waiters: 0,
        kitchen: 0,
        billing: 0,
      };
    }
    if (s.role === "waiter") shiftsByDateAndType[key].waiters++;
    if (s.role === "kitchen") shiftsByDateAndType[key].kitchen++;
    if (s.role === "billing") shiftsByDateAndType[key].billing++;
  });

  Object.values(shiftsByDateAndType).forEach((slot) => {
    if (slot.shiftType === "Evening Shift" || slot.shiftType === "Morning Shift") {
      if (slot.waiters < 2) {
        alerts.push({
          id: `under_wtr_${slot.date}_${slot.shiftType}`,
          date: slot.date,
          shiftType: slot.shiftType,
          role: "waiter",
          current: slot.waiters,
          minimum: 2,
          message: `${slot.date} ${slot.shiftType} has only ${slot.waiters} Waiter (Min: 2 needed for floor rush).`,
        });
      }
      if (slot.kitchen < 2) {
        alerts.push({
          id: `under_kit_${slot.date}_${slot.shiftType}`,
          date: slot.date,
          shiftType: slot.shiftType,
          role: "kitchen",
          current: slot.kitchen,
          minimum: 2,
          message: `${slot.date} ${slot.shiftType} has only ${slot.kitchen} Kitchen Chef (Min: 2 needed for KDS line).`,
        });
      }
    }
  });

  return alerts;
}
