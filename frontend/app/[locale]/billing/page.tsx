"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";

export default function BillingRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/billing/claims");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>Loading Claims Workbench...</span>
      </div>
    </div>
  );
}
