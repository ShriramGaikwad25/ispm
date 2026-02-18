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
  Plus, 
  Server, 
  Key, 
  FileText, 
  ClipboardList, 
  Search,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  FolderTree,
  Mail,
  Clock,
  Lock,
  Workflow,
  Users,
  ShieldCheck
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
      { name: 'Pending Approvals', href: '/access-request/pending-approvals', icon: AlertCircle }
    ]
  },
  {
    name: 'My Details',
    href: '/profile',
    icon: User,
    subItems: [
      { name: 'My Profile', href: '/profile', icon: UserCircle2Icon },
      { name: 'Users/Team', href: '/user', icon: User2Icon },
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
      { name: 'Reporting', href: '/reports', icon: FileText },
      { name: 'Profiles', href: '/profiles', icon: UserCircle2Icon },
      { name: 'SoD Audit', href: '/reports/sod-audit', icon: AlertCircle },
      { name: 'Control Mapping', href: '/reports/control-mapping', icon: FolderTree }
    ]
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    subItems: [
      { name: 'App Inventory', href: '/settings/app-inventory', icon: Package },
      { name: 'Onboard App', href: '/settings/onboard-app', icon: Plus },
      { name: 'Gateway', href: '/settings/gateway', icon: Server }
    ]
  }
];
