import React from "react";
import { Flag, MapPin } from "lucide-react";

const Timeline = () => {
  const milestones = [
    {
      title: "Q3 SOX Campaign Initiation on July 10th 2025",
      leftContent: (
        <>
          <p>
            Initiated using template{" "}
            <strong>“Quarterly SOX User Manager Certification”</strong>.
          </p>
          <p>
            <strong>John Doe</strong> is cert template owner and{" "}
            <strong>Phil Brown</strong> ran this template.
          </p>
        </>
      ),
      rightContent: (
        <DownloadCard
          title="Reports Linked"
          links={[{ label: "Certification definition template", href: "#" }]}
        />
      ),
    },
    {
      title: "Data snapshot created on July 10th",
      leftContent: (
        <p>
          <strong>10 apps</strong>, <strong>8000 users</strong>,{" "}
          <strong>500 reviewers</strong>, and <strong>68k assignments</strong>
        </p>
      ),
      rightContent: (
        <div className="flex space-x-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          {[
            {
              app: "Salesforce",
              date: "July 20th",
              type: "SCIM integration",
              records: { pulled: 12000, reconciled: 11800, failed: 200 },
            },
            {
              app: "HR App / IGA tool",
              date: "July 17th",
              type: "Flat file",
              records: { pulled: 8400, reconciled: 8300, failed: 100 },
            },
          ].map((card, index) => (
            <div key={index} className="flex-shrink-0 snap-center">
              <SnapshotCard
                app={card.app}
                date={card.date}
                type={card.type}
                href="#"
                records={card.records}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Campaign closed on August 30th",
      leftContent: (
        <p>
          <strong>300 revokes</strong>, <strong>8600 approvals</strong>,{" "}
          <strong>500+ delta entitlements</strong>,{" "}
          <strong>60 remediations</strong>, <strong>20 reassigns</strong>,{" "}
          <strong>950 delegations</strong>
        </p>
      ),
      rightContent: (
        <DownloadCard
          title="Certification Report"
          links={[
            {
              label:
                "Download Full Report (filter by reviewer, decision, delta, etc.)",
              href: "#",
            },
          ]}
        />
      ),
    },
    {
      title: "Closed loop remediation completion",
      leftContent: (
        <div className="space-y-4">
          <p>
            Closed loop remediation completed on <strong>September 15th</strong>{" "}
            with <strong>60 automated revokes</strong> and{" "}
            <strong>240 manual revokes</strong>.
          </p>
          <table className="min-w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">
                  # Revocation
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  App Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left">
                  Revocation Type
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 1, app: "Salesforce", type: "Manual" },
                { id: 2, app: "HR App", type: "IGA" },
              ].map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-3 py-1">{row.id}</td>
                  <td className="border border-gray-300 px-3 py-1">
                    {row.app}
                  </td>
                  <td className="border border-gray-300 px-3 py-1">
                    {row.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
      rightContent: (
        <DownloadCard
          title="Detailed Revocation Report"
          links={[
            {
              label:
                "Download per-application revocation report (includes app name, description, owner, revoke reported date, revoke completed date, and line-item details)",
              href: "#",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="max-w-6xl p-6">
      <div className="relative">
        <div className="absolute left-1/2 top-0 w-1 bg-gray-300 h-full -translate-x-1/2 z-0" />
        <div className="space-y-16 relative z-10">
          {milestones.map((milestone, index) => (
            <Milestone
              key={index}
              title={milestone.title}
              leftContent={milestone.leftContent}
              rightContent={milestone.rightContent}
              iconType={
                index === 0 || index === milestones.length - 1 ? "flag" : "pin"
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-24">
        <h3 className="text-2xl font-semibold text-center mb-6">
          Available Reports
        </h3>
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
            {[
              "High Risk Users",
              "Inactive Accounts (90+ days)",
              "SOD Violations",
              "Privileged Accounts",
              "Orphan Accounts",
              "Shared Accounts",
            ].map((report, index) => (
              <div
                key={index}
                className="p-4 bg-white rounded-xl shadow border text-center hover:bg-blue-50 transition text-sm sm:text-base"
              >
                {report}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Milestone = ({
  title,
  leftContent,
  rightContent,
  iconType,
}: {
  title: string;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  iconType: string;
}) => {
  const renderIcon = () => {
    if (iconType === "flag") return <Flag className="text-red-500 w-5 h-5" />;
    if (iconType === "pin") return <MapPin className="text-blue-500 w-5 h-5" />;
    return <div className="w-4 h-4 bg-blue-500 rounded-full" />;
  };

  return (
    <div className="flex items-start justify-between gap-8 relative pt-14">
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 text-center">
        <h3 className="text-lg font-semibold bg-white px-3 py-1 rounded shadow text-gray-800">
          {title}
        </h3>
      </div>
      <div className="w-1/2 flex justify-end pr-6">
        <div className="bg-white border border-gray-200 shadow-md rounded-xl p-6 max-w-md w-full">
          {leftContent}
        </div>
      </div>
      <div className="relative pt-6">
        <div className="absolute left-1/2 -translate-x-1/2 z-10 bg-white p-1 rounded-full shadow border">
          {renderIcon()}
        </div>
      </div>
      <div className="w-1/2 flex justify-start pl-6">
        <div className="bg-white border border-gray-200 shadow-md rounded-xl p-6 max-w-3xl w-full">
          {rightContent}
        </div>
      </div>
    </div>
  );
};

const DownloadCard = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) => (
  <div className="bg-white border border-gray-200 shadow-md rounded-xl p-4">
    <h4 className="text-lg font-semibold mb-2">{title}</h4>
    {links.map((link, index) => (
      <a
        key={index}
        href={link.href}
        className="block text-blue-600 hover:underline text-sm mb-1"
      >
        ⬇️ {link.label}
      </a>
    ))}
  </div>
);

const SnapshotCard = ({
  app,
  date,
  type,
  href,
  records,
}: {
  app: string;
  date: string;
  type: string;
  href: string;
  records: { pulled: number; reconciled: number; failed: number };
}) => (
  <div className="bg-white border border-gray-200 shadow-md rounded-xl p-4 w-64">
    <h5 className="font-semibold text-gray-800">{app}</h5>
    <p className="text-sm text-gray-500 mb-2">
      📅 {date} | 🔌 {type}
    </p>
    <p className="text-sm mb-1">✅ Pulled: {records.pulled}</p>
    <p className="text-sm mb-1">🔄 Reconciled: {records.reconciled}</p>
    <p className="text-sm mb-1 text-red-600">❌ Failed: {records.failed}</p>
    <a
      href={href}
      className="inline-block mt-2 text-blue-600 hover:underline text-sm"
    >
      View Snapshot Report
    </a>
  </div>
);

export default Timeline;
