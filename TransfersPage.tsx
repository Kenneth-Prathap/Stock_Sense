import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  Eye,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { InternalTransfer, Product, Warehouse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface TransfersPageProps {
  warehouses: Warehouse[];
  products: Product[];
  selectedWarehouseId: string;
  onRefreshData?: () => void;
}

export const TransfersPage: React.FC<TransfersPageProps> = ({
  warehouses,
  products,
  selectedWarehouseId,
  onRefreshData,
}) => {
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active transfer modal
  const [activeTransfer, setActiveTransfer] = useState<InternalTransfer | null>(null);

  // Validate confirmation modal
  const [transferToValidate, setTransferToValidate] = useState<InternalTransfer | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Create transfer modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?.id || '');
  const [sourceLocationId, setSourceLocationId] = useState(warehouses[0]?.locations[0]?.id || '');
  const [destWarehouseId, setDestWarehouseId] = useState(warehouses[1]?.id || warehouses[0]?.id || '');
  const [destLocationId, setDestLocationId] = useState(
    warehouses[1]?.locations[0]?.id || warehouses[0]?.locations[1]?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 15 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTransfers({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sourceWarehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        search: searchQuery || undefined,
      });
      setTransfers(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch internal transfers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter, selectedWarehouseId, searchQuery]);

  // Keep source locations synced
  useEffect(() => {
    const wh = warehouses.find((w) => w.id === sourceWarehouseId);
    if (wh && wh.locations.length > 0) {
      setSourceLocationId(wh.locations[0].id);
    }
  }, [sourceWarehouseId, warehouses]);

  // Keep dest locations synced
  useEffect(() => {
    const wh = warehouses.find((w) => w.id === destWarehouseId);
    if (wh && wh.locations.length > 0) {
      setDestLocationId(wh.locations[0].id);
    }
  }, [destWarehouseId, warehouses]);

  const handleAddItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', quantity: 5 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceLocationId === destLocationId) {
      addToast('Source and Destination locations must be different', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createTransfer({
        sourceWarehouseId,
        sourceLocationId,
        destWarehouseId,
        destLocationId,
        notes,
        items,
      });
      addToast(`Transfer order ${created.referenceNumber} created in Draft status!`, 'success');
      setIsCreateOpen(false);
      fetchTransfers();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create internal transfer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateTransfer = async () => {
    if (!transferToValidate) return;

    setIsValidating(true);
    try {
      const res = await api.validateTransfer(transferToValidate.id);
      addToast(
        `Transfer ${transferToValidate.referenceNumber} validated! Stock relocated. Total company inventory conserved.`,
        'success'
      );
      setTransferToValidate(null);
      if (activeTransfer?.id === transferToValidate.id) {
        setActiveTransfer(res.transfer);
      }
      fetchTransfers();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Transfer validation failed', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdateStatus = async (transferId: string, newStatus: string) => {
    try {
      await api.updateTransferStatus(transferId, newStatus);
      addToast(`Transfer status updated to ${newStatus}`, 'info');
      fetchTransfers();
      if (activeTransfer && activeTransfer.id === transferId) {
        setActiveTransfer({ ...activeTransfer, status: newStatus as any });
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Internal Transfers & Relocations
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Inter-Warehouse • Rack-to-Rack
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Move inventory across warehouses, zones, or specific racks. Total company stock remains strictly unchanged.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setNotes('');
            setItems([{ productId: products[0]?.id || '', quantity: 15 }]);
            setIsCreateOpen(true);
          }}
        >
          New Internal Transfer
        </Button>
      </div>

      {/* Conservation Invariant Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <span className="font-bold text-white">Stock Conservation Invariant: </span>
          <span className="text-slate-300">
            A transfer atomically decrements the source storage location and increments the destination location within a single database transaction. Net change in total enterprise stock is exactly zero (0).
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transfer reference (e.g. INT-2026-0001)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done (Relocated)</option>
              <option value="CANCELED">Canceled</option>
            </select>

            {(statusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Transfers Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Destination Location</th>
                <th className="py-3 px-4">Total Units</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading internal transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No internal transfers recorded. Create one to relocate stock!
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const totalUnits = t.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {t.referenceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-semibold text-white">{t.sourceWarehouse?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {t.sourceLocation?.name} ({t.sourceLocation?.code})
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-semibold text-white">{t.destWarehouse?.name}</div>
                        <div className="text-[11px] text-brand-400 font-mono">
                          {t.destLocation?.name} ({t.destLocation?.code})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white text-sm">{totalUnits}</span>{' '}
                        <span className="text-[11px] text-slate-400">({t.items.length} items)</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-slate-400 hover:text-white"
                            onClick={() => setActiveTransfer(t)}
                            title="View Transfer Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {t.status !== 'DONE' && t.status !== 'CANCELED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs px-2.5 py-1"
                              onClick={() => setTransferToValidate(t)}
                            >
                              Validate Transfer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Transfer Details Modal */}
      <Modal
        isOpen={!!activeTransfer}
        onClose={() => setActiveTransfer(null)}
        title={`Transfer Details: ${activeTransfer?.referenceNumber}`}
        subtitle={`Inter-facility and rack-level relocation`}
        size="lg"
      >
        {activeTransfer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <StatusBadge status={activeTransfer.status} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Source</span>
                <span className="font-semibold text-white">
                  {activeTransfer.sourceWarehouse?.name} - {activeTransfer.sourceLocation?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Destination</span>
                <span className="font-semibold text-brand-400">
                  {activeTransfer.destWarehouse?.name} - {activeTransfer.destLocation?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Operator</span>
                <span className="text-slate-200">{activeTransfer.createdBy?.name}</span>
              </div>
            </div>

            {/* Workflow Progress */}
            {activeTransfer.status !== 'DONE' && activeTransfer.status !== 'CANCELED' && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Transfer State:</span>
                <div className="flex items-center gap-2">
                  {activeTransfer.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeTransfer.id, 'WAITING')}
                    >
                      Set to Waiting
                    </Button>
                  )}
                  {(activeTransfer.status === 'DRAFT' || activeTransfer.status === 'WAITING') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeTransfer.id, 'READY')}
                    >
                      Ready for Transit
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setTransferToValidate(activeTransfer);
                    }}
                  >
                    Validate & Relocate Stock
                  </Button>
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3">Quantity to Move</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeTransfer.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{item.product?.name}</div>
                        <div className="font-mono text-[10px] text-amber-400">{item.product?.sku}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 text-sm">
                        {item.quantity} {item.product?.uom || 'units'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activeTransfer.notes && (
              <p className="text-xs text-slate-400 italic">Notes: {activeTransfer.notes}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal to Validate Transfer */}
      <ConfirmationModal
        isOpen={!!transferToValidate}
        onClose={() => setTransferToValidate(null)}
        onConfirm={handleValidateTransfer}
        title="Execute Internal Stock Relocation"
        message={`Validating transfer ${transferToValidate?.referenceNumber} will deduct stock from ${transferToValidate?.sourceLocation?.name} and add it into ${transferToValidate?.destLocation?.name}. Total enterprise inventory count is guaranteed constant (net change = 0).`}
        confirmLabel="Execute Transfer"
        isLoading={isValidating}
      />

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Internal Stock Transfer"
        subtitle="Configure Warehouse to Warehouse, Warehouse to Location, or Rack to Rack transfer"
        size="lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/80">
            {/* Source */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Source (Stock Deducted)
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Source Warehouse</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => setSourceWarehouseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Source Bin / Rack</label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {warehouses
                    .find((w) => w.id === sourceWarehouseId)
                    ?.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Destination (Stock Added)
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dest Warehouse</label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dest Bin / Rack</label>
                <select
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {warehouses
                    .find((w) => w.id === destWarehouseId)
                    ?.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Transfer Reason / Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Replenish West Coast High-Bay rack for peak demand"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Product Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Products to Relocate
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line Item
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((row, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700"
                >
                  <div className="flex-1">
                    <select
                      value={row.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} ({p.totalStock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                      }
                      placeholder="Qty to move"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(index)}
                    disabled={items.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Create Transfer Order (Draft)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
