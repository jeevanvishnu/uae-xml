"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IdentificationCard,
  Stethoscope,
  Pill,
  Receipt,
  Money,
  Buildings,
  SquaresFour,
  SignOut,
  Hospital,
} from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const healthcareNavItems = [
    {
      name: "Executive Overview",
      href: "/dashboard",
      icon: SquaresFour,
    },
    {
      name: "Reception & Eligibility",
      href: "/reception",
      icon: IdentificationCard,
    },
    {
      name: "Doctor Consultation",
      href: "/doctor",
      icon: Stethoscope,
    },
    {
      name: "Pharmacy & eRx",
      href: "/pharmacy",
      icon: Pill,
    },
    {
      name: "Billing & Claims",
      href: "/billing",
      icon: Receipt,
    },
    {
      name: "Remittance Advice",
      href: "/billing/remittance",
      icon: Money,
    },
    {
      name: "Facility & Clinicians",
      href: "/admin/facility",
      icon: Buildings,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("[Sidebar] Error during logout:", error);
    }
  };

  return (
    <aside className="w-64 bg-[var(--color-surface,#161B22)] border-r border-[var(--color-border,#243045)] flex flex-col h-full text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--color-border,#243045)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
          <Hospital size={22} weight="duotone" />
        </div>
        <div className="overflow-hidden">
          <h2 className="font-bold text-sm text-white truncate">
            {user?.facility?.name || "Al Noor Medical"}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {user?.facility?.emirate === "DXB" ? "DHA" : "Riayati"}
            </span>
            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-300">
              {user?.facility?.dispositionFlag || "TEST"}
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Clinical & Claims Modules
        </div>

        {healthcareNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-[var(--color-surface-raised,#192131)]"
              }`}
            >
              <Icon size={18} weight={isActive ? "fill" : "regular"} className="shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-[var(--color-border,#243045)] bg-[var(--color-surface-raised,#192131)]/50">
        <div className="flex items-center justify-between">
          <div className="truncate mr-2">
            <p className="text-xs font-semibold text-white truncate">
              {user?.name || "Authorized User"}
            </p>
            <p className="text-[10px] text-slate-400 capitalize truncate">
              {user?.role || "Staff"} &bull; {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-lg bg-[var(--color-surface,#161B22)] hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-[var(--color-border,#243045)] transition-colors cursor-pointer shrink-0"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
