import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SAMPLE_SITES = [
  {
    siteId: 'KTM-BSR-02',
    name: 'Baneshwor Sector',
    province: 'Bagmati',
    zone: 'Bagmati',
    district: 'Kathmandu',
    localLevel: 'Kathmandu MC',
    status: 'Active',
    lat: 27.6915,
    lng: 85.3420,
    technologies: ['4G', '3G'],
    tower: { height: '25m', type: 'RTP', owner: 'NTC House', foundation: 'Steel Frame', lastAudit: '2024-01-20' },
    power: { 
      source: 'NEA Commercial', 
      backup: '20kVA DG', 
      battery: 'VRLA 1000Ah', 
      rectifier: 'ZTE 400A', 
      solarCapacity: '5kWp',
      batteryHealth: 88,
      fuelLevel: 40,
      currentLoad: '60A',
      rectifiers: [
        { make: 'Delta', model: 'DPD-400', year: 2022, criticality: 'High' }
      ],
      batteries: [
        { make: 'Narada', model: '12V100Ah', year: 2021, bank: 'Bank A', criticality: 'Medium' }
      ],
      solarStations: 1
    },
    transmission: { 
      type: 'Microwave', 
      capacity: '2.5Gbps', 
      vendor: 'Ceragon', 
      path: 'Link to Sundhara Hub', 
      interface: 'GE',
      routers: 1,
      switches: 2,
      olt: 1,
      atn: 1,
      rtn: 0
    },
    logicalSites: { g2: true, g3: true, g4: true, g5: false },
    parentSite: 'KTM-001-SDR',
    ownerInfo: { name: 'Nepal Telecom', contact: '01-447000', type: 'Internal', accessCode: 'NTC-B1' },
    engineer: { name: 'Er. Maya Devi', phone: '9851022334', employeeId: 'NTC-9021', shift: 'Beta' },
    environment: { temp: 28, humidity: 60, smokeDetector: false, doorOpen: false },
    alarms: ['High Temperature Warning']
  },
  {
    siteId: 'LTP-PAT-01',
    name: 'Patan Durbar Hub',
    province: 'Bagmati',
    zone: 'Bagmati',
    district: 'Lalitpur',
    localLevel: 'Lalitpur MC',
    status: 'Active',
    lat: 27.6744,
    lng: 85.3240,
    technologies: ['5G', '4G'],
    tower: { height: '30m', type: 'GFL', lastAudit: '2023-11-15' },
    power: { source: 'NEA Commercial', backup: 'Solar', batteryHealth: 95 },
    transmission: { type: 'Fiber', capacity: '10Gbps', vendor: 'Huawei' },
    engineer: { name: 'Er. Rajesh Hamal', phone: '9841221122', employeeId: 'NTC-1011', shift: 'Alpha' },
    alarms: [],
    environment: { temp: 22, humidity: 45, smokeDetector: false, doorOpen: false }
  },
  {
    siteId: 'SOL-EV-09',
    name: 'Mustang Alpine Node',
    province: 'Gandaki',
    zone: 'Dhaulagiri',
    district: 'Mustang',
    localLevel: 'Lo-Ghekar Damodarkunda',
    status: 'Active',
    lat: 28.9950,
    lng: 83.8200,
    technologies: ['4G', '2G'],
    tower: { height: '15m', type: 'Pole', owner: 'Rural Municipality', lastAudit: '2024-03-10' },
    power: { 
      source: 'Solar', 
      backup: 'Battery Bank', 
      solarCapacity: '12kWp',
      solarStations: 1,
      bankCount: 2,
      batteryHealth: 98 
    },
    transmission: { type: 'VSAT', capacity: '100Mbps', vendor: 'Gilat' },
    engineer: { name: 'Er. Sonam Gurung', phone: '9860000001', employeeId: 'NTC-5001', shift: 'Continuous' },
    alarms: [],
    environment: { temp: 4, humidity: 30, smokeDetector: false, doorOpen: false }
  },
  {
    siteId: 'PLN-KTM-01',
    name: 'Kalanki Hub Expansion',
    province: 'Bagmati',
    zone: 'Bagmati',
    district: 'Kathmandu',
    localLevel: 'Kathmandu MC',
    status: 'Planned',
    lat: 27.6938,
    lng: 85.2817,
    technologies: [],
    logicalSites: { g2: false, g3: false, g4: false, g5: false },
    tower: { height: '30m', type: 'Roof Top', owner: 'Private', lastAudit: '2024-04-01' },
    power: { source: 'NEA', backup: 'Battery' },
    transmission: { type: 'Fiber', capacity: '10Gbps' },
    engineer: { name: 'Er. Hari Prasad', phone: '9851000002', employeeId: 'NTC-2001', shift: 'Alpha' },
    alarms: [],
    environment: { temp: 24, humidity: 50, smokeDetector: false, doorOpen: false }
  },
  {
    siteId: 'SRV-PKH-05',
    name: 'Lakeside Micro Node',
    province: 'Gandaki',
    zone: 'Gandaki',
    district: 'Kaski',
    localLevel: 'Pokhara MC',
    status: 'Surveyed',
    lat: 28.2096,
    lng: 83.9589,
    technologies: [],
    logicalSites: { g2: false, g3: false, g4: false, g5: false },
    tower: { height: '12m', type: 'Pole', owner: 'Public', lastAudit: '2024-04-15' },
    power: { source: 'NEA', backup: 'None' },
    transmission: { type: 'Microwave', capacity: '300Mbps' },
    engineer: { name: 'Er. Rita KC', phone: '9846000003', employeeId: 'NTC-3001', shift: 'Beta' },
    alarms: [],
    environment: { temp: 22, humidity: 45, smokeDetector: false, doorOpen: false }
  }
];

const SAMPLE_COMPLAINTS = [
  {
    ticketNumber: 'HS-2024-001',
    complaintName: 'Weak 4G Signal in Bazaar Area',
    complainerName: 'Ram Bahadur',
    complainerContact: '9841000111',
    province: 'Bagmati',
    zone: 'Bagmati',
    district: 'Kathmandu',
    localLevel: 'Kathmandu MC',
    lat: 27.7172,
    lng: 85.3240,
    siteId: 'KTM-BSR-02',
    status: 'Open'
  },
  {
    ticketNumber: 'HS-2024-002',
    complaintName: 'Total Service Blackout',
    complainerName: 'Sita Kumari',
    complainerContact: '9851000222',
    province: 'Gandaki',
    zone: 'Gandaki',
    district: 'Kaski',
    localLevel: 'Pokhara MC',
    lat: 28.2096,
    lng: 83.9856,
    siteId: 'SRV-PKH-05',
    status: 'In Progress'
  },
  {
    ticketNumber: 'HS-2024-003',
    complaintName: 'Frequent Call Drops',
    complainerName: 'Hari Prasad',
    complainerContact: '9801000333',
    province: 'Koshi',
    zone: 'Mechi',
    district: 'Jhapa',
    localLevel: 'Birtamod Municipality',
    lat: 26.6343,
    lng: 87.9791,
    siteId: 'SOL-EV-09',
    status: 'Resolved'
  }
];

export async function seedInitialData() {
  const sitesRef = collection(db, 'sites');
  const complaintsRef = collection(db, 'complaints');
  
  const sitesSnapshot = await getDocs(sitesRef);
  if (sitesSnapshot.empty) {
    console.log('Seeding initial sites...');
    for (const site of SAMPLE_SITES) {
      await addDoc(sitesRef, {
        ...site,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'system-seed'
      });
    }
  }

  const complaintsSnapshot = await getDocs(complaintsRef);
  if (complaintsSnapshot.empty) {
    console.log('Seeding initial complaints...');
    for (const complaint of SAMPLE_COMPLAINTS) {
      await addDoc(complaintsRef, {
        ...complaint,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }
}
