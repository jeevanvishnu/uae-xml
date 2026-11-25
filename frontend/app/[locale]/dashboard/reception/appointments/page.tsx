"use client";

import React, { useState, useMemo } from "react";
import { useReception, Appointment, Doctor } from "@/app/context/ReceptionContext";
import { toast } from "sonner";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Plus,
  MagnifyingGlass,
  Bell,
  CheckCircle,
  Door,
  User,
  Phone,
  ShieldCheck,
  IdentificationCard,
  X,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";

const TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Distinct pastel color palette matching Reference Image (Lavender, Mint, Warm Amber, Sky, Soft Pink)
interface DoctorTheme {
  dotColor: string;
  bg: string;
  hoverBg: string;
  border: string;
  stripe: string;
  textTitle: string;
  textSubtitle: string;
  badgeBg: string;
  badgeText: string;
  tokenBg: string;
  btnPrimary: string;
  btnReschedule: string;
  chipClass: string;
}

const DOCTOR_THEMES: Record<string, DoctorTheme> = {
  // Dr. Sarah Al-Hashimi (Internal Medicine) -> Soft Lavender / Periwinkle (like "Online meeting" in ref)
  "doc-1": {
    dotColor: "bg-[#6366F1]",
    bg: "bg-[#EEF2FF]",
    hoverBg: "hover:bg-[#E0E7FF]",
    border: "border-[#C7D2FE]",
    stripe: "border-l-[4px] border-l-[#6366F1]",
    textTitle: "text-[#312E81]",
    textSubtitle: "text-[#4338CA]",
    badgeBg: "bg-[#E0E7FF]",
    badgeText: "text-[#4338CA]",
    tokenBg: "bg-[#6366F1]",
    btnPrimary: "bg-[#6366F1] hover:bg-[#4F46E5] text-white",
    btnReschedule: "text-[#4338CA] hover:bg-[#E0E7FF]",
    chipClass: "bg-[#EEF2FF] text-[#4338CA] border-l-[3px] border-l-[#6366F1]",
  },
  // Dr. Tariq Mansoor (Cardiology) -> Soft Mint Green (like "Design new pages", "Fix code issues" in ref)
  "doc-2": {
    dotColor: "bg-[#10B981]",
    bg: "bg-[#ECFDF5]",
    hoverBg: "hover:bg-[#D1FAE5]",
    border: "border-[#A7F3D0]",
    stripe: "border-l-[4px] border-l-[#10B981]",
    textTitle: "text-[#064E3B]",
    textSubtitle: "text-[#047857]",
    badgeBg: "bg-[#D1FAE5]",
    badgeText: "text-[#047857]",
    tokenBg: "bg-[#10B981]",
    btnPrimary: "bg-[#10B981] hover:bg-[#059669] text-white",
    btnReschedule: "text-[#047857] hover:bg-[#D1FAE5]",
    chipClass: "bg-[#ECFDF5] text-[#065F46] border-l-[3px] border-l-[#10B981]",
  },
  // Dr. Reem Al-Nuaimi (Pediatrics) -> Warm Ochre / Peach / Gold (like "UI kit for mobile app" in ref)
  "doc-3": {
    dotColor: "bg-[#F59E0B]",
    bg: "bg-[#FEFCE8]",
    hoverBg: "hover:bg-[#FEF08A]/60",
    border: "border-[#FDE68A]",
    stripe: "border-l-[4px] border-l-[#F59E0B]",
    textTitle: "text-[#713F12]",
    textSubtitle: "text-[#854D0E]",
    badgeBg: "bg-[#FEF08A]",
    badgeText: "text-[#854D0E]",
    tokenBg: "bg-[#F59E0B]",
    btnPrimary: "bg-[#F59E0B] hover:bg-[#D97706] text-white",
    btnReschedule: "text-[#854D0E] hover:bg-[#FEF08A]",
    chipClass: "bg-[#FEFCE8] text-[#854D0E] border-l-[3px] border-l-[#F59E0B]",
  },
  // Dr. Marcus Vance (Orthopedics) -> Sky / Soft Blue
  "doc-4": {
    dotColor: "bg-[#0284C7]",
    bg: "bg-[#F0F9FF]",
    hoverBg: "hover:bg-[#E0F2FE]",
    border: "border-[#BAE6FD]",
    stripe: "border-l-[4px] border-l-[#0284C7]",
    textTitle: "text-[#0C4A6E]",
    textSubtitle: "text-[#0369A1]",
    badgeBg: "bg-[#E0F2FE]",
    badgeText: "text-[#0369A1]",
    tokenBg: "bg-[#0284C7]",
    btnPrimary: "bg-[#0284C7] hover:bg-[#0369A1] text-white",
    btnReschedule: "text-[#0369A1] hover:bg-[#E0F2FE]",
    chipClass: "bg-[#F0F9FF] text-[#0369A1] border-l-[3px] border-l-[#0284C7]",
  },
  // Dr. Laila Bin Haider (OB/GYN) -> Soft Rose / Coral Pink (like "Course documents", "Start course" in ref)
  "doc-5": {
    dotColor: "bg-[#EC4899]",
    bg: "bg-[#FDF2F8]",
    hoverBg: "hover:bg-[#FCE7F3]",
    border: "border-[#FBCFE8]",
    stripe: "border-l-[4px] border-l-[#EC4899]",
    textTitle: "text-[#831843]",
    textSubtitle: "text-[#9D174D]",
    badgeBg: "bg-[#FCE7F3]",
    badgeText: "text-[#9D174D]",
    tokenBg: "bg-[#EC4899]",
    btnPrimary: "bg-[#EC4899] hover:bg-[#DB2777] text-white",
    btnReschedule: "text-[#9D174D] hover:bg-[#FCE7F3]",
    chipClass: "bg-[#FDF2F8] text-[#9D174D] border-l-[3px] border-l-[#EC4899]",
  },
};

const DEFAULT_THEME: DoctorTheme = DOCTOR_THEMES["doc-1"];

export default function DashboardAppointmentsCalendarPage() {
  const {
    doctors,
    appointments,
    checkInAppointment,
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment,
  } = useReception();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"MONTH" | "DAY">("DAY");
  const [searchQuery, setSearchQuery] = useState("");

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDocId, setBookingDocId] = useState(doctors[0]?.id || "doc-1");
  const [bookingTimeSlot, setBookingTimeSlot] = useState("10:00 AM");
  const [bookingPatientName, setBookingPatientName] = useState("");
  const [bookingEmiratesId, setBookingEmiratesId] = useState("");
  const [bookingPhone, setBookingPhone] = useState("+971 ");
  const [bookingReason, setBookingReason] = useState("");
  const [bookingPayer, setBookingPayer] = useState("National Health Insurance (Daman)");
  const [bookingMemberId, setBookingMemberId] = useState("");

  // Reschedule Modal State
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState(selectedDate);
  const [newRescheduleSlot, setNewRescheduleSlot] = useState("11:00 AM");

  const displayDoctors =
    selectedDoctorFilter === "ALL"
      ? doctors
      : doctors.filter((d) => d.id === selectedDoctorFilter);

  // Month navigation vs Day navigation
  const shiftPeriod = (amount: number) => {
    const current = new Date(selectedDate);
    if (viewMode === "MONTH") {
      current.setMonth(current.getMonth() + amount);
    } else {
      current.setDate(current.getDate() + amount);
    }
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const monthYearHeading = useMemo(() => {
    return new Date(selectedDate).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const fullDateHeading = useMemo(() => {
    return new Date(selectedDate).toLocaleDateString("en-AE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  // Calendar matrix calculation for Month View (Mon -> Sun)
  const calendarDays = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    const firstDay = new Date(year, month, 1);
    // (getDay() + 6) % 7 gives Monday = 0, Sunday = 6
    const startWeekday = (firstDay.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month filler
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().split("T")[0];
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().split("T")[0];
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }

    // Next month filler
    const totalCurrentCells = cells.length;
    const remaining = totalCurrentCells % 7 === 0 ? 0 : 7 - (totalCurrentCells % 7);
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().split("T")[0];
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      });
    }

    return cells;
  }, [selectedDate]);

  const handleOneClickCheckIn = (apt: Appointment) => {
    const result = checkInAppointment(apt.id, "Card");
    if (result) {
      toast.success(
        `Checked In: ${apt.patientName}! Assigned Token: ${result.patient.tokenNumber}`,
        {
          description: `Dispatched to ${result.patient.assignedDoctorName} (${result.patient.roomNumber}).`,
        }
      );
    } else {
      toast.error("Failed to check in appointment");
    }
  };

  const handleOpenBooking = (doctorId: string, timeSlot: string, customDate?: string) => {
    setBookingDocId(doctorId);
    setBookingTimeSlot(timeSlot);
    if (customDate) setSelectedDate(customDate);
    setBookingPatientName("");
    setBookingEmiratesId("");
    setBookingPhone("+971 50 ");
    setBookingReason("");
    setBookingMemberId("");
    setIsBookingModalOpen(true);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPatientName.trim()) {
      toast.error("Please enter patient name");
      return;
    }

    const doc = doctors.find((d) => d.id === bookingDocId) || doctors[0];

    bookAppointment({
      patientName: bookingPatientName.trim(),
      emiratesId: bookingEmiratesId.trim() || "784-1990-0000000-0",
      phone: bookingPhone.trim() || "+971 50 000 0000",
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: doc.specialty,
      roomNumber: doc.roomNumber,
      date: selectedDate,
      timeSlot: bookingTimeSlot,
      reason: bookingReason.trim() || "General Consultation",
      insurancePayer: bookingPayer,
      memberId: bookingMemberId.trim() || "AUTO-001",
    });

    toast.success(`Booked ${bookingTimeSlot} for ${bookingPatientName} with ${doc.name}`);
    setIsBookingModalOpen(false);
  };

  const handleSaveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt) return;

    rescheduleAppointment(reschedulingApt.id, newRescheduleDate, newRescheduleSlot);
    toast.success(`Rescheduled appointment to ${newRescheduleDate} at ${newRescheduleSlot}`);
    setReschedulingApt(null);
  };

  const dayAppointments = appointments.filter((a) => a.date === selectedDate);
  const totalDayAppointments = dayAppointments.length;
  const checkedInCount = dayAppointments.filter((a) => a.status === "CHECKED_IN").length;
  const scheduledCount = dayAppointments.filter((a) => a.status === "SCHEDULED").length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-12">
      {/* Top Bar - Clean & Minimal matching Reference Image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Calendar
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64 md:w-72">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for appointment, patient..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
            />
          </div>

          {/* Quick Notification Bell */}
          <div className="relative p-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-600 shadow-2xs hover:bg-slate-50 cursor-pointer hidden sm:flex items-center justify-center">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </div>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/90 bg-slate-100 hidden sm:flex items-center justify-center">
            <img
              src="/Profile Avatar of Older Man.svg"
              alt="User Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {/* New Book Appointment Button */}
          <button
            onClick={() => handleOpenBooking(doctors[0]?.id || "doc-1", "09:00 AM")}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} weight="bold" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Card - Pure White, rounded-[28px], Off-white inner accents */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-xs space-y-6">
        {/* Card Header matching Reference Image: Month/Year on left, grouped navigation on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {viewMode === "MONTH" ? monthYearHeading : fullDateHeading}
            </h2>

            {/* Quick Count Pills */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                {totalDayAppointments} Total
              </span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                {checkedInCount} Checked-In
              </span>
            </div>
          </div>

          {/* Right Navigation Controls matching Reference Image */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#EFF2F6] p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode("DAY")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "DAY"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Day Slots
              </button>
              <button
                onClick={() => setViewMode("MONTH")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "MONTH"
                  ? "bg-white text-slate-900 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Month
              </button>
            </div>

            {/* Today Button with Calendar Icon */}
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-all cursor-pointer"
            >
              <CalendarBlank size={15} className="text-slate-500" />
              <span>Today</span>
            </button>

            {/* Previous & Next Chevron Button Group */}
            <div className="flex items-center border border-slate-200/90 rounded-xl bg-white shadow-2xs overflow-hidden">
              <button
                onClick={() => shiftPeriod(-1)}
                className="p-2 hover:bg-slate-50 text-slate-700 border-r border-slate-200/90 transition-colors cursor-pointer"
                title="Previous"
              >
                <CaretLeft size={14} />
              </button>
              <button
                onClick={() => shiftPeriod(1)}
                className="p-2 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Next"
              >
                <CaretRight size={14} />
              </button>
            </div>

            {/* Doctor Filter Dropdown */}
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="bg-[#F6F8FA] border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Physicians ({doctors.length})</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VIEW 1: MONTH CALENDAR GRID (Exact match to Reference Image) */}
        {viewMode === "MONTH" && (
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-slate-200/80 bg-[#F6F8FA] text-center text-xs font-bold text-slate-500 py-3">
              {WEEKDAYS.map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
              {calendarDays.map((cell, idx) => {
                // Get appointments for this day
                const dayApts = appointments.filter((a) => {
                  if (a.date !== cell.dateStr) return false;
                  if (selectedDoctorFilter !== "ALL" && a.doctorId !== selectedDoctorFilter) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    return (
                      a.patientName.toLowerCase().includes(q) ||
                      a.doctorName.toLowerCase().includes(q) ||
                      a.reason.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                    }}
                    className={`min-h-[110px] p-2 transition-all cursor-pointer flex flex-col justify-between ${cell.isCurrentMonth ? "bg-white" : "bg-slate-50/50"
                      } ${cell.isSelected
                        ? "ring-2 ring-blue-500 ring-inset bg-blue-50/20"
                        : "hover:bg-slate-50/80"
                      }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${cell.isToday
                          ? "w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold"
                          : cell.isCurrentMonth
                            ? "text-slate-800"
                            : "text-slate-400"
                          }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isSelected && (
                        <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Appointment Event Chips - Multi-colored Pastels matching Reference Image */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayApts.slice(0, 3).map((apt, aIdx) => {
                        const theme = DOCTOR_THEMES[apt.doctorId] || DEFAULT_THEME;

                        return (
                          <div
                            key={apt.id || aIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(cell.dateStr);
                              setViewMode("DAY");
                            }}
                            className={`px-1.5 py-1 rounded text-[11px] font-medium truncate transition-transform hover:scale-[1.02] shadow-2xs ${theme.chipClass}`}
                            title={`${apt.timeSlot} - ${apt.patientName} (${apt.doctorName})`}
                          >
                            <span className="font-semibold">{apt.timeSlot.split(" ")[0]}</span>{" "}
                            {apt.patientName.split(" ")[0]}
                          </div>
                        );
                      })}

                      {dayApts.length > 3 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateStr);
                            setViewMode("DAY");
                          }}
                          className="text-[10px] text-slate-500 font-bold hover:text-blue-600 pl-1"
                        >
                          +{dayApts.length - 3} events
                        </div>
                      )}
                    </div>

                    <div />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: DAILY DOCTOR OUTPATIENT SLOTS MATRIX */}
        {viewMode === "DAY" && (
          <div className="border border-slate-200/80 rounded-2xl overflow-x-auto bg-white">
            <div
              className="grid min-w-[900px] border-b border-slate-200/80"
              style={{
                gridTemplateColumns: `100px repeat(${displayDoctors.length}, minmax(220px, 1fr))`,
              }}
            >
              {/* Corner */}
              <div className="p-3.5 bg-[#F6F8FA] border-r border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                Time Slot
              </div>

              {/* Doctor Columns */}
              {displayDoctors.map((doc) => {
                const docBookings = dayAppointments.filter((a) => a.doctorId === doc.id);
                return (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-[#F6F8FA] border-r border-slate-100 last:border-r-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 truncate">{doc.name}</div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        {docBookings.length} Visits
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{doc.specialty}</div>
                    <div className="text-[10px] text-blue-600 font-mono mt-1 flex items-center gap-1 font-bold">
                      <Door size={13} />
                      <span>{doc.roomNumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Rows */}
            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="grid min-w-[900px] hover:bg-slate-50/50 transition-colors"
                  style={{
                    gridTemplateColumns: `100px repeat(${displayDoctors.length}, minmax(220px, 1fr))`,
                  }}
                >
                  {/* Time Label */}
                  <div className="p-3 bg-[#F6F8FA] border-r border-slate-100 text-xs font-mono font-bold text-slate-600 flex items-center justify-center">
                    {slot}
                  </div>

                  {/* Slot per Doctor */}
                  {displayDoctors.map((doc) => {
                    const booking = dayAppointments.find(
                      (a) => a.doctorId === doc.id && a.timeSlot === slot
                    );
                    const theme = DOCTOR_THEMES[doc.id] || DEFAULT_THEME;

                    return (
                      <div
                        key={`${doc.id}-${slot}`}
                        className="p-2.5 border-r border-slate-100 last:border-r-0 min-h-[80px] flex flex-col justify-center"
                      >
                        {booking ? (
                          <div
                            className={`p-3 rounded-xl border ${theme.bg} ${theme.border} ${theme.stripe} text-xs space-y-1.5 shadow-2xs transition-all`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`font-bold truncate max-w-[130px] ${theme.textTitle}`}>
                                {booking.patientName}
                              </span>
                              {booking.status === "CHECKED_IN" && (
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full text-white font-bold shrink-0 ${theme.tokenBg}`}
                                >
                                  {booking.tokenNumber || "IN QUEUE"}
                                </span>
                              )}
                            </div>

                            {booking.status === "CHECKED_IN" && (
                              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                <CheckCircle size={13} weight="fill" />
                                <span>Checked-In &bull; Queue Active</span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 truncate">{booking.reason}</div>

                            {booking.status !== "CHECKED_IN" && (
                              <div className="pt-1">
                                <button
                                  onClick={() => handleOneClickCheckIn(booking)}
                                  className={`w-full py-1.5 px-2.5 rounded-lg text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${theme.btnPrimary}`}
                                >
                                  <CheckCircle size={12} weight="bold" />
                                  <span>Check In &amp; Token</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenBooking(doc.id, slot)}
                            className="w-full h-full min-h-[50px] border border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/40 text-[11px] font-medium transition-all group cursor-pointer"
                          >
                            <span className="group-hover:inline-flex items-center gap-1 hidden">
                              <Plus size={12} weight="bold" />
                              <span>Book Slot</span>
                            </span>
                            <span className="group-hover:hidden text-slate-300 font-light text-xs">
                              &mdash;
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-[24px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#F6F8FA]">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarBlank size={18} className="text-blue-600" weight="bold" />
                <span>Book New Outpatient Appointment</span>
              </h3>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor</label>
                  <select
                    value={bookingDocId}
                    onChange={(e) => setBookingDocId(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={bookingTimeSlot}
                    onChange={(e) => setBookingTimeSlot(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patient Full Name (Emirates ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sultan Khalfan Al-Suwaidi"
                  value={bookingPatientName}
                  onChange={(e) => setBookingPatientName(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Emirates ID Number
                  </label>
                  <input
                    type="text"
                    placeholder="784-1988-1234567-1"
                    value={bookingEmiratesId}
                    onChange={(e) => setBookingEmiratesId(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (+971)
                  </label>
                  <input
                    type="text"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Visit / Clinical Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine blood pressure review"
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-[24px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-[#F6F8FA]">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" weight="bold" />
                <span>Reschedule Appointment</span>
              </h3>
              <button
                onClick={() => setReschedulingApt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSaveReschedule} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-[#F6F8FA] border border-slate-200/80 text-xs space-y-1">
                <div className="font-bold text-slate-900">{reschedulingApt.patientName}</div>
                <div className="text-slate-500">
                  Doctor: <span className="font-semibold text-slate-700">{reschedulingApt.doctorName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Time Slot</label>
                <select
                  value={newRescheduleSlot}
                  onChange={(e) => setNewRescheduleSlot(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-blue-500 outline-none"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
