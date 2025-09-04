import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Menu as MenuIcon, 
  Users, 
  BarChart3,
  Settings,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: 'Kitchen',
    href: '/staff',
    icon: ClipboardList,
    roles: ['staff'],
  },
  {
    title: 'Delivery',
    href: '/delivery',
    icon: Truck,
    roles: ['delivery'],
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: ClipboardList,
    roles: ['admin'],
  },
  {
    title: 'Menu Management',
    href: '/menu',
    icon: MenuIcon,
    roles: ['admin'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'Staff',
    href: '/staff-management',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin', 'staff', 'delivery'],
  },
];

export const Sidebar = () => {
  const { user } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm">
      <nav className="p-4 space-y-2">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};