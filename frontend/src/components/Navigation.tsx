import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Users,
  Syringe,
  Calendar,
  Bell,
  Bot,
  FileText,
  User,
  Settings,
  Activity
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home Landing', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/family', label: 'Family Profiles', icon: Users },
  { path: '/vaccinations', label: 'Vaccination History', icon: Syringe },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/ai', label: 'AI Assistant', icon: Bot },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/profile', label: 'My Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/login', label: 'Login', icon: LogIn },
  { path: '/register', label: 'Register', icon: UserPlus },
];

export const Navigation: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-teal-600 rounded-xl text-white shadow-md shadow-teal-900/40">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide text-white">VaxAssist <span className="text-teal-400">AI</span></h1>
          <p className="text-xs text-slate-400">Healthcare Foundation</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-400 border-l-4 border-teal-500 pl-2'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 mr-3 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-500 text-center">
        <span>VaxAssist AI v1.0 Foundation</span>
      </div>
    </aside>
  );
};
