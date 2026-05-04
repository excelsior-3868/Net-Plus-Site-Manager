import React, { useMemo, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  ChevronLeft, 
  MapPin, 
  AlertCircle, 
  User, 
  Phone,
  Layout,
  Server,
  Activity
} from 'lucide-react';
import { getComplaints } from '../services/complaintService';
import { getSites } from '../services/siteService';
import { Site, Complaint, UserProfile } from '../types';
import { cn } from '../lib/utils';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ComplaintMap: React.FC<{ profile: UserProfile | null }> = ({ profile }) => {
    const [searchParams] = useSearchParams();
    const [sites, setSites] = useState<Site[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const ticketId = searchParams.get('ticket');
    const siteId = searchParams.get('siteId');

    useEffect(() => {
        const unsubSites = getSites(setSites);
        const unsubComplaints = getComplaints(setComplaints);
        return () => {
          unsubSites();
          unsubComplaints();
        };
    }, []);
    

    const filteredComplaints = useMemo(() => {
        if (siteId) {
            return complaints.filter(c => c.siteId === siteId);
        }
        return complaints;
    }, [complaints, siteId]);

    const targetSite = useMemo(() => 
        sites.find(s => s.siteId === siteId),
    [sites, siteId]);

    const selectedComplaint = useMemo(() => 
        complaints.find(c => c.ticketNumber === ticketId), 
    [complaints, ticketId]);

    const center: [number, number] = useMemo(() => {
        if (selectedComplaint) return [selectedComplaint.lat, selectedComplaint.lng];
        if (targetSite) return [targetSite.lat, targetSite.lng];
        return [28.3949, 84.1240]; // Center of Nepal
    }, [selectedComplaint, targetSite]);

    const zoom = (selectedComplaint || targetSite) ? 14 : 7;

    const siteIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        className: 'hue-rotate-[140deg] saturate-[200%] contrast-[150%]', // Customize icon via CSS filter
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });

    return (
        <div className="flex h-[calc(100vh-160px)] flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to={siteId ? "/nodes" : "/complaints"} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 hover:text-ntc-blue transition-all">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-ntc-blue">
                            {siteId ? `Topology View: ${siteId}` : 'Topology View'}
                        </h2>
                        <p className="text-sm text-ntc-blue/60">
                            {siteId ? `Visualizing network status and complaint history for ${targetSite?.name || siteId}.` : 'GIS mapping of network grievances and complaints.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Info Panel */}
                <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 min-w-[320px]">
                    {targetSite && (
                        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                                    <Server size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Target Node</p>
                                    <p className="text-sm font-bold text-ntc-blue truncate max-w-[180px]">{targetSite.name}</p>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-500">Status</span>
                                    <span className="font-bold text-emerald-600 uppercase">{targetSite.status}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-gray-500">Technology</span>
                                    <span className="font-bold text-ntc-blue">{targetSite.technologies.join(', ')}</span>
                                </div>
                                <Link to={`/sites/${targetSite.id}`} className="mt-3 block w-full py-2 text-center text-[10px] font-bold uppercase tracking-widest bg-white border border-indigo-100 rounded-xl text-ntc-blue hover:bg-ntc-blue hover:text-white transition-all">
                                    View Full Details
                                </Link>
                             </div>
                        </div>
                    )}

                    {selectedComplaint ? (
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                            <div className="mb-6 flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    selectedComplaint.status === 'Open' ? "bg-red-50 text-red-600" :
                                    selectedComplaint.status === 'In Progress' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Selected Ticket</p>
                                    <p className="text-sm font-bold text-ntc-blue">{selectedComplaint.ticketNumber}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Issue</p>
                                    <p className="text-sm font-semibold text-ntc-blue">{selectedComplaint.complaintName}</p>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex items-start gap-3">
                                    <MapPin size={16} className="text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs font-bold text-ntc-blue">{selectedComplaint.district}</p>
                                        <p className="text-[10px] text-gray-500">{selectedComplaint.province} | {selectedComplaint.localLevel}</p>
                                        <p className="mt-1 text-[9px] font-mono text-gray-400">{selectedComplaint.lat.toFixed(4)}, {selectedComplaint.lng.toFixed(4)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex items-start gap-3">
                                    <User size={16} className="text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs font-bold text-ntc-blue">{selectedComplaint.complainerName}</p>
                                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                                            <Phone size={10} />
                                            {selectedComplaint.complainerContact}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center py-12 px-4">
                            <Activity size={40} className="text-indigo-100 mb-4" />
                            <p className="text-sm font-bold text-ntc-blue">{siteId ? 'Site Complaints' : 'Network Intelligence'}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {siteId ? `Visualizing historical grievances for Node ${siteId}.` : 'Select a marker on the map to view specific details.'}
                            </p>
                        </div>
                    )}

                    <div className="flex-1 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                            {siteId ? 'Complaint History' : 'Regional List'}
                        </p>
                        <div className="flex-1 overflow-y-auto space-y-3 -mr-2 pr-2">
                            {filteredComplaints.length > 0 ? filteredComplaints.map((c, idx) => (
                                <Link 
                                    key={c.id || `${c.ticketNumber}-${idx}`}
                                    to={siteId ? `/complaints/map?siteId=${siteId}&ticket=${c.ticketNumber}` : `/complaints/map?ticket=${c.ticketNumber}`}
                                    className={cn(
                                        "block p-3 rounded-2xl border transition-all hover:bg-gray-50",
                                        c.ticketNumber === ticketId ? "border-ntc-blue bg-ntc-blue/[0.02]" : "border-gray-50"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-ntc-blue">{c.ticketNumber}</span>
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            c.status === 'Open' ? "bg-red-500" :
                                            c.status === 'In Progress' ? "bg-amber-500" : "bg-emerald-500"
                                        )} />
                                    </div>
                                    <p className="text-xs font-semibold text-ntc-blue line-clamp-1">{c.complaintName}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">{c.district}, {c.province}</p>
                                </Link>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Records Found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 rounded-[32px] border border-gray-100 bg-white p-2 shadow-sm overflow-hidden z-0">
                    <MapContainer 
                        key={`${center[0]}-${center[1]}-${zoom}`}
                        center={center} 
                        zoom={zoom} 
                        style={{ height: '100%', width: '100%', borderRadius: '24px' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {targetSite && (
                            <Marker position={[targetSite.lat, targetSite.lng]} icon={siteIcon}>
                                <Popup>
                                    <div className="p-1">
                                        <p className="text-[10px] font-bold text-ntc-blue uppercase mb-1">{targetSite.siteId}</p>
                                        <p className="text-xs font-bold mb-1">{targetSite.name}</p>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase">{targetSite.status}</p>
                                        <p className="text-[8px] text-gray-400">NODE LOCATION (HUB)</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {selectedComplaint && selectedComplaint.nearestSites && selectedComplaint.nearestSites.map((ns, idx) => {
                            const site = sites.find(s => s.siteId === ns.siteId);
                            if (!site) return null;
                            return (
                                <React.Fragment key={`ns-${idx}`}>
                                    <Marker position={[site.lat, site.lng]} icon={siteIcon}>
                                        <Popup>
                                            <div className="p-1">
                                                <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">PROXIMITY SITE</p>
                                                <p className="text-xs font-bold mb-1">{site.siteId}: {site.name}</p>
                                                <p className="text-[10px] text-gray-500">{ns.distance.toFixed(2)} km from complaint</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Polyline 
                                        positions={[[selectedComplaint.lat, selectedComplaint.lng], [site.lat, site.lng]]}
                                        pathOptions={{ 
                                            color: '#6366f1', 
                                            dashArray: '5, 10', 
                                            weight: 2,
                                            opacity: 0.6
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {filteredComplaints.map((c, idx) => (
                            <Marker 
                                key={c.id || `${c.ticketNumber}-${idx}`} 
                                position={[c.lat, c.lng]}
                                eventHandlers={{
                                    click: () => {
                                        const url = new URL(window.location.href);
                                        url.searchParams.set('ticket', c.ticketNumber);
                                        if (siteId) url.searchParams.set('siteId', siteId);
                                        window.history.pushState({}, '', url);
                                    }
                                }}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <p className="text-[10px] font-bold text-ntc-blue uppercase mb-1">{c.ticketNumber}</p>
                                        <p className="text-xs font-bold mb-1">{c.complaintName}</p>
                                        <p className="text-[10px] text-gray-500">{c.district}, {c.province}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default ComplaintMap;
