import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { Home, Users, BookOpen, Calendar, DollarSign, FileText, UserCircle, LogOut, GraduationCap, CalendarDays, Megaphone, UserCheck, Settings as SettingsIcon, Menu, X, Upload, TrendingDown, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [terminology, setTerminology] = useState({
    classLabel: 'Classes',
    classLabelSingular: 'Class'
  });

  useEffect(() => {
    const fetchTerminology = async () => {
      try {
        const response = await api.getSettings();
        if (response.data) {
          setTerminology({
            classLabel: response.data.terminology_classes || 'Classes',
            classLabelSingular: response.data.terminology_class || 'Class'
          });
        }
      } catch (error) {
        // Use defaults on error
      }
    };
    fetchTerminology();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['admin', 'teacher', 'student'] },
    { path: '/students', icon: Users, label: 'Students', roles: ['admin', 'teacher'] },
    { path: '/groups', icon: Users, label: 'Student Groups', roles: ['admin', 'teacher'] },
    { path: '/teachers', icon: GraduationCap, label: 'Teachers', roles: ['admin'] },
    { path: '/families', icon: UserCheck, label: 'Families & Invoices', roles: ['admin', 'teacher'] },
    { path: '/classes', icon: BookOpen, label: terminology.classLabel, roles: ['admin', 'teacher'] },
    { path: '/attendance', icon: Calendar, label: 'Attendance', roles: ['admin', 'teacher'] },
    { path: '/calendar', icon: CalendarDays, label: 'Calendar', roles: ['admin', 'teacher', 'student'] },
    { path: '/invoices', icon: FileText, label: 'Invoices', roles: ['admin'] },
    { path: '/fees', icon: DollarSign, label: 'Fees & Payments', roles: ['admin', 'student'] },
    { path: '/expenses', icon: TrendingDown, label: 'Expenses', roles: ['admin'] },
    { path: '/reports', icon: BarChart3, label: 'Financial Reports', roles: ['admin'] },
    { path: '/announcements', icon: Megaphone, label: 'Announcements', roles: ['admin', 'teacher', 'student'] },
    { path: '/import', icon: Upload, label: 'Import Data', roles: ['admin'] },
    { path: '/users', icon: ShieldCheck, label: 'User Management', roles: ['admin'] },
    { path: '/settings', icon: SettingsIcon, label: 'Settings', roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-primary font-heading">StemXplore</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="mobile-menu-button"
          className="lg:hidden"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 overflow-y-auto
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary font-heading">StemXplore</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {filteredMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              data-testid={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                }`
              }
            >
              <item.icon size={20} strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <UserCircle size={24} className="text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-destructive hover:bg-red-50 font-medium transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;