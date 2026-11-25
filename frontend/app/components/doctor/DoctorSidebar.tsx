"use client";

import React, { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useDoctor } from "@/app/context/DoctorContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  Stethoscope,
  UsersThree,
  Pill,
  ShieldCheck,
  Power,
  Hospital,
  List,
  X,
  IdentificationBadge,
} from "@phosphor-icons/react";

export function DoctorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { encounters, erxHistory, clinicianProfile } = useDoctor();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getTabFromPath = (p: string) => {
    if (p.includes("/consultation")) return "consultation";
    if (p.includes("/prescriptions")) return "prescriptions";
    return "queue";
  };

  const activeTab = getTabFromPath(pathname || "");
  const activeCount = encounters.filter(
    (e) => e.status === "WAITING" || e.status === "IN_CONSULTATION"
  ).length;
  const activeEncounter =
    encounters.find((e) => e.status === "IN_CONSULTATION") || encounters[0];

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  const mainNavItems = [
    {
      id: "queue",
      label: "Patient Queue",
      href: "/dashboard/doctor",
      icon: UsersThree,
      badgeCount: activeCount,
    },
    {
      id: "consultation",
      label: "Consultation Workbench",
      href: activeEncounter
        ? `/dashboard/doctor/consultation/${activeEncounter.id}`
        : "/dashboard/doctor",
      icon: Stethoscope,
    },
    {
      id: "prescriptions",
      label: "eRx History & Slips",
      href: "/dashboard/doctor/prescriptions",
      icon: Pill,
      badgeCount: erxHistory.length > 0 ? erxHistory.length : undefined,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none p-5">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Hospital size={20} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
              MOSCTD
            </span>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              Physician Portal
            </span>
          </div>
        </div>

        {/* Clinician Profile Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
              SH
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || clinicianProfile.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {clinicianProfile.specialty} &bull; {clinicianProfile.roomNumber}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-mono font-semibold text-slate-700">
            <IdentificationBadge size={13} className="text-blue-600 shrink-0" weight="bold" />
            <span className="truncate">{clinicianProfile.licenseNo}</span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Clinical Workspace
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    weight={isActive ? "bold" : "regular"}
                    className={isActive ? "text-blue-600" : "text-slate-400"}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Gateway Card & Sign Out */}
      <div className="pt-4 space-y-3">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
            <ShieldCheck size={20} weight="fill" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">DHA eClaimLink &amp; Riayati</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            ClaimSubmission.xml, PriorRequest.xml &amp; eRx gateway active.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200/80 text-slate-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Power size={15} weight="bold" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-xs">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          {isMobileOpen ? <X size={18} /> : <List size={18} />}
          <span>Menu</span>
        </button>
        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <Hospital size={15} weight="bold" />
          </div>
          <span>MOSCTD</span>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 md:hidden backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-64 h-full bg-[#F8FAFC] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 w-64 h-screen sticky top-0 bg-[#F8FAFC] border-r border-slate-200/80 z-40 select-none">
        {sidebarContent}
      </aside>
    </>
  );
}
