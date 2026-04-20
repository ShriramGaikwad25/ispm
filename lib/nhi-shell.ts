/** Non-Human Identity module: in-page nav links and valid URL segments. */
export const NHI_NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/non-human-identity" },
  { label: "Agents", href: "/non-human-identity/agents" },
  { label: "NHIs", href: "/non-human-identity/nhis" },
  { label: "Service Accounts", href: "/non-human-identity/service-accounts" },
  { label: "RFC Calls", href: "/non-human-identity/rfc-calls" },
  { label: "Findings", href: "/non-human-identity/findings" },
  { label: "SoD", href: "/non-human-identity/sod" },
  { label: "Changes", href: "/non-human-identity/changes" },
  { label: "Reviews", href: "/non-human-identity/reviews" },
  { label: "Controls", href: "/non-human-identity/controls" },
  { label: "Emergency", href: "/non-human-identity/emergency" },
  { label: "Lineage", href: "/non-human-identity/lineage" },
  { label: "Lookups", href: "/non-human-identity/lookups" },
];

const PREFIX = "/non-human-identity/";

export const NHI_SECTION_SLUGS = new Set(
  NHI_NAV_ITEMS.filter((i) => i.href.startsWith(PREFIX)).map((i) =>
    i.href.slice(PREFIX.length)
  )
);

export function isNhiShellPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/non-human-identity" || pathname.startsWith("/non-human-identity/");
}
