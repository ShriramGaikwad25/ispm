"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Placeholder for the upcoming NHI detail experience. Route is wired from NHI Inventory “View”.
 */
export function NhiInventoryDetailPageClient({ nhiId }: { nhiId: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <Link
        href="/non-human-identity/nhi-inventory"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        NHI Inventory
      </Link>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-8">
        <h1 className="text-2xl font-semibold text-slate-900">NHI details</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is reserved for the detailed NHI design. You opened the record for{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs shadow-sm">{nhiId}</code>.
        </p>
      </div>
    </div>
  );
}
