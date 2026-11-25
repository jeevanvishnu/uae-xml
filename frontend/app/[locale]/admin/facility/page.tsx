"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/lib/axios";
import { toast } from "sonner";
import { HealthcareNav } from "@/app/components/HealthcareNav";
import {
  Hospital,
  Buildings,
  Stethoscope,
  Plus,
  FloppyDisk,
  CheckCircle,
  ShieldCheck,
  UserGear,
  Clock,
  ArrowRight,
} from "@phosphor-icons/react";

interface FacilityData {
  id: string;
  name: string;
  emirate: "NE" | "DXB";
  licenseId: string;
  facilityType: "CLINIC" | "PHARMACY" | "HOSPITAL";
  dispositionFlag: "TEST" | "PRODUCTION";
  phone?: string;
  email?: string;
  address?: string;
  hubUsername?: string;
}

interface Clinician {
  id: string;
  name: string;
  licenseNumber: string;
  specialty: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export default function FacilitySettingsPage() {
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [stats, setStats] = useState<any>({});
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Add Clinician Modal
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [docName, setDocName] = useState("");
  const [docLicense, setDocLicense] = useState("");
  const [docSpecialty, setDocSpecialty] = useState("");
  const [docDept, setDocDept] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const fetchFacilityData = async () => {
    setIsLoading(true);
    try {
      const [facRes, docsRes] = await Promise.all([
        api.get("/facilities/current"),
        api.get("/facilities/clinicians"),
      ]);

      if (facRes.data?.success) {
        setFacility(facRes.data.data.facility);
        setStats(facRes.data.data.stats || {});
      }
      if (docsRes.data?.success) {
        setClinicians(docsRes.data.data.clinicians || []);
      }
    } catch (err: any) {
      toast.error("Failed to load facility configuration");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilityData();
  }, []);

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setIsSaving(true);
    try {
      const res = await api.put("/facilities/current", {
        name: facility.name,
        emirate: facility.emirate,
        licenseId: facility.licenseId,
        facilityType: facility.facilityType,
        dispositionFlag: facility.dispositionFlag,
        phone: facility.phone,
        email: facility.email,
        address: facility.address,
        hubUsername: facility.hubUsername,
      });

      if (res.data?.success) {
        toast.success("Facility settings updated successfully!");
        setFacility(res.data.data.facility);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClinician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docLicense || !docSpecialty) {
      toast.warning("Please fill in Doctor Name, License Number, and Specialty.");
      return;
    }

    setIsAddingDoc(true);
    try {
      const res = await api.post("/facilities/clinicians", {
        name: docName,
        licenseNumber: docLicense,
        specialty: docSpecialty,
        department: docDept,
      });

      if (res.data?.success) {
        toast.success(`Doctor ${docName} registered successfully!`);
        setShowAddDocModal(false);
        setDocName("");
        setDocLicense("");
        setDocSpecialty("");
        setDocDept("");
        fetchFacilityData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to register clinician");
    } finally {
      setIsAddingDoc(false);
    }
  };

  if (isLoading || !facility) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-400">
        Loading facility configuration...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg,#0D1117)] text-[var(--color-primary,#E2E8F0)] flex flex-col font-sans">
      <HealthcareNav
        currentModuleTitle="Facility License Settings & Clinician Management"
        badgeText="Admin"
        badgeColor="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Buildings className="text-sky-400" size={26} weight="duotone" />
            Facility Settings & Federal Hub Configuration
          </h1>
          <p className="text-xs text-[var(--color-muted,#64748B)] mt-1">
            Manage healthcare license, MoHAP Riayati / DHA eClaimLink credentials, and clinician roster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reception"
            className="px-4 py-2 bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-[var(--color-border,#243045)] transition-colors"
          >
            Reception Desk
          </Link>
          <Link
            href="/doctor"
            className="px-4 py-2 bg-[var(--color-surface-raised,#202A3E)] hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-[var(--color-border,#243045)] transition-colors"
          >
            Doctor Queue
          </Link>
          <Link
            href="/billing"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg transition-colors"
          >
            Claims Gateway
          </Link>
        </div>
      </div>

      {/* Main Grid: Settings & Clinicians */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Facility & Hub Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveFacility}
            className="bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)] space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Hospital size={18} className="text-sky-400" />
                Facility Regulatory Identity
              </h2>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <FloppyDisk size={16} />
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Facility Name</label>
                <input
                  type="text"
                  value={facility.name}
                  onChange={(e) => setFacility({ ...facility, name: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Facility Type</label>
                <select
                  value={facility.facilityType}
                  onChange={(e: any) => setFacility({ ...facility, facilityType: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="CLINIC">Medical Clinic / Polyclinic</option>
                  <option value="HOSPITAL">Hospital / Day Surgery Center</option>
                  <option value="PHARMACY">Community / In-House Pharmacy</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  License ID / SenderID (Riayati/DHA)
                </label>
                <input
                  type="text"
                  value={facility.licenseId}
                  onChange={(e) => setFacility({ ...facility, licenseId: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Used as SenderID in all XML transmissions.
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Emirate & Regulatory Switch</label>
                <select
                  value={facility.emirate}
                  onChange={(e: any) => setFacility({ ...facility, emirate: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 font-semibold text-emerald-400"
                >
                  <option value="NE">Northern Emirates (MoHAP Riayati)</option>
                  <option value="DXB">Dubai (DHA eClaimLink)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Disposition Flag</label>
                <select
                  value={facility.dispositionFlag}
                  onChange={(e: any) => setFacility({ ...facility, dispositionFlag: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 font-mono font-bold text-amber-300"
                >
                  <option value="TEST">TEST (Sandbox Simulation)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Claims Switch)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hub WebService Username</label>
                <input
                  type="text"
                  value={facility.hubUsername || ""}
                  onChange={(e) => setFacility({ ...facility, hubUsername: e.target.value })}
                  placeholder="e.g. mohap_ws_user"
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={facility.phone || ""}
                  onChange={(e) => setFacility({ ...facility, phone: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={facility.email || ""}
                  onChange={(e) => setFacility({ ...facility, email: e.target.value })}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Clinicians Roster */}
        <div className="space-y-6">
          <div className="bg-[var(--color-surface,#161B22)] p-6 rounded-xl border border-[var(--color-border,#243045)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope size={18} className="text-purple-400" />
                  Clinicians Roster
                </h2>
                <p className="text-[11px] text-slate-400">
                  {clinicians.length} licensed practitioners
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddDocModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                Add Clinician
              </button>
            </div>

            <div className="space-y-2.5 max-h-[450px] overflow-y-auto">
              {clinicians.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
                  No clinicians registered yet.
                </div>
              ) : (
                clinicians.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg bg-[var(--color-surface-raised,#192131)] border border-[var(--color-border,#243045)] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{doc.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        ACTIVE
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-sky-400">
                      License: {doc.licenseNumber}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Specialty: {doc.specialty} {doc.department && `(${doc.department})`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Clinician Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface,#161B22)] border border-[var(--color-border,#243045)] rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border,#243045)]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Stethoscope size={18} className="text-purple-400" />
                Register New Healthcare Clinician
              </h3>
              <button
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddClinician} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Clinician Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Tariq Al Hashimi"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  MoHAP / DHA Practitioner License No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. MOH-DOC-4421"
                  value={docLicense}
                  onChange={(e) => setDocLicense(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Internal Medicine, Cardiology, General Practice"
                  value={docSpecialty}
                  onChange={(e) => setDocSpecialty(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Department (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Outpatient Clinics"
                  value={docDept}
                  onChange={(e) => setDocDept(e.target.value)}
                  className="w-full bg-[var(--color-surface-raised,#1C2433)] border border-[var(--color-border,#243045)] rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-surface-raised,#202A3E)] text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDoc}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isAddingDoc ? "Registering..." : "Add Clinician"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
