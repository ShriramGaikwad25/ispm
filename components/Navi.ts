import { Settings, ListTodo, ListTree, LayoutDashboard, LayoutPanelLeft, User2Icon, UserCircle2Icon, ScreenShareIcon, Package, Plus, Server, Key, FileText, ClipboardList, Search } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
}

export const navLinks: NavItem[] = [
  { name: 'Access Review', href: '/access-review', icon: ListTodo },
  { name: 'Access Request', href: '/access-request', icon: ClipboardList },
  { name: 'Track Request', href: '/track-request', icon: Search },
  // { name: 'Application owner', href: '/app-owner', icon: LayoutDashboard },
  { name: 'Manage Campaigns', href: '/campaigns', icon: ListTree },
  { name: 'Applications', href: '/applications', icon: LayoutPanelLeft },
  { name: 'Users', href: '/user', icon: User2Icon },
  { name: 'Profiles', href: '/profiles', icon: UserCircle2Icon },
  { name: 'Catalog', href: '/catalog', icon: ScreenShareIcon },
  { name: 'Service Account', href: '/service-account', icon: Key },
  { name: 'Reports', href: '/reports', icon: FileText },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    subItems: [
      { name: 'App Inventory', href: '/settings/app-inventory', icon: Package },
      { name: 'Onboard App', href: '/settings/onboard-app', icon: Plus },
      { name: 'Gateway', href: '/settings/gateway', icon: Server }
    ]
  },
];
