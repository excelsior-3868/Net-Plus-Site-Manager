import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Radio, TowerControl, Zap, Activity, ShieldCheck, Map, Users } from 'lucide-react';
import { Site, UserProfile, Complaint } from '../types';
import { createSite, updateSite } from '../services/siteService';
import { createComplaint } from '../services/complaintService';
import { cn } from '../lib/utils';

interface SiteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Site;
  profile: UserProfile | null;
  initialTab?: 'general' | 'technical' | 'power' | 'transmission' | 'infrastructure' | 'contact';
}

const DEFAULT_SITE: Partial<Site> = {
  siteId: '',
  name: '',
  admin: { province: '', zone: '', district: '', localLevel: '', wardToleArea: '' },
  status: 'Planned',
  lat: 0,
  lng: 0,
  technologies: { type: [], lteType: [], lte1800RRU: [] },
  tower: { height: '', type: '', owner: '', foundation: '', fencingDoneByNT: false },
  power: { 
    source: [], sourceType: '', backupDG: 'No', backupDGCapacity: '', 
    batteryType: '', batteryCapacity: '', batteryBanks: '',
    rectifierVendor: '', rectifierCapacity: '', solarCapacity: '',
    batteryHealth: 100, fuelLevel: 100, currentLoad: '',
    ntTransformer: false, powerCableType: '', powerCableLength: 0,
    customerId: '', mcbCapacity: ''
  },
  transmission: { 
    type: 'Fiber', bandwidthCapacity: '', vendor: '', path: '', 
    interface: '', indoorTransEquipmentType: 'Router', 
    indoorTransEquipmentname: '', indoorTransEquipmentVendor: '',
    indoorTransEquipmentType2: '', indoorTransEquipmentname2: '',
    indoorTransEquipmentVendor2: ''
  },
  hubSite: 'No',
  parentSite: '',
  shelterType: 'Outdoor',
  owner: { name: '', contact: '', type: 'Internal', accessCode: '' },
  leaseContract: { Date: '', renewalOnYears: '', renewalPercent: '' },
  engineer: { name: '', phone: '', employeeId: '', shift: '' },
  lastAudit: new Date().toISOString().split('T')[0]
};

function MultiSelectField({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string, 
  options: string[], 
  selected: string[] | any, 
  onChange: (val: string[]) => void 
}) {
  const normalizedSelected = Array.isArray(selected) ? selected : (typeof selected === 'string' ? [selected] : []);

  const toggleOption = (option: string) => {
    if (normalizedSelected.includes(option)) {
      onChange(normalizedSelected.filter(item => item !== option));
    } else {
      onChange([...normalizedSelected, option]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">{label}</label>
      <div className="flex flex-wrap gap-2 rounded-xl border border-ntc-blue/10 p-2 min-h-[46px]">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
              normalizedSelected.includes(option)
                ? "bg-ntc-blue text-white shadow-sm"
                : "bg-ntc-blue/5 text-ntc-blue/60 hover:bg-ntc-blue/10"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SiteFormModal({ isOpen, onClose, initialData, profile, initialTab }: SiteFormModalProps) {
  const [formData, setFormData] = useState<Partial<Site>>(DEFAULT_SITE);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'technical' | 'power' | 'transmission' | 'infrastructure' | 'contact'>('general');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      
      // Only set form data if it's the first time opening or switching modes
      // This prevents overwriting user progress if the parent re-renders
      const initial = initialData || DEFAULT_SITE;
      
      // Normalize for legacy data
      const normalized = { ...initial } as any;
      if (initialData && Array.isArray(initialData.technologies)) {
         normalized.technologies = {
           type: initialData.technologies,
           lteType: [],
           lte1800RRU: []
         };
      }
      if (!normalized.transmission) normalized.transmission = { ...DEFAULT_SITE.transmission };
      if (!normalized.power) normalized.power = { ...DEFAULT_SITE.power };
      if (!normalized.tower) normalized.tower = { ...DEFAULT_SITE.tower };
      if (!normalized.admin) normalized.admin = { ...DEFAULT_SITE.admin };
      if (!normalized.engineer) normalized.engineer = { ...DEFAULT_SITE.engineer };
      if (!normalized.owner) normalized.owner = { ...DEFAULT_SITE.owner };
      if (!normalized.leaseContract) normalized.leaseContract = { ...DEFAULT_SITE.leaseContract };
      if (!normalized.environment) normalized.environment = { ...DEFAULT_SITE.environment };
      
      setFormData(normalized);
      setIsDirty(false);
    }
  }, [isOpen]); // Only trigger on open/close

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setErrorMsg(null);
    try {
      const auditData = {
        ...formData,
        lastAudit: new Date().toLocaleDateString(),
        lastAuditDate: new Date(),
        updatedAt: new Date(),
        updatedByUserId: profile?.uid || '',
        updatedByUserName: profile?.name || '',
        updatedBy: profile?.name || '' // Legacy field
      };

      if (initialData?.id) {
        await updateSite(initialData.id, auditData);
      } else {
        await createSite(auditData);
      }

      // Automatically trigger complaint if battery health is below 50%
      const oldHealth = initialData?.power?.batteryHealth ?? 100;
      const newHealth = formData.power?.batteryHealth;
      
      if (newHealth !== undefined && newHealth < 50 && (oldHealth >= 50 || !initialData)) {
        const ticketNumber = `ALAM-BAT-${Math.floor(1000 + Math.random() * 9000)}`;
        const complaintData: Partial<Complaint> = {
          ticketNumber,
          type: 'Site',
          complaintName: `Low Battery Health Alarm: ${formData.power.batteryHealth}%`,
          complainerName: 'System Monitor',
          complainerContact: 'Auto-Generated',
          province: formData.admin?.province || '',
          zone: formData.admin?.zone || '',
          district: formData.admin?.district || '',
          localLevel: formData.admin?.localLevel || '',
          lat: formData.lat || 0,
          lng: formData.lng || 0,
          siteId: formData.siteId || '',
          status: 'Open',
          comments: `Critical internal threshold reached. Battery health reported at ${formData.power.batteryHealth}%. Immediate technical inspection required at site ${formData.siteId}.`,
          createdByUserId: 'system',
          createdByUserName: 'Auto Monitor Service'
        };
        await createComplaint(complaintData);
      }

      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMsg("Transaction Failed: Unable to commit changes to the database. Please verify network status.");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (newData: Partial<Site>) => {
    setFormData(prev => ({ ...prev, ...newData }));
    setIsDirty(true);
  };

  const tabs = [
    { id: 'general', icon: Radio, label: 'Core Info' },
    { id: 'technical', icon: Activity, label: 'Radio/Tech' },
    { id: 'power', icon: Zap, label: 'Power/Energy' },
    { id: 'transmission', icon: Radio, label: 'Trans/Backhaul' },
    { id: 'infrastructure', icon: TowerControl, label: 'Infra/Lease' },
    { id: 'contact', icon: Users, label: 'Operations' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ntc-blue/5 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ntc-blue text-white">
                <TowerControl size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{initialData ? 'Edit Asset Record' : 'Create New Asset Node'}</h2>
                <p className="text-[10px] uppercase tracking-widest opacity-40">System Modification Registry</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} className="rounded-full p-2 transition-all hover:bg-ntc-blue/5 active:scale-95">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            {/* Tabs Sidebar */}
            <div className="flex flex-1 overflow-hidden">
              <div className="w-48 border-r border-ntc-blue/5 bg-ntc-blue/[0.01] p-4">
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                        activeTab === tab.id 
                          ? "bg-ntc-blue text-white shadow-md shadow-ntc-blue/10" 
                          : "text-ntc-blue/60 hover:bg-ntc-blue/5 hover:text-ntc-blue"
                      )}
                    >
                      <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "opacity-40 group-hover:opacity-100"} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-white p-8">
                {activeTab === 'general' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Site Identifier</label>
                      <input 
                        required
                        placeholder="e.g. KTM-BSR-02"
                        className="w-full rounded-xl border border-[#141414]/10 p-3 text-sm focus:ring-2 focus:ring-black/5 outline-none font-mono"
                        value={formData.siteId}
                        onChange={(e) => updateFormData({ siteId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Display Name</label>
                      <input 
                        required
                        placeholder="e.g. Baneshwor Sector 1"
                        className="w-full rounded-xl border border-[#141414]/10 p-3 text-sm focus:ring-2 focus:ring-black/5 outline-none"
                        value={formData.name}
                        onChange={(e) => updateFormData({ name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status Level</label>
                      <select 
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.status}
                        onChange={(e) => updateFormData({ status: e.target.value as any })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Decommissioned">Decommissioned</option>
                        <option value="Planned">Planned</option>
                        <option value="Surveyed">Surveyed</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Province</label>
                      <input 
                        placeholder="e.g. Bagmati"
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.admin?.province}
                        onChange={(e) => updateFormData({ admin: { ...formData.admin!, province: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Zone</label>
                      <input 
                        placeholder="e.g. Bagmati"
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.admin?.zone}
                        onChange={(e) => updateFormData({ admin: { ...formData.admin!, zone: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">District</label>
                      <input 
                        placeholder="e.g. Kathmandu"
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.admin?.district}
                        onChange={(e) => updateFormData({ admin: { ...formData.admin!, district: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Local Level</label>
                      <input 
                        placeholder="e.g. Kathmandu Metropolitan"
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.admin?.localLevel}
                        onChange={(e) => updateFormData({ admin: { ...formData.admin!, localLevel: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Ward/Tole Area Name</label>
                      <input 
                        placeholder="e.g. Ward 10, New Baneshwor"
                        className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                        value={formData.admin?.wardToleArea}
                        onChange={(e) => updateFormData({ admin: { ...formData.admin!, wardToleArea: e.target.value } })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Latitude</label>
                        <input 
                          type="number" step="0.000001"
                          className="w-full rounded-xl border border-[#141414]/10 p-3 text-sm outline-none font-mono"
                          value={formData.lat}
                          onChange={(e) => updateFormData({ lat: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Longitude</label>
                        <input 
                          type="number" step="0.000001"
                          className="w-full rounded-xl border border-[#141414]/10 p-3 text-sm outline-none font-mono"
                          value={formData.lng}
                          onChange={(e) => updateFormData({ lng: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'technical' && (
                  <div className="space-y-6">
                    <MultiSelectField 
                      label="Radio Technologies"
                      options={['2G', '3G', '4G', '5G']}
                      selected={formData.technologies?.type || []}
                      onChange={(val) => updateFormData({ technologies: { ...formData.technologies!, type: val } })}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <MultiSelectField 
                        label="LTE Bands"
                        options={['800', '1800']}
                        selected={formData.technologies?.lteType || []}
                        onChange={(val) => updateFormData({ technologies: { ...formData.technologies!, lteType: val } })}
                      />
                      <MultiSelectField 
                        label="LTE 1800 RRU Type"
                        options={['2T2R', '4T4R']}
                        selected={formData.technologies?.lte1800RRU || []}
                        onChange={(val) => updateFormData({ technologies: { ...formData.technologies!, lte1800RRU: val } })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Hub Site</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.hubSite}
                          onChange={(e) => updateFormData({ hubSite: e.target.value as any })}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Shelter Type</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.shelterType}
                          onChange={(e) => updateFormData({ shelterType: e.target.value as any })}
                        >
                          <option value="Outdoor">Outdoor</option>
                          <option value="Indoor">Indoor</option>
                          <option value="Greenfield">Greenfield</option>
                          <option value="Rooftop">Rooftop</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'power' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <MultiSelectField 
                          label="Main Power Source"
                          options={['NEA Commercial Supply', 'Local Hydro Supply', 'Solar']}
                          selected={formData.power?.source || []}
                          onChange={(val) => updateFormData({ power: { ...formData.power!, source: val } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Power Connection Type</label>
                        <input 
                          placeholder="e.g. 3 Phase"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.sourceType}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, sourceType: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Backup DG Available?</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.power?.backupDG}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, backupDG: e.target.value } })}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">DG Capacity</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.backupDGCapacity}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, backupDGCapacity: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Solar Capacity (kWp)</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.solarCapacity}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, solarCapacity: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Current Operational Load</label>
                        <input 
                          placeholder="e.g. 5.2 kW"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono text-amber-600 font-bold"
                          value={formData.power?.currentLoad}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, currentLoad: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">NT Transformer</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.power?.ntTransformer ? 'Yes' : 'No'}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, ntTransformer: e.target.value === 'Yes' } })}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Power Cable Type</label>
                        <input 
                          placeholder="e.g. Armored 4 Core"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.power?.powerCableType}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, powerCableType: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Power Cable Length (m)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 50"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.powerCableLength}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, powerCableLength: parseFloat(e.target.value) || 0 } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Customer ID</label>
                        <input 
                          placeholder="NEA Customer ID"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.customerId}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, customerId: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">MCB Capacity</label>
                        <input 
                          placeholder="e.g. 32A"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.mcbCapacity}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, mcbCapacity: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-ntc-blue/5 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Battery Type</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.power?.batteryType}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, batteryType: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Current Health (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono text-indigo-600 font-bold"
                          value={formData.power?.batteryHealth}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, batteryHealth: parseInt(e.target.value) || 0 } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Capacity (Ah)</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.batteryCapacity}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, batteryCapacity: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Banks</label>
                        <input 
                          type="number"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.power?.batteryBanks}
                          onChange={(e) => updateFormData({ power: { ...formData.power!, batteryBanks: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transmission' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Transmission Media</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.transmission?.type}
                          onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, type: e.target.value } })}
                        >
                          <option value="Fiber">Fiber</option>
                          <option value="Microwave">Microwave</option>
                          <option value="Fiber+Microwave">Fiber+Microwave</option>
                          <option value="Satellite">Satellite</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Bandwidth</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.transmission?.bandwidthCapacity}
                          onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, bandwidthCapacity: e.target.value } })}
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Transmission Path/Route</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.transmission?.path}
                          onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, path: e.target.value } })}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-ntc-blue/5 pt-4">
                      <h4 className="text-xs font-bold text-ntc-blue/60 uppercase tracking-widest">Indoor Equipment 1</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Type</label>
                          <select 
                            className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-bold text-ntc-blue"
                            value={formData.transmission?.indoorTransEquipmentType}
                            onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentType: e.target.value } })}
                          >
                            <option value="">Select Type</option>
                            <option value="Router">Router</option>
                            <option value="Switch">Switch</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Model Name</label>
                          <input 
                            className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                            value={formData.transmission?.indoorTransEquipmentname}
                            onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentname: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Vendor</label>
                          <input 
                            className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                            value={formData.transmission?.indoorTransEquipmentVendor}
                            onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentVendor: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>

                    {(formData.transmission?.indoorTransEquipmentType2 || formData.transmission?.indoorTransEquipmentname2) ? (
                      <div className="space-y-4 border-t border-ntc-blue/5 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-ntc-blue/60 uppercase tracking-widest">Indoor Equipment 2</h4>
                          <button 
                            type="button" 
                            onClick={() => updateFormData({ transmission: { 
                              ...formData.transmission!, 
                              indoorTransEquipmentType2: '',
                              indoorTransEquipmentname2: '',
                              indoorTransEquipmentVendor2: ''
                            }})}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Type</label>
                            <select 
                              className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-bold text-ntc-blue"
                              value={formData.transmission?.indoorTransEquipmentType2}
                              onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentType2: e.target.value } })}
                            >
                              <option value="">Select Type</option>
                              <option value="Router">Router</option>
                              <option value="Switch">Switch</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Model Name</label>
                            <input 
                              className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                              value={formData.transmission?.indoorTransEquipmentname2}
                              onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentname2: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Vendor</label>
                            <input 
                              className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                              value={formData.transmission?.indoorTransEquipmentVendor2}
                              onChange={(e) => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentVendor2: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-ntc-blue/5 pt-4">
                        <button 
                          type="button"
                          onClick={() => updateFormData({ transmission: { ...formData.transmission!, indoorTransEquipmentType2: 'Router' } })}
                          className="flex items-center gap-2 rounded-xl border border-dashed border-ntc-blue/20 px-4 py-2 text-xs font-bold text-ntc-blue/60 hover:bg-ntc-blue/5 transition-colors"
                        >
                          + Add Second Equipment (Router/Switch)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'infrastructure' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Tower Height</label>
                        <input 
                          placeholder="e.g. 25m"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.tower?.height}
                          onChange={(e) => updateFormData({ tower: { ...formData.tower!, height: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Tower Type</label>
                        <input 
                          placeholder="e.g. RTT, GBT"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.tower?.type}
                          onChange={(e) => updateFormData({ tower: { ...formData.tower!, type: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 border-t border-ntc-blue/5 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Contract Date</label>
                        <input 
                          type="date"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.leaseContract?.Date}
                          onChange={(e) => updateFormData({ leaseContract: { ...formData.leaseContract!, Date: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Renewal (%)</label>
                        <input 
                          placeholder="e.g. 10%"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.leaseContract?.renewalPercent}
                          onChange={(e) => updateFormData({ leaseContract: { ...formData.leaseContract!, renewalPercent: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Foundation</label>
                        <input 
                          placeholder="e.g. Steel Frame"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.tower?.foundation}
                          onChange={(e) => updateFormData({ tower: { ...formData.tower!, foundation: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Fencing Done by NT</label>
                        <select 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.tower?.fencingDoneByNT ? 'Yes' : 'No'}
                          onChange={(e) => updateFormData({ tower: { ...formData.tower!, fencingDoneByNT: e.target.value === 'Yes' } })}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Asset Owner</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.owner?.name}
                          onChange={(e) => updateFormData({ owner: { ...formData.owner!, name: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Owner Contact</label>
                        <input 
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.owner?.contact}
                          onChange={(e) => updateFormData({ owner: { ...formData.owner!, contact: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-ntc-blue/5 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Shift Engineer</label>
                        <input 
                          placeholder="Name"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none"
                          value={formData.engineer?.name}
                          onChange={(e) => updateFormData({ engineer: { ...formData.engineer!, name: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Shift Engineer Contact</label>
                        <input 
                          placeholder="Phone Number"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.engineer?.phone}
                          onChange={(e) => updateFormData({ engineer: { ...formData.engineer!, phone: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Shift Engineer ID</label>
                        <input 
                          placeholder="Employee ID"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.engineer?.employeeId}
                          onChange={(e) => updateFormData({ engineer: { ...formData.engineer!, employeeId: e.target.value } })}
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Shift Profile</label>
                        <input 
                          placeholder="e.g. 0700-1400"
                          className="w-full rounded-xl border border-ntc-blue/10 p-3 text-sm outline-none font-mono"
                          value={formData.engineer?.shift}
                          onChange={(e) => updateFormData({ engineer: { ...formData.engineer!, shift: e.target.value } })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-ntc-blue/5 bg-ntc-blue/[0.01] p-6">
              {errorMsg ? (
                 <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                    <Activity size={14} className="animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">{errorMsg}</p>
                 </div>
              ) : (
                <p className="text-[10px] uppercase tracking-widest opacity-40">Changes require system audit trail logging</p>
              )}
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium transition-all hover:bg-ntc-blue/5"
                >
                  Discard
                </button>
                <button 
                  disabled={loading}
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-ntc-blue px-8 py-2.5 text-sm font-medium text-white transition-all hover:bg-ntc-blue-dark active:scale-95 disabled:opacity-50"
                >
                  {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={16} />}
                  <span>{initialData ? 'Update Record' : 'Commit Node'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
