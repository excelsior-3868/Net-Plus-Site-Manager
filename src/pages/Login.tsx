import { motion } from 'motion/react';
import { LogIn, Radio } from 'lucide-react';
import { login } from '../services/authService';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email || 'admin@netplus.com');
      window.location.reload();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#E4E3E0] font-sans text-ntc-blue">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#004899 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex w-full max-w-md flex-col items-center px-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ntc-blue text-[#E4E3E0]">
            <Radio size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">NetPulse</h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">BTS Management System</p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-ntc-blue/10 bg-white p-8 shadow-[20px_20px_60px_-15px_rgba(0,0,0,0.05)]">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-medium text-ntc-blue">Secure Access</h2>
            <p className="mt-2 text-sm text-ntc-blue/60">Sign in to manage your network infrastructure.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@netplus.com"
                className="w-full rounded-xl border border-ntc-blue/10 bg-gray-50 px-4 py-3 text-sm focus:border-ntc-blue focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-ntc-blue py-4 text-sm font-medium text-white transition-all hover:bg-ntc-blue-dark active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In to Dashboard</span>
                </>
              )}
              
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            </button>
          </form>

          <div className="mt-8 border-t border-ntc-blue/5 pt-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">Version</p>
                <p className="text-xs font-mono">v4.2.0-stable</p>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">Region</p>
                <p className="text-xs font-mono">ASIA-SE1</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-12 text-[10px] font-mono uppercase tracking-widest opacity-30">
          Proprietary Intelligence & Infrastructure
        </p>
      </motion.div>
    </div>
  );
}
