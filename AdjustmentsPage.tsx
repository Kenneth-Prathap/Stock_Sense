import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  History,
  CheckCircle2,
  Calculator,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { StockAdjustment, Product, Warehouse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface AdjustmentsPageProps {
  warehouses: Warehouse[];
  products: Product[];
  selectedWarehouseId: string;
  onRefreshData?: () => void;
}

export const AdjustmentsPage: React.FC<AdjustmentsPageProps> = ({
  warehouses,
  products,
  selectedWarehouseId,
  onRefreshData,
}) => {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Create adjustment modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [locationId, setLocationId] = useState(warehouses[0]?.locations[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [recordedQty, setRecordedQty] = useState(0);
  const [physicalQty, setPhysicalQty] = useState(0);
  const [reason, setReason] = useState('DAMAGED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdjustments({
        warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        reason: reasonFilter !== 'ALL' ? reasonFilter : undefined,
      });
      setAdjustments(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch adjustments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [reasonFilter, selectedWarehouseId]);

  // Keep location in sync with warehouse selection
  useEffect(() => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (wh && wh.locations.length > 0) {
      setLocationId(wh.locations[0].id);
    }
  }, [warehouseId, warehouses]);

  // Dynamically calculate recordedQty whenever product or location changes
  useEffect(() => {
    const selectedProd = products.find((p) => p.id === productId);
    if (selectedProd) {
      const match = selectedProd.stocks?.find((s) => s.locationId === locationId);
      const currentQty = match ? match.quantity : 0;
      setRecordedQty(currentQty);
      setPhysicalQty(currentQty);
    }
  }, [productId, locationId, products]);

  const differenceQty = physicalQty - recordedQty; // e.g. 97 - 100 = -3

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.createAdjustment({
        warehouseId,
        locationId,
        productId,
        physicalQty,
        reason,
        notes,
      });
      addToast(
        `Adjustment ${res.adjustment.referenceNumber} applied! Stock updated to ${physicalQty} (Δ: ${differenceQty >= 0 ? '+' : ''}${differenceQty})`,
        'success'
      );
      setIsCreateOpen(false);
      fetchAdjustments();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to apply adjustment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (code: string) => {
    switch (code) {
      case 'DAMAGED':
        return 'Damaged Goods / Scrap';
      case 'AUDIT_COUNT':
        return 'Physical Inventory Audit';
      case 'DISCREPANCY':
        return 'Counting Discrepancy';
      case 'LOST':
        return 'Lost / Unaccounted';
      case 'FOUND':
        return 'Found / Surpluses';
      default:
        return code;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Stock Adjustments & Physical Counting
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Audit & Damage Control
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconcile recorded books with physical warehouse shelf counts. Computes discrepancy and updates stock with full ledger traceability.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setReason('DAMAGED');
            setNotes('');
            setIsCreateOpen(true);
          }}
        >
          New Stock Adjustment
        </Button>
      </div>

      {/* Example Box */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white">Physical Count Reconciliation Formula: </span>
            <span className="text-slate-300">
              Recorded Stock (100) + Discrepancy Adjustment (-3) = Final Physical Stock (97).
            </span>
          </div>
        </div>
        <Badge variant="purple">Immutable Audit Logged</Badge>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Filter Reason:</span>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Reasons</option>
              <option value="DAMAGED">Damaged Goods / Scrap</option>
              <option value="AUDIT_COUNT">Physical Inventory Audit</option>
              <option value="DISCREPANCY">Counting Discrepancy</option>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {adjustments.length} adjustment{adjustments.length === 1 ? '' : 's'} recorded
          </span>
        </div>
      </Card>

      {/* Adjustments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Warehouse & Location</th>
                <th className="py-3 px-4">Recorded</th>
                <th className="py-3 px-4">Physical Count</th>
                <th className="py-3 px-4">Discrepancy (Δ)</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Audit Officer</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Loading stock adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No physical count adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {adj.referenceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{adj.product?.name}</div>
                      <div className="font-mono text-[10px] text-brand-400">{adj.product?.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{adj.warehouse?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {adj.location?.name} ({adj.location?.code})
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{adj.recordedQty}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                      {adj.physicalQty}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-extrabold text-xs px-2 py-0.5 rounded-full ${
                          adj.differenceQty < 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : adj.differenceQty > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {adj.differenceQty > 0 ? `+${adj.differenceQty}` : adj.differenceQty}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={adj.reason === 'DAMAGED' ? 'danger' : 'neutral'}>
                        {getReasonLabel(adj.reason)}
                      </Badge>
                      {adj.notes && (
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-[150px] truncate">
                          {adj.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{adj.createdBy?.name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(adj.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Physical Inventory Count & Adjustment"
        subtitle="Record actual counted physical inventory to adjust books"
        size="md"
      >
        <form onSubmit={handleApplyAdjustment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Warehouse *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Storage Location *
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {warehouses
                  .find((w) => w.id === warehouseId)
                  ?.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Product *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Math Box: Recorded vs Physical */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Recorded in Books
                </span>
                <span className="font-mono text-lg font-black text-white">{recordedQty}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Physical Count
                </span>
                <input
                  type="number"
                  min={0}
                  value={physicalQty}
                  onChange={(e) => setPhysicalQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-center text-lg font-mono font-black text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Difference (Δ)
                </span>
                <span
                  className={`font-mono text-lg font-black ${
                    differenceQty < 0
                      ? 'text-rose-400'
                      : differenceQty > 0
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {differenceQty > 0 ? `+${differenceQty}` : differenceQty}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Final resulting stock at this location will be{' '}
              <strong className="text-white">{physicalQty}</strong> units.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Adjustment Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="DAMAGED">Damaged Goods / Scrap</option>
                <option value="AUDIT_COUNT">Physical Inventory Audit</option>
                <option value="DISCREPANCY">Counting Discrepancy</option>
                <option value="LOST">Lost Item Write-off</option>
                <option value="FOUND">Found Item Intake</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Incident / Reason Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 3 units damaged by forklift in aisle 1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Apply Physical Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
