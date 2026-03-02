"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock4,
  UserX,
  FileClock,
  UserMinus,
  Users,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import DashboardCard from "@/components/DashboardCard";
import Tabs from "@/components/tabs";
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
    title: "Access Request Summary Report",
    description:
      "Aggregates access requests, approvals, and rejections related to Oracle applications to support compliance reviews.",
    icon: ClipboardList,
    href: "/oracle-reports/access-request-report",
  },
  {
    title: "Last Login Report - Application",
    description:
      "Highlights last-login timestamps for Oracle target application accounts to help spot inactive or stale access.",
    icon: Clock4,
    href: "/oracle-reports/target-application-last-logon-report",
  },
  {
    title: "Deleted Application Accounts Report",
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
  {
    title: "User Current Access Report",
    description:
      "Summarizes current user access across Oracle applications to support reviews and certifications.",
    icon: Users,
    href: "/oracle-reports/user-access-report",
  },
  {
    title: "Policies Report",
    description:
      "Lists Oracle access and security policies to help you analyze configured controls and their impact.",
    icon: ShieldCheck,
    href: "/oracle-reports/policies-report",
  },
  {
    title: "Access GuardRail Report",
    description:
      "Provides insight into Access GuardRail violations and policy evaluations for Oracle access.",
    icon: ShieldAlert,
    href: "/oracle-reports/access-guardrail-report",
  },
];

const COMPLIANCE_STANDARDS = [
  "NIST 800-53",
  "PCI-DSS",
  "SOX-ITGC",
  "ISO 27001",
  "CIS v8",
];

function ReportLink({ label }: { label: string }) {
  const normalise = (value: string) =>
    value.replace(/[\u2013\u2014]/g, "-").toLowerCase();

  const card = ORACLE_REPORT_CARDS.find(
    (c) =>
      normalise(c.title) === normalise(label) ||
      normalise(c.title).includes(normalise(label)) ||
      normalise(label).includes(normalise(c.title)),
  );

  if (!card) {
    return <span>{label}</span>;
  }

  return (
    <Link href={card.href} className="text-blue-600 hover:underline">
      {label}
    </Link>
  );
}

function DefaultReportsView() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
  );
}

function ComplianceReportsView() {
  return (
    <div className="py-4 space-y-3">
      {COMPLIANCE_STANDARDS.map((standard) => (
        <details
          key={standard}
          className="group border border-gray-200 rounded-md bg-white"
        >
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-gray-800">
            <span>{standard}</span>
            <span className="text-gray-400 transition-transform group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="px-4 pb-4 text-xs text-gray-600">
            {standard === "NIST 800-53" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Control
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Definition
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-2 (Account Management), AC-3 (Access Enforcement), AC-5
                        (Separation of Duties), AU-2 (Audit Events)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Demonstrate formal provisioning process &amp; approval
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Access Request Summary Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-2(3), AC-2(12), IA-11
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Inactive account management
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Last Login Report – Application" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-2(2), AC-2(4)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Deleted Application Accounts Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AU-2, AU-6, AC-2
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Access History Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-2, IA-4
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Orphan Account Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-2, AC-5
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Current Access Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        AC-1 (Policy &amp; Procedures)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Policies Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="px-3 py-2">
                        AC-3, AC-5, AC-6
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <ReportLink label="Access GuardRail Report" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : standard === "PCI-DSS" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Control
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Definition
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 7.2, 7.3
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Access granted based on business need-to-know
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Access Request Summary Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 8.2.6
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Disable inactive accounts within 90 days
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Last Login Report – Application" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 8.2.2
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Deleted Application Accounts Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 10 (Logging &amp; Monitoring)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Access History Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 7 &amp; 8
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Orphan Account Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 7
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Current Access Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Req 12
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Policies Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="px-3 py-2">
                        Req 7 (least privilege)
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <ReportLink label="Access GuardRail Report" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : standard === "SOX-ITGC" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Control
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Definition
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Logical Access Controls
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Evidence of controlled access provisioning
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Access Request Summary Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Periodic access review support
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Identify stale accounts
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Last Login Report – Application" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Termination controls ITGC
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Deleted Application Accounts Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Change Management + Logical Access
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Access History Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Unauthorized access risk
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Orphan Account Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Quarterly Access Reviews
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Current Access Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control Design documentation
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Policies Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="px-3 py-2">Preventive SoD controls</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <ReportLink label="Access GuardRail Report" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : standard === "ISO 27001" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Control
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Definition
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.15, A.5.18
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Access control &amp; access rights management
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Access Request Summary Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.18
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Removal or adjustment of access rights
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Last Login Report – Application" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.18
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Deleted Application Accounts Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.8.15 Logging
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Access History Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.18
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Orphan Account Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.15
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Current Access Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        A.5.1 Policies for Information Security
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Policies Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="px-3 py-2">A.5.15</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <ReportLink label="Access GuardRail Report" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : standard === "CIS v8" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Control
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Definition
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                        Report
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 5 (Account Management)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Managed provisioning lifecycle
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Access Request Summary Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 5.3
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        Disable dormant accounts
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Last Login Report – Application" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 5.4
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Deleted Application Accounts Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 8 (Audit Log Management)
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Access History Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 5.2
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Orphan Account Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 6
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="User Current Access Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="border-b border-gray-200 px-3 py-2">
                        Control 17
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2"></td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <ReportLink label="Policies Report" />
                      </td>
                    </tr>
                    <tr className="align-top">
                      <td className="px-3 py-2">Control 6.8</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">
                        <ReportLink label="Access GuardRail Report" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <>Compliance details for {standard} will appear here.</>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function OracleReports() {
  const tabsData = useMemo(
    () => [
      {
        label: "Default View",
        component: DefaultReportsView,
      },
      {
        label: "Compliance View",
        component: ComplianceReportsView,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-2 px-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-semibold text-black mb-6">
            Oracle Access Governance Reports
          </h1>

          <Tabs
            tabs={tabsData}
            activeClass="bg-blue-600 text-white rounded-lg"
            buttonClass="text-sm px-3 py-1"
            className="justify-center"
          />
        </div>
      </div>
    </div>
  );
}

