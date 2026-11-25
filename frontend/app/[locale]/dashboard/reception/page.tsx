"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useReception, QueuePatient } from "@/app/context/ReceptionContext";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  UsersThree,
  UserPlus,
  Clock,
  Stethoscope,
  CheckCircle,
  Hourglass,
  Printer,
  MagnifyingGlass,
  ShieldCheck,
  Money,
  Copy,
  Door,
  CaretDown,
  ArrowUpRight,
} from "@phosphor-icons/react";

// Live ticking timer component for each waiting patient
function LiveWaitTimer({
  checkInTime,
  status,
}: {
  checkInTime: string;
  status: QueuePatient["status"];
}) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const calc = () => {
      const diffMs = Date.now() - new Date(checkInTime).getTime();
      setElapsed(Math.max(0, Math.floor(diffMs / 1000)));
    };
    calc();

    if (status === "WAITING") {
      const timer = setInterval(calc, 1000);
      return () => clearInterval(timer);
    }
  }, [checkInTime, status]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // Blue & White Color-coded wait thresholds
  let colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
  if (minutes >= 30) {
    colorClasses = "bg-red-50 text-red-600 border-red-200 animate-pulse font-bold";
  } else if (minutes >= 15) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "WITH_DOCTOR") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Stethoscope size={13} weight="fill" />
        <span>In Consultation</span>
      </span>
    );
  }

  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle size={13} weight="fill" />
        <span>Discharged</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${colorClasses}`}
    >
      <Clock size={13} />
      <span>
        {minutes}m {seconds.toString().padStart(2, "0")}s
      </span>
    </span>
  );
}

export default function ReceptionLiveQueueDashboard() {
  const {
    queue,
    updatePatientStatus,
    setSelectedReceipt,
    receipts,
  } = useReception();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "WAITING" | "WITH_DOCTOR" | "COMPLETED">("WAITING");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Summary Metrics calculations
  const totalPatientsToday = queue.length;
  const walkInsCount = queue.filter((p) => p.visitType === "Walk-In").length;
  const waitingPatients = queue.filter((p) => p.status === "WAITING");
  const waitingCount = waitingPatients.length;
  const withDoctorCount = queue.filter((p) => p.status === "WITH_DOCTOR").length;
  const completedCount = queue.filter((p) => p.status === "COMPLETED").length;
  const nextWaitingPatient = waitingPatients[0] || null;

  // Filtered queue items
  const filteredQueue = queue.filter((item) => {
    if (activeTab === "WAITING" && item.status !== "WAITING") return false;
    if (activeTab === "WITH_DOCTOR" && item.status !== "WITH_DOCTOR") return false;
    if (activeTab === "COMPLETED" && item.status !== "COMPLETED") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchToken = item.tokenNumber.toLowerCase().includes(q);
      const matchName = item.patientName.toLowerCase().includes(q);
      const matchEID = item.emiratesId.toLowerCase().includes(q);
      const matchDoctor = item.assignedDoctorName.toLowerCase().includes(q);
      const matchDept = item.department.toLowerCase().includes(q);
      return matchToken || matchName || matchEID || matchDoctor || matchDept;
    }

    return true;
  });

  const handleMoveToDoctor = (patient: QueuePatient) => {
    updatePatientStatus(patient.id, "WITH_DOCTOR");
    toast.success(
      `Called ${patient.patientName} (${patient.tokenNumber}) to ${patient.roomNumber}!`,
      {
        description: `Notified ${patient.assignedDoctorName} & updated waiting screen.`,
      }
    );
  };

  const handleMarkCompleted = (patient: QueuePatient) => {
    updatePatientStatus(patient.id, "COMPLETED");
    toast.info(`Visit marked complete for ${patient.patientName}.`);
  };

  const handlePrintReceipt = (receiptId: string) => {
    const rc = receipts.find((r) => r.id === receiptId);
    if (rc) {
      setSelectedReceipt(rc);
    } else {
      toast.error("Receipt not found for this encounter");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // 1. Hourly Patient Flow Data (Blue & Deep Slate bars)
  const hourlyFlowData = [
    { time: "08:00", completed: 1, waiting: 0 },
    { time: "09:00", completed: 2, waiting: 1 },
    { time: "10:00", completed: 4, waiting: 2 },
    { time: "11:00", completed: 3, waiting: waitingCount > 0 ? waitingCount : 1 },
    { time: "12:00", completed: 2, waiting: 1 },
    { time: "13:00", completed: 1, waiting: 0 },
    { time: "14:00", completed: 3, waiting: 2 },
    { time: "15:00", completed: 2, waiting: 1 },
    { time: "16:00", completed: 1, waiting: 0 },
    { time: "17:00", completed: 0, waiting: 0 },
  ];

  // 2. Queue & Insurance Distribution (Blue & White palette Donut Chart)
  const payerCounts: Record<string, number> = {};
  queue.forEach((p) => {
    const key = p.insuranceStatus === "ACTIVE" ? (p.payerName?.split(" ")[0] || "Insured") : "Cash/Self-Pay";
    payerCounts[key] = (payerCounts[key] || 0) + 1;
  });

  const donutColors = ["#2563EB", "#0F172A", "#0284C7", "#93C5FD"];
  const donutData = Object.keys(payerCounts).length > 0
    ? Object.entries(payerCounts).map(([name, value], i) => ({
        name,
        value,
        color: donutColors[i % donutColors.length],
      }))
    : [
        { name: "Daman", value: 2, color: "#2563EB" },
        { name: "Thiqa", value: 1, color: "#0F172A" },
        { name: "Self-Pay", value: 2, color: "#0284C7" },
      ];

  const totalDonutPatients = donutData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────
          TOP HEADER & GLOBAL ACTIONS (BLUE & WHITE THEME)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Live Reception Queue &amp; Patient Tracker
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time clinic waiting lounge, doctor room assignment, and patient token flow.
          </p>
        </div>

        {/* Global Controls & Check-In Action */}
        <div className="flex items-center gap-3">
          {/* Quick Search (Rounded-xl matching reference) */}
          <div className="relative hidden sm:block w-64">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-14 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-md">
              ⌘ F
            </span>
          </div>

          <Link
            href="/dashboard/reception/check-in"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <UserPlus size={16} weight="bold" />
            <span>+ New Check-In / Walk-In</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 1: TOP 3-ZONE HERO & VITALS CARDS (IMAGE 2 MODEL: BLUE & WHITE)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Zone 1: Featured Royal Blue Hero Card ("Waiting in Lounge") */}
        <div className="md:col-span-5 lg:col-span-4 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 text-white p-6 shadow-md shadow-blue-600/15 flex flex-col justify-between min-h-[195px]">
          {/* Subtle decorative curved ambient light */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

          {/* Top Row: Title + Indicator */}
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-100 tracking-wider uppercase">
                Active Lounge Queue
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">Waiting in Lounge</h2>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xs">
              <Hourglass size={18} weight="bold" />
            </div>
          </div>

          {/* Metric Value */}
          <div className="relative z-10 my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl lg:text-5xl font-black font-sans tracking-tight text-white">
                {waitingCount}
              </span>
              <span className="text-sm font-medium text-blue-100">
                Patients Waiting
              </span>
            </div>
          </div>

          {/* Action Pills (Rounded-xl) */}
          <div className="relative z-10 flex items-center gap-2 pt-1">
            {nextWaitingPatient ? (
              <button
                onClick={() => handleMoveToDoctor(nextWaitingPatient)}
                className="px-4 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Call {nextWaitingPatient.tokenNumber}</span>
                <ArrowUpRight size={14} weight="bold" />
              </button>
            ) : (
              <span className="px-4 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                Lounge Clear
              </span>
            )}
            <button
              onClick={() => setActiveTab("WAITING")}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs backdrop-blur-sm transition-colors cursor-pointer"
            >
              View Queue
            </button>
          </div>
        </div>

        {/* Zone 2: Clinic Vitals Multi-Stat Card */}
        <div className="md:col-span-7 lg:col-span-5 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinic Vitals</h3>
              <p className="text-[11px] text-slate-500">Today&apos;s real-time intake distribution</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              Shift 08:00 - 18:00
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Stat 1: Total Patients */}
            <div className="bg-[#F6F8FA] border border-slate-200/70 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Total Today</span>
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UsersThree size={14} weight="bold" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">{totalPatientsToday}</span>
                <span className="block text-[10px] text-blue-700 font-bold mt-0.5">
                  100% Volume
                </span>
              </div>
            </div>

            {/* Stat 2: Walk-Ins */}
            <div className="bg-[#F6F8FA] border border-slate-200/70 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Walk-Ins</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <UserPlus size={14} weight="bold" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">{walkInsCount}</span>
                <span className="block text-[10px] text-indigo-700 font-bold mt-0.5">
                  {totalPatientsToday > 0 ? Math.round((walkInsCount / totalPatientsToday) * 100) : 0}% of Total
                </span>
              </div>
            </div>

            {/* Stat 3: In Consultation */}
            <div className="bg-[#F6F8FA] border border-slate-200/70 rounded-2xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">With Doctor</span>
                <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Stethoscope size={14} weight="bold" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-black text-blue-700">{withDoctorCount}</span>
                <span className="block text-[10px] text-sky-700 font-bold mt-0.5">
                  In Consult
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Zone 3: Queue Efficiency Score (Matching Reference "Finance Score") */}
        <div className="md:col-span-12 lg:col-span-3 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Queue Flow Score</h3>
            <span className="text-slate-400 cursor-pointer hover:text-slate-600">•••</span>
          </div>

          <div className="my-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Triage Quality
            </span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xl font-black text-slate-900">Optimal</span>
              <span className="text-2xl font-black text-blue-600 font-sans">94%</span>
            </div>
          </div>

          {/* Dual Segment Progress Track */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: "70%" }}></div>
              <div className="h-full bg-blue-600 rounded-full" style={{ width: "24%" }}></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Avg wait &lt; 14 mins</span>
              <span className="text-blue-600 font-bold font-mono">DHA Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: MATCHING ANALYTICS & CHARTS (BLUE & DEEP SLATE)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Hourly Patient Volume & Flow Dynamics (Dual-color Bar Chart) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Patient Inflow &amp; Flow Dynamics
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hourly comparison of waiting vs completed encounters today
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                  Completed
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Waiting
                </span>
              </div>

              {/* Time Dropdown Pill */}
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <span>Today&apos;s Shift</span>
                <CaretDown size={12} />
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-[210px] w-full pt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyFlowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={4}
                >
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748B", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "#F1F5F9", radius: 8 }}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: 12,
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 12,
                      padding: "8px 12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                    }}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#0F172A"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="waiting"
                    name="Waiting"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading analytics...
              </div>
            )}
          </div>
        </div>

        {/* Right: Queue & Insurance Distribution (Donut Chart) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Queue Distribution</h3>
              <p className="text-xs text-slate-500">By Payer &amp; Insurance</p>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span>All Active</span>
              <CaretDown size={11} />
            </div>
          </div>

          {/* Donut Graphic */}
          <div className="relative h-[150px] w-full flex items-center justify-center">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={64}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: 10,
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 12,
                      padding: "6px 10px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-slate-900">{totalDonutPatients}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Patients</span>
            </div>
          </div>

          {/* Legend Items Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="font-semibold text-slate-700">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 font-mono">{d.value}</span>
                  <span className="text-[11px] text-slate-500">
                    ({Math.round((d.value / (totalDonutPatients || 1)) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 3: PATIENT TRACKER TABLE (BLUE & WHITE THEME)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-[28px] shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs (Rounded-xl Bar) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("WAITING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "WAITING"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-700 hover:bg-white/60"
              }`}
            >
              Waiting Now ({waitingCount})
            </button>
            <button
              onClick={() => setActiveTab("WITH_DOCTOR")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "WITH_DOCTOR"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-700 hover:bg-white/60"
              }`}
            >
              With Doctor ({withDoctorCount})
            </button>
            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "COMPLETED"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-700 hover:bg-white/60"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-700 hover:bg-white/60"
              }`}
            >
              All Queue ({totalPatientsToday})
            </button>
          </div>

          {/* Search Field (Rounded-xl) */}
          <div className="relative w-full md:w-80">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token, name, EID, or doctor..."
              className="w-full bg-[#F6F8FA] border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-3.5">Token #</th>
                <th className="px-6 py-3.5">Patient Details</th>
                <th className="px-6 py-3.5">Emirates ID</th>
                <th className="px-6 py-3.5">Insurance / Billing</th>
                <th className="px-6 py-3.5">Assigned Doctor &amp; Room</th>
                <th className="px-6 py-3.5">Wait Timer</th>
                <th className="px-6 py-3.5 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center gap-2">
                      <Hourglass size={36} className="text-slate-300" />
                      <p className="text-sm font-bold text-slate-800">No patients in this view</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery
                          ? "Try clearing your search query to see all patients."
                          : "There are currently no patients in this view category."}
                      </p>
                      <Link
                        href="/dashboard/reception/check-in"
                        className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        + Check-In Next Patient
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Token Number */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono font-black text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                          {item.tokenNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            item.priority === "URGENT"
                              ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                              : item.priority === "PRIORITY"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </td>

                    {/* Patient Name */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                        {item.patientName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{item.gender}</span>
                        <span>&bull;</span>
                        <span>{item.phone}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] text-blue-700 font-semibold border border-blue-100">
                          {item.visitType}
                        </span>
                      </div>
                    </td>

                    {/* Emirates ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700 font-semibold">
                          {item.emiratesId}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.emiratesId, "Emirates ID")}
                          title="Copy Emirates ID"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer p-0.5"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">UAE Resident ID</span>
                    </td>

                    {/* Insurance Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {item.insuranceStatus === "ACTIVE" ? (
                          <div className="flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ShieldCheck size={14} weight="fill" />
                            <span>Active ({item.copayPercent}% Co-Pay)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Money size={14} weight="bold" />
                            <span>Cash / Self-Pay</span>
                          </div>
                        )}
                        <span
                          className="text-[11px] font-medium text-slate-600 truncate max-w-[170px]"
                          title={item.payerName}
                        >
                          {item.payerName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Co-Pay:{" "}
                          <span className="text-slate-900 font-mono font-bold">
                            {item.copayAmount.toFixed(2)} AED
                          </span>{" "}
                          ({item.paymentMethod})
                        </span>
                      </div>
                    </td>

                    {/* Assigned Doctor */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.assignedDoctorName}
                      </div>
                      <div className="text-[11px] text-blue-600 font-mono mt-0.5 flex items-center gap-1 font-bold">
                        <Door size={13} />
                        <span>{item.roomNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.department}</div>
                    </td>

                    {/* Live Wait Timer */}
                    <td className="px-6 py-4">
                      <LiveWaitTimer checkInTime={item.checkInTime} status={item.status} />
                    </td>

                    {/* Quick Actions (Rounded-xl Buttons) */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === "WAITING" && (
                          <button
                            onClick={() => handleMoveToDoctor(item)}
                            title="Call patient to consultation room"
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs shadow-blue-500/25 cursor-pointer"
                          >
                            <Stethoscope size={14} weight="bold" />
                            <span>Move to Doctor</span>
                          </button>
                        )}

                        {item.status === "WITH_DOCTOR" && (
                          <button
                            onClick={() => handleMarkCompleted(item)}
                            title="Mark encounter as completed"
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <CheckCircle size={14} weight="bold" />
                            <span>Complete</span>
                          </button>
                        )}

                        <button
                          onClick={() => handlePrintReceipt(item.receiptId)}
                          title="Print or view co-pay receipt"
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors cursor-pointer"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredQueue.length}</span> of{" "}
            <span className="font-bold text-slate-900">{queue.length}</span> patients in today&apos;s queue
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              &lt; 15m (Optimal)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              15-30m (Moderate)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              &gt; 30m (Escalation)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
