"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/app/context/AuthContext";
import { getDashboardForRole } from "@/app/lib/roleRouting";
import { AuthLoadingScreen } from "@/app/components/auth/AuthRouteGuard";

export default function DashboardRootPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace("/login");
    } else {
      router.replace(getDashboardForRole(user.role));
    }
  }, [isLoading, isAuthenticated, user, router]);

  return <AuthLoadingScreen message="Loading your workspace..." />;
}
