import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  History,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { StatCard, Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { DashboardMetrics, Warehouse, Category } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  warehouses: Warehouse[];
  categories: Category[];
  selectedWarehouseId: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  warehouses,
  categories,
  selectedWarehouseId,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDashboardMetrics({
        warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        docType: docTypeFilter !== 'ALL' ? docTypeFilter : undefined,
      });
      setMetrics(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load dashboard metrics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedWarehouseId, docTypeFilter, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Inventory Operations Command
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Live ACID
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-warehouse stock positions, order queues, and immutable ledger movements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={isLoading}
          >
            Refresh Metrics
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('ledger')}
            icon={<History className="w-4 h-4" />}
          >
            Open Stock Ledger
          </Button>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total In Stock"
          value={metrics?.kpis.totalStockUnits.toLocaleString() || '0'}
          subtitle={`${metrics?.kpis.inStockProductsCount || 0} active SKUs in storage`}
          icon={<Boxes className="w-5 h-5" />}
          variant="emerald"
          onClick={() => onNavigate('products')}
        />

        <StatCard
          title="Low / Out of Stock"
          value={(metrics?.kpis.lowStockCount || 0) + (metrics?.kpis.outOfStockCount || 0)}
          subtitle={`${metrics?.kpis.outOfStockCount || 0} depleted, ${metrics?.kpis.lowStockCount || 0} below min`}
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="rose"
          badge={
            (metrics?.kpis.lowStockCount || 0) + (metrics?.kpis.outOfStockCount || 0) > 0
              ? 'Urgent'
              : 'Optimal'
          }
          onClick={() => onNavigate('products')}
        />

        <StatCard
          title="Pending Receipts"
          value={metrics?.kpis.pendingReceipts || 0}
          subtitle="Inbound shipments waiting"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          variant="blue"
          onClick={() => onNavigate('receipts')}
        />

        <StatCard
          title="Pending Deliveries"
          value={metrics?.kpis.pendingDeliveries || 0}
          subtitle="Customer dispatches in queue"
          icon={<ArrowUpRight className="w-5 h-5" />}
          variant="purple"
          onClick={() => onNavigate('deliveries')}
        />

        <StatCard
          title="Transfers Scheduled"
          value={metrics?.kpis.internalTransfersScheduled || 0}
          subtitle="Inter-facility stock moves"
          icon={<ArrowLeftRight className="w-5 h-5" />}
          variant="amber"
          onClick={() => onNavigate('transfers')}
        />
      </div>

      {/* Dynamic Filter Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Dynamic Filters
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Document Type Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Document:</span>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Documents</option>
                <option value="RECEIPT">Receipts (Inbound)</option>
                <option value="DELIVERY">Delivery Orders (Outbound)</option>
                <option value="TRANSFER">Internal Transfers</option>
                <option value="ADJUSTMENT">Stock Adjustments</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="WAITING">Waiting</option>
                <option value="READY">Ready</option>
                <option value="PICKED">Picked</option>
                <option value="PACKED">Packed</option>
                <option value="DONE">Done / Validated</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {(docTypeFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setDocTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                }}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Analytics & Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Filtered Documents Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Document Queue ({metrics?.filteredDocuments?.length || 0})
                </h3>
                <p className="text-xs text-slate-400">
                  Filtered by type, status, and warehouse scope
                </p>
              </div>
              <span className="text-xs text-brand-400 font-medium font-mono">Real-time</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Party / Location</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {!metrics?.filteredDocuments || metrics.filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No documents match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    metrics.filteredDocuments.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {doc.referenceNumber}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={doc.type} />
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {doc.supplier || doc.customer || doc.sourceWarehouse?.name || 'Internal'}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              if (doc.type === 'RECEIPT') onNavigate('receipts');
                              else if (doc.type === 'DELIVERY') onNavigate('deliveries');
                              else if (doc.type === 'TRANSFER') onNavigate('transfers');
                              else onNavigate('adjustments');
                            }}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title="View Document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Category Distribution Chart / Breakdown */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Inventory Volume by Product Category
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metrics?.categoryDistribution?.map((cat) => {
                const totalAll = metrics.kpis.totalStockUnits || 1;
                const percentage = Math.round((cat.totalUnits / totalAll) * 100);

                return (
                  <div
                    key={cat.name}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-white mb-2">
                      <span className="truncate max-w-[180px]">{cat.name}</span>
                      <span className="font-mono text-brand-400">{cat.totalUnits.toLocaleString()} units</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{cat.count} product types</span>
                      <span className="font-mono">{percentage}% share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Audit Trail / Recent Movements */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Stock Ledger Feed
                </h3>
              </div>
              <button
                onClick={() => onNavigate('ledger')}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                View Full Audit
              </button>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {!metrics?.recentActivity || metrics.recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No stock moves logged yet.
                </p>
              ) : (
                metrics.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={log.movementType} />
                        <span className="text-xs font-mono font-bold text-white">
                          {log.referenceNumber}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-extrabold ${
                          log.quantity > 0
                            ? 'text-emerald-400'
                            : log.quantity < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {log.productName}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>By: {log.userName}</span>
                      <span className="font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
