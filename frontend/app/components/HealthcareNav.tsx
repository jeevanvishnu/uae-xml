"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Hospital, SignOut } from "@phosphor-icons/react";

interface HealthcareNavProps {
  currentModuleTitle?: string;
  badgeText?: string;
  badgeColor?: string;
}

export function HealthcareNav({
  currentModuleTitle = "Healthcare Operations",
  badgeText,
  badgeColor = "text-sky-400 bg-sky-500/10 border-sky-500/20",
}: HealthcareNavProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-[var(--color-surface,#161B22)] border-b border-[var(--color-border,#243045)] select-none">
      {/* Top Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all">
              <Hospital size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wide text-white">
                  {user?.facility?.name || "MOSCTD"}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user?.facility?.emirate === "DXB" ? "DHA eClaimLink" : "MoHAP Riayati"}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {user?.facility?.dispositionFlag || "TEST"}
                </span>
                {badgeText && (
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-muted,#64748B)]">
                SenderID: <span className="font-mono text-slate-300 font-semibold">{user?.facility?.licenseId || "FAC-MOH-98765"}</span> &bull; {currentModuleTitle}
              </p>
            </div>
          </Link>
        </div>

        {/* User Info & Quick Sign Out */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{user?.name || "Authorized User"}</p>
            <p className="text-[10px] text-[var(--color-muted,#64748B)] capitalize">Role: {user?.role || "Staff"}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-lg bg-[var(--color-surface-raised,#202A3E)] hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-[var(--color-border,#243045)] transition-colors cursor-pointer"
          >
            <SignOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
