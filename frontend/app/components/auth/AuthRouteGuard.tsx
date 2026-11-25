"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "../../context/AuthContext";
import {
  canRoleAccessPath,
  getDashboardForRole,
  isPublicRoute,
} from "../../lib/roleRouting";
import { motion } from "motion/react";
import { toast } from "sonner";

export function AuthLoadingScreen({
  message = "Verifying workspace access...",
}: {
  message?: string;
}) {
  return (
    <div
      aria-label={message}
      className="min-h-screen bg-gradient-to-br from-blue-50/90 via-white to-blue-100/60 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none"
    >
      {/* Subtle Ambient Blue Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-blue-200/35 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[320px] h-[320px] rounded-full bg-sky-100/50 blur-[100px] pointer-events-none" />

      {/* Precision Dot Grid */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="loading-grid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="18" cy="18" r="1" fill="#2563EB" fillOpacity="0.08" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#loading-grid)" />
      </svg>

      {/* Clean Centered Brand + Animated ECG Pulse (No White Box) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-3"
      >
        <div className="text-2xl font-bold tracking-tight text-slate-950">
          Mos<span className="text-blue-600">Ctd</span>
        </div>

        {/* Animated Heartbeat ECG SVG */}
        <svg
          viewBox="0 0 180 28"
          className="w-48 h-7 overflow-visible"
          fill="none"
        >
          <line
            x1="0"
            y1="14"
            x2="180"
            y2="14"
            stroke="#DBEAFE"
            strokeWidth="1.2"
          />
          <motion.path
            d="M 0,14 L 55,14 L 64,14 L 70,8 L 76,20 L 83,2 L 90,26 L 97,9 L 103,18 L 109,14 L 180,14"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{
              pathLength: [0, 1, 1],
              pathOffset: [0, 0, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/**
 * Global route guard enforcing authentication on all non-public pages,
 * strict role-based workspace isolation, and automatic redirects for
 * already-signed-in users visiting `/` or `/login`.
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const lastDeniedRef = useRef<string | null>(null);

  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const isPublic = isPublicRoute(normalizedPath);
  const isAuthRedirectRoute = normalizedPath === "/" || normalizedPath === "/login";

  useEffect(() => {
    if (isLoading) return;

    // 1. Logged-in users visiting "/" or "/login" automatically go to their role dashboard
    if (isAuthenticated && user && isAuthRedirectRoute) {
      router.replace(getDashboardForRole(user.role));
      return;
    }

    // 2. Unauthenticated users visiting any protected route automatically go to "/login"
    if (!isPublic && (!isAuthenticated || !user)) {
      router.replace("/login");
      return;
    }

    // 3. Authenticated users visiting a route outside their role are redirected to their own dashboard
    if (!isPublic && isAuthenticated && user && !canRoleAccessPath(user.role, normalizedPath)) {
      if (lastDeniedRef.current !== normalizedPath) {
        lastDeniedRef.current = normalizedPath;
        toast.error("Access restricted: redirected to your assigned workspace.");
      }
      router.replace(getDashboardForRole(user.role));
    } else {
      lastDeniedRef.current = null;
    }
  }, [isLoading, isAuthenticated, user, isPublic, isAuthRedirectRoute, normalizedPath, router]);

  // While session is restoring on protected or auth-redirect routes, hold rendering to prevent flash
  if (isLoading && (!isPublic || isAuthRedirectRoute)) {
    return <AuthLoadingScreen />;
  }

  // Signed-in user on "/" or "/login" is being redirected to their dashboard
  if (isAuthenticated && user && isAuthRedirectRoute) {
    return <AuthLoadingScreen message="Redirecting to your dashboard..." />;
  }

  // Unauthenticated user on a protected route is being redirected to "/login"
  if (!isPublic && (!isAuthenticated || !user)) {
    return <AuthLoadingScreen message="Redirecting to login..." />;
  }

  // Authenticated user on an unauthorized role route is being redirected
  if (!isPublic && isAuthenticated && user && !canRoleAccessPath(user.role, normalizedPath)) {
    return <AuthLoadingScreen message="Redirecting to your authorized workspace..." />;
  }

  return <>{children}</>;
}
