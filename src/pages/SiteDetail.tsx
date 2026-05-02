import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Site, UserProfile } from '../types';
import { getSite, deleteSite } from '../services/siteService';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  TowerControl, 
  Zap, 
  Database,
  Shield,
  Smartphone,
  Edit2,
  Trash2,
  Radio,
  Users,
  History,
  Plus,
  Map,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import SiteFormModal from '../components/SiteFormModal';
import ComplaintFormModal from '../components/ComplaintFormModal';
import { getSiteComplaints, createComplaint, updateComplaint } from '../services/complaintService';
import { Complaint } from '../types';

export default function SiteDetail({ profile }: { profile: UserProfile | null }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isComplaintModalOpen, setComplaintModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Active');
  const [editingComplaint, setEditingComplaint] = useState<Complaint | undefined>(undefined);

  const handleEditComplaint = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setComplaintModalOpen(true);
  };
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (filterStatus === 'Active') {
        return c.status === 'Open' || c.status === 'In Progress';
      }
      if (filterStatus === 'All') return true;
      return c.status === filterStatus;
    });
  }, [complaints, filterStatus]);

  useEffect(() => {
    if (id) {
      loadSite();
    }
  }, [id]);

  useEffect(() => {
    const targetId = site?.siteId || id;
    if (targetId) {
       getSiteComplaints(targetId, setComplaints);
    }
  }, [id, site?.siteId]);

  const loadSite = async () => {
    setLoading(true);
    const data = await getSite(id!);
    setSite(data || null);
    setLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!site?.id) return;
    if (window.confirm("CRITICAL ACTION: Are you sure you want to permanently delete this asset record? This cannot be undone.")) {
      try {
        await deleteSite(site.id);
        navigate('/nodes');
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const handleAddComplaint = async (data: Complaint) => {
    try {
      const auditInfo = editingComplaint?.id ? {
        updatedByUserId: profile?.uid,
        updatedByUserName: profile?.name,
        updatedAt: new Date()
      } : {
        createdByUserId: profile?.uid,
        createdByUserName: profile?.name,
        createdAt: new Date()
      };

      if (editingComplaint?.id) {
        await updateComplaint(editingComplaint.id, { ...data, ...auditInfo });
      } else {
        await createComplaint({
          ...data,
          ...auditInfo,
          siteId: site?.siteId || site?.id,
          province: site?.admin?.province,
          district: site?.admin?.district,
          zone: site?.admin?.zone,
          localLevel: site?.admin?.localLevel,
          lat: site?.lat,
          lng: site?.lng
        });
      }
      setComplaintModalOpen(false);
      setEditingComplaint(undefined);
    } catch (error) {
      console.error("Failed to add/update complaint", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-ntc-blue border-t-transparent" /></div>;
  if (!site) return <div className="text-center py-20">Site not found.</div>;

  const canEdit = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'editor';
  const canDelete = profile?.role === 'admin' || profile?.role === 'superadmin';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/nodes')}
          className="flex items-center gap-2 text-sm font-medium opacity-60 transition-all hover:opacity-100"
        >
          <ArrowLeft size={16} />
          <span>Back to Registry</span>
        </button>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button 
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-ntc-blue/5 px-4 py-2 text-sm font-medium transition-all hover:bg-ntc-blue/10"
            >
              <Edit2 size={14} />
              <span>Edit Asset</span>
            </button>
          )}
          {canDelete && (
            <button 
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-600 hover:text-white"
            >
              <Trash2 size={14} />
              <span>Purge Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Site Card */}
      <div className="relative overflow-hidden rounded-3xl border border-ntc-blue/5 bg-white p-8 shadow-xl shadow-black/5">
        <div className="absolute right-0 top-0 opacity-[0.02]">
           <Radio size={300} strokeWidth={0.5} />
        </div>
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                site.status === 'Active' ? "bg-emerald-50 text-emerald-600" : 
                site.status === 'Planned' || site.status === 'Surveyed' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
              )}>
                SYSTEM {site.status.toUpperCase()}
              </span>
              <span className={cn(
                "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
                (Array.isArray(site.technologies) ? site.technologies.length > 0 : (site.technologies?.type?.length || 0) > 0) ? "border-emerald-200 bg-emerald-50/50 text-emerald-700" : "border-blue-200 bg-blue-50/50 text-blue-700"
              )}>
                {(Array.isArray(site.technologies) ? site.technologies.length > 0 : (site.technologies?.type?.length || 0) > 0) ? 'PHYSICAL ASSET' : 'PROPOSED INFRASTRUCTURE'}
              </span>
              <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-widest opacity-30">Node ID: {site.siteId}</span>
              {site.updatedByUserName && (
                <div className="flex flex-col border-l border-ntc-blue/10 pl-4">
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-ntc-blue/40 font-bold">
                    <Users size={10} /> Last modified by: {site.updatedByUserName}
                  </span>
                  {site.updatedByUserId && (
                    <span className="text-[8px] text-gray-300 font-mono tracking-tighter">ID: {site.updatedByUserId}</span>
                  )}
                </div>
              )}
            </div>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-ntc-blue">{site.name}</h1>
            <div className="flex items-center gap-6 text-ntc-blue/40">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} />
                <span>{site.admin?.district}, {site.admin?.zone}, {site.admin?.province}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                 <Shield size={16} />
                 <span>{site.admin?.localLevel || 'N/A Local Level'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono opacity-60">
                 <Map size={14} className="opacity-40" />
                 <span>{site.lat?.toFixed(6)}, {site.lng?.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || [])).map(tech => (
              <span key={tech} className="rounded-xl border border-ntc-blue/10 bg-white px-4 py-2 font-mono text-sm font-bold shadow-sm">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Detailed Specifications */}
        <div className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Infrastructure */}
              <div className="space-y-6">
                <section>
                   <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                     <TowerControl size={14} /> Civil Infrastructure
                   </h4>                    <div className="space-y-4 rounded-3xl border border-[#141414]/5 p-6">
                      <div className="grid grid-cols-2 gap-y-4">
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Tower Height</p>
                            <p className="font-semibold">{site.tower?.height || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Tower Type</p>
                            <p className="font-semibold">{site.tower?.type || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Tower Foundation</p>
                            <p className="font-semibold">{site.tower?.foundation || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Asset Owner</p>
                            <p className="font-semibold">{site.owner?.name || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Owner Contact</p>
                            <p className="text-xs font-mono">{site.owner?.contact || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Access Code</p>
                            <p className="text-xs font-bold text-red-600 tracking-widest">
                               {profile?.role === 'viewer' ? '••••••' : (site.owner?.accessCode || 'NONE')}
                            </p>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-ntc-blue/5">
                         <div className="flex justify-between items-center bg-ntc-blue/5 p-3 rounded-2xl">
                           <div>
                              <p className="text-[10px] uppercase tracking-widest opacity-40">Lease Contract Renewal</p>
                              <p className="text-xs font-bold">{site.leaseContract?.Date ? `Signed: ${site.leaseContract.Date}` : 'No Contract Date'}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] uppercase tracking-widest opacity-40">Yearly / Incr (%)</p>
                              <p className="text-xs font-bold text-ntc-blue">{site.leaseContract?.renewalOnYears || '0'} Yr | {site.leaseContract?.renewalPercent || '0'}%</p>
                           </div>
                         </div>
                      </div>
                   </div>

                </section>

                <section>
                   <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                     <Zap size={14} /> Power Management
                   </h4>
                    <div className="space-y-4 rounded-3xl border border-[#141414]/5 p-6">
                      <div className="grid grid-cols-2 gap-y-4">
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Main Source</p>
                            <p className="font-semibold">{site.power?.source || 'N/A'}</p>
                            <p className="text-[9px] opacity-40 italic">{site.power?.sourceType || ''}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Solar Yield</p>
                            <p className="font-bold text-emerald-600">{site.power?.solarCapacity || '0kWp'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">DG Capacity</p>
                            <p className="font-semibold">{site.power?.backupDGCapacity || 'None'} {site.power?.backupDG === 'Yes' ? '(PRIMARY BACKUP)' : ''}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Rectifier System</p>
                            <p className="text-xs font-bold">{site.power?.rectifierVendor || 'N/A'}</p>
                            <p className="text-[9px] opacity-40">{site.power?.rectifierCapacity || ''}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Current Load</p>
                            <p className="font-semibold text-amber-600">{site.power?.currentLoad || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Fuel Level</p>
                            <p className="font-semibold">{site.power?.fuelLevel !== undefined ? `${site.power.fuelLevel}%` : 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Battery Health</p>
                            <p className="font-bold text-indigo-600">{site.power?.batteryHealth || '100'}%</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Last Audit Date</p>
                            <p className="font-semibold">{site.lastAudit || 'N/A'}</p>
                         </div>
                         <div className="col-span-2 pt-2 border-t border-ntc-blue/5">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Energy Storage Infrastructure</p>
                            <p className="font-mono text-xs">{site.power?.batteryCapacity || 'N/A'} Ah | {site.power?.batteryBanks || '1'} Banks ({site.power?.batteryType || 'Lead Acid'})</p>
                         </div>
                      </div>
                   </div>
                </section>
              </div>

              {/* Operations */}
              <div className="space-y-6">
                <section>
                   <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                     <Database size={14} /> Network Connectivity
                   </h4>
                    <div className="space-y-4 rounded-3xl border border-[#141414]/5 p-6">
                      <div className="grid grid-cols-2 gap-y-4">
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Media Interface</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                               {(Array.isArray(site.transmission?.type) ? site.transmission.type : (typeof site.transmission?.type === 'string' ? [site.transmission.type] : [])).map(t => (
                                 <span key={t} className="rounded bg-ntc-blue/5 px-2 py-0.5 text-[8px] font-bold text-ntc-blue uppercase">{t}</span>
                               ))}
                            </div>
                            <p className="text-[9px] opacity-40 mt-1">Logic Intf: {site.transmission?.interface || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Bandwidth</p>
                            <p className="font-bold text-ntc-blue">{site.transmission?.bandwidthCapacity || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Indoor Equipment</p>
                            <p className="font-mono text-xs">{site.transmission?.indoorTransEquipmentName || 'N/A'}</p>
                            <p className="text-[9px] opacity-40">Type: {site.transmission?.indoorTransEquipmentType || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Vendor Profile</p>
                            <p className="font-semibold">{site.transmission?.vendor || 'N/A'}</p>
                            <p className="text-[9px] opacity-40">{site.transmission?.indoorTransEquipmentVendor || ''}</p>
                         </div>
                         <div className="col-span-2 pt-2 border-t border-ntc-blue/5">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Path Definition</p>
                            <p className="text-xs italic">{site.transmission?.path || 'Standard Direct'}</p>
                         </div>
                      </div>
                    </div>
                </section>

                <section>
                   <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                     <Radio size={14} /> Site Configuration
                   </h4>
                   <div className="space-y-4 rounded-3xl border border-[#141414]/5 p-6">
                      <div className="grid grid-cols-2 gap-y-4">
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Hub Status</p>
                            <p className={cn("text-xs font-bold", site.hubSite === 'Yes' ? "text-emerald-600" : "text-gray-400")}>
                               {site.hubSite === 'Yes' ? 'CENTRAL HUB' : 'STANDARD NODE'}
                            </p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Parent Node</p>
                            <p className="text-xs font-mono font-bold">{site.parentSite || 'ROOT NODE'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Shelter Type</p>
                            <p className="text-xs font-bold">{site.shelterType || 'N/A'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">LTE Deployment</p>
                            <div className="flex flex-wrap gap-1 justify-end mt-1">
                               {(site.technologies?.lteType || []).map(b => (
                                 <span key={b} className="rounded bg-indigo-50 px-2 py-0.5 text-[8px] font-bold text-indigo-600">B{b}</span>
                               ))}
                               {(site.technologies?.lte1800RRU || []).map(r => (
                                 <span key={r} className="rounded bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-600">{r}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </section>

                <section>
                   <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                     <Edit2 size={14} /> Maintenance Crew
                   </h4>
                   <div className="space-y-4 rounded-3xl border border-[#141414]/5 p-6">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-ntc-blue/5 flex items-center justify-center">
                            <Users size={24} className="opacity-40" />
                         </div>
                         <div>
                            <p className="font-bold">{site.engineer?.name || 'Standard Assignment'}</p>
                            <p className="text-[10px] text-ntc-blue font-bold uppercase tracking-tight">Shift Engineer</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-ntc-blue/5">
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Employee ID</p>
                            <p className="text-xs font-bold">{site.engineer?.employeeId || 'USR-000'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Duty Contact</p>
                            <p className="text-xs font-bold">{site.engineer?.phone || 'N/A'}</p>
                         </div>
                         <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Duty Shift</p>
                            <p className="text-xs font-bold">{site.engineer?.shift || 'Flexible'}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40">Protocol</p>
                            <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1"><Smartphone size={12} /> SMS ACTIVE</p>
                         </div>
                      </div>
                    </div>
                </section>
              </div>
           </div>
        </div>
      </div>

      {/* History & Maintenance Logs */}
      <div className="rounded-3xl border border-ntc-blue/5 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
           <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-ntc-blue/5 flex items-center justify-center text-ntc-blue">
                 <History size={20} />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-ntc-blue">Site History & Complaints</h3>
                 <p className="text-xs text-ntc-blue/40 font-medium">Track issues, tickets and maintenance logs for this specific node.</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
             <select 
                className="rounded-xl border border-ntc-blue/10 bg-white px-3 py-2 text-xs font-bold text-ntc-blue outline-none transition-all focus:ring-2 focus:ring-ntc-blue/20"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
             >
                <option value="Active">Active Issues</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="All">All Logs</option>
             </select>
             <button 
               onClick={() => {
                 setEditingComplaint(undefined);
                 setComplaintModalOpen(true);
               }}
               className="flex items-center gap-2 rounded-xl bg-ntc-blue px-4 py-2 text-sm font-bold text-white shadow-lg shadow-ntc-blue/20 hover:bg-ntc-blue-dark transition-all active:scale-95"
             >
               <Plus size={16} />
               Add Log Entry
             </button>
           </div>
        </div>

        {filteredComplaints.length > 0 ? (
          <div className="space-y-4">
             {filteredComplaints.map((c, i) => (
                <div key={c.id || `${i}`} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 group transition-all hover:bg-white hover:shadow-md relative">
                   <button 
                     onClick={() => handleEditComplaint(c)}
                     className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-ntc-blue hover:border-ntc-blue shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Edit2 size={14} />
                   </button>
                   <div className={cn(
                     "mt-1 h-2 w-2 rounded-full shrink-0",
                     c.status === 'Open' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                     c.status === 'In Progress' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500"
                   )} />
                   <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                         <h4 className="text-sm font-bold text-ntc-blue">{c.complaintName}</h4>
                         <span className="text-[10px] font-mono font-bold text-ntc-blue/40">{c.ticketNumber}</span>
                      </div>
                      <p className="text-xs text-ntc-blue/60 leading-relaxed">
                         Reported by <span className="font-bold">{c.complainerName}</span> • {c.status}
                         {c.createdByUserName && (
                           <span className="block text-[9px] text-gray-400 mt-0.5">
                             Registered in system by: {c.createdByUserName}
                           </span>
                         )}
                         {c.updatedByUserName && c.status !== 'Open' && (
                           <span className="block text-[9px] text-gray-400">
                             Last update by: {c.updatedByUserName}
                           </span>
                         )}
                      </p>
                      {c.comments && (
                        <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                           <p className="text-[11px] leading-relaxed text-indigo-900 font-medium">
                              <span className="font-bold text-indigo-600 uppercase text-[9px] tracking-wider block mb-0.5">Resolution Notes</span>
                              {c.comments}
                           </p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-ntc-blue/30 uppercase tracking-tighter">
                          <Calendar size={10} />
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Just now'}
                        </div>
                        {c.siteId && (
                           <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500/60 uppercase tracking-tighter">
                             <MapPin size={10} />
                             {c.siteId}
                           </div>
                        )}
                      </div>
                   </div>
                </div>
             ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
             <MessageSquare size={40} strokeWidth={1} className="mb-3 opacity-20" />
             <p className="text-sm font-medium italic">No historical logs found for this site.</p>
          </div>
        )}
      </div>

      <SiteFormModal 
        isOpen={isModalOpen} 
        onClose={() => { setModalOpen(false); loadSite(); }} 
        initialData={site}
        profile={profile}
      />

      <ComplaintFormModal 
        isOpen={isComplaintModalOpen}
        onClose={() => {
          setComplaintModalOpen(false);
          setEditingComplaint(undefined);
        }}
        onSave={handleAddComplaint}
        complaint={editingComplaint || {
           type: 'Site',
           siteId: site.siteId,
           province: site.admin?.province || (site as any).province || '',
           district: site.admin?.district || (site as any).district || '',
           zone: site.admin?.zone || (site as any).zone || '',
           localLevel: site.admin?.localLevel || (site as any).localLevel || '',
           lat: site.lat,
           lng: site.lng,
           complaintName: 'New Log Entry',
           ticketNumber: `SITE-LOG-${Date.now().toString().slice(-4)}`,
           status: 'Open',
           complainerName: profile?.name || 'Site Engineer',
           complainerContact: profile?.email || '',
        } as any}
      />
    </div>
  );
}
