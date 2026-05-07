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
  Activity
} from 'lucide-react';
import { Site, UserProfile, Complaint } from '../types';
import { getSites, deleteSite, createSite } from '../services/siteService';
import { getComplaints, createComplaint, updateComplaint } from '../services/complaintService';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import SiteFormModal from '../components/SiteFormModal';
import ComplaintFormModal from '../components/ComplaintFormModal';

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
      const isStatusProposed = s.status === 'Planned' || s.status === 'Surveyed';
      const hasEquipment = techLength > 0;
      const isProposed = isStatusProposed || (!hasEquipment && s.status !== 'Active' && s.status !== 'Maintenance');

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
    const unsubscribeSites = getSites(setSites);
    const unsubscribeComplaints = getComplaints(setComplaints);
    return () => {
      unsubscribeSites();
      unsubscribeComplaints();
    };
  }, []);

  useEffect(() => {
    if (provinceParam) {
      setFilterProvince(provinceParam);
    }
  }, [provinceParam]);

  const handleExport = () => {
    const dataToExport = filteredSites.map(s => ({
      'Node ID': s.siteId,
      'Site Name': s.name,
      'Status': s.status,
      'Province': s.admin?.province || '',
      'Zone': s.admin?.zone || '',
      'District': s.admin?.district || '',
      'Local Level': s.admin?.localLevel || '',
      'Coordinates': `${s.lat}, ${s.lng}`,
      'Technologies': (s.technologies?.type || []).join(', '),
      'LTE Bands': (s.technologies?.lteType || []).join(', '),
      'LTE RRU Config': (s.technologies?.lte1800RRU || []).join(', '),
      'Tower Height': s.tower?.height || '',
      'Tower Type': s.tower?.type || '',
      'Tower Owner': s.tower?.owner || '',
      'Tower Foundation': s.tower?.foundation || '',
      'Power Source': Array.isArray(s.power?.source) ? s.power.source.join(', ') : s.power?.source || '',
      'Power Source Type': s.power?.sourceType || '',
      'Backup DG': s.power?.backupDG || '',
      'DG Capacity': s.power?.backupDGCapacity || '',
      'Battery Type': s.power?.batteryType || '',
      'Battery Capacity': s.power?.batteryCapacity || '',
      'Battery Banks': s.power?.batteryBanks || '',
      'Rectifier Vendor': s.power?.rectifierVendor || '',
      'Rectifier Capacity': s.power?.rectifierCapacity || '',
      'Solar Capacity': s.power?.solarCapacity || '',
      'Battery Health (%)': s.power?.batteryHealth || '',
      'Fuel Level (%)': s.power?.fuelLevel || '',
      'Current Load': s.power?.currentLoad || '',
      'NT Transformer': s.power?.ntTransformer ? 'Yes' : 'No',
      'Power Cable Type': s.power?.powerCableType || '',
      'Power Cable Length': s.power?.powerCableLength || '',
      'Customer ID': s.power?.customerId || '',
      'MCB Capacity': s.power?.mcbCapacity || '',
      'Trans Type': s.transmission?.type || '',
      'Bandwidth': s.transmission?.bandwidthCapacity || '',
      'Trans Vendor': s.transmission?.vendor || '',
      'Trans Path': s.transmission?.path || '',
      'Trans Interface': s.transmission?.interface || '',
      'Indoor Trans Type': s.transmission?.indoorTransEquipmentType || '',
      'Indoor Trans Name': s.transmission?.indoorTransEquipmentname || '',
      'Indoor Trans Vendor': s.transmission?.indoorTransEquipmentVendor || '',
      'Indoor Trans Type 2': (s.transmission as any)?.indoorTransEquipmentType2 || '',
      'Indoor Trans Name 2': (s.transmission as any)?.indoorTransEquipmentname2 || '',
      'Indoor Trans Vendor 2': (s.transmission as any)?.indoorTransEquipmentVendor2 || '',
      'Hub Site': s.hubSite || '',
      'Parent Site': s.parentSite || '',
      'Shelter Type': s.shelterType || '',
      'Owner Name': s.owner?.name || '',
      'Owner Contact': s.owner?.contact || '',
      'Owner Type': s.owner?.type || '',
      'Access Code': s.owner?.accessCode || '',
      'Lease Date': s.leaseContract?.Date || '',
      'Renewal Years': s.leaseContract?.renewalOnYears || '',
      'Renewal Percent': s.leaseContract?.renewalPercent || '',
      'Engineer Name': s.engineer?.name || '',
      'Engineer Phone': s.engineer?.phone || '',
      'Employee ID': s.engineer?.employeeId || '',
      'Engineer Shift': s.engineer?.shift || '',
      'Temp (C)': s.environment?.temp || '',
      'Humidity (%)': s.environment?.humidity || '',
      'Smoke Detector': s.environment?.smokeDetector ? 'Yes' : 'No',
      'Door Open': s.environment?.doorOpen ? 'Yes' : 'No',
      'Active Alarms': (s.alarms || []).join(', '),
      'Last Audit': s.lastAudit || '',
      'Audit By': s.updatedByUserName || '',
      'Ward/Tole Area': s.admin?.wardToleArea || '',
      'Fencing Done by NT': s.tower?.fencingDoneByNT ? 'Yes' : 'No'
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NTC_Nodes");
    XLSX.writeFile(wb, `ntc_nodes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkImport = async (e: ChangeEvent<HTMLInputElement>) => {
    // Starting import process
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`Starting bulk import for file: ${file.name}`);

    if (!window.confirm(`Bulk Import Initiation: Are you sure you want to attempt importing records from "${file.name}"?`)) {
      e.target.value = '';
      return;
    }

    if (!profile) {
      alert("System Error: Your administrative profile is not yet loaded. Please wait a moment and try again.");
      e.target.value = '';
      return;
    }

    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error("The system encountered an error reading the local file buffer.");
        
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || !Array.isArray(data) || data.length === 0) {
          alert("Import Canceled: The selected Excel file contains no valid data rows or is incorrectly formatted.");
          setImporting(false);
          return;
        }

        console.log(`Successfully parsed ${data.length} rows.`);
        
        const getVal = (row: any, ...keys: string[]) => {
          const rowKeys = Object.keys(row);
          for (const k of keys) {
            const searchKey = k.toLowerCase().trim();
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return typeof row[k] === 'string' ? row[k].trim() : row[k];
            }
            const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === searchKey);
            if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
              return typeof row[foundKey] === 'string' ? row[foundKey].trim() : row[foundKey];
            }
          }
          return undefined;
        };

        const existingNodeIds = new Set(sites.map(s => String(s.siteId || '').toLowerCase().trim()).filter(Boolean));
        const failedRowsArr: { row: number; id: string; error: string }[] = [];
        let duplicateCount = 0;
        let invalidCount = 0;

        const toImport = data.filter((row, idx) => {
          const idCandidates = ['Node ID', 'siteId', 'NodeID', 'Site ID', 'ID', 'SiteID', 'SiteRef', 'Asset ID', 'Site_ID'];
          const rowSiteIdRaw = getVal(row, ...idCandidates);
          
          if (!rowSiteIdRaw) {
            invalidCount++;
            return false;
          }

          const rowSiteId = String(rowSiteIdRaw).toLowerCase().trim();
          if (existingNodeIds.has(rowSiteId)) {
            duplicateCount++;
            return false;
          }
          return true;
        });

        if (toImport.length === 0) {
          alert(`Import Result: No new data to process.\n\n- Total Rows in File: ${data.length}\n- Duplicates Skipped: ${duplicateCount}\n- Missing Node ID: ${invalidCount}\n\nPlease ensure your Node IDs are unique and the column header matches "Node ID".`);
          setImporting(false);
          return;
        }

        console.log(`Executing batch import of ${toImport.length} new records...`);

        const results = await Promise.all(toImport.map(async (row) => {
          const originalIndex = data.indexOf(row);
          const rowNumber = originalIndex + 2;
          const siteId = String(getVal(row, 'Node ID', 'siteId', 'NodeID', 'SiteID', 'ID') || 'Unknown');

          try {
            let lat = 0, lng = 0;
            const coords = getVal(row, 'Coordinates', 'Coords', 'Location', 'Lat/Long', 'Lat,Long');
            if (typeof coords === 'string' && coords.includes(',')) {
              const parts = coords.split(',').map(p => parseFloat(p.trim()));
              if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                lat = parts[0];
                lng = parts[1];
              }
            } else {
              lat = parseFloat(String(getVal(row, 'Latitude', 'lat', 'Lat') || '0')) || 0;
              lng = parseFloat(String(getVal(row, 'Longitude', 'lng', 'Long', 'Lng') || '0')) || 0;
            }

            const nodeStatus = (getVal(row, 'Status', 'status', 'Site Status') || 'Active') as any;

            const newSite: Partial<Site> = {
              siteId: siteId,
              name: String(getVal(row, 'Site Name', 'Name', 'SiteName', 'Site_Name') || 'Unnamed Site'),
              status: nodeStatus,
              lat,
              lng,
              admin: {
                province: String(getVal(row, 'Province', 'state', 'Region') || ''),
                zone: String(getVal(row, 'Zone', 'SubRegion') || ''),
                district: String(getVal(row, 'District', 'City') || ''),
                localLevel: String(getVal(row, 'Local Level', 'LocalLevel', 'Municipality', 'Area') || ''),
                wardToleArea: String(getVal(row, 'Ward/Tole Area', 'WardToleArea', 'Ward', 'Tole') || ''),
              },
              technologies: {
                type: String(getVal(row, 'Technologies', 'Technology', 'Network') || '').split(',').map(s => s.trim()).filter(Boolean),
                lteType: String(getVal(row, 'LTE Bands', 'LTEBands', 'Bands') || '').split(',').map(s => s.trim()).filter(Boolean),
                lte1800RRU: String(getVal(row, 'LTE RRU Config', 'RRUConfig') || '').split(',').map(s => s.trim()).filter(Boolean),
              },
              tower: { 
                height: String(getVal(row, 'Tower Height', 'Height') || ''), 
                type: String(getVal(row, 'Tower Type', 'TowerType') || ''), 
                owner: String(getVal(row, 'Tower Owner', 'TowerOwner') || ''), 
                foundation: String(getVal(row, 'Tower Foundation', 'Foundation') || ''),
                fencingDoneByNT: String(getVal(row, 'Fencing Done by NT', 'FencingNT', 'Fencing') || '').toLowerCase().includes('yes'), 
              },
              power: { 
                source: String(getVal(row, 'Power Source', 'Source') || '').split(',').map(s => s.trim()).filter(Boolean),
                sourceType: String(getVal(row, 'Power Source Type', 'SourceType') || ''),
                backupDG: (String(getVal(row, 'Backup DG', 'DG') || 'No').trim().toLowerCase().startsWith('y') ? 'Yes' : 'No') as 'Yes' | 'No', 
                backupDGCapacity: String(getVal(row, 'DG Capacity', 'DGCapacity') || ''), 
                batteryType: String(getVal(row, 'Battery Type', 'BatteryType') || ''), 
                batteryCapacity: String(getVal(row, 'Battery Capacity') || ''), 
                batteryBanks: String(getVal(row, 'Battery Banks', 'BatteryBanks') || ''), 
                rectifierVendor: String(getVal(row, 'Rectifier Vendor', 'Rectifier') || ''), 
                rectifierCapacity: String(getVal(row, 'Rectifier Capacity') || ''), 
                solarCapacity: String(getVal(row, 'Solar Capacity', 'Solar') || ''), 
                batteryHealth: Math.min(100, Math.max(0, parseInt(String(getVal(row, 'Battery Health (%)') || '100')))), 
                fuelLevel: Math.min(100, Math.max(0, parseInt(String(getVal(row, 'Fuel Level (%)') || '100')))), 
                currentLoad: String(getVal(row, 'Current Load', 'Load') || ''),
                ntTransformer: String(getVal(row, 'NT Transformer', 'NTTransformer') || '').toLowerCase().includes('yes'),
                powerCableType: String(getVal(row, 'Power Cable Type', 'PowerCableType') || ''),
                powerCableLength: parseFloat(String(getVal(row, 'Power Cable Length', 'PowerCableLength') || '0')) || 0,
                customerId: String(getVal(row, 'Customer ID', 'CustomerID', 'NEA ID') || ''),
                mcbCapacity: String(getVal(row, 'MCB Capacity', 'MCBCapacity') || ''),
              },
              transmission: { 
                type: String(getVal(row, 'Trans Type', 'Transmission Media', 'Media') || ''), 
                bandwidthCapacity: String(getVal(row, 'Bandwidth', 'Capacity') || ''), 
                vendor: String(getVal(row, 'Trans Vendor', 'Vendor') || ''), 
                path: String(getVal(row, 'Trans Path', 'Path') || ''), 
                interface: String(getVal(row, 'Trans Interface', 'Interface') || ''), 
                indoorTransEquipmentType: String(getVal(row, 'Indoor Trans Type') || ''), 
                indoorTransEquipmentname: String(getVal(row, 'Indoor Trans Name') || ''), 
                indoorTransEquipmentVendor: String(getVal(row, 'Indoor Trans Vendor') || ''),
                indoorTransEquipmentType2: String(getVal(row, 'Indoor Trans Type 2') || ''), 
                indoorTransEquipmentname2: String(getVal(row, 'Indoor Trans Name 2') || ''), 
                indoorTransEquipmentVendor2: String(getVal(row, 'Indoor Trans Vendor 2') || '') 
              },
              hubSite: (String(getVal(row, 'Hub Site') || 'No').trim().toLowerCase().startsWith('y') ? 'Yes' : 'No') as any,
              parentSite: String(getVal(row, 'Parent Site') || ''),
              shelterType: String(getVal(row, 'Shelter Type') || ''),
              owner: { 
                name: String(getVal(row, 'Owner Name') || ''), 
                contact: String(getVal(row, 'Owner Contact') || ''), 
                type: (getVal(row, 'Owner Type') || 'Internal') as any, 
                accessCode: String(getVal(row, 'Access Code') || '') 
              },
              engineer: { 
                name: String(getVal(row, 'Engineer Name') || ''), 
                phone: String(getVal(row, 'Engineer Phone') || ''), 
                employeeId: String(getVal(row, 'Employee ID') || ''), 
                shift: (getVal(row, 'Engineer Shift') || 'Alpha') as any 
              },
              leaseContract: { 
                Date: String(getVal(row, 'Lease Date') || ''), 
                renewalOnYears: String(getVal(row, 'Renewal Years') || ''), 
                renewalPercent: String(getVal(row, 'Renewal Percent') || '') 
              },
              environment: { 
                temp: parseInt(String(getVal(row, 'Temp (C)') || '25')), 
                humidity: parseInt(String(getVal(row, 'Humidity (%)') || '50')), 
                smokeDetector: String(getVal(row, 'Smoke Detector') || '').toLowerCase().includes('yes'), 
                doorOpen: String(getVal(row, 'Door Open') || '').toLowerCase().includes('yes') 
              },
              alarms: String(getVal(row, 'Active Alarms') || '').split(',').map(s => s.trim()).filter(Boolean),
              updatedByUserId: profile.uid,
              updatedByUserName: profile.name,
              updatedBy: profile.name,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            await createSite(newSite);
            return true;
          } catch (err: any) {
            console.error(`Import error during database write at row ${rowNumber}:`, err);
            let errorMessage = "Database Execution Error";
            try {
              const errObj = err.message ? JSON.parse(err.message) : err;
              errorMessage = errObj.error || err.message || String(err);
            } catch {
              errorMessage = err.message || String(err);
            }
            failedRowsArr.push({ row: rowNumber, id: siteId, error: errorMessage });
            return false;
          }
        }));

        const successCount = results.filter(r => r === true).length;
        let summaryText = `Bulk Import Summary:\n\n`;
        summaryText += `✅ Success: ${successCount} sites record added\n`;
        if (duplicateCount > 0) summaryText += `⏭️ Skipped: ${duplicateCount} existing duplicates\n`;
        if (invalidCount > 0) summaryText += `⚠️ Invalid: ${invalidCount} rows missing header "Node ID"\n`;
        
        if (failedRowsArr.length > 0) {
          summaryText += `\n❌ Failed: ${failedRowsArr.length} errors occurred during writing\n`;
          failedRowsArr.slice(0, 10).forEach(f => {
            summaryText += `   - Row ${f.row} [ID: ${f.id}]: ${f.error.substring(0, 80)}\n`;
          });
          if (failedRowsArr.length > 10) summaryText += `   ... and ${failedRowsArr.length - 10} more.`;
        }

        alert(summaryText);
      } catch (error: any) {
        console.error("Bulk import process fatal error:", error);
        alert(`System Failure during Import: ${error.message || "An unexpected error occurred during Excel processing."}`);
      } finally {
        setImporting(false);
        if (e.target) e.target.value = '';
        console.log("Bulk import process finished.");
      }
    };
    reader.onerror = () => {
      alert("File Access Failure: System could not read the selected local registry file.");
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
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
    if (!id) {
       alert("Target Identification Failure: Could not resolve the unique ID for this record.");
       return;
    }
    
    if (window.confirm("CRITICAL PROTOCOL: Are you sure you want to permanently DESTRUCT this asset record from the production registry? This action is irreversible.")) {
      try {
        await deleteSite(id);
        alert("Success: Asset record has been purged from the database.");
      } catch (error: any) {
        console.error("Deletion execution failed:", error);
        let errorMessage = "Check administrative authorization and connection stability.";
        try {
          const errStatus = error.message ? JSON.parse(error.message) : (typeof error === 'string' ? JSON.parse(error) : error);
          errorMessage = errStatus.error || errorMessage;
        } catch {
          errorMessage = error.message || String(error);
        }
        alert(`Deletion Access Denied: ${errorMessage}`);
      }
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'editor';
  const canDelete = profile?.role === 'admin' || profile?.role === 'superadmin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ntc-blue">
            {isSolarView ? 'Solar Stations Registry' : 
             isPlannedView ? 'Planned & Surveyed Registry' : 
             isTransmissionView ? 'Transmission Registry' :
             (activeFilter === 'complaints' || isComplaintsView) ? 'Critical Sites Registry (Complaints)' :
             techFilter ? `${techFilter} Technologies Registry` :
             'Node Registry'}
            <span className="ml-3 text-sm font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl align-middle border border-gray-200/50">
              {filteredSites.length} Records
            </span>
          </h2>
          <p className="text-sm text-ntc-blue/60">
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
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
          >
            <Download size={16} />
            <span>Generate Inventory</span>
          </button>
            {canEdit && (
            <div className="flex items-center gap-3">
              <label className={cn(
                "flex items-center gap-2 rounded-xl border border-ntc-blue/20 bg-ntc-blue/5 px-4 py-2.5 text-sm font-medium text-ntc-blue transition-all",
                importing ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-ntc-blue/10"
              )}>
                {importing ? (
                  <Activity size={16} className="animate-spin" />
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
    </div>
  );
}
