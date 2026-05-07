import { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { cn } from '../lib/utils';
import { Shield, ShieldAlert, ShieldCheck, Trash2, Mail, Calendar, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { getCurrentUser } from '../services/authService';
import { useToast } from '../components/Toast';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (uid: string, role: UserRole) => {
    try {
      await fetch(`${API_URL}/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      setUsers(users.map(u => u.uid === uid ? { ...u, role } : u));
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      toast.warning('Action Blocked', 'You cannot delete your own account.');
      return;
    }
    if (!window.confirm('Remove this user\'s access?')) return;
    try {
      await fetch(`${API_URL}/users/${uid}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.uid !== uid));
      toast.success('User Removed', 'User access has been revoked.');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Delete Failed', 'An error occurred while removing the user.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-ntc-blue border-t-transparent" /></div>;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-ntc-blue/5 bg-white shadow-xl shadow-black/5 overflow-hidden">
        <div className="border-b border-ntc-blue/5 p-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
             <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ntc-blue">Access Control Matrix</h1>
            <p className="mt-1 text-sm text-ntc-blue/60 uppercase tracking-widest opacity-40">Identity & Role-Based Access Management</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-ntc-blue/[0.01] border-b border-ntc-blue/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[.2em] opacity-40">Authorized Entity</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[.2em] opacity-40">Privilege Level</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[.2em] opacity-40">Security Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[.2em] opacity-40">Entry Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[.2em] opacity-40">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ntc-blue/5">
              {users.map((user) => (
                <tr key={user.uid} className="group transition-all hover:bg-ntc-blue/[0.02]">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-ntc-blue/5 flex items-center justify-center text-ntc-blue/40">
                         <UserIcon size={20} />
                      </div>
                      <div>
                         <p className="text-sm font-semibold tracking-tight">{user.name}</p>
                         <p className="text-xs opacity-60 flex items-center gap-1"><Mail size={10} /> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <select 
                      value={user.role}
                      onChange={(e) => updateRole(user.uid, e.target.value as UserRole)}
                      disabled={user.uid === currentUser?.uid}
                      className={cn(
                        "rounded-lg border border-ntc-blue/10 bg-transparent px-3 py-1.5 text-xs font-bold uppercase tracking-wider outline-none transition-all focus:ring-2 focus:ring-ntc-blue/10",
                        user.role === 'superadmin' ? "text-purple-600 font-black" : user.role === 'admin' ? "text-indigo-600" : user.role === 'editor' ? "text-blue-600" : "text-ntc-blue/60"
                      )}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Administrator</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       {user.role === 'superadmin' ? (
                         <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                            <ShieldAlert size={12} /> System Authority
                         </div>
                       ) : user.role === 'admin' ? (
                         <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                            <ShieldAlert size={12} /> Root Access
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <ShieldCheck size={12} /> Verified
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs opacity-40 font-mono">
                      <Calendar size={12} />
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Historical'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <button 
                      onClick={() => deleteUser(user.uid)}
                      disabled={user.uid === currentUser?.uid}
                      className="rounded-lg p-2 text-red-600 opacity-40 transition-all hover:bg-red-50 hover:opacity-100 disabled:invisible"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="rounded-3xl bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-200">
         <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl">
               <Shield size={32} />
            </div>
            <div>
               <h3 className="text-xl font-semibold">Security Directive</h3>
               <p className="max-w-2xl text-sm opacity-80 mt-1">
                 As an administrator, you are responsible for maintaining the integrity of the Network Access Matrix. 
                 Ensure all technicians are assigned the correct privilege levels to prevent unauthorized site modifications.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
