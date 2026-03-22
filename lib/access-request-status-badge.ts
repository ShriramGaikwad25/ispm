/**
 * Tailwind class sets for access-request / approval status pills (Track requests, My Approvals).
 */
export function getAccessRequestStatusBadgeClasses(status: string): string {
  const s = status || "";
  if (s.includes("Completed") || s.includes("Approved")) {
    return "bg-green-100 text-green-800";
  }
  if (s.includes("Closed")) {
    return "bg-gray-100 text-gray-800";
  }
  if (s.includes("Rejected") || s.includes("Denied")) {
    return "bg-red-100 text-red-800";
  }
  if (s.includes("Awaiting") || s.includes("Pending")) {
    return "bg-yellow-100 text-yellow-800";
  }
  if (s.includes("Provide Information") || s.includes("Info Requested")) {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-blue-100 text-blue-800";
}
