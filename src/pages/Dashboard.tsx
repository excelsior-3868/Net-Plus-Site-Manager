import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Radio, 
  Wifi, 
  Zap,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Activity,
  Server,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Database,
  Cpu,
  Sun,
  X
} from 'lucide-react';
import { getSites } from '../services/siteService';
import { getComplaints } from '../services/complaintService';
import { seedInitialData } from '../lib/seed';
import { cn } from '../lib/utils';
import { Complaint, Site, UserProfile } from '../types';

interface DashboardProps {
  profile: UserProfile | null;
}

const PROVINCES = ['All', 'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];

interface HardwareDetail {
  make: string;
  model: string;
  count: number;
  capacity?: string;
}

export default function Dashboard({ profile }: DashboardProps) {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('All');

  useEffect(() => {
    seedInitialData();
    const unsubscribeSites = getSites(setSites);
    const unsubscribeComplaints = getComplaints(setComplaints);
    return () => {
      unsubscribeSites();
      unsubscribeComplaints();
    };
  }, []);

  const filteredSites = useMemo(() => {
    return selectedProvince === 'All' 
      ? sites 
      : sites.filter(s => (s.admin?.province || (s as any).province) === selectedProvince);
  }, [sites, selectedProvince]);

  const filteredComplaints = useMemo(() => {
    return selectedProvince === 'All'
      ? complaints
      : complaints.filter(c => (c.province || (c as any).admin?.province) === selectedProvince);
  }, [complaints, selectedProvince]);

  const stats = useMemo(() => {
    // A site is proposed if it's explicitly planned/surveyed OR has no equipment installed
    const plannedSites = filteredSites.filter(s => {
      const status = s.status;
      const tech = s.technologies;
      const techLength = Array.isArray(tech) ? tech.length : (tech?.type?.length || 0);
      return status === 'Planned' || status === 'Surveyed' || techLength === 0;
    });

    // Physical sites must have equipment AND not be in the planned/surveyed phase
    const physicalSites = filteredSites.filter(s => {
      const status = s.status;
      const tech = s.technologies;
      const techLength = Array.isArray(tech) ? tech.length : (tech?.type?.length || 0);
      return !['Planned', 'Surveyed'].includes(status) && techLength > 0;
    });

    const logical = physicalSites.reduce((acc, s) => {
      const tech = s.technologies;
      const types = Array.isArray(tech) ? tech : (tech?.type || []);
      if (types.includes('2G')) acc.g2++;
      if (types.includes('3G')) acc.g3++;
      if (types.includes('4G')) acc.g4++;
      return acc;
    }, { g2: 0, g3: 0, g4: 0 });

    const equipment = physicalSites.reduce((acc, s) => {
      const indoorType = (s.transmission?.indoorTransEquipmentType || '').toLowerCase();
      const vendor = s.transmission?.indoorTransEquipmentVendor || 'Unknown';
      const model = s.transmission?.indoorTransEquipmentname || 'Generic';
      const capacity = s.transmission?.bandwidthCapacity || 'N/A';

      if (indoorType.includes('router')) {
        acc.routers++;
        const key = `${vendor}-${model}`;
        if (!acc.routerDetails[key]) {
          acc.routerDetails[key] = { make: vendor, model, count: 0, capacity };
        }
        acc.routerDetails[key].count++;
      }
      
      if (indoorType.includes('switch')) {
        acc.switches++;
        const key = `${vendor}-${model}`;
        if (!acc.switchDetails[key]) {
          acc.switchDetails[key] = { make: vendor, model, count: 0, capacity };
        }
        acc.switchDetails[key].count++;
      }
      
      return acc;
    }, { 
      routers: 0, 
      switches: 0, 
      routerDetails: {} as Record<string, HardwareDetail>,
      switchDetails: {} as Record<string, HardwareDetail>
    });

    const solarCount = filteredSites.filter(s => {
      const sources = Array.isArray(s.power?.source) ? s.power.source : [String(s.power?.source || '')];
      const solarStations = (s as any).power?.solarStations || 0;
      return sources.includes('Solar') || solarStations > 0;
    }).length;

    const sitesWithComplaints = filteredComplaints
      .filter(c => (c.status === 'Open' || c.status === 'In Progress') && c.siteId)
      .reduce((acc, c) => {
        const site = sites.find(s => s.siteId === c.siteId || s.id === c.siteId);
        if (site && !acc.find(s => s.id === site.id)) {
          acc.push(site);
        }
        return acc;
      }, [] as Site[]);

    return {
      physical: physicalSites.length,
      active: physicalSites.filter(s => s.status === 'Active').length,
      plannedCount: plannedSites.length,
      warning: sitesWithComplaints.length,
      logical,
      equipment,
      solarCount,
      sitesWithComplaints: sitesWithComplaints.slice(0, 3)
    };
  }, [filteredSites, filteredComplaints, sites]);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-ntc-blue">Network Dashboard</h1>
           <p className="mt-1 text-gray-500">Infrastructure metrics & asset distributions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2">
              <Globe size={14} className="text-ntc-blue" />
              <select 
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none text-ntc-blue"
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p} Province</option>)}
              </select>
           </div>
           
           <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <Activity size={12} className="text-emerald-500 animate-pulse" />
              Live Feed: {new Date().toLocaleTimeString()}
           </div>
        </div>
      </div>

      {/* Core Operational Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Physical Sites', value: stats.physical, icon: Radio, gradient: 'from-blue-600 to-ntc-blue', path: '/nodes' },
          { label: 'Planned/Surveyed', value: stats.plannedCount, icon: Wifi, gradient: 'from-emerald-500 to-teal-600', path: '/planned-sites' },
          { label: 'Solar Stations', value: stats.solarCount, icon: Sun, gradient: 'from-amber-400 to-orange-500', path: '/solar-stations' },
          { label: 'Network Complains', value: stats.warning, icon: Bell, gradient: 'from-orange-500 to-red-600', path: '/complaints' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => stat.path && navigate(stat.path)}
            className={cn(
              "group relative overflow-hidden rounded-3xl bg-white p-7 shadow-sm border border-gray-100 h-full",
              stat.path && "cursor-pointer hover:border-ntc-blue/20 transition-colors"
            )}
          >
            <div className="relative z-10">
               <div className={cn("inline-flex rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg", stat.gradient)}>
                  <stat.icon size={22} />
               </div>
               <p className="mt-6 text-4xl font-bold tracking-tighter text-ntc-blue">{stat.value}</p>
               <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
               
               {stat.label === 'Physical Sites' && (
                 <div className="mt-4 flex gap-4 border-t border-gray-50 pt-4">
                    <Link 
                      to="/transmission-registry?type=Router" 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                    >
                       <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                       <span className="text-[10px] font-bold text-ntc-blue">{stats.equipment.routers} Routers</span>
                    </Link>
                    <Link 
                      to="/transmission-registry?type=Switch" 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                    >
                       <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                       <span className="text-[10px] font-bold text-ntc-blue">{stats.equipment.switches} Switches</span>
                    </Link>
                 </div>
               )}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] grayscale transition-all group-hover:scale-110 group-hover:opacity-[0.06]">
               <stat.icon size={120} strokeWidth={1} />
            </div>
            {stat.path && (
              <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={16} className="text-ntc-blue" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
         {/* Logical Sites Breakdown */}
         <div className="rounded-3xl border border-gray-100 bg-white p-8">
            <div className="flex items-center gap-2 mb-8">
               <Database size={18} className="text-ntc-blue" />
               <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Logical Node Density</h3>
            </div>
            <div className="space-y-6">
               {[
                 { label: '2G (GSM)', value: stats.logical.g2, color: 'bg-blue-500', tech: '2G' },
                 { label: '3G (WCDMA)', value: stats.logical.g3, color: 'bg-indigo-500', tech: '3G' },
                 { label: '4G (LTE)', value: stats.logical.g4, color: 'bg-emerald-500', tech: '4G' }
               ].map((item) => (
                 <Link 
                   key={item.label} 
                   to={`/nodes?tech=${item.tech}`}
                   className="block space-y-2 group hover:opacity-80 transition-opacity"
                 >
                    <div className="flex items-center justify-between text-xs font-bold uppercase px-1">
                       <span className="text-gray-500 group-hover:text-ntc-blue transition-colors">{item.label}</span>
                       <span className="text-ntc-blue">{item.value} Nodes</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / (stats.physical || 1)) * 100}%` }}
                        className={cn("h-full", item.color)} 
                       />
                    </div>
                 </Link>
               ))}
               <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest pt-4">Total Capacity: {stats.logical.g2 + stats.logical.g3 + stats.logical.g4} Channels</p>
            </div>
         </div>

         {/* Transmission Gear */}
         <div className="rounded-3xl border border-gray-100 bg-ntc-blue p-8 text-white">
            <div className="flex items-center gap-2 mb-8">
               <Cpu size={18} className="text-blue-400" />
               <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Core Network Gear</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {[
                 { label: 'Routers', value: stats.equipment.routers, path: '/transmission-registry?type=Router' },
                 { label: 'Switches', value: stats.equipment.switches, path: '/transmission-registry?type=Switch' }
               ].map(item => (
                 <Link 
                   key={item.label} 
                   to={item.path}
                   className="rounded-2xl bg-white/5 p-4 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                 >
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">{item.value}</p>
                      <ArrowUpRight size={14} className="text-white/20 group-hover:text-white transition-opacity" />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400/60">{item.label}</p>
                 </Link>
               ))}
            </div>
         </div>

         {/* Hardware Criticality / Site Complain */}
         <Link to="/site-complaints" className="rounded-3xl border border-gray-100 bg-white p-8 hover:border-ntc-blue/20 transition-all block group">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-ntc-blue transition-colors">Site Complain</h3>
               </div>
               <ArrowUpRight size={16} className="text-gray-300 group-hover:text-ntc-blue transition-colors" />
            </div>
            <div className="space-y-4">
               {stats.sitesWithComplaints.length > 0 ? (
                 stats.sitesWithComplaints.map((site) => (
                   <div 
                     key={site.id} 
                     className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 transition-colors pointer-events-none"
                   >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                         <Bell size={20} />
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-xs font-bold text-ntc-blue uppercase truncate">{site.name}</p>
                         <p className="text-[10px] text-amber-700 font-medium truncate">
                            {site.siteId} | {(site.admin?.province || (site as any).province)}
                         </p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-amber-500" />
                   </div>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                    <ShieldCheck size={40} strokeWidth={1} className="mb-3 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">All Systems Nominal</p>
                 </div>
               )}
            </div>
            <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-bold text-ntc-blue uppercase tracking-widest hover:underline">
               View All Site Complains <ArrowUpRight size={14} />
            </div>
         </Link>
      </div>
    </div>
  );
}
