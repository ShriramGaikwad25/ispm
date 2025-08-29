import { Home, Settings, ListTodo,ListTree, LayoutDashboard, LayoutPanelLeft, User2Icon, UserCircle2Icon, ScreenShareIcon } from 'lucide-react';
 export const navLinks = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Access Review', href: '/access-review', icon: ListTodo },
  // { name: 'Application owner', href: '/app-owner', icon: LayoutDashboard },
  { name: 'Manage Campaigns', href: '/campaigns', icon: ListTree },
  { name: 'Applications', href: '/applications', icon: LayoutPanelLeft },
  { name: 'Users', href: '/user', icon: User2Icon },
  { name: 'Profiles', href: '/profiles', icon: UserCircle2Icon },
  { name: 'Catalog', href: '/catalog', icon: ScreenShareIcon },
  { name: 'Settings', href: '/settings', icon: Settings },

];
