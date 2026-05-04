import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  Map, 
  Layers, 
  Radio, 
  Search, 
  Bell, 
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Wifi,
  Sun,
  ArrowUpRight,
  Database,
  Globe,
  X
} from 'lucide-react';
import { Site, Complaint, UserProfile } from '../types';
import { getSites } from '../services/siteService';
import { getComplaints } from '../services/complaintService';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { Link, useNavigate } from 'react-router-dom';

interface ProvincialStats {
  province: string;
  physicalSites: number;
  logical2G: number;
  logical3G: number;
  logical4G: number;
  plannedSurveyed: number;
  complaints: number;
  routers: number;
  switches: number;
}

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];

interface HardwareDetail {
  make: string;
  model: string;
  count: number;
  capacity?: string;
}

export default function ProvincialDashboard({ profile }: { profile: UserProfile | null }) {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  useEffect(() => {
    const unsubSites = getSites((data) => {
      setSites(data);
    });
    const unsubComplaints = getComplaints((data) => {
      setComplaints(data);
      setLoading(false);
    });

    return () => {
      unsubSites();
      unsubComplaints();
    };
  }, []);

  const provincialStats = useMemo(() => {
    const provincialData: Record<string, ProvincialStats> = {};

    PROVINCES.forEach(p => {
      provincialData[p] = {
        province: p,
        physicalSites: 0,
        logical2G: 0,
        logical3G: 0,
        logical4G: 0,
        plannedSurveyed: 0,
        complaints: 0,
        routers: 0,
        switches: 0
      };
    });

    sites.forEach(site => {
      const province = site.admin?.province || (site as any).province;
      if (province && provincialData[province]) {
        const pStat = provincialData[province];
        
        const techs = Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || []);
        const techLength = techs.length;

        // Physical Sites
        if (!['Planned', 'Surveyed'].includes(site.status) && techLength > 0) {
          pStat.physicalSites++;
        }

        // Planned & Surveyed
        if (['Planned', 'Surveyed'].includes(site.status) || techLength === 0) {
          pStat.plannedSurveyed++;
        }

        // Logical Sites
        if (techs.includes('2G')) pStat.logical2G++;
        if (techs.includes('3G')) pStat.logical3G++;
        if (techs.includes('4G')) pStat.logical4G++;

        // Routers & Switches
        const equipment = (site.transmission?.indoorTransEquipmentType || '').toLowerCase();
        if (equipment.includes('router')) pStat.routers++;
        if (equipment.includes('switch')) pStat.switches++;
      }
    });

    complaints.forEach(complaint => {
      if (complaint.province && provincialData[complaint.province]) {
        provincialData[complaint.province].complaints++;
      }
    });

    return provincialData;
  }, [sites, complaints]);

  const detailStats = useMemo(() => {
    if (!selectedProvince) return null;

    const filteredSites = sites.filter(s => (s.admin?.province || (s as any).province) === selectedProvince);
    const filteredComplaints = complaints.filter(c => (c.province || (c as any).admin?.province) === selectedProvince);

    const plannedSites = filteredSites.filter(s => {
      const status = s.status;
      const tech = s.technologies;
      const techLength = Array.isArray(tech) ? tech.length : (tech?.type?.length || 0);
      return status === 'Planned' || status === 'Surveyed' || techLength === 0;
    });

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
      plannedCount: plannedSites.length,
      warning: sitesWithComplaints.length,
      logical,
      equipment,
      solarCount,
      sitesWithComplaints: sitesWithComplaints.slice(0, 3)
    };
  }, [selectedProvince, sites, complaints]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ntc-blue border-t-transparent" />
      </div>
    );
  }

  // --- Provincial Detail View ---
  if (selectedProvince && detailStats) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedProvince(null)}
              className="group flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={20} className="rotate-180 text-ntc-blue" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ntc-blue">{selectedProvince} Province</h2>
              <p className="text-sm text-ntc-blue/60">Regional network infrastructure metrics.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Regional Feed
          </div>
        </div>

        {/* 4 Core Metrics (Replicating Dashboard style) */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Physical Sites', value: detailStats.physical, icon: Radio, gradient: 'from-blue-600 to-ntc-blue', path: `/nodes?province=${selectedProvince}` },
            { label: 'Planned/Surveyed', value: detailStats.plannedCount, icon: Wifi, gradient: 'from-emerald-500 to-teal-600', path: `/planned-sites?province=${selectedProvince}` },
            { label: 'Solar Stations', value: detailStats.solarCount, icon: Sun, gradient: 'from-amber-400 to-orange-500', path: `/solar-stations?province=${selectedProvince}` },
            { label: 'Network Complains', value: detailStats.warning, icon: Bell, gradient: 'from-orange-500 to-red-600', path: `/complaints?province=${selectedProvince}` }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => stat.path && navigate(stat.path)}
              className="group relative overflow-hidden rounded-3xl bg-white p-7 shadow-sm border border-gray-100 h-full cursor-pointer hover:border-ntc-blue/20 transition-colors"
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
                        to={`/transmission-registry?type=Router&province=${selectedProvince}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                      >
                         <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                         <span className="text-[10px] font-bold text-ntc-blue">{detailStats.equipment.routers} Routers</span>
                      </Link>
                      <Link 
                        to={`/transmission-registry?type=Switch&province=${selectedProvince}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                      >
                         <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                         <span className="text-[10px] font-bold text-ntc-blue">{detailStats.equipment.switches} Switches</span>
                      </Link>
                   </div>
                 )}
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] grayscale transition-all group-hover:scale-110 group-hover:opacity-[0.06]">
                 <stat.icon size={120} strokeWidth={1} />
              </div>
              <div className="absolute right-6 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={16} className="text-ntc-blue" />
              </div>
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
                   { label: '2G (GSM)', value: detailStats.logical.g2, color: 'bg-blue-500', tech: '2G' },
                   { label: '3G (WCDMA)', value: detailStats.logical.g3, color: 'bg-indigo-500', tech: '3G' },
                   { label: '4G (LTE)', value: detailStats.logical.g4, color: 'bg-emerald-500', tech: '4G' }
                 ].map((item) => (
                   <Link 
                     key={item.label} 
                     to={`/nodes?tech=${item.tech}&province=${selectedProvince}`}
                     className="block space-y-2 group hover:opacity-80 transition-opacity"
                   >
                      <div className="flex items-center justify-between text-xs font-bold uppercase px-1">
                         <span className="text-gray-500 group-hover:text-ntc-blue transition-colors">{item.label}</span>
                         <span className="text-ntc-blue">{item.value} Nodes</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                         <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / (detailStats.physical || 1)) * 100}%` }}
                          className={cn("h-full", item.color)} 
                         />
                      </div>
                   </Link>
                 ))}
                 <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest pt-4">Regional Capacity: {detailStats.logical.g2 + detailStats.logical.g3 + detailStats.logical.g4} Channels</p>
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
                   { label: 'Routers', value: detailStats.equipment.routers, path: `/transmission-registry?type=Router&province=${selectedProvince}` },
                   { label: 'Switches', value: detailStats.equipment.switches, path: `/transmission-registry?type=Switch&province=${selectedProvince}` }
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
           <Link to={`/complaints?province=${selectedProvince}`} className="rounded-3xl border border-gray-100 bg-white p-8 hover:border-ntc-blue/20 transition-all block group">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-ntc-blue transition-colors">Site Complain</h3>
                 </div>
                 <ArrowUpRight size={16} className="text-gray-300 group-hover:text-ntc-blue transition-colors" />
              </div>
              <div className="space-y-4">
                 {detailStats.sitesWithComplaints.length > 0 ? (
                   detailStats.sitesWithComplaints.map((site) => (
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
                              {site.siteId}
                           </p>
                        </div>
                        <ChevronRight size={14} className="ml-auto text-amber-500" />
                     </div>
                   ))
                 ) : (
                   <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                      <ShieldCheck size={40} strokeWidth={1} className="mb-3 opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">No regional alerts</p>
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

  // --- Provincial Overview Grid (7 Cards) ---
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ntc-blue">Regional Hierarchy</h2>
          <p className="text-sm text-ntc-blue/60">Select a province to view specialized infrastructure metrics.</p>
        </div>
        <button 
          onClick={() => {
            const dataToExport = Object.values(provincialStats).map((s: ProvincialStats) => ({
              'Province': s.province,
              'Physical Sites': s.physicalSites,
              '2G Sites': s.logical2G,
              '3G Sites': s.logical3G,
              '4G Sites': s.logical4G,
              'Planned/Surveyed': s.plannedSurveyed,
              'Complaints': s.complaints,
              'Routers': s.routers,
              'Switches': s.switches
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Provincial_Stats_Full");
            XLSX.writeFile(wb, "provincial_full_report.xlsx");
          }}
          className="flex items-center gap-2 rounded-xl bg-ntc-blue/5 border border-ntc-blue/10 px-5 py-2.5 text-[10px] font-bold text-ntc-blue uppercase tracking-widest hover:bg-ntc-blue hover:text-white transition-all group"
        >
          <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
          Full Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PROVINCES.map((province, idx) => {
          const s = provincialStats[province];
          const totalLogical = s.logical2G + s.logical3G + s.logical4G;

          return (
            <motion.div 
              key={province}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedProvince(province)}
              className="cursor-pointer group flex flex-col rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:border-ntc-blue/30 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
            >
              <div className="p-7 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ntc-blue/5 text-ntc-blue group-hover:bg-ntc-blue group-hover:text-white transition-colors">
                    <Map size={24} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Region</span>
                    <h3 className="text-base font-bold text-ntc-blue">{province}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Sites Row */}
                  <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase text-gray-400 tracking-tighter">Physical Sites</span>
                        <span className="text-xl font-bold text-ntc-blue">{s.physicalSites}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold uppercase text-emerald-500 tracking-tighter">Surveyed</span>
                        <span className="text-xl font-bold text-emerald-600">{s.plannedSurveyed}</span>
                     </div>
                  </div>

                  <div className="h-px bg-gray-50 w-full" />

                  {/* Logical Nodes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-bold uppercase text-gray-400 tracking-tighter">Logical Infrastructure</span>
                       <span className="text-[10px] font-bold text-purple-600">{totalLogical} Nodes</span>
                    </div>
                    <div className="flex gap-1">
                       <div style={{ width: `${(s.logical2G / (totalLogical || 1)) * 100}%` }} className="h-1.5 rounded-l-full bg-blue-500" />
                       <div style={{ width: `${(s.logical3G / (totalLogical || 1)) * 100}%` }} className="h-1.5 bg-indigo-500" />
                       <div style={{ width: `${(s.logical4G / (totalLogical || 1)) * 100}%` }} className="h-1.5 rounded-r-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom info bar */}
              <div className="bg-gray-50 p-4 px-7 flex items-center justify-between border-t border-gray-100 group-hover:bg-ntc-blue group-hover:border-ntc-blue transition-colors">
                 <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white/60">
                    <div className="flex items-center gap-1.5">
                       <Cpu size={12} />
                       <span>{s.routers + s.switches} Gears</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5", s.complaints > 0 ? "text-red-500 group-hover:text-white" : "")}>
                       <Bell size={12} />
                       <span>{s.complaints} Issues</span>
                    </div>
                 </div>
                 <ChevronRight size={14} className="text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
