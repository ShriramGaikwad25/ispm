import {
  Settings,
  ListTodo,
  ListTree,
  LayoutDashboard,
  LayoutPanelLeft,
  User2Icon,
  UserCircle2Icon,
  ScreenShareIcon,
  Package,
  Server,
  FileText,
  ClipboardList,
  Search,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Lock,
  Workflow,
  Users,
  Bot,
  KeyRound,
  Phone,
  FileSearch,
  History,
  ClipboardCheck,
  SlidersHorizontal,
  Siren,
  GitBranch,
  Table2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { NHI_LEGACY_NAV_ITEMS, NHI_NAV_ITEMS } from "@/lib/nhi-shell";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
  /** Show β next to the label (e.g. pre-release features) */
  beta?: boolean;
}

const NHI_PRIMARY_ICONS = [
  LayoutDashboard,
  Bot,
  Users,
  RefreshCw,
  ShieldAlert,
] as const;

const NHI_LEGACY_ICONS = [
  LayoutDashboard,
  Bot,
  Users,
  KeyRound,
  Phone,
  FileSearch,
  Shield,
  History,
  ClipboardCheck,
  SlidersHorizontal,
  Siren,
  GitBranch,
  Table2,
] as const;

const nhiPrimarySubItems: NavItem[] = NHI_NAV_ITEMS.map((item, i) => ({
  name: item.label,
  href: item.href,
  icon: NHI_PRIMARY_ICONS[i] ?? Bot,
}));

const nhiLegacySubItems: NavItem[] = NHI_LEGACY_NAV_ITEMS.map((item, i) => ({
  name: item.label,
  href: item.href,
  icon: NHI_LEGACY_ICONS[i] ?? Bot,
}));

export const navLinks: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Access Review(s)",
    href: "/access-review",
    icon: ListTodo,
    subItems: [
      { name: "Access Review", href: "/access-review", icon: ListTodo },
      { name: "Manage Campaign", href: "/campaigns", icon: ListTree },
      {
        name: "Continuous Compliance",
        href: "/campaigns/continuous-compliance",
        icon: CheckCircle,
      },
    ],
  },
  {
    name: "Request Management",
    href: "/access-request",
    icon: ClipboardList,
    subItems: [
      { name: "Access Request", href: "/access-request", icon: ClipboardList },
      { name: "Track Request", href: "/track-request", icon: Search },
      {
        name: "My Approvals",
        href: "/access-request/pending-approvals",
        icon: AlertCircle,
      },
    ],
  },
  {
    name: "My Workspace",
    href: "/profile",
    icon: User,
    subItems: [
      { name: "My Profile", href: "/profile", icon: UserCircle2Icon },
      { name: "Users", href: "/user", icon: User2Icon },
      { name: "Applications", href: "/applications", icon: LayoutPanelLeft },
      { name: "Catalog", href: "/catalog", icon: ScreenShareIcon },
    ],
  },
  {
    name: "Non-Human Identity",
    href: "/non-human-identity",
    icon: Bot,
    subItems: nhiPrimarySubItems,
  },
  {
    name: "Non-Human Identity-1",
    href: "/non-human-identity-1",
    icon: Bot,
    subItems: nhiLegacySubItems,
  },
  {
    name: "Audit and Compliance",
    href: "/reports",
    icon: Shield,
    subItems: [
      { name: "Reporting", href: "/oracle-reports", icon: FileText },
      { name: "Profiles", href: "/profiles", icon: UserCircle2Icon },
      { name: "SoD Audit", href: "/reports/sod-audit", icon: AlertCircle },
      {
        name: "NHI Dashboard",
        href: "/reports/nhi-dashboard",
        icon: LayoutDashboard,
        beta: true,
      },
    ],
  },
  {
    name: "Administration",
    href: "/settings",
    icon: Settings,
    subItems: [
      { name: "Integrations", href: "/settings/app-inventory", icon: Package },
      {
        name: "Roles",
        href: "/settings/gateway/manage-business-roles",
        icon: Shield,
      },
      { name: "Scheduler", href: "/settings/gateway/scheduler", icon: Clock },
      {
        name: "Access Policy",
        href: "/settings/gateway/manage-access-policy",
        icon: Lock,
      },
      {
        name: "Approval Policy",
        href: "/settings/gateway/manage-approval-policies",
        icon: Workflow,
      },
      {
        name: "Workflow Builder",
        href: "/settings/gateway/workflow-builder",
        icon: Workflow,
      },
      { name: "SoD", href: "/settings/gateway/sod", icon: Shield },
      { name: "Generic", href: "/settings/gateway", icon: Server },
    ],
  },
];
