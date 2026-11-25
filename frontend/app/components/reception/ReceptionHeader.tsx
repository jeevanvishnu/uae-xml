"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReception } from "@/app/context/ReceptionContext";
import {
  UsersThree,
  UserPlus,
  CalendarCheck,
  Receipt,
  Clock,
  Broadcast,
  PlusCircle,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";

export function ReceptionHeader() {
  const pathname = usePathname();
  const { queue, shift } = useReception();

  // UAE Gulf Standard Time (GST, UTC+4) Live Clock
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-AE", {
          timeZone: "Asia/Dubai",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const waitingCount = queue.filter((p) => p.status === "WAITING").length;
  const withDoctorCount = queue.filter((p) => p.status === "WITH_DOCTOR").length;

  const tabs = [
    {
      label: "Live Queue & Dashboard",
      href: "/reception/dashboard",
      icon: UsersThree,
      badge: waitingCount > 0 ? `${waitingCount} Waiting` : undefined,
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      label: "Patient Check-In & Eligibility",
      href: "/reception/check-in",
      icon: UserPlus,
    },
    {
      label: "Appointments Calendar",
      href: "/reception/appointments",
      icon: CalendarCheck,
    },
    {
      label: "Receipts & Cash Closing",
      href: "/reception/receipts",
      icon: Receipt,
      badge: shift.isClosed ? "Shift Closed" : `AED ${shift.totalCollected.toFixed(0)}`,
      badgeColor: shift.isClosed ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <div className="bg-[#141A24] border-b border-[#243045] px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            // Active if exact match or root /reception matches dashboard
            const isActive =
              pathname === tab.href ||
              (pathname?.endsWith("/reception") && tab.href === "/reception/dashboard") ||
              pathname?.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-sky-500 text-white border-sky-400 font-semibold shadow-sm shadow-sky-500/30"
                    : "text-slate-300 hover:text-white bg-[#1A2230] border-[#253246] hover:bg-[#202A3E]"
                }`}
              >
                <Icon size={16} weight={isActive ? "bold" : "regular"} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full border font-semibold ${
                      isActive ? "bg-white/20 text-white border-white/30" : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Live Reception Station Status & Quick Action */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Live Clock (GST) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A2230] border border-[#243045] text-[11px] text-slate-300 font-mono">
            <Clock size={13} className="text-sky-400" />
            <span>UAE GST:</span>
            <span className="text-white font-bold">{currentTime || "--:--:--"}</span>
          </div>

          {/* Quick Counter Info */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
            <Broadcast size={13} className="text-emerald-400 animate-pulse" />
            <span className="font-semibold">{shift.counterId}</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-400">{withDoctorCount} in Consultation</span>
          </div>

          {/* Quick Check-In CTA */}
          <Link
            href="/reception/check-in"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <PlusCircle size={15} weight="bold" />
            <span>+ New Check-In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
