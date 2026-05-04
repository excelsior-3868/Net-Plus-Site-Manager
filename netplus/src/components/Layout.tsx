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
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { logOut } from '../lib/firebase';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: User;
  profile: UserProfile | null;
}

export default function Layout({ user, profile }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: 'Network Dashboard', icon: LayoutDashboard, path: '/', role: 'viewer' },
    { label: 'Provincial Dashboard', icon: Globe, path: '/provincial', role: 'viewer' },
    { label: 'Node Registry', icon: Server, path: '/nodes', role: 'viewer' },
    { label: 'Transmission Registry', icon: Cpu, path: '/transmission-registry', role: 'viewer' },
    { label: 'Planned & Surveyed', icon: Map, path: '/planned-sites', role: 'viewer' },
    { label: 'Network Complains', icon: Bell, path: '/complaints', role: 'viewer' },
    { label: 'Authorized Users', icon: Users, path: '/users', role: 'admin' },
  ];

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ntc-blue text-white shadow-lg shadow-ntc-blue/30">
              <Globe size={28} />
            </div>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ntc-blue/30">Nepal Telecom</p>
                <h2 className="text-xl font-bold tracking-tight text-ntc-blue leading-tight">NetPulse</h2>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ntc-blue/30">Site Manager</p>
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
                <item.icon size={20} className={isActive ? "text-white" : "text-gray-400 group-hover:text-ntc-blue"} />
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
                    <p className="truncate text-[10px] font-bold text-ntc-blue">{profile?.name || user.email}</p>
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
        <div className="p-10 pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
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
