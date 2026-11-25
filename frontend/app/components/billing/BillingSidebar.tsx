"use client";

import React, { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useBilling } from "@/app/context/BillingContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  ClipboardText,
  Package,
  Receipt,
  ArrowsClockwise,
  Power,
  Hospital,
  List,
  X,
  ShieldCheck,
  IdentificationBadge,
} from "@phosphor-icons/react";

export function BillingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { claims, batches, remittanceLines, resubmissions, facilityProfile } =
    useBilling();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getTabFromPath = (p: string) => {
    if (p.includes("/billing/batches")) return "batches";
    if (p.includes("/billing/remittance")) return "remittance";
    if (p.includes("/billing/resubmissions")) return "resubmissions";
    return "claims";
  };

  const activeTab = getTabFromPath(pathname || "");

  const readyCount = claims.filter(
    (c) => c.workflowStatus === "READY_FOR_CLAIM"
  ).length;
  const readyBatchesCount = batches.filter(
    (b) => b.status !== "SUBMITTED_TO_HUB"
  ).length;
  const deniedRemitCount = remittanceLines.filter(
    (r) => r.status !== "PAID" && r.resubmissionStatus !== "RESUBMITTED"
  ).length;
  const openResubCount = resubmissions.filter(
    (r) => r.status === "OPEN"
  ).length;

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
      id: "claims",
      label: "Claims Workbench",
      href: "/billing/claims",
      icon: ClipboardText,
      badgeCount: readyCount > 0 ? readyCount : undefined,
    },
    {
      id: "batches",
      label: "XML Batch Export",
      href: "/billing/batches",
      icon: Package,
      badgeCount: readyBatchesCount > 0 ? readyBatchesCount : undefined,
    },
    {
      id: "remittance",
      label: "Remittance Advice",
      href: "/billing/remittance",
      icon: Receipt,
      badgeCount: deniedRemitCount > 0 ? deniedRemitCount : undefined,
    },
    {
      id: "resubmissions",
      label: "Denials & Resubmission",
      href: "/billing/resubmissions",
      icon: ArrowsClockwise,
      badgeCount: openResubCount > 0 ? openResubCount : undefined,
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
              {facilityProfile.name}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              Billing &amp; RCM Portal
            </span>
          </div>
        </div>

        {/* Billing Officer Profile Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
              ZA
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || facilityProfile.officerName}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                Senior Billing Officer
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70 text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
              <IdentificationBadge size={12} className="text-blue-600" />
              {facilityProfile.licenseNo}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
              {facilityProfile.dispositionFlag}
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            RCM Workstation
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
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
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
                        : item.id === "resubmissions"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
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
            <span>eClaimLink / Riayati</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5 leading-snug">
            ClaimSubmission &amp; Remittance Hub gateway active.
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
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <Hospital size={18} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-slate-900 block leading-tight">
              {facilityProfile.name}
            </span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase">
              Billing Portal
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
