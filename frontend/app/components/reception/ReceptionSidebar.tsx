"use client";

import React, { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useReception } from "@/app/context/ReceptionContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  SquaresFour,
  IdentificationCard,
  CalendarBlank,
  Receipt,
  Power,
  User,
  Hospital,
  List,
  X,
  CaretDown,
  ShieldCheck,
} from "@phosphor-icons/react";

export function ReceptionSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { queue, shift } = useReception();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Map route to tab ID
  const getTabFromPath = (p: string) => {
    if (p.includes("check-in")) return "checkin";
    if (p.includes("appointments")) return "appointments";
    if (p.includes("receipts")) return "receipts";
    return "queue";
  };

  const activeTab = getTabFromPath(pathname || "");
  const waitingCount = queue.filter((p) => p.status === "WAITING").length;

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  // Main Menu Navigation Items (matching reference layout)
  const mainNavItems = [
    {
      id: "queue",
      label: "Live Queue",
      href: "/dashboard/reception",
      icon: SquaresFour,
      badgeCount: waitingCount,
    },
    {
      id: "checkin",
      label: "Patient Check-In",
      href: "/dashboard/reception/check-in",
      icon: IdentificationCard,
    },
    {
      id: "appointments",
      label: "Appointments",
      href: "/dashboard/reception/appointments",
      icon: CalendarBlank,
    },
    {
      id: "receipts",
      label: "Receipts & Invoices",
      href: "/dashboard/reception/receipts",
      icon: Receipt,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none p-5">
      {/* Top Section */}
      <div className="space-y-5">
        {/* 1. Brand Logo Header */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Hospital size={20} weight="bold" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
              Al Noor Clinic
            </span>
          </div>
        </div>

        {/* 2. User Profile Card (Jenny Wilson / Personal Account style) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between shadow-2xs hover:bg-slate-100/70 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/90 bg-slate-100 flex items-center justify-center">
              <img
                src="/Profile Avatar of Older Man.svg"
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.name || shift.receptionistName || "Fatima Al-Zahra"}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {shift.counterId ? `${shift.counterId} • Reception` : "Reception Desk"}
              </div>
            </div>
          </div>
          <CaretDown size={14} className="text-slate-400 shrink-0 ml-1" />
        </div>

        {/* 3. Main Menu Navigation */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
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
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${isActive
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

      {/* Bottom Section: Clinic Status Card & Sign Out (Matching "Upgrade Plan" card) */}
      <div className="pt-4 space-y-3">
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-2">
            <ShieldCheck size={20} weight="fill" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">MoHAP &bull; Riayati Synced</h4>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
            Real-time eClaimLink &amp; Malaffi insurance eligibility gateway active.
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
          <span>Al Noor Clinic</span>
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

      {/* Desktop Expanded Sidebar (~240px wide matching reference) */}
      <aside className="hidden md:flex flex-col shrink-0 w-64 h-screen sticky top-0 bg-[#F8FAFC] border-r border-slate-200/80 z-40 select-none">
        {sidebarContent}
      </aside>
    </>
  );
}
