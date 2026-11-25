"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface QueuePatient {
  id: string;
  tokenNumber: string;
  priority: "NORMAL" | "PRIORITY" | "URGENT";
  patientName: string;
  emiratesId: string;
  phone: string;
  dob: string;
  gender: "Male" | "Female";
  visitType: "Walk-In" | "Appointment";
  insuranceStatus: "ACTIVE" | "CASH" | "EXPIRED" | "PENDING";
  payerName: string;
  payerId: string;
  memberId: string;
  network: string;
  copayPercent: number;
  copayAmount: number;
  paymentMethod: "Card" | "Cash" | "Waived";
  paymentStatus: "COLLECTED" | "PENDING" | "WAIVED";
  assignedDoctorId: string;
  assignedDoctorName: string;
  department: string;
  roomNumber: string;
  status: "WAITING" | "WITH_DOCTOR" | "COMPLETED" | "CANCELLED";
  checkInTime: string; // ISO string
  doctorCallTime?: string;
  completedTime?: string;
  receiptId: string;
  notes?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  roomNumber: string;
  status: "AVAILABLE" | "BUSY" | "ON_BREAK";
  consultationFee: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  emiratesId: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomNumber: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm AM/PM
  reason: string;
  insurancePayer: string;
  memberId: string;
  status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED";
  tokenNumber?: string;
}

export interface ReceiptRecord {
  id: string;
  tokenNumber: string;
  patientName: string;
  emiratesId: string;
  phone: string;
  date: string; // ISO
  doctorId: string;
  doctorName: string;
  department: string;
  serviceName: string;
  grossAmount: number;
  insuranceCovered: number;
  copayPercent: number;
  copayCollected: number;
  paymentMethod: "Card" | "Cash" | "Waived";
  cardAuthCode?: string;
  payerName: string;
  memberId: string;
  receptionistName: string;
  trnNumber: string;
  receiptType: "COPAY_RECEIPT" | "CASH_INVOICE";
}

export interface ShiftSummary {
  receptionistName: string;
  counterId: string;
  shiftTitle: string;
  shiftDate: string;
  openingFloat: number;
  cashCollected: number;
  cardCollected: number;
  totalCollected: number;
  waivedCount: number;
  transactionCount: number;
  isClosed: boolean;
  closedAt?: string;
  closureNotes?: string;
}

interface ReceptionContextType {
  queue: QueuePatient[];
  doctors: Doctor[];
  appointments: Appointment[];
  receipts: ReceiptRecord[];
  shift: ShiftSummary;
  selectedReceipt: ReceiptRecord | null;
  setSelectedReceipt: (receipt: ReceiptRecord | null) => void;
  // Actions
  checkInPatient: (data: Omit<QueuePatient, "id" | "tokenNumber" | "status" | "checkInTime" | "receiptId">) => { patient: QueuePatient; receipt: ReceiptRecord };
  updatePatientStatus: (patientId: string, status: QueuePatient["status"]) => void;
  checkInAppointment: (appointmentId: string, paymentMethod?: "Card" | "Cash" | "Waived") => { patient: QueuePatient; receipt: ReceiptRecord } | null;
  bookAppointment: (data: Omit<Appointment, "id" | "status">) => Appointment;
  cancelAppointment: (appointmentId: string) => void;
  rescheduleAppointment: (appointmentId: string, date: string, timeSlot: string) => void;
  closeShift: (notes: string) => void;
  reopenShift: () => void;
  resetAllData: () => void;
}

const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Sarah Al-Hashimi",
    specialty: "Internal Medicine & Chronic Care",
    roomNumber: "Consultation Suite 102",
    status: "AVAILABLE",
    consultationFee: 300,
  },
  {
    id: "doc-2",
    name: "Dr. Tariq Mansoor",
    specialty: "Cardiology & Preventive Health",
    roomNumber: "Cardio Suite 105",
    status: "BUSY",
    consultationFee: 450,
  },
  {
    id: "doc-3",
    name: "Dr. Reem Al-Nuaimi",
    specialty: "Pediatrics & Child Wellness",
    roomNumber: "Pediatric Clinic 101",
    status: "AVAILABLE",
    consultationFee: 250,
  },
  {
    id: "doc-4",
    name: "Dr. Marcus Vance",
    specialty: "Orthopedics & Sports Medicine",
    roomNumber: "Ortho Suite 108",
    status: "AVAILABLE",
    consultationFee: 400,
  },
  {
    id: "doc-5",
    name: "Dr. Laila Bin Haider",
    specialty: "Obstetrics & Gynecology",
    roomNumber: "Women's Health 204",
    status: "AVAILABLE",
    consultationFee: 350,
  },
];

// Helper to generate UAE today's date
const getTodayDateString = () => new Date().toISOString().split("T")[0];

const INITIAL_QUEUE: QueuePatient[] = [
  {
    id: "pat-q-1",
    tokenNumber: "TK-101",
    priority: "PRIORITY",
    patientName: "Rashid Sultan Al-Ketbi",
    emiratesId: "784-1985-2345671-3",
    phone: "+971 50 482 1928",
    dob: "1985-04-12",
    gender: "Male",
    visitType: "Walk-In",
    insuranceStatus: "ACTIVE",
    payerName: "National Health Insurance (Daman)",
    payerId: "INS-DAMAN-01",
    memberId: "DAM-902381-01",
    network: "Enhanced Tier 1",
    copayPercent: 10,
    copayAmount: 30,
    paymentMethod: "Card",
    paymentStatus: "COLLECTED",
    assignedDoctorId: "doc-1",
    assignedDoctorName: "Dr. Sarah Al-Hashimi",
    department: "Internal Medicine",
    roomNumber: "Suite 102",
    status: "WAITING",
    checkInTime: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    receiptId: "REC-2026-0841",
    notes: "Patient reports mild seasonal allergy flare-up",
  },
  {
    id: "pat-q-2",
    tokenNumber: "TK-102",
    priority: "NORMAL",
    patientName: "Mariam Salem Al-Nuaimi",
    emiratesId: "784-1992-8712349-8",
    phone: "+971 52 891 0022",
    dob: "1992-11-20",
    gender: "Female",
    visitType: "Appointment",
    insuranceStatus: "ACTIVE",
    payerName: "Sukoon Insurance (Oman)",
    payerId: "INS-SUKOON-01",
    memberId: "SUK-771239-00",
    network: "Comprehensive Plus",
    copayPercent: 20,
    copayAmount: 50,
    paymentMethod: "Card",
    paymentStatus: "COLLECTED",
    assignedDoctorId: "doc-2",
    assignedDoctorName: "Dr. Tariq Mansoor",
    department: "Cardiology",
    roomNumber: "Suite 105",
    status: "WITH_DOCTOR",
    checkInTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    doctorCallTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    receiptId: "REC-2026-0842",
    notes: "Follow-up Holter monitor readout review",
  },
  {
    id: "pat-q-3",
    tokenNumber: "TK-103",
    priority: "URGENT",
    patientName: "Zaid Mohammed Al-Zaabi",
    emiratesId: "784-2018-4509123-5",
    phone: "+971 56 312 9944",
    dob: "2018-06-15",
    gender: "Male",
    visitType: "Walk-In",
    insuranceStatus: "ACTIVE",
    payerName: "Thiqa (Daman Government)",
    payerId: "INS-THIQA-01",
    memberId: "THQ-991200-01",
    network: "Full UAE Network",
    copayPercent: 0,
    copayAmount: 0,
    paymentMethod: "Waived",
    paymentStatus: "WAIVED",
    assignedDoctorId: "doc-3",
    assignedDoctorName: "Dr. Reem Al-Nuaimi",
    department: "Pediatrics",
    roomNumber: "Clinic 101",
    status: "WAITING",
    checkInTime: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    receiptId: "REC-2026-0843",
    notes: "Acute earache with low-grade pyrexia",
  },
  {
    id: "pat-q-4",
    tokenNumber: "TK-104",
    priority: "NORMAL",
    patientName: "Carlos Javier Mendez",
    emiratesId: "784-1989-1092837-4",
    phone: "+971 55 776 2311",
    dob: "1989-03-05",
    gender: "Male",
    visitType: "Walk-In",
    insuranceStatus: "CASH",
    payerName: "Self-Pay / Cash Patient",
    payerId: "CASH",
    memberId: "N/A",
    network: "Direct Settlement",
    copayPercent: 100,
    copayAmount: 400,
    paymentMethod: "Cash",
    paymentStatus: "COLLECTED",
    assignedDoctorId: "doc-4",
    assignedDoctorName: "Dr. Marcus Vance",
    department: "Orthopedics",
    roomNumber: "Suite 108",
    status: "WAITING",
    checkInTime: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    receiptId: "REC-2026-0844",
    notes: "Right knee strain after padel match",
  },
  {
    id: "pat-q-5",
    tokenNumber: "TK-105",
    priority: "NORMAL",
    patientName: "Fatima Noor Al-Hashemi",
    emiratesId: "784-1995-6543210-9",
    phone: "+971 50 918 3344",
    dob: "1995-09-14",
    gender: "Female",
    visitType: "Appointment",
    insuranceStatus: "ACTIVE",
    payerName: "AXA Gulf Insurance",
    payerId: "INS-AXA-01",
    memberId: "AXA-882310-99",
    network: "MedNet Gold",
    copayPercent: 20,
    copayAmount: 70,
    paymentMethod: "Card",
    paymentStatus: "COLLECTED",
    assignedDoctorId: "doc-5",
    assignedDoctorName: "Dr. Laila Bin Haider",
    department: "Obstetrics & Gynecology",
    roomNumber: "Suite 204",
    status: "COMPLETED",
    checkInTime: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    doctorCallTime: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    completedTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    receiptId: "REC-2026-0840",
    notes: "Routine 2nd trimester antenatal check",
  },
];

const INITIAL_RECEIPTS: ReceiptRecord[] = [
  {
    id: "REC-2026-0840",
    tokenNumber: "TK-105",
    patientName: "Fatima Noor Al-Hashemi",
    emiratesId: "784-1995-6543210-9",
    phone: "+971 50 918 3344",
    date: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    doctorId: "doc-5",
    doctorName: "Dr. Laila Bin Haider",
    department: "Obstetrics & Gynecology",
    serviceName: "Specialist Antenatal Consultation",
    grossAmount: 350,
    insuranceCovered: 280,
    copayPercent: 20,
    copayCollected: 70,
    paymentMethod: "Card",
    cardAuthCode: "AUTH-892102",
    payerName: "AXA Gulf Insurance",
    memberId: "AXA-882310-99",
    receptionistName: "Fatima Al-Mansouri",
    trnNumber: "TRN-100482910300003",
    receiptType: "COPAY_RECEIPT",
  },
  {
    id: "REC-2026-0841",
    tokenNumber: "TK-101",
    patientName: "Rashid Sultan Al-Ketbi",
    emiratesId: "784-1985-2345671-3",
    phone: "+971 50 482 1928",
    date: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    doctorId: "doc-1",
    doctorName: "Dr. Sarah Al-Hashimi",
    department: "Internal Medicine",
    serviceName: "General Medical Consultation",
    grossAmount: 300,
    insuranceCovered: 270,
    copayPercent: 10,
    copayCollected: 30,
    paymentMethod: "Card",
    cardAuthCode: "AUTH-341982",
    payerName: "National Health Insurance (Daman)",
    memberId: "DAM-902381-01",
    receptionistName: "Fatima Al-Mansouri",
    trnNumber: "TRN-100482910300003",
    receiptType: "COPAY_RECEIPT",
  },
  {
    id: "REC-2026-0842",
    tokenNumber: "TK-102",
    patientName: "Mariam Salem Al-Nuaimi",
    emiratesId: "784-1992-8712349-8",
    phone: "+971 52 891 0022",
    date: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    doctorId: "doc-2",
    doctorName: "Dr. Tariq Mansoor",
    department: "Cardiology",
    serviceName: "Cardiology Specialist Follow-up",
    grossAmount: 450,
    insuranceCovered: 400,
    copayPercent: 20,
    copayCollected: 50,
    paymentMethod: "Card",
    cardAuthCode: "AUTH-771920",
    payerName: "Sukoon Insurance (Oman)",
    memberId: "SUK-771239-00",
    receptionistName: "Fatima Al-Mansouri",
    trnNumber: "TRN-100482910300003",
    receiptType: "COPAY_RECEIPT",
  },
  {
    id: "REC-2026-0843",
    tokenNumber: "TK-103",
    patientName: "Zaid Mohammed Al-Zaabi",
    emiratesId: "784-2018-4509123-5",
    phone: "+971 56 312 9944",
    date: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    doctorId: "doc-3",
    doctorName: "Dr. Reem Al-Nuaimi",
    department: "Pediatrics",
    serviceName: "Pediatric Consultation (Thiqa 100%)",
    grossAmount: 250,
    insuranceCovered: 250,
    copayPercent: 0,
    copayCollected: 0,
    paymentMethod: "Waived",
    payerName: "Thiqa (Daman Government)",
    memberId: "THQ-991200-01",
    receptionistName: "Fatima Al-Mansouri",
    trnNumber: "TRN-100482910300003",
    receiptType: "COPAY_RECEIPT",
  },
  {
    id: "REC-2026-0844",
    tokenNumber: "TK-104",
    patientName: "Carlos Javier Mendez",
    emiratesId: "784-1989-1092837-4",
    phone: "+971 55 776 2311",
    date: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    doctorId: "doc-4",
    doctorName: "Dr. Marcus Vance",
    department: "Orthopedics",
    serviceName: "Orthopedic Initial Consultation (Cash)",
    grossAmount: 400,
    insuranceCovered: 0,
    copayPercent: 100,
    copayCollected: 400,
    paymentMethod: "Cash",
    payerName: "Self-Pay / Cash Patient",
    memberId: "N/A",
    receptionistName: "Fatima Al-Mansouri",
    trnNumber: "TRN-100482910300003",
    receiptType: "CASH_INVOICE",
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-1",
    patientName: "Mariam Salem Al-Nuaimi",
    emiratesId: "784-1992-8712349-8",
    phone: "+971 52 891 0022",
    doctorId: "doc-2",
    doctorName: "Dr. Tariq Mansoor",
    specialty: "Cardiology",
    roomNumber: "Suite 105",
    date: getTodayDateString(),
    timeSlot: "09:30 AM",
    reason: "Hypertension medication review",
    insurancePayer: "Sukoon Insurance (Oman)",
    memberId: "SUK-771239-00",
    status: "CHECKED_IN",
    tokenNumber: "TK-102",
  },
  {
    id: "apt-2",
    patientName: "Fatima Noor Al-Hashemi",
    emiratesId: "784-1995-6543210-9",
    phone: "+971 50 918 3344",
    doctorId: "doc-5",
    doctorName: "Dr. Laila Bin Haider",
    specialty: "Obstetrics & Gynecology",
    roomNumber: "Suite 204",
    date: getTodayDateString(),
    timeSlot: "10:00 AM",
    reason: "Antenatal routine scan",
    insurancePayer: "AXA Gulf Insurance",
    memberId: "AXA-882310-99",
    status: "CHECKED_IN",
    tokenNumber: "TK-105",
  },
  {
    id: "apt-3",
    patientName: "Hamad Abdulla Al-Mazrouei",
    emiratesId: "784-1976-9021823-1",
    phone: "+971 50 671 2299",
    doctorId: "doc-1",
    doctorName: "Dr. Sarah Al-Hashimi",
    specialty: "Internal Medicine",
    roomNumber: "Suite 102",
    date: getTodayDateString(),
    timeSlot: "11:30 AM",
    reason: "HbA1c diabetes follow-up",
    insurancePayer: "National Health Insurance (Daman)",
    memberId: "DAM-109283-02",
    status: "SCHEDULED",
  },
  {
    id: "apt-4",
    patientName: "Ananya Sharma",
    emiratesId: "784-1994-4321098-7",
    phone: "+971 54 443 1209",
    doctorId: "doc-3",
    doctorName: "Dr. Reem Al-Nuaimi",
    specialty: "Pediatrics",
    roomNumber: "Clinic 101",
    date: getTodayDateString(),
    timeSlot: "12:00 PM",
    reason: "18-Month immunization package",
    insurancePayer: "MedNet UAE (TPA)",
    memberId: "MDN-382910-1",
    status: "SCHEDULED",
  },
  {
    id: "apt-5",
    patientName: "Khalfan Saeed Al-Dhaheri",
    emiratesId: "784-1981-5544332-0",
    phone: "+971 50 221 8877",
    doctorId: "doc-4",
    doctorName: "Dr. Marcus Vance",
    specialty: "Orthopedics",
    roomNumber: "Suite 108",
    date: getTodayDateString(),
    timeSlot: "02:30 PM",
    reason: "Post-surgery knee inspection",
    insurancePayer: "National Health Insurance (Daman)",
    memberId: "DAM-448291-03",
    status: "SCHEDULED",
  },
  {
    id: "apt-6",
    patientName: "Sophie Laurent",
    emiratesId: "784-1990-7766554-2",
    phone: "+971 58 554 9911",
    doctorId: "doc-2",
    doctorName: "Dr. Tariq Mansoor",
    specialty: "Cardiology",
    roomNumber: "Suite 105",
    date: getTodayDateString(),
    timeSlot: "03:15 PM",
    reason: "ECG stress test follow-up",
    insurancePayer: "NextCare Health (Allianz)",
    memberId: "NXT-902182-44",
    status: "SCHEDULED",
  },
];

const ReceptionContext = createContext<ReceptionContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "uae_ectd_reception_v1";

export function ReceptionProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuePatient[]>(INITIAL_QUEUE);
  const [doctors] = useState<Doctor[]>(DEFAULT_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(INITIAL_RECEIPTS);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);

  const [shift, setShift] = useState<ShiftSummary>({
    receptionistName: "Fatima Al-Mansouri",
    counterId: "Front Desk POS-01",
    shiftTitle: "Morning Shift (08:00 AM - 04:00 PM)",
    shiftDate: getTodayDateString(),
    openingFloat: 500.0,
    cashCollected: 400.0,
    cardCollected: 150.0,
    totalCollected: 550.0,
    waivedCount: 1,
    transactionCount: 5,
    isClosed: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.queue) setQueue(parsed.queue);
        if (parsed.appointments) setAppointments(parsed.appointments);
        if (parsed.receipts) setReceipts(parsed.receipts);
        if (parsed.shift) setShift(parsed.shift);
      }
    } catch (e) {
      console.warn("Could not parse saved reception state, using initial seed data", e);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ queue, appointments, receipts, shift })
      );
    } catch (e) {
      console.warn("Failed to persist reception state", e);
    }
  }, [queue, appointments, receipts, shift]);

  // Recalculate shift collection totals whenever receipts change
  useEffect(() => {
    let cash = 0;
    let card = 0;
    let waived = 0;

    receipts.forEach((r) => {
      if (r.paymentMethod === "Cash") {
        cash += r.copayCollected;
      } else if (r.paymentMethod === "Card") {
        card += r.copayCollected;
      } else {
        waived += 1;
      }
    });

    setShift((prev) => ({
      ...prev,
      cashCollected: cash,
      cardCollected: card,
      totalCollected: cash + card,
      waivedCount: waived,
      transactionCount: receipts.length,
    }));
  }, [receipts]);

  // Check In Patient (Walk-in or New registration)
  const checkInPatient = (
    data: Omit<QueuePatient, "id" | "tokenNumber" | "status" | "checkInTime" | "receiptId">
  ) => {
    const nextTokenNum = 100 + queue.length + 1;
    const tokenNumber = `TK-${nextTokenNum}`;
    const patientId = `pat-q-${Date.now()}`;
    const receiptId = `REC-2026-0${840 + receipts.length + 1}`;
    const checkInTime = new Date().toISOString();

    const newPatient: QueuePatient = {
      ...data,
      id: patientId,
      tokenNumber,
      status: "WAITING",
      checkInTime,
      receiptId,
    };

    const newReceipt: ReceiptRecord = {
      id: receiptId,
      tokenNumber,
      patientName: data.patientName,
      emiratesId: data.emiratesId,
      phone: data.phone,
      date: checkInTime,
      doctorId: data.assignedDoctorId,
      doctorName: data.assignedDoctorName,
      department: data.department,
      serviceName: `${data.department} Consultation`,
      grossAmount: data.insuranceStatus === "CASH" ? data.copayAmount : (data.copayAmount > 0 ? (data.copayAmount / (data.copayPercent / 100)) : 300),
      insuranceCovered: data.insuranceStatus === "CASH" ? 0 : ((data.copayAmount > 0 ? (data.copayAmount / (data.copayPercent / 100)) : 300) - data.copayAmount),
      copayPercent: data.copayPercent,
      copayCollected: data.copayAmount,
      paymentMethod: data.paymentMethod,
      cardAuthCode: data.paymentMethod === "Card" ? `AUTH-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      payerName: data.payerName,
      memberId: data.memberId,
      receptionistName: shift.receptionistName,
      trnNumber: "TRN-100482910300003",
      receiptType: data.insuranceStatus === "CASH" ? "CASH_INVOICE" : "COPAY_RECEIPT",
    };

    setQueue((prev) => [newPatient, ...prev]);
    setReceipts((prev) => [newReceipt, ...prev]);
    setSelectedReceipt(newReceipt);

    return { patient: newPatient, receipt: newReceipt };
  };

  // Update Status in Waiting Queue
  const updatePatientStatus = (patientId: string, status: QueuePatient["status"]) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === patientId) {
          const now = new Date().toISOString();
          return {
            ...item,
            status,
            doctorCallTime: status === "WITH_DOCTOR" ? now : item.doctorCallTime,
            completedTime: status === "COMPLETED" ? now : item.completedTime,
          };
        }
        return item;
      })
    );
  };

  // 1-Click Check-In for Scheduled Appointment
  const checkInAppointment = (
    appointmentId: string,
    paymentMethod: "Card" | "Cash" | "Waived" = "Card"
  ) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return null;

    const doctor = doctors.find((d) => d.id === apt.doctorId) || doctors[0];
    const isCash = apt.insurancePayer.toLowerCase().includes("cash") || apt.insurancePayer.toLowerCase().includes("self");

    const copayPct = isCash ? 100 : 20;
    const copayAmt = isCash ? doctor.consultationFee : Math.min(50, (doctor.consultationFee * copayPct) / 100);

    const { patient, receipt } = checkInPatient({
      patientName: apt.patientName,
      emiratesId: apt.emiratesId,
      phone: apt.phone,
      dob: "1990-01-01",
      gender: "Male",
      priority: "NORMAL",
      visitType: "Appointment",
      insuranceStatus: isCash ? "CASH" : "ACTIVE",
      payerName: apt.insurancePayer,
      payerId: "INS-AUTO",
      memberId: apt.memberId || "AUTO-MEM-01",
      network: "Standard Network",
      copayPercent: copayPct,
      copayAmount: copayAmt,
      paymentMethod,
      paymentStatus: paymentMethod === "Waived" ? "WAIVED" : "COLLECTED",
      assignedDoctorId: doctor.id,
      assignedDoctorName: doctor.name,
      department: doctor.specialty.split("&")[0].trim(),
      roomNumber: doctor.roomNumber,
      notes: `Pre-booked visit: ${apt.reason}`,
    });

    // Mark appointment as checked-in
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId
          ? { ...a, status: "CHECKED_IN", tokenNumber: patient.tokenNumber }
          : a
      )
    );

    return { patient, receipt };
  };

  // Book New Appointment
  const bookAppointment = (data: Omit<Appointment, "id" | "status">) => {
    const newApt: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      status: "SCHEDULED",
    };
    setAppointments((prev) => [...prev, newApt]);
    return newApt;
  };

  const cancelAppointment = (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: "CANCELLED" } : a))
    );
  };

  const rescheduleAppointment = (appointmentId: string, date: string, timeSlot: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, date, timeSlot } : a))
    );
  };

  const closeShift = (notes: string) => {
    setShift((prev) => ({
      ...prev,
      isClosed: true,
      closedAt: new Date().toISOString(),
      closureNotes: notes,
    }));
  };

  const reopenShift = () => {
    setShift((prev) => ({
      ...prev,
      isClosed: false,
      closedAt: undefined,
      closureNotes: undefined,
    }));
  };

  const resetAllData = () => {
    setQueue(INITIAL_QUEUE);
    setAppointments(INITIAL_APPOINTMENTS);
    setReceipts(INITIAL_RECEIPTS);
    setShift({
      receptionistName: "Fatima Al-Mansouri",
      counterId: "Front Desk POS-01",
      shiftTitle: "Morning Shift (08:00 AM - 04:00 PM)",
      shiftDate: getTodayDateString(),
      openingFloat: 500.0,
      cashCollected: 400.0,
      cardCollected: 150.0,
      totalCollected: 550.0,
      waivedCount: 1,
      transactionCount: 5,
      isClosed: false,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <ReceptionContext.Provider
      value={{
        queue,
        doctors,
        appointments,
        receipts,
        shift,
        selectedReceipt,
        setSelectedReceipt,
        checkInPatient,
        updatePatientStatus,
        checkInAppointment,
        bookAppointment,
        cancelAppointment,
        rescheduleAppointment,
        closeShift,
        reopenShift,
        resetAllData,
      }}
    >
      {children}
    </ReceptionContext.Provider>
  );
}

export function useReception() {
  const context = useContext(ReceptionContext);
  if (!context) {
    throw new Error("useReception must be used within a ReceptionProvider");
  }
  return context;
}
