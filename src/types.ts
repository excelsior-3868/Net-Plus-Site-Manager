export type UserRole = 'superadmin' | 'admin' | 'editor' | 'viewer';

export interface HardwareItem {
  make: string;
  model: string;
  year: number;
  criticality: 'High' | 'Medium' | 'Low';
  bank?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  employeeId?: string;
}

export interface Complaint {
  id?: string;
  ticketNumber: string;
  type: 'Network' | 'Site';
  complaintName: string;
  complainerName: string;
  complainerContact: string;
  province: string;
  zone: string;
  district: string;
  localLevel: string;
  complaintType: 'SITE COMPLAINT' | 'NETWORK COMPLAINT';
  lat: number;
  lng: number;
  siteId?: string;
  nearestSites?: {
    siteId: string;
    name: string;
    distance: number;
  }[];
  status: 'Open' | 'Resolved' | 'In Progress';
  comments?: string;
  createdAt: any;
  createdByUserId?: string;
  createdByUserName?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
  updatedAt?: any;
}

export interface Site {
  id?: string;
  siteId: string;
  name: string;
  admin: {
    province: string;
    zone: string;
    district: string;
    localLevel: string;
  };
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Decommissioned' | 'Planned' | 'Surveyed';
  lat: number;
  lng: number;
  technologies: {
    type: string[];
    lteType: string[];
    lteRRUConfig: string[];
  };
  tower: {
    height: string;
    type: string;
    owner: string;
    foundation: string;
  };
  power: { 
    source: string[]; 
    sourceType: string;
    backupDG: string; 
    backupDGCapacity: string; 
    batteryType: string; 
    batteryCapacity: string; 
    batteryBanks: string;
    rectifierVendor: string; 
    rectifierCapacity: string;
    solarCapacity: string;
    batteryHealth: number;
    fuelLevel: number;
    currentLoad: string;
  };
  transmission: { 
    type: string; 
    bandwidthCapacity: string; 
    vendor: string; 
    path: string; 
    interface: string; 
    indoorTransEquipmentType: string; 
    indoorTransEquipmentname: string; 
    indoorTransEquipmentVendor: string; 
    indoorTransEquipmentType2?: string; 
    indoorTransEquipmentname2?: string; 
    indoorTransEquipmentVendor2?: string; 
  };
  hubSite: 'Yes' | 'No';
  parentSite: string;
  shelterType: string;
  owner: { 
    name: string; 
    contact: string; 
    type: string; 
    accessCode: string; 
  };
  leaseContract: {
    Date: string;
    renewalOnYears: string;
    renewalPercent: string;
  };
  engineer: { 
    name: string; 
    phone: string; 
    employeeId: string; 
    shift: string; 
  };
  environment: { 
    temp: number; 
    humidity: number; 
    smokeDetector: boolean; 
    doorOpen: boolean; 
  };
  alarms: string[];
  lastAudit: string;
  auditBy?: string;
  lastAuditDate?: any;
  createdAt: any;
  updatedAt: any;
  updatedBy?: string;
  updatedByUserId?: string;
  updatedByUserName?: string;
}
