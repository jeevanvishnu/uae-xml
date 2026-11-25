"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/reception");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-slate-400 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
        <span>Loading Reception Workstation...</span>
      </div>
    </div>
  );
}
