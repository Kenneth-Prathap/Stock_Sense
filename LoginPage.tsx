import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { KeyRound, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('admin@stocksense.io');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [role, setRole] = useState('MANAGER');
  const [isLoading, setIsLoading] = useState(false);

  // OTP Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const { login, signup, requestOtp, resetPassword } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        await signup(name, email, password, role);
        addToast('Account created and logged in successfully!', 'success');
      } else {
        await login(email, password);
        addToast('Welcome back to StockSense!', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      addToast('Please enter your email', 'warning');
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await requestOtp(resetEmail);
      if (res.otpCode) {
        setGeneratedOtpHint(res.otpCode);
        setOtpCode(res.otpCode);
      }
      addToast('OTP sent! Please check the code to proceed.', 'success');
      setResetStep(2);
    } catch (err: any) {
      addToast(err.message || 'Failed to request OTP', 'error');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword) {
      addToast('Please enter both the OTP code and your new password', 'warning');
      return;
    }

    setIsResetLoading(true);
    try {
      await resetPassword(resetEmail, otpCode, newPassword);
      addToast('Password reset successfully! Please sign in with your new password.', 'success');
      setIsResetOpen(false);
      setResetStep(1);
      setGeneratedOtpHint(null);
      setPassword(newPassword);
      setEmail(resetEmail);
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsResetLoading(false);
    }
  };

  const fillDemoCreds = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSignUp(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-xl shadow-brand-500/25 mb-4">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">StockSense</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise Inventory Management System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create an Account' : 'Sign In to Your Workspace'}
            </h2>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              {isSignUp ? 'Already have account?' : 'Need an account?'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kenneth Prathap"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stocksense.io"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetOpen(true);
                      setResetStep(1);
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Forgot Password? (OTP)
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="ADMIN">Administrator (Full Access)</option>
                  <option value="MANAGER">Inventory Manager (Approvals & Audits)</option>
                  <option value="STAFF">Warehouse Staff (Pick & Pack)</option>
                </select>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isSignUp ? 'Create Workspace Account' : 'Sign In'}
            </Button>
          </form>

          {/* Quick Demo Logins for judges */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              1-Click Demo Logins for Judges
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCreds('admin@stocksense.io', 'admin123')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors text-left"
              >
                <div className="font-semibold text-white">Admin Demo</div>
                <div className="text-[10px] text-slate-400 font-mono">admin@stocksense.io</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('manager@stocksense.io', 'manager123')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors text-left"
              >
                <div className="font-semibold text-white">Manager Demo</div>
                <div className="text-[10px] text-slate-400 font-mono">manager@stocksense.io</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Password Reset Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="OTP Password Reset"
        subtitle="Secure verification code sent to your registered address"
        size="md"
      >
        {resetStep === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your work email address to receive a secure 6-digit one-time password (OTP).
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="admin@stocksense.io"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsResetOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isResetLoading}>
                Generate & Dispatch OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            {generatedOtpHint && (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs text-brand-300 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Demo OTP Code: </span>
                  <span className="font-mono font-bold text-sm tracking-widest text-white">
                    {generatedOtpHint}
                  </span>
                </div>
                <span className="text-[10px] text-brand-400 bg-brand-500/20 px-2 py-0.5 rounded font-mono">
                  15 min expiry
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest text-center focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setResetStep(1)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsResetOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isResetLoading}>
                  Confirm & Reset Password
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
