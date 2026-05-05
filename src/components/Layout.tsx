import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Server,
  Globe,
  Map,
  Bell,
  Sun,
  Cpu,
  Database
} from 'lucide-react';
import { UserProfile } from '../types';
import { logout } from '../services/authService';
import { useState, useEffect } from 'react';
import logo from '../assets/telecom.png';
import { cn } from '../lib/utils';

interface LayoutProps {
  profile: UserProfile | null;
}

export default function Layout({ profile }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: 'Network Dashboard', icon: LayoutDashboard, path: '/', role: 'viewer', color: 'text-blue-500' },
    { label: 'Provincial Dashboard', icon: Globe, path: '/provincial', role: 'viewer', color: 'text-emerald-500' },
    { label: 'Node Registry', icon: Server, path: '/nodes', role: 'viewer', color: 'text-indigo-500' },
    { label: 'Transmission Registry', icon: Cpu, path: '/transmission-registry', role: 'viewer', color: 'text-purple-500' },
    { label: 'Planned & Surveyed', icon: Map, path: '/planned-sites', role: 'viewer', color: 'text-amber-500' },
    { label: 'Network Complains', icon: Bell, path: '/complaints', role: 'viewer', color: 'text-orange-500' },
    { label: 'Authorized Users', icon: Users, path: '/users', role: 'admin', color: 'text-rose-500' },
  ];

  useEffect(() => {
    const currentItem = navItems.find(item => item.path === location.pathname);
    const pageName = currentItem?.label || 'Dashboard';
    document.title = `${pageName} | Netsplus Manager`;
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8F9FB] font-sans text-ntc-blue">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-50 flex h-full flex-col border-r border-gray-200 bg-white"
      >
        <div className="flex h-24 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-lg shadow-black/5 border border-gray-100">
              <img src={logo} alt="Netsplus" className="h-full w-full object-contain" />
            </div>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-black tracking-tighter text-ntc-blue leading-none">NETSPLUS</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ntc-blue/40 mt-1">Manager</p>
              </motion.div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 pt-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const canView = profile && (
              item.role === 'viewer' || 
              (item.role === 'editor' && (profile.role === 'editor' || profile.role === 'admin' || profile.role === 'superadmin')) ||
              (item.role === 'admin' && (profile.role === 'admin' || profile.role === 'superadmin'))
            );

            if (!canView) return null;

            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "group flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-300",
                  isActive 
                    ? "bg-ntc-blue text-white shadow-md shadow-ntc-blue/10" 
                    : "text-gray-500 hover:bg-ntc-blue/[0.04] hover:text-ntc-blue"
                )}
              >
                <item.icon size={20} className={cn(isActive ? "text-white" : cn("transition-colors", item.color))} />
                {isSidebarOpen && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                {isActive && isSidebarOpen && (
                  <motion.div layoutId="activeDot" className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className={cn(
            "flex items-center rounded-2xl bg-gray-50 border border-gray-100 p-2",
            isSidebarOpen ? "gap-2 justify-between" : "justify-center"
          )}>
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-ntc-blue/10 p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-ntc-blue text-[8px] font-bold text-white uppercase">
                      {profile?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[10px] font-bold text-ntc-blue">{profile?.name || profile?.email || 'User'}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-ntc-blue/60">{profile?.role || 'Guest'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="shrink-0 p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 rounded-lg"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-28 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-transform hover:scale-110 active:scale-95"
        >
          {isSidebarOpen ? <X size={10} /> : <Menu size={10} />}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto overflow-x-hidden">
        <div className="p-10 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
