import React, { useState } from 'react';
import { Sparkles, ChevronRight, ChevronDown, CheckCircle2, RotateCcw, Play } from 'lucide-react';
import { Button } from './Button';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

interface HackathonDemoGuideProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onRefreshData?: () => void;
}

export const HackathonDemoGuide: React.FC<HackathonDemoGuideProps> = ({
  currentTab,
  onNavigate,
  onRefreshData,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const { addToast } = useToast();

  const steps = [
    {
      num: 1,
      title: 'Authentication',
      desc: 'Log in as Admin (admin@stocksense.io / admin123) or test OTP reset',
      targetTab: 'dashboard',
    },
    {
      num: 2,
      title: 'Dashboard Overview',
      desc: 'Inspect real-time KPIs and test dynamic document status filters',
      targetTab: 'dashboard',
    },
    {
      num: 3,
      title: 'Products Inventory',
      desc: 'Check SKU list, reordering thresholds, and stock by location',
      targetTab: 'products',
    },
    {
      num: 4,
      title: 'Receive 100 Units',
      desc: 'Validate receipt (REC-2026-0005) or create new receipt → stock increases',
      targetTab: 'receipts',
    },
    {
      num: 5,
      title: 'Internal Stock Transfer',
      desc: 'Validate transfer (INT-2026-0001) → locations change, total company stock is constant',
      targetTab: 'transfers',
    },
    {
      num: 6,
      title: 'Deliver 20 Units',
      desc: 'Validate delivery (DEL-2026-0002) → stock decreases; test overdraft prevention',
      targetTab: 'deliveries',
    },
    {
      num: 7,
      title: 'Adjust Damaged Stock',
      desc: 'Physical count adjustment (100 -> 97 = -3) → triggers Low-Stock alert',
      targetTab: 'adjustments',
    },
    {
      num: 8,
      title: 'Stock Ledger Audit',
      desc: 'Open Stock Ledger to verify immutable trace of all receipts, deliveries, transfers, & adjustments',
      targetTab: 'ledger',
    },
  ];

  const handleReset = async () => {
    try {
      setIsResetting(true);
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
    <div className="fixed bottom-6 left-6 z-40 max-w-sm w-full">
      <div className="bg-slate-900/95 backdrop-blur-md border border-brand-500/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Toggle Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-950/60 to-slate-900 cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                Hackathon Judge Demo Flow
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 font-mono">
                  8 Steps
                </span>
              </span>
            </div>
          </div>
          <div className="text-slate-400">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>

        {/* Expanded Steps List */}
        {isExpanded && (
          <div className="p-4 border-t border-slate-800 space-y-3 max-h-96 overflow-y-auto">
            <p className="text-xs text-slate-400 leading-relaxed">
              Step-by-step presentation walkthrough showcasing all transactional workflows and audit controls required by the specification.
            </p>

            <div className="space-y-2">
              {steps.map((s) => {
                const isActive = currentTab === s.targetTab;
                return (
                  <div
                    key={s.num}
                    onClick={() => onNavigate(s.targetTab)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-brand-500/10 border-brand-500/40 text-brand-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {s.num}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white flex items-center justify-between">
                        {s.title}
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleReset}
                isLoading={isResetting}
              >
                Reset Demo Data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
