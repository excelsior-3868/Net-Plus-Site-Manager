import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  ChevronRight,
  Filter,
  X,
  FileText,
  AlertCircle,
  Download,
  User,
  Phone,
  Plus
} from 'lucide-react';
import { Site, Complaint, UserProfile } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import ComplaintFormModal from '../components/ComplaintFormModal';
import { getComplaints, createComplaint, updateComplaint } from '../services/complaintService';
import { getSites } from '../services/siteService';

const Complaints: React.FC<{ profile: UserProfile | null }> = ({ profile }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const provinceParam = searchParams.get('province');
  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState(provinceParam || 'All');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [filterType, setFilterType] = useState('All');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | undefined>(undefined);

  useEffect(() => {
    if (provinceParam) {
      setFilterProvince(provinceParam);
    }
  }, [provinceParam]);

  useEffect(() => {
    getComplaints(setComplaints);
    getSites(setSites);
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const searchLower = search.toLowerCase();
      const matchesSearch = c.complaintName.toLowerCase().includes(searchLower) || 
                          c.ticketNumber.toLowerCase().includes(searchLower) ||
                          c.complainerName.toLowerCase().includes(searchLower) ||
                          c.complainerContact.includes(searchLower) ||
                          (c.siteId || '').toLowerCase().includes(searchLower) ||
                          c.district.toLowerCase().includes(searchLower);
      const matchesProvince = filterProvince === 'All' || c.province === filterProvince;
      
      let matchesStatus = true;
      if (filterStatus === 'Active') {
        matchesStatus = c.status === 'Open' || c.status === 'In Progress';
      } else if (filterStatus !== 'All') {
        matchesStatus = c.status === filterStatus;
      }
      
      const matchesType = filterType === 'All' || c.complaintType === filterType;
      
      return matchesSearch && matchesProvince && matchesStatus && matchesType;
    });
  }, [complaints, search, filterProvince, filterStatus]);

  const PROVINCES = ['All', 'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
  const STATUSES = ['Active', 'Open', 'In Progress', 'Resolved', 'All'];
  const TYPES = ['All', 'SITE COMPLAINT', 'NETWORK COMPLAINT'];

  const handleExport = () => {
    const dataToExport = filteredComplaints.map(c => ({
      'Ticket Number': c.ticketNumber,
      'Complaint Type': c.complaintType,
      'Complaint Name': c.complaintName,
      'Complainer': c.complainerName,
      'Contact': c.complainerContact,
      'Status': c.status,
      'Province': c.province,
      'District': c.district,
      'Local Level': c.localLevel,
      'Site ID': c.siteId || '',
      'Latitude': c.lat,
      'Longitude': c.lng
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, `ntc_complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterProvince('All');
    setFilterStatus('Active');
    setFilterType('All');
  };

  const handleSave = async (updated: Complaint) => {
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
            await updateComplaint(editingComplaint.id, { ...updated, ...auditInfo });
        } else {
            await createComplaint({ ...updated, ...auditInfo });
        }
        setIsModalOpen(false);
        setEditingComplaint(undefined);
    } catch (error) {
        console.error("Save failed", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-semibold tracking-tight text-ntc-blue">Network & Site Complaints</h2>
           <p className="text-sm text-ntc-blue/60">Manage ticket registry for general network areas and specific sites.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setEditingComplaint(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-ntc-blue px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-ntc-blue/20 hover:bg-ntc-blue-dark transition-all active:scale-95"
          >
            <Plus size={18} />
            Register New Complaint
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-ntc-blue" size={18} />
            <input 
              type="text" 
              placeholder="Search by Ticket, Area, or Complainer Name/Contact..."
              className="w-full rounded-2xl bg-white border border-gray-200 py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-ntc-blue focus:ring-4 focus:ring-ntc-blue/10 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="relative group">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" size={16} />
           <select 
              className="w-full appearance-none rounded-2xl bg-white border border-gray-200 py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-ntc-blue focus:ring-4 focus:ring-ntc-blue/10 transition-all shadow-sm"
              value={filterProvince}
              onChange={(e) => setFilterProvince(e.target.value)}
           >
              {PROVINCES.map(p => <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>)}
           </select>
        </div>
        <div className="relative group">
           <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" size={16} />
           <select 
              className="w-full appearance-none rounded-2xl bg-white border border-gray-200 py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-ntc-blue focus:ring-4 focus:ring-ntc-blue/10 transition-all shadow-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
           >
              {STATUSES.map(s => <option key={s} value={s}>{s === 'Active' ? 'Active Issues' : s}</option>)}
           </select>
        </div>

        <div className="relative group">
           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" size={16} />
           <select 
              className="w-full appearance-none rounded-2xl bg-white border border-gray-200 py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-ntc-blue focus:ring-4 focus:ring-ntc-blue/10 transition-all shadow-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
           >
              {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
           </select>
        </div>

        { (search || filterProvince !== 'All' || filterStatus !== 'Active' || filterType !== 'All') && (
            <button 
                onClick={clearFilters}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-50 text-red-600 text-xs font-bold transition-all hover:bg-red-100"
            >
                <X size={14} /> Clear All Filters
            </button>
        )}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Ticket & Complaint</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Affected Area</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Complainer Details</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredComplaints.map((c, idx) => (
                <tr key={idx} className="group transition-all hover:bg-ntc-blue/[0.02]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 transition-all group-hover:bg-orange-600 group-hover:text-white">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-ntc-blue">{c.ticketNumber}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase line-clamp-1 max-w-[200px]">{c.complaintName}</p>
                        {c.createdByUserName && (
                          <p className="text-[8px] text-gray-400 mt-0.5">By: {c.createdByUserName}</p>
                        )}
                        <span className={cn(
                          "mt-1 inline-block px-1.5 py-0.5 rounded text-[7px] font-bold tracking-widest uppercase",
                          c.complaintType === 'SITE COMPLAINT' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                        )}>
                          {c.complaintType}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-ntc-blue">{c.district}</span>
                        { (c.type === 'Site' || (c.siteId && !c.type)) ? (
                           <span className="px-1.5 py-0.5 rounded bg-ntc-blue/5 text-[8px] font-mono font-bold text-ntc-blue border border-ntc-blue/10">
                             {c.siteId}
                           </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-[8px] font-bold text-purple-600 border border-purple-100 flex items-center gap-0.5">
                            <MapPin size={8} /> Network
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase line-clamp-1">
                        {c.province} | {c.localLevel}
                      </span>
                      {c.type === 'Network' && c.nearestSites && c.nearestSites.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.nearestSites.map((ns, i) => (
                            <span key={i} title={`${ns.name} (${ns.distance.toFixed(1)}km)`} className="px-1 py-0.5 rounded bg-amber-50 text-[7px] font-bold text-amber-700 border border-amber-100">
                              Ref: {ns.siteId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <User size={10} className="text-gray-400" />
                                <span className="text-xs font-bold text-ntc-blue">{c.complainerName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Phone size={10} className="text-gray-400" />
                                <span className="text-[9px] text-gray-500 font-medium">{c.complainerContact}</span>
                            </div>
                         </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-tight",
                      c.status === 'Open' ? "bg-red-50 text-red-700" : 
                      c.status === 'In Progress' ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Link 
                            to={`/complaints/map?ticket=${c.ticketNumber}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            title="View on Map"
                        >
                            <MapPin size={18} />
                        </Link>
                        <button 
                            onClick={() => { setEditingComplaint(c); setIsModalOpen(true); }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-ntc-blue hover:bg-ntc-blue hover:text-white transition-all shadow-sm"
                            title="Edit Record"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredComplaints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <FileText size={48} strokeWidth={1} className="mb-4 opacity-20" />
               <p className="text-sm font-medium">No complaints matching your criteria found.</p>
            </div>
          )}
        </div>
      </div>

      <ComplaintFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingComplaint(undefined); }}
        onSave={handleSave}
        complaint={editingComplaint}
        sites={sites}
      />
    </div>
  );
};

export default Complaints;
