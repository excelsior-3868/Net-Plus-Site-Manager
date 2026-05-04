import { motion } from 'motion/react';
import { LogIn, Radio, Eye, EyeOff } from 'lucide-react';
import { login } from '../services/authService';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(employeeId, password);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
            <p className="mt-2 text-sm text-ntc-blue/60">Sign in with your Employee Credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="E.G. ADMIN001"
                className="w-full rounded-xl border border-ntc-blue/10 bg-gray-50 px-4 py-3 text-sm focus:border-ntc-blue focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Security Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-ntc-blue/10 bg-gray-50 px-4 py-3 text-sm focus:border-ntc-blue focus:outline-none pr-11"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-ntc-blue/30 hover:text-ntc-blue transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
                  <span>Authenticate to Portal</span>
                </>
              )}
              
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            </button>
          </form>

        </div>

        <p className="mt-12 text-[10px] font-mono uppercase tracking-widest opacity-30">
          Proprietary Intelligence & Infrastructure
        </p>
      </motion.div>
    </div>
  );
}
