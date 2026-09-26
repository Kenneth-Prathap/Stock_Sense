import React, { useState } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  Mail,
  Calendar,
  Lock,
  RotateCcw,
  CheckCircle2,
  Database,
  Server,
  LogOut,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface ProfilePageProps {
  onRefreshData?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onRefreshData }) => {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { addToast } = useToast();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUpdating(true);
    try {
      await updateProfile({ name });
      addToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDemoReset = async () => {
    if (!window.confirm('Reset all demo data back to clean initial state?')) return;

    setIsResetting(true);
    try {
      await api.resetDemoData();
      addToast('Demo environment reset successfully with clean seed data!', 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to reset demo data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Profile & System Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your operator identity, role permissions, and database environment.
        </p>
      </div>

      {/* User Info Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500/40 shadow-lg shadow-brand-500/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-2xl border border-brand-500/40">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{user?.name}</h2>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="success">Role: {user?.role}</Badge>
                <span className="text-[10px] text-slate-400 font-mono">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2026'}
                </span>
              </div>
            </div>
          </div>

          <Button variant="danger" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={logout}>
            Sign Out
          </Button>
        </div>

        {/* Update Form */}
        <form onSubmit={handleUpdate} className="pt-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Edit Profile Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Assigned Role
              </label>
              <input
                type="text"
                disabled
                value={user?.role || 'MANAGER'}
                className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3.5 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" type="submit" isLoading={isUpdating}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* System & Architecture Details Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-400" />
          System & Architecture Specification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Backend Architecture
            </span>
            <span className="font-semibold text-white">Node.js + Express + TypeScript</span>
            <span className="text-[10px] text-brand-400 block mt-0.5">ACID Transactions</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Database & ORM
            </span>
            <span className="font-semibold text-white">Prisma Client + SQLite / Postgres</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Foreign Key Integrity</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Frontend Client
            </span>
            <span className="font-semibold text-white">React 18 + TypeScript + Vite</span>
            <span className="text-[10px] text-sky-400 block mt-0.5">Tailwind CSS + Lucide</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Reset Hackathon Demo Environment</span>
            <span className="text-[11px] text-slate-400">
              Restores initial seed records: 6 products, 3 warehouses, pending orders, and initial ledger history.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleDemoReset}
            isLoading={isResetting}
          >
            Reset Seed Data
          </Button>
        </div>
      </Card>
    </div>
  );
};
