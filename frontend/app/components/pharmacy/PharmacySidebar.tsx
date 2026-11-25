"use client";

import React, { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { usePharmacy } from "@/app/context/PharmacyContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  Pill,
  Queue,
  QrCode,
  FileCode,
  Power,
  List,
  X,
  ShieldCheck,
  IdentificationBadge,
  Storefront,
} from "@phosphor-icons/react";

export function PharmacySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { erxQueue, claims, activeErxId, facilityProfile } = usePharmacy();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getTabFromPath = (p: string) => {
    if (p.includes("/pharmacy/dispense")) return "dispense";
    if (p.includes("/pharmacy/claims")) return "claims";
    return "queue";
  };

  const activeTab = getTabFromPath(pathname || "");

  const pendingCount = erxQueue.filter((e) => e.status !== "DISPENSED").length;
  const readyClaimsCount = claims.filter((c) => c.status !== "SUBMITTED_TO_HUB").length;

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
      label: "eRx Queue & Lookup",
      href: "/pharmacy/queue",
      icon: Queue,
      badgeCount: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: "dispense",
      label: "Dispense & Tatmeen",
      href: `/pharmacy/dispense/${activeErxId}`,
      icon: QrCode,
    },
    {
      id: "claims",
      label: "Pharmacy Claims & XML",
      href: "/pharmacy/claims",
      icon: FileCode,
      badgeCount: readyClaimsCount > 0 ? readyClaimsCount : undefined,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none p-5">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Pill size={20} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
              {facilityProfile.pharmacyName}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Pharmacist Portal
            </span>
          </div>
        </div>

        {/* Pharmacist & Facility Credentials Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
              NA
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || facilityProfile.pharmacistName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Licensed Clinical Pharmacist
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pharmacist ID</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
                <IdentificationBadge size={12} className="text-emerald-600" />
                {facilityProfile.pharmacistLicenseId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Facility ID</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
                <Storefront size={12} className="text-blue-600" />
                {facilityProfile.pharmacyLicenseId}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-400">Environment</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                {facilityProfile.dispositionFlag}
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Dispensary Desk
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    weight={isActive ? "fill" : "regular"}
                    className={isActive ? "text-white shrink-0" : "text-slate-400 shrink-0"}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badgeCount !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-700"
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

      {/* Bottom Compliance & Sign Out */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
            <ShieldCheck size={16} weight="fill" className="text-emerald-600 shrink-0" />
            <span>Tatmeen &amp; Riayati</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5 leading-snug">
            GS1 Track-and-Trace &amp; Activity Type 5 drug claims active.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        >
          <Power size={16} weight="bold" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-72 shrink-0 bg-white border-r border-slate-200/80 min-h-screen sticky top-0 h-screen">
        <div className="w-full h-full">{sidebarContent}</div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <Pill size={18} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 block leading-tight">
              {facilityProfile.pharmacyName}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase">
              Pharmacist Portal
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <List size={20} weight="bold" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X size={18} weight="bold" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
