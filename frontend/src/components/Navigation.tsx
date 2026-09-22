import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Activity,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  publicOnly?: boolean;
  protectedOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home Landing', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, protectedOnly: true },
  { path: '/family', label: 'Family Profiles', icon: Users, protectedOnly: true },
  { path: '/vaccinations', label: 'Vaccination History', icon: Syringe, protectedOnly: true },
  { path: '/schedule', label: 'Schedule', icon: Calendar, protectedOnly: true },
  { path: '/reminders', label: 'Reminders', icon: Bell, protectedOnly: true },
  { path: '/ai', label: 'AI Assistant', icon: Bot, protectedOnly: true },
  { path: '/reports', label: 'Reports', icon: FileText, protectedOnly: true },
  { path: '/profile', label: 'My Profile', icon: User, protectedOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings, protectedOnly: true },
  { path: '/login', label: 'Login', icon: LogIn, publicOnly: true },
  { path: '/register', label: 'Register', icon: UserPlus, publicOnly: true },
];

export const Navigation: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const filteredItems = navItems.filter((item) => {
    if (item.protectedOnly && !isAuthenticated) return false;
    if (item.publicOnly && isAuthenticated) return false;
    return true;
  });

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2 bg-teal-600 rounded-xl text-white shadow-md shadow-teal-900/40">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide text-white">VaxAssist <span className="text-teal-400">AI</span></h1>
          <p className="text-xs text-slate-400">Healthcare Platform</p>
        </div>
      </div>

      {/* User Badge if Authenticated */}
      {isAuthenticated && user && (
        <div className="mx-3 mt-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
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

      {/* Logout button or Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-500">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <div className="text-center">
            <span>VaxAssist AI v1.0 Foundation</span>
          </div>
        )}
      </div>
    </aside>
  );
};
