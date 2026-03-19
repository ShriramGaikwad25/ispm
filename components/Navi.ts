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
  Key, 
  FileText, 
  ClipboardList, 
  Search,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Mail,
  Clock,
  Lock,
  Workflow,
  Users,
  ShieldCheck,
  FileBarChart
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
}

export const navLinks: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Access Review(s)',
    href: '/access-review',
    icon: ListTodo,
    subItems: [
      { name: 'Access Review', href: '/access-review', icon: ListTodo },
      { name: 'Manage Campaign', href: '/campaigns', icon: ListTree },
      { name: 'Continuous Compliance', href: '/campaigns/continuous-compliance', icon: CheckCircle }
    ]
  },
  {
    name: 'Request Management',
    href: '/access-request',
    icon: ClipboardList,
    subItems: [
      { name: 'Access Request', href: '/access-request', icon: ClipboardList },
      { name: 'Track Request', href: '/track-request', icon: Search },
      { name: 'My Approvals', href: '/access-request/pending-approvals', icon: AlertCircle }
    ]
  },
  {
    name: 'My Details',
    href: '/profile',
    icon: User,
    subItems: [
      { name: 'My Profile', href: '/profile', icon: UserCircle2Icon },
      { name: 'Users', href: '/user', icon: User2Icon },
      { name: 'Applications', href: '/applications', icon: LayoutPanelLeft },
      { name: 'Catalog', href: '/catalog', icon: ScreenShareIcon },
      { name: 'Service Account(s)', href: '/service-account', icon: Key }
    ]
  },
  {
    name: 'Compliance/Audit',
    href: '/reports',
    icon: Shield,
    subItems: [
      { name: 'Reporting', href: '/oracle-reports', icon: FileText },
      { name: 'Profiles', href: '/profiles', icon: UserCircle2Icon },
      { name: 'SoD Audit', href: '/reports/sod-audit', icon: AlertCircle }
    ]
  },
  {
    name: 'Administration',
    href: '/settings',
    icon: Settings,
    subItems: [
      { name: 'Integrations', href: '/settings/app-inventory', icon: Package },
      { name: 'Roles', href: '/settings/gateway/manage-business-roles', icon: Shield },
      { name: 'Scheduler', href: '/settings/gateway/scheduler', icon: Clock },
      { name: 'Access Policy', href: '/settings/gateway/manage-access-policy', icon: Lock },
      { name: 'Workflow', href: '/settings/gateway/workflow-builder', icon: Workflow },
      { name: 'SoD', href: '/settings/gateway/sod', icon: Shield },
      { name: 'Generic', href: '/settings/gateway', icon: Server }
    ]
  }
];
