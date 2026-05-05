import { useEffect, useState, useMemo, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Download, 
  Search, 
  MapPin, 
  Map,
  Wifi, 
  Zap,
  ChevronRight,
  Settings,
  MoreVertical,
  Filter,
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Cpu,
  Database,
  FileText,
  Activity,
  Server,
  Sun,
  Map as MapIcon
} from 'lucide-react';
import { Site, UserProfile, Complaint } from '../types';
import { getSites, deleteSite, createSite } from '../services/siteService';
import { getComplaints, createComplaint, updateComplaint } from '../services/complaintService';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import SiteFormModal from '../components/SiteFormModal';
import ComplaintFormModal from '../components/ComplaintFormModal';
import BulkImportPreviewModal from '../components/BulkImportPreviewModal';

interface SitesProps {
  profile: UserProfile | null;
}

export default function Sites({ profile }: SitesProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isComplaintModalOpen, setComplaintModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | undefined>(undefined);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importSummary, setImportSummary] = useState({ total: 0, valid: 0, duplicates: 0, invalid: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const provinceParam = searchParams.get('province');
  
  const [filterProvince, setFilterProvince] = useState<string>(provinceParam || 'All');
  
  const isTransmissionView = location.pathname === '/transmission-registry';
  const isSolarView = location.pathname === '/solar-stations';
  const isPlannedView = location.pathname === '/planned-sites';
  const isComplaintsView = location.pathname === '/site-complaints';
  const activeFilter = searchParams.get('filter');
  const techFilter = searchParams.get('tech');
  const typeFilter = searchParams.get('type') || 'All'; // Transmission type: All, Router, Switch
  const solarType = searchParams.get('solarType') || 'OnlySolar'; // OnlySolar, Hybrid

  const PROVINCES = ['All', 'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      const matchesSearch = s.siteId.toLowerCase().includes(search.toLowerCase()) || 
                            s.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
      const matchesProvince = filterProvince === 'All' || (s.admin?.province || (s as any).province) === filterProvince;
      
      let matchesFilter = true;
      const tech = s.technologies;
      const techLength = Array.isArray(tech) ? tech.length : (tech?.type?.length || 0);
      const isProposed = s.status === 'Planned' || s.status === 'Surveyed';

      if (isSolarView || activeFilter === 'solar') {
        const sources = Array.isArray(s.power?.source) ? s.power.source : [String(s.power?.source || '')];
        const isSolar = sources.includes('Solar') || (s.power?.solarStations || 0) > 0;
        
        if (solarType === 'OnlySolar') {
          // Strictly solar (only 1 source and it's solar, or just solar station count > 0 and no other source?)
          // Usually "Only Solar" means it doesn't have NEA/Hydro.
          const hasOtherSource = sources.some(src => src !== 'Solar' && src !== '');
          matchesFilter = isSolar && !hasOtherSource;
        } else {
          // "Hybrid" or "All Solar" - includes sites that have solar as ONE of their sources
          matchesFilter = isSolar;
        }
      } else if (isTransmissionView) {
        const transType = (s.transmission?.indoorTransEquipmentType || '').toLowerCase();
        const transType2 = ((s.transmission as any)?.indoorTransEquipmentType2 || '').toLowerCase();
        
        if (typeFilter === 'Router') {
          matchesFilter = transType.includes('router') || transType2.includes('router');
        } else if (typeFilter === 'Switch') {
          matchesFilter = transType.includes('switch') || transType2.includes('switch');
        } else {
          // 'All' in transmission registry shows everything with a recognized trans equipment type
          matchesFilter = transType.includes('router') || transType.includes('switch') || 
                         transType2.includes('router') || transType2.includes('switch');
        }
      } else if (activeFilter === 'complaints' || isComplaintsView) {
        const hasActiveComplaint = complaints.some(c => 
          (c.status === 'Open' || c.status === 'In Progress') && (c.siteId === s.siteId || c.siteId === s.id)
        );
        matchesFilter = hasActiveComplaint;
      } else if (techFilter) {
        const types = Array.isArray(tech) ? tech : (tech?.type || []);
        matchesFilter = types.includes(techFilter);
      } else if (isPlannedView) {
        // Planned/Surveyed view strictly shows sites still in proposed phases or without tech
        matchesFilter = isProposed;
      } else {
        // Default node registry strictly shows sites with active equipment installed
        matchesFilter = !isProposed;
      }

      return matchesSearch && matchesStatus && matchesProvince && matchesFilter;
    });
  }, [sites, search, filterStatus, filterProvince, activeFilter, isSolarView, isPlannedView, isTransmissionView, isComplaintsView, techFilter, typeFilter, solarType]);

  const hardwareSummary = useMemo(() => {
    if (!isTransmissionView) return null;
    const details: Record<string, { make: string; model: string; count: number; capacity: string }> = {};
    
    const countEquipment = (vendor?: string, name?: string, capacity?: string) => {
      if (!vendor && !name) return;
      const v = vendor || 'Unknown';
      const n = name || 'Generic';
      const c = capacity || 'N/A';
      const key = `${v}-${n}`;
      if (!details[key]) {
        details[key] = { make: v, model: n, count: 0, capacity: c };
      }
      details[key].count++;
    };

    filteredSites.forEach(s => {
      countEquipment(s.transmission?.indoorTransEquipmentVendor, s.transmission?.indoorTransEquipmentname, s.transmission?.bandwidthCapacity);
      countEquipment((s.transmission as any)?.indoorTransEquipmentVendor2, (s.transmission as any)?.indoorTransEquipmentname2, s.transmission?.bandwidthCapacity);
    });
    return Object.values(details);
  }, [filteredSites, isTransmissionView]);

  useEffect(() => {
    getSites(setSites);
    getComplaints(setComplaints);
    if (provinceParam) {
      setFilterProvince(provinceParam);
    }
  }, []);

  const handleGenerateReport = () => {
    if (filteredSites.length === 0) {
      alert("No data available to generate a report.");
      return;
    }

    const reportData = filteredSites.map(s => ({
      'Site ID': s.siteId,
      'Site Name': s.name,
      'Operational Status': s.status,
      'Region': s.admin?.province || '',
      'Zone': s.admin?.zone || '',
      'District': s.admin?.district || '',
      'Municipality/Local Level': s.admin?.localLevel || '',
      'Latitude': s.lat,
      'Longitude': s.lng,
      'Technologies': (s.technologies?.type || []).join(', '),
      'Tower Type': s.tower?.type || '',
      'Tower Height': s.tower?.height || '',
      'Power Source': Array.isArray(s.power?.source) ? s.power.source.join(', ') : s.power?.source || '',
      'Battery Health (%)': s.power?.batteryHealth || '',
      'Transmission Type': s.transmission?.type || '',
      'Bandwidth Capacity': s.transmission?.bandwidthCapacity || '',
      'Primary Gear': `${s.transmission?.indoorTransEquipmentVendor || ''} ${s.transmission?.indoorTransEquipmentname || ''}`,
      'Responsible Engineer': s.engineer?.name || '',
      'Engineer Contact': s.engineer?.phone || '',
      'Last Audit Date': s.lastAudit || ''
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Infrastructure_Report");
    XLSX.writeFile(wb, `ntc_network_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExport = () => {
    // Generate a flat template matching the NTC import schema (limit to 4 rows for template)
    const exportData = (filteredSites.length > 0 ? filteredSites.slice(0, 4) : [{}]).map(s => {
      const site = s as Site;
      return {
        'Node ID': site.siteId || '',
        'Site Name': site.name || '',
        'Status': site.status || 'Active',
        'Coordinates': (site.lat && site.lng) ? `${site.lat}, ${site.lng}` : '',
        'Province': site.admin?.province || '',
        'Zone': site.admin?.zone || '',
        'District': site.admin?.district || '',
        'Local Level': site.admin?.localLevel || '',
        'Technologies': Array.isArray(site.technologies?.type) ? site.technologies.type.join(', ') : '',
        'LTE Bands': Array.isArray(site.technologies?.lteType) ? site.technologies.lteType.join(', ') : '',
        'LTE RRU Config': Array.isArray(site.technologies?.lteRRUConfig) ? site.technologies.lteRRUConfig.join(', ') : '',
        'Tower Height (m)': site.tower?.height || '',
        'Tower Type': site.tower?.type || '',
        'Tower Owner': site.tower?.owner || '',
        'Tower Foundation': site.tower?.foundation || '',
        'Power Source': Array.isArray(site.power?.source) ? site.power.source.join(', ') : '',
        'Power Source Type': site.power?.sourceType || '',
        'Backup DG': site.power?.backupDG || 'No',
        'DG Capacity (kVA)': site.power?.backupDGCapacity || '',
        'Battery Type': site.power?.batteryType || '',
        'Battery Capacity (Ah)': site.power?.batteryCapacity || '',
        'Battery Banks': site.power?.batteryBanks || '',
        'Rectifier Vendor': site.power?.rectifierVendor || '',
        'Rectifier Capacity (A)': site.power?.rectifierCapacity || '',
        'Solar Capacity (kWp)': site.power?.solarCapacity || '',
        'Battery Health (%)': site.power?.batteryHealth || 0,
        'Fuel Level (%)': site.power?.fuelLevel || 0,
        'Current Load (A)': site.power?.currentLoad || '',
        'Trans Type': site.transmission?.type || 'Fiber',
        'Bandwidth': site.transmission?.bandwidthCapacity || '',
        'Trans Vendor': site.transmission?.vendor || '',
        'Trans Path': site.transmission?.path || '',
        'Trans Interface': site.transmission?.interface || '',
        'Indoor Trans Type': site.transmission?.indoorTransEquipmentType || '',
        'Indoor Trans Name': site.transmission?.indoorTransEquipmentname || '',
        'Indoor Trans Vendor': site.transmission?.indoorTransEquipmentVendor || '',
        'Indoor Trans Type 2': site.transmission?.indoorTransEquipmentType2 || '',
        'Indoor Trans Name 2': site.transmission?.indoorTransEquipmentname2 || '',
        'Indoor Trans Vendor 2': site.transmission?.indoorTransEquipmentVendor2 || '',
        'Hub Site': site.hubSite || 'No',
        'Parent Site': site.parentSite || '',
        'Shelter Type': site.shelterType || 'Outdoor',
        'Owner Name': site.owner?.name || '',
        'Owner Contact': site.owner?.contact || '',
        'Owner Type': site.owner?.type || 'Internal',
        'Access Code': site.owner?.accessCode || '',
        'Lease Date': site.leaseContract?.Date || '',
        'Renewal (Years)': site.leaseContract?.renewalOnYears || '',
        'Renewal (%)': site.leaseContract?.renewalPercent || '',
        'Engineer Name': site.engineer?.name || '',
        'Engineer Phone': site.engineer?.phone || '',
        'Employee ID': site.engineer?.employeeId || '',
        'Shift': site.engineer?.shift || '',
        'Temp (C)': site.environment?.temp || 0,
        'Humidity (%)': site.environment?.humidity || 0,
        'Smoke Detector': site.environment?.smokeDetector ? 'Yes' : 'No',
        'Door Open Alarm': site.environment?.doorOpen ? 'Yes' : 'No',
        'Alarms': Array.isArray(site.alarms) ? site.alarms.join(', ') : '',
        'Last Audit': site.lastAudit || '',
        'Audit By': site.auditBy || ''
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NTC_Nodes");
    XLSX.writeFile(wb, `ntc_inventory_template.xlsx`);
  };

    const handleBulkImport = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const existingNodeIds = new Set(sites.map(s => String(s.siteId || '').toLowerCase().trim()));

        const getVal = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined) return row[key];
          }
          return '';
        };

        const previewData = data.filter((row: any) => {
          return getVal(row, 'Node ID', 'BTS ID', 'Site ID');
        }).map((dataRow: any) => {
          const item: any = {
            siteId: String(getVal(dataRow, 'Node ID', 'BTS ID', 'Site ID') || '').trim(),
            name: String(getVal(dataRow, 'Site Name', 'Name') || '').trim(),
            status: 'Active',
            admin: {
              province: getVal(dataRow, 'Province') || '',
              zone: getVal(dataRow, 'Zone') || '',
              district: getVal(dataRow, 'District') || '',
              localLevel: getVal(dataRow, 'Local Level') || '',
            },
            technologies: {
              type: String(getVal(dataRow, 'Technologies', 'Technology') || '').split(',').map(s => s.trim()).filter(Boolean),
              lteType: String(getVal(dataRow, 'LTE Bands') || '').split(',').map(s => s.trim()).filter(Boolean),
              lteRRUConfig: String(getVal(dataRow, 'LTE RRU Config') || '').split(',').map(s => s.trim()).filter(Boolean),
            },
            tower: {
              height: getVal(dataRow, 'Tower Height (m)') || '',
              type: getVal(dataRow, 'Tower Type') || '',
              owner: getVal(dataRow, 'Tower Owner') || '',
              foundation: getVal(dataRow, 'Tower Foundation') || '',
            },
            power: {
              source: String(getVal(dataRow, 'Power Source') || '').split(',').map(s => s.trim()).filter(Boolean),
              sourceType: getVal(dataRow, 'Power Source Type') || '',
              backupDG: getVal(dataRow, 'Backup DG') || 'No',
              backupDGCapacity: getVal(dataRow, 'DG Capacity (kVA)') || '',
              batteryType: getVal(dataRow, 'Battery Type') || '',
              batteryCapacity: getVal(dataRow, 'Battery Capacity (Ah)') || '',
              batteryBanks: getVal(dataRow, 'Battery Banks') || '',
              rectifierVendor: getVal(dataRow, 'Rectifier Vendor') || '',
              rectifierCapacity: getVal(dataRow, 'Rectifier Capacity (A)') || '',
              solarCapacity: getVal(dataRow, 'Solar Capacity (kWp)') || '',
              batteryHealth: parseInt(String(getVal(dataRow, 'Battery Health (%)') || '0')) || 0,
              fuelLevel: parseInt(String(getVal(dataRow, 'Fuel Level (%)') || '0')) || 0,
              currentLoad: getVal(dataRow, 'Current Load (A)') || '',
            },
            transmission: {
              type: getVal(dataRow, 'Trans Type') || 'Fiber',
              bandwidthCapacity: getVal(dataRow, 'Bandwidth') || '',
              vendor: getVal(dataRow, 'Trans Vendor') || '',
              path: getVal(dataRow, 'Trans Path') || '',
              interface: getVal(dataRow, 'Trans Interface') || '',
              indoorTransEquipmentType: getVal(dataRow, 'Indoor Trans Type') || '',
              indoorTransEquipmentname: getVal(dataRow, 'Indoor Trans Name') || '',
              indoorTransEquipmentVendor: getVal(dataRow, 'Indoor Trans Vendor') || '',
              indoorTransEquipmentType2: getVal(dataRow, 'Indoor Trans Type 2') || '',
              indoorTransEquipmentname2: getVal(dataRow, 'Indoor Trans Name 2') || '',
              indoorTransEquipmentVendor2: getVal(dataRow, 'Indoor Trans Vendor 2') || '',
            },
            hubSite: getVal(dataRow, 'Hub Site') || 'No',
            parentSite: getVal(dataRow, 'Parent Site') || '',
            shelterType: getVal(dataRow, 'Shelter Type') || 'Outdoor',
            owner: {
              name: getVal(dataRow, 'Owner Name') || '',
              contact: getVal(dataRow, 'Owner Contact') || '',
              type: getVal(dataRow, 'Owner Type') || 'Internal',
              accessCode: getVal(dataRow, 'Access Code') || '',
            },
            leaseContract: {
              Date: getVal(dataRow, 'Lease Date') || '',
              renewalOnYears: getVal(dataRow, 'Renewal (Years)') || '',
              renewalPercent: getVal(dataRow, 'Renewal (%)') || '',
            },
            engineer: {
              name: getVal(dataRow, 'Engineer Name') || '',
              phone: getVal(dataRow, 'Engineer Phone') || '',
              employeeId: getVal(dataRow, 'Employee ID') || '',
              shift: getVal(dataRow, 'Shift') || '',
            },
            environment: {
              temp: parseFloat(String(getVal(dataRow, 'Temp (C)') || '0')) || 0,
              humidity: parseFloat(String(getVal(dataRow, 'Humidity (%)') || '0')) || 0,
              smokeDetector: String(getVal(dataRow, 'Smoke Detector') || '').toLowerCase() === 'yes',
              doorOpen: String(getVal(dataRow, 'Door Open Alarm') || '').toLowerCase() === 'yes',
            },
            alarms: String(getVal(dataRow, 'Alarms') || '').split(',').map(s => s.trim()).filter(Boolean),
            lastAudit: getVal(dataRow, 'Last Audit') || '',
            auditBy: getVal(dataRow, 'Audit By') || '',
          };

          const coords = getVal(dataRow, 'Coordinates');
          if (typeof coords === 'string' && coords.includes(',')) {
            const parts = coords.split(',').map(p => parseFloat(p.trim()));
            if (parts.length >= 2) {
              item.lat = parts[0];
              item.lng = parts[1];
            }
          }

          item._isDuplicate = item.siteId && existingNodeIds.has(item.siteId.toLowerCase());
          item._isInvalid = !item.siteId;
          return item;
        });

        setPreviewData(previewData);
        setImportSummary({
          total: data.length,
          valid: previewData.filter(i => !i._isDuplicate && !i._isInvalid).length,
          duplicates: previewData.filter(i => i._isDuplicate).length,
          invalid: previewData.filter(i => i._isInvalid).length
        });
        setPreviewModalOpen(true);
        setImporting(false);
      };
      reader.readAsBinaryString(file);
      e.target.value = ''; // Reset input
    };

    const commitBulkImport = async () => {
      if (!profile) return;
      setImporting(true);
      const toImport = previewData.filter(item => !item._isInvalid && !item._isDuplicate);
      let successCount = 0;
      const failedRows: string[] = [];

      for (const row of toImport) {
        try {
          const newSite: Partial<Site> = {
            siteId: row.siteId,
            name: row.name,
            status: row.status,
            lat: row.lat,
            lng: row.lng,
            admin: row.admin,
            technologies: row.technologies,
            tower: row.tower,
            power: row.power,
            transmission: row.transmission,
            hubSite: row.hubSite,
            parentSite: row.parentSite,
            shelterType: row.shelterType,
            owner: row.owner,
            leaseContract: row.leaseContract,
            engineer: row.engineer,
            environment: row.environment,
            alarms: row.alarms,
            lastAudit: row.lastAudit,
            auditBy: row.auditBy,
            updatedBy: profile.name,
            updatedByUserId: profile.uid,
            updatedByUserName: profile.name,
          };

          await createSite(newSite);
          successCount++;
        } catch (err: any) {
          failedRows.push(`${row.siteId}: ${err.message}`);
        }
      }

      setPreviewModalOpen(false);
      setImporting(false);
      alert(`Import completed: ${successCount} sites added.\n${failedRows.length > 0 ? `Failed: ${failedRows.join(', ')}` : ''}`);
      getSites(setSites);
    };

  const handleSaveComplaint = async (updated: Complaint) => {
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
        setComplaintModalOpen(false);
        setEditingComplaint(undefined);
    } catch (error) {
        console.error("Save complaint failed", error);
    }
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearch('');
    setFilterStatus('All');
    setFilterProvince('All');
  };

  const handleConfirmDelete = async (id: string) => {
    if (window.confirm("CRITICAL ACTION: Are you sure you want to permanently delete this asset record? This cannot be undone.")) {
      try {
        await deleteSite(id);
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'editor';
  const canDelete = profile?.role === 'admin' || profile?.role === 'superadmin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg",
            isSolarView ? "bg-amber-500 shadow-amber-500/20" : 
            isPlannedView ? "bg-amber-500 shadow-amber-500/20" : 
            isTransmissionView ? "bg-purple-500 shadow-purple-500/20" :
            (activeFilter === 'complaints' || isComplaintsView) ? "bg-orange-500 shadow-orange-500/20" :
            "bg-indigo-500 shadow-indigo-500/20"
          )}>
            {isSolarView ? <Sun size={24} /> : 
             isPlannedView ? <MapIcon size={24} /> : 
             isTransmissionView ? <Cpu size={24} /> :
             (activeFilter === 'complaints' || isComplaintsView) ? <Bell size={24} /> :
             <Server size={24} />}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ntc-blue">
              {isSolarView ? 'Solar Stations Registry' : 
               isPlannedView ? 'Planned & Surveyed Registry' : 
               isTransmissionView ? 'Transmission Registry' :
               (activeFilter === 'complaints' || isComplaintsView) ? 'Critical Sites Registry (Complaints)' :
               techFilter ? `${techFilter} Technologies Registry` :
               'Node Registry'}
              <span className="ml-3 text-sm font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl align-middle border border-gray-200/50">
                {filteredSites.length} Records
              </span>
            </h1>
            <p className="mt-1 text-sm text-ntc-blue/60">
              {isSolarView || activeFilter === 'solar' 
               ? 'Filtering for Solar Powered Sites' 
               : isTransmissionView
                 ? `Nodes equipped with active ${typeFilter === 'All' ? 'transmission' : typeFilter.toLowerCase()} hardware.`
                 : (activeFilter === 'complaints' || isComplaintsView)
                   ? 'Nodes with active network performance complaints or alarms.'
                   : techFilter
                     ? `Filtering for nodes with active ${techFilter} logical capacity.`
                     : isPlannedView 
                       ? 'Infrastructure nodes in planning and survey phases.'
                       : 'Comprehensive list of all BTS/eNodeB assets.'}
            </p>
          </div>
        </div>

        {hardwareSummary && hardwareSummary.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 max-w-xl self-end bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-1"
          >
            <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-50 flex items-center justify-between">
               <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Inventory Distribution</span>
               <span className="text-[9px] font-bold text-ntc-blue bg-ntc-blue/5 px-2 py-0.5 rounded-lg">
                  {hardwareSummary.length} Configs
               </span>
            </div>
            <div className="max-h-24 overflow-y-auto">
              <table className="w-full text-left text-[10px]">
                <tbody className="divide-y divide-gray-50">
                  {hardwareSummary.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-1.5">
                         <span className="font-bold text-ntc-blue">{item.make}</span>
                         <span className="ml-2 text-gray-400">{item.model}</span>
                      </td>
                      <td className="px-4 py-1.5 text-center">
                         <span className="font-black text-ntc-blue">{item.count}</span>
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-emerald-600 font-bold">{item.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        
        <div className="flex items-center gap-3">
          {(activeFilter || techFilter || search || filterStatus !== 'All' || filterProvince !== 'All') && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <X size={14} />
              Reset Filters
            </button>
          )}
          <button 
            onClick={handleGenerateReport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
          >
            <FileText size={16} className="text-ntc-blue" />
            <span>Generate Report</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
          >
            <Download size={16} className="text-emerald-600" />
            <span>Download Template</span>
          </button>
          {canEdit && (
            <div className="flex items-center gap-3">
              <label className={cn(
                "flex items-center gap-2 rounded-xl border border-ntc-blue/20 bg-ntc-blue/5 px-4 py-2.5 text-sm font-medium text-ntc-blue transition-all",
                importing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-ntc-blue/10"
              )}>
                {importing ? (
                  <Activity size={16} className="animate-spin text-ntc-blue" />
                ) : (
                  <Download size={16} className="rotate-180" />
                )}
                <span>{importing ? 'Processing Commit...' : 'Bulk Import'}</span>
                {!importing && <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleBulkImport} />}
              </label>
              <button 
                onClick={() => { 
                  if (isComplaintsView) {
                    setEditingComplaint(undefined);
                    setComplaintModalOpen(true);
                  } else {
                    setEditingSite(undefined); 
                    setModalOpen(true); 
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-ntc-blue px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-ntc-blue/20 transition-all hover:bg-ntc-blue-dark active:scale-95"
              >
                <Plus size={16} />
                <span>{isComplaintsView ? 'Register New Site Complaint' : 'Add New Node'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6 bg-gray-50/50">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by Node ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ntc-blue focus:ring-4 focus:ring-ntc-blue/5 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
               <Filter size={14} className="text-gray-400" />
               <select 
                  value={filterProvince}
                  onChange={(e) => setFilterProvince(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-ntc-blue"
                >
                  {PROVINCES.map(p => <option key={p} value={p}>{p} Province</option>)}
                </select>
                {isSolarView && (
                  <select 
                    value={solarType}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('solarType', e.target.value);
                      setSearchParams(newParams);
                    }}
                    className="rounded-xl border border-ntc-blue/30 bg-ntc-blue/5 px-4 py-2 text-sm font-bold text-ntc-blue outline-none focus:ring-4 focus:ring-ntc-blue/10"
                  >
                    <option value="OnlySolar">Only Solar Sites</option>
                    <option value="Hybrid">Hybrid/All Solar</option>
                  </select>
                )}
                {isTransmissionView && (
                  <select 
                    value={typeFilter}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (e.target.value === 'All') {
                        newParams.delete('type');
                      } else {
                        newParams.set('type', e.target.value);
                      }
                      setSearchParams(newParams);
                    }}
                    className="rounded-xl border border-ntc-blue/30 bg-ntc-blue/5 px-4 py-2 text-sm font-bold text-ntc-blue outline-none focus:ring-4 focus:ring-ntc-blue/10"
                  >
                    <option value="All">All Hardware</option>
                    <option value="Router">Routers Only</option>
                    <option value="Switch">Switches Only</option>
                  </select>
                )}
               <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-ntc-blue"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active Nodes</option>
                  <option value="Inactive">Offline</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {isSolarView ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Descriptor</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Locus (Dist/Prov)</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Power Ops</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Logic</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Access</th>
                  </>
                ) : isPlannedView ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Asset Ref</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Phase Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Location Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Proposed Tech</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Review</th>
                  </>
                ) : isTransmissionView ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Asset Ref</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Gear Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Locus</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Agg. BW</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Action</th>
                  </>
                ) : isComplaintsView ? (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Resource ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Active Issues</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500 text-right">Action</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Resource ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Asset Identity</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Health Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Technology</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Location</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-500">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSites.map((site) => (
                <tr key={site.id} className="group transition-all hover:bg-ntc-blue/[0.02]">
                  {isSolarView ? (
                    <>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center text-ntc-blue transition-all group-hover:bg-ntc-blue group-hover:text-white">
                            <Zap size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ntc-blue">{site.siteId}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{site.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-ntc-blue">{site.admin?.district}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{site.admin?.province}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-600">{site.power?.solarCapacity || 'N/A'}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">
                              {Array.isArray(site.power?.source) ? site.power.source.join(', ') : site.power?.source}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-1">
                          {site.logicalSites?.g2 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="2G" />}
                          {site.logicalSites?.g3 && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="3G" />}
                          {site.logicalSites?.g4 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="4G" />}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Link 
                             to={`/complaints/map?siteId=${site.siteId}`}
                             className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                             title="Topology View (GIS)"
                           >
                             <Map size={18} />
                           </Link>
                           <Link to={`/sites/${site.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-ntc-blue hover:bg-ntc-blue hover:text-white transition-all shadow-sm">
                             <ChevronRight size={18} />
                           </Link>
                           {canEdit && (
                             <button 
                               onClick={() => { setEditingSite(site); setModalOpen(true); }}
                               className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:text-ntc-blue hover:border-ntc-blue transition-all"
                             >
                               <Settings size={18} />
                             </button>
                           )}
                           {canDelete && (
                             <button 
                               onClick={() => handleConfirmDelete(site.id!)}
                               className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                               title="Permanently Delete Node"
                             >
                               <Trash2 size={18} />
                             </button>
                           )}
                        </div>
                      </td>
                    </>
                  ) : isPlannedView ? (
                    <>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Map size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ntc-blue">{site.siteId}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{site.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-tight",
                            site.status === 'Planned' ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                         )}>
                            <div className={cn("h-1 w-1 rounded-full", site.status === 'Planned' ? "bg-blue-600" : "bg-purple-600")} />
                            {site.status}
                         </span>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-ntc-blue">{site.admin?.district || (site as any).district || 'N/A'}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">
                               {site.admin?.province || (site as any).province || 'N/A'} | {site.admin?.zone || (site as any).zone || ''}
                            </span>
                            <span className="text-[8px] text-indigo-400 font-medium uppercase mt-0.5">
                               {site.admin?.localLevel || (site as any).localLevel || ''}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {((Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || [])).length > 0) ? (
                            (Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || [])).map(t => (
                              <span key={t} className="rounded bg-indigo-50 px-2 py-0.5 text-[8px] font-bold text-indigo-600 uppercase">{t}</span>
                            ))
                          ) : (
                            <span className="text-[9px] text-gray-400 italic">None Proposed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Link 
                             to={`/complaints/map?siteId=${site.siteId}`}
                             className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                             title="Topology View (GIS)"
                           >
                             <Map size={16} />
                           </Link>
                           <Link to={`/sites/${site.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-ntc-blue hover:bg-ntc-blue hover:text-white transition-all">
                              <ChevronRight size={16} />
                           </Link>
                           {canEdit && (
                              <button 
                                 onClick={() => { setEditingSite(site); setModalOpen(true); }}
                                 className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:text-ntc-blue hover:border-ntc-blue transition-all"
                              >
                                 <Settings size={14} />
                              </button>
                           )}
                           {canDelete && (
                              <button 
                                 onClick={() => handleConfirmDelete(site.id!)}
                                 className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                 title="Delete Planned Site"
                              >
                                 <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                      </td>
                    </>
                  ) : isTransmissionView ? (
                    <>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                            (site.transmission?.indoorTransEquipmentType || '').toLowerCase().includes('router') || 
                            ((site.transmission as any)?.indoorTransEquipmentType2 || '').toLowerCase().includes('router')
                              ? "bg-blue-50 text-blue-600" 
                              : "bg-indigo-50 text-indigo-600"
                          )}>
                            {(site.transmission?.indoorTransEquipmentType || '').toLowerCase().includes('router') ||
                             ((site.transmission as any)?.indoorTransEquipmentType2 || '').toLowerCase().includes('router') ? <Cpu size={16} /> : <Database size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ntc-blue">{site.siteId}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{site.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="space-y-2">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-ntc-blue">{site.transmission?.indoorTransEquipmentVendor || 'Unknown Vendor'}</span>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">{site.transmission?.indoorTransEquipmentname || 'Generic Gear'}</span>
                           </div>
                           {((site.transmission as any)?.indoorTransEquipmentname2 || (site.transmission as any)?.indoorTransEquipmentType2) && (
                             <div className="flex flex-col pt-2 border-t border-gray-100">
                                <span className="text-xs font-bold text-ntc-blue">{(site.transmission as any).indoorTransEquipmentVendor2 || 'Unknown Vendor'}</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">{(site.transmission as any).indoorTransEquipmentname2 || 'Secondary Gear'}</span>
                             </div>
                           )}
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-ntc-blue">{site.admin?.district}</span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">{site.admin?.province}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-xs font-mono font-bold text-emerald-600">{site.transmission?.bandwidthCapacity || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <Link to={`/sites/${site.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-ntc-blue hover:bg-ntc-blue hover:text-white transition-all shadow-sm">
                           <ChevronRight size={18} />
                         </Link>
                      </td>
                    </>
                  ) : isComplaintsView ? (
                    <>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                             <AlertCircle size={16} />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-ntc-blue">{site.siteId}</p>
                             <p className="text-[9px] font-bold text-gray-400 uppercase">{site.name}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="space-y-1.5 min-w-[200px]">
                            {complaints
                              .filter(c => (c.status === 'Open' || c.status === 'In Progress') && (c.siteId === site.siteId || c.siteId === site.id))
                              .map((c, idx) => (
                                <div key={c.id || `${c.ticketNumber}-${idx}`} className="flex items-center gap-2">
                                   <div className={cn("h-1 w-1 rounded-full", c.status === 'Open' ? "bg-red-500" : "bg-amber-500")} />
                                   <span className="text-[10px] font-bold text-ntc-blue truncate max-w-[250px]">{c.complaintName}</span>
                                   <span className="text-[8px] text-gray-400 font-mono">[{c.ticketNumber}]</span>
                                </div>
                              ))
                            }
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Link to={`/sites/${site.id}`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-ntc-blue hover:text-white transition-all shadow-sm">
                             <ChevronRight size={18} />
                           </Link>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-5 font-mono text-xs font-semibold text-ntc-blue">{site.siteId}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-ntc-blue">{site.name}</span>
                          <span className="text-[11px] text-gray-500">Registered: {new Date(site.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight",
                          site.status === 'Active' ? "bg-emerald-50 text-emerald-700" : 
                          site.status === 'Maintenance' ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        )}>
                          <div className={cn("h-1.5 w-1.5 rounded-full", 
                            site.status === 'Active' ? "bg-emerald-500" : 
                            site.status === 'Maintenance' ? "bg-amber-500" : "bg-red-500"
                          )} />
                          {site.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {((Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || [])).length > 0) ? (
                            (Array.isArray(site.technologies) ? site.technologies : (site.technologies?.type || [])).map(t => (
                              <span key={t} className="rounded bg-ntc-blue/5 px-2 py-0.5 text-[9px] font-bold text-ntc-blue">{t}</span>
                            ))
                          ) : (
                            <span className="text-[9px] text-gray-400 italic">None Proposed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs text-ntc-blue/80">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" />
                          <div>
                            <p className="font-bold">{site.admin?.district || (site as any).district || 'N/A'}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
                              {site.admin?.province || (site as any).province || 'N/A'} 
                              { (site.admin?.zone || (site as any).zone) ? ` | ${site.admin?.zone || (site as any).zone}` : ''} 
                            </p>
                            <p className="text-[9px] text-indigo-400/60 font-semibold uppercase tracking-widest mt-0.5">
                               {site.admin?.localLevel || (site as any).localLevel || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/complaints/map?siteId=${site.siteId}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-all hover:bg-indigo-600 hover:text-white"
                            title="Topology View (GIS)"
                          >
                            <Map size={18} />
                          </Link>
                          <Link 
                            to={`/sites/${site.id}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all hover:bg-ntc-blue hover:text-white"
                          >
                            <ChevronRight size={18} />
                          </Link>
                           {canEdit && (
                            <button 
                              onClick={() => { setEditingSite(site); setModalOpen(true); }}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-all hover:border-ntc-blue hover:text-ntc-blue"
                            >
                              <Settings size={18} />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleConfirmDelete(site.id!)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-all hover:bg-red-600 hover:text-white"
                              title="Permanently Delete Node"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SiteFormModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        initialData={editingSite}
        profile={profile}
      />

      <ComplaintFormModal 
        isOpen={isComplaintModalOpen}
        onClose={() => { setComplaintModalOpen(false); setEditingComplaint(undefined); }}
        onSave={handleSaveComplaint}
        complaint={editingComplaint}
        sites={sites}
      />

      <BulkImportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onConfirm={commitBulkImport}
        data={previewData}
        summary={importSummary}
      />
    </div>
  );
}
