import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentUser } from './services/authService';
import { UserProfile } from './types';
import { ToastProvider } from './components/Toast';

// Pages
import Dashboard from './pages/Dashboard';
import ProvincialDashboard from './pages/ProvincialDashboard';
import Login from './pages/Login';
import Users from './pages/Users';
import Nodes from './pages/Nodes';
import Complaints from './pages/Complaints';
import ComplaintMap from './pages/ComplaintMap';
import SiteDetail from './pages/SiteDetail';
import Layout from './components/Layout';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setProfile(user);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-ntc-blue border-t-transparent" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-ntc-blue">Authorizing Systems...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!profile ? <Login /> : <Navigate to="/" replace />} />
          
          <Route element={profile ? <Layout profile={profile} /> : <Navigate to="/login" replace />}>
            <Route path="/" element={<Dashboard profile={profile} />} />
            <Route path="/provincial" element={<ProvincialDashboard profile={profile} />} />
            <Route path="/transmission-registry" element={<Nodes profile={profile} />} />
            <Route path="/nodes" element={<Nodes profile={profile} />} />
            <Route path="/solar-stations" element={<Nodes profile={profile} />} />
            <Route path="/planned-sites" element={<Nodes profile={profile} />} />
            <Route path="/site-complaints" element={<Nodes profile={profile} />} />
            <Route path="/complaints" element={<Complaints profile={profile} />} />
            <Route path="/complaints/map" element={<ComplaintMap profile={profile} />} />
            <Route path="/sites/:id" element={<SiteDetail profile={profile} />} />
            <Route path="/users" element={(profile?.role === 'admin' || profile?.role === 'superadmin') ? <Users /> : <Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
