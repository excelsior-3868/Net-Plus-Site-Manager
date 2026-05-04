import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, User, Phone, MapPin, Hash, Search, Check, Info } from 'lucide-react';
import { Complaint, Site } from '../types';
import { cn, getDistance } from '../lib/utils';

interface ComplaintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (complaint: Complaint) => void;
  complaint?: Complaint;
  sites?: Site[];
}

const ComplaintFormModal: React.FC<ComplaintFormModalProps> = ({ isOpen, onClose, onSave, complaint, sites = [] }) => {
  const [formData, setFormData] = useState<Partial<Complaint>>({
    ticketNumber: '',
    type: 'Site',
    complaintName: '',
    complainerName: '',
    complainerContact: '',
    status: 'Open',
    comments: '',
    province: '',
    zone: '',
    district: '',
    localLevel: '',
    lat: 0,
    lng: 0,
    siteId: '',
    nearestSites: [],
  });

  const [siteSearch, setSiteSearch] = useState('');
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);

  useEffect(() => {
    if (complaint) {
      setFormData(complaint);
      setSiteSearch(complaint.siteId || '');
    } else {
      setFormData({
        ticketNumber: '',
        type: 'Site',
        complaintName: '',
        complainerName: '',
        complainerContact: '',
        status: 'Open',
        comments: '',
        province: '',
        zone: '',
        district: '',
        localLevel: '',
        lat: 0,
        lng: 0,
        siteId: '',
        nearestSites: [],
      });
      setSiteSearch('');
    }
  }, [complaint, isOpen]);

  // Handle nearest sites calculation when lat/lng changes for Network complaints
  useEffect(() => {
    if (formData.type === 'Network' && formData.lat && formData.lng && sites.length > 0) {
      const calculated = sites.map(site => ({
        siteId: site.siteId,
        name: site.name,
        distance: getDistance(formData.lat!, formData.lng!, site.lat, site.lng)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
      
      // Check if nearestSites actually changed to prevent infinite loop
      const currentVal = JSON.stringify(formData.nearestSites || []);
      const newVal = JSON.stringify(calculated);
      
      if (currentVal !== newVal) {
        setFormData(prev => ({ ...prev, nearestSites: calculated }));
      }
    } else if (formData.type === 'Site') {
      if (formData.nearestSites && formData.nearestSites.length > 0) {
        setFormData(prev => ({ ...prev, nearestSites: [] }));
      }
    }
  }, [formData.lat, formData.lng, formData.type, sites]);

  const filteredSites = useMemo(() => {
    if (!siteSearch) return sites.slice(0, 10);
    const searchLower = siteSearch.toLowerCase();
    return sites.filter(s => 
      s.siteId.toLowerCase().includes(searchLower) || 
      s.name.toLowerCase().includes(searchLower)
    ).slice(0, 10);
  }, [sites, siteSearch]);

  const handleSelectSite = (site: Site) => {
    setFormData(prev => ({
      ...prev,
      siteId: site.siteId,
      province: site.admin?.province || prev.province,
      zone: site.admin?.zone || prev.zone,
      district: site.admin?.district || prev.district,
      localLevel: site.admin?.localLevel || prev.localLevel,
      lat: site.lat || prev.lat,
      lng: site.lng || prev.lng,
    }));
    setSiteSearch(site.siteId);
    setIsSiteDropdownOpen(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Complaint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ntc-blue/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-ntc-blue">
              {complaint ? 'Edit Complaint' : 'Register New Complaint'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
               <span className={cn(
                 "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                 formData.type === 'Network' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
               )}>
                 {formData.type} Complaint
               </span>
               <p className="text-[10px] text-ntc-blue/60 font-medium uppercase tracking-wider">
                {formData.ticketNumber || 'System Ticket'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-8">
            {/* Complaint Type Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Complaint Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Network', siteId: '' })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    formData.type === 'Network' 
                      ? "border-ntc-blue bg-ntc-blue/5 text-ntc-blue shadow-md" 
                      : "border-gray-100 bg-gray-50/50 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <MapPin size={24} />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wide">Network Complaint</p>
                    <p className="text-[9px] opacity-70">Public / General Area Issue</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Site' })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    formData.type === 'Site' 
                      ? "border-ntc-blue bg-ntc-blue/5 text-ntc-blue shadow-md" 
                      : "border-gray-100 bg-gray-50/50 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <Search size={24} />
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-wide">Site Complaint</p>
                    <p className="text-[9px] opacity-70">Specific Station / Tech Issue</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                 {/* Site link - only mandatory for Site complaints */}
                 <div className="relative">
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                     {formData.type === 'Site' ? 'Linked Site ID' : 'Linked Site ID (Optional)'} 
                     {formData.type === 'Site' && <span className="text-red-500 ml-1">*</span>}
                   </label>
                   <div className="relative group">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" />
                      <input 
                        placeholder={formData.type === 'Site' ? "Search Mandatory Site ID..." : "Optional: Search Site ID..."}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm font-mono"
                        value={siteSearch}
                        onChange={e => {
                          setSiteSearch(e.target.value);
                          setIsSiteDropdownOpen(true);
                        }}
                        onFocus={() => setIsSiteDropdownOpen(true)}
                        required={formData.type === 'Site'}
                      />
                   </div>
                   
                   {isSiteDropdownOpen && filteredSites.length > 0 && (
                     <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1">
                       {filteredSites.map(site => (
                         <button
                           key={site.id}
                           type="button"
                           onClick={() => handleSelectSite(site)}
                           className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-ntc-blue/5 text-left transition-colors group"
                         >
                           <div>
                              <p className="text-xs font-bold text-ntc-blue">{site.siteId}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{site.name}</p>
                           </div>
                           {formData.siteId === site.siteId && <Check size={14} className="text-emerald-500" />}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Ticket Reference <span className="text-red-500">*</span></label>
                   <div className="relative group">
                      <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" />
                      <input 
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm"
                        value={formData.ticketNumber}
                        onChange={e => setFormData({ ...formData, ticketNumber: e.target.value })}
                        required
                        placeholder="e.g. HS-12345"
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Complaint Title <span className="text-red-500">*</span></label>
                   <div className="relative group">
                      <AlertCircle size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" />
                      <input 
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm"
                        value={formData.complaintName}
                        onChange={e => setFormData({ ...formData, complaintName: e.target.value })}
                        required
                        placeholder="Issue summary..."
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Status</label>
                   <select 
                     className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm"
                     value={formData.status}
                     onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                   >
                     <option value="Open">Open</option>
                     <option value="In Progress">In Progress</option>
                     <option value="Resolved">Resolved</option>
                   </select>
                 </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Complainer Name <span className="text-red-500">*</span></label>
                   <div className="relative group">
                      <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" />
                      <input 
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm"
                        value={formData.complainerName}
                        onChange={e => setFormData({ ...formData, complainerName: e.target.value })}
                        required
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Contact Number <span className="text-red-500">*</span></label>
                   <div className="relative group">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ntc-blue" />
                      <input 
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm"
                        value={formData.complainerContact}
                        onChange={e => setFormData({ ...formData, complainerContact: e.target.value })}
                        required
                      />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Latitude <span className="text-red-500">*</span></label>
                      <input 
                          type="number" step="any"
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all"
                          value={formData.lat}
                          onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                          required
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Longitude <span className="text-red-500">*</span></label>
                      <input 
                          type="number" step="any"
                          className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all"
                          value={formData.lng}
                          onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                          required
                      />
                   </div>
                 </div>

                 {/* Nearest Sites Suggestion for Network Complaints */}
                 {formData.type === 'Network' && formData.nearestSites && formData.nearestSites.length > 0 && (
                   <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-2">
                     <div className="flex items-center gap-2 text-amber-700">
                       <Info size={14} />
                       <p className="text-[10px] font-bold uppercase tracking-wider">Nearest Reference Sites</p>
                     </div>
                     <div className="space-y-1.5">
                       {formData.nearestSites.map((site, idx) => (
                         <div key={idx} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-800">{site.siteId}</span>
                            <span className="text-[9px] text-amber-600 font-medium">{site.distance.toFixed(2)} km away</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </div>

              {/* Location Details */}
              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-3xl bg-gray-50/50 border border-t-gray-100 border-l-gray-100 border-r-gray-200 border-b-gray-200">
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Province</label>
                    <input 
                       className="w-full rounded-xl border border-gray-100 bg-white py-2 px-3 text-xs font-bold text-ntc-blue outline-none"
                       value={formData.province}
                       onChange={e => setFormData({ ...formData, province: e.target.value })}
                       required
                       placeholder="e.g. Bagmati"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Zone</label>
                    <input 
                       className="w-full rounded-xl border border-gray-100 bg-white py-2 px-3 text-xs font-bold text-ntc-blue outline-none"
                       value={formData.zone}
                       onChange={e => setFormData({ ...formData, zone: e.target.value })}
                       placeholder="e.g. Bagmati"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">District</label>
                    <input 
                       className="w-full rounded-xl border border-gray-100 bg-white py-2 px-3 text-xs font-bold text-ntc-blue outline-none"
                       value={formData.district}
                       onChange={e => setFormData({ ...formData, district: e.target.value })}
                       required
                       placeholder="e.g. Kathmandu"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Local Level</label>
                    <input 
                       className="w-full rounded-xl border border-gray-100 bg-white py-2 px-3 text-xs font-bold text-ntc-blue outline-none"
                       value={formData.localLevel}
                       onChange={e => setFormData({ ...formData, localLevel: e.target.value })}
                       placeholder="e.g. KMC-32"
                    />
                 </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Comments / Notes</label>
                <textarea 
                  placeholder="Detailed findings or resolution steps..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm font-medium focus:bg-white focus:border-ntc-blue outline-none transition-all shadow-sm resize-none h-24"
                  value={formData.comments || ''}
                  onChange={e => setFormData({ ...formData, comments: e.target.value })}
                />
              </div>
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-gray-100 flex-shrink-0 bg-gray-50/30 flex justify-end gap-3 rounded-b-3xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all flex items-center gap-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-xl bg-ntc-blue px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-ntc-blue/20 hover:bg-ntc-blue-dark transition-all active:scale-95 group"
          >
            <Save size={18} className="transition-transform group-hover:scale-110" />
            Save Complaint
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintFormModal;
