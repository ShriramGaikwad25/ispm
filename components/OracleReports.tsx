"use client";

import React from "react";
import { ClipboardList, Clock4, UserX, FileClock, UserMinus } from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import type { LucideIcon } from "lucide-react";

type OracleReportCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  flipDescription?: string;
};

const ORACLE_REPORT_CARDS: OracleReportCard[] = [
  {
    title: "Access Request Report",
    description:
      "Aggregates access requests, approvals, and rejections related to Oracle applications to support compliance reviews.",
    icon: ClipboardList,
    href: "#",
  },
  {
    title: "Target Application Last Logon Report",
    description:
      "Highlights last-login timestamps for Oracle target application accounts to help spot inactive or stale access.",
    icon: Clock4,
    href: "#",
  },
  {
    title: "Deleted Target Application Accounts Report",
    description:
      "Summarizes accounts deleted in Oracle target applications so you can validate deprovisioning and audit trails.",
    icon: UserX,
    href: "/oracle-reports/deleted-target-application-accounts",
  },
  {
    title: "User Access History Report",
    description:
      "Provides a chronological view of user access changes across Oracle applications for investigations and audits.",
    icon: FileClock,
    href: "/oracle-reports/user-access-history-report",
  },
  {
    title: "Orphan Account Report",
    description:
      "Shows Oracle accounts that are no longer linked to active identities, helping you detect and remediate orphaned access.",
    icon: UserMinus,
    href: "/oracle-reports/orphan-account",
  },
];

export default function OracleReports() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Oracle Reports
          </h1>
          <p className="text-sm text-gray-600 mb-6 max-w-2xl">
            Choose an Oracle report to view.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ORACLE_REPORT_CARDS.map((card) => (
              <DashboardCard
                key={card.title}
                title={card.title}
                href={card.href}
                icon={card.icon}
                description={card.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

