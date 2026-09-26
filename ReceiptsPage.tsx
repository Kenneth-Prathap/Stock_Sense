import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Warehouse as WarehouseIcon,
  Clock,
  Eye,
  Check,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Receipt, Product, Warehouse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ReceiptsPageProps {
  warehouses: Warehouse[];
  products: Product[];
  selectedWarehouseId: string;
  onRefreshData?: () => void;
}

export const ReceiptsPage: React.FC<ReceiptsPageProps> = ({
  warehouses,
  products,
  selectedWarehouseId,
  onRefreshData,
}) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // View / Detail modal
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);

  // Validate confirmation modal
  const [receiptToValidate, setReceiptToValidate] = useState<Receipt | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Create Receipt modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [locationId, setLocationId] = useState(warehouses[0]?.locations[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { productId: string; expectedQty: number; unitCost: number }[]
  >([{ productId: products[0]?.id || '', expectedQty: 50, unitCost: 10 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchReceipts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getReceipts({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        search: searchQuery || undefined,
      });
      setReceipts(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch receipts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter, selectedWarehouseId, searchQuery]);

  // Keep location in sync with warehouse selection
  useEffect(() => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (wh && wh.locations.length > 0) {
      setLocationId(wh.locations[0].id);
    }
  }, [warehouseId, warehouses]);

  const handleAddItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', expectedQty: 10, unitCost: 0 }]);
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

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      addToast('Please specify supplier name', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createReceipt({
        supplier,
        warehouseId,
        locationId,
        notes,
        items,
      });
      addToast(`Receipt ${created.referenceNumber} created in Draft status!`, 'success');
      setIsCreateOpen(false);
      fetchReceipts();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create receipt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateReceipt = async () => {
    if (!receiptToValidate) return;

    setIsValidating(true);
    try {
      const res = await api.validateReceipt(receiptToValidate.id);
      addToast(
        `Receipt ${receiptToValidate.referenceNumber} validated! Stock increased by received quantities.`,
        'success'
      );
      setReceiptToValidate(null);
      if (activeReceipt?.id === receiptToValidate.id) {
        setActiveReceipt(res.receipt);
      }
      fetchReceipts();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Validation failed', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdateStatus = async (receiptId: string, newStatus: string) => {
    try {
      await api.updateReceiptStatus(receiptId, newStatus);
      addToast(`Receipt status updated to ${newStatus}`, 'info');
      fetchReceipts();
      if (activeReceipt && activeReceipt.id === receiptId) {
        setActiveReceipt({ ...activeReceipt, status: newStatus as any });
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
            Inbound Receipts
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Procurement & Restock
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Receive incoming goods from suppliers. Draft receipts do NOT affect inventory until validated.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setSupplier('');
            setNotes('');
            setItems([{ productId: products[0]?.id || '', expectedQty: 50, unitCost: 15 }]);
            setIsCreateOpen(true);
          }}
        >
          New Receipt
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference (e.g. REC-2026-0001) or supplier..."
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
              <option value="DRAFT">Draft (No Stock Impact)</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready to Validate</option>
              <option value="DONE">Done (Stock Increased)</option>
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

      {/* Receipts Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Destination Storage</th>
                <th className="py-3 px-4">Items / Total Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No receipts found. Create one to receive products!
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const totalQty = r.items.reduce(
                    (sum, item) => sum + (item.receivedQty || item.expectedQty),
                    0
                  );

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {r.referenceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{r.supplier}</td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-medium text-white">{r.warehouse?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {r.location?.name} ({r.location?.code})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white text-sm">{totalQty}</span>{' '}
                        <span className="text-[11px] text-slate-400">({r.items.length} items)</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-slate-400 hover:text-white"
                            onClick={() => setActiveReceipt(r)}
                            title="View Receipt Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {r.status !== 'DONE' && r.status !== 'CANCELED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs px-2.5 py-1"
                              onClick={() => setReceiptToValidate(r)}
                            >
                              Validate Receipt
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

      {/* View Receipt Details Modal */}
      <Modal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        title={`Receipt Details: ${activeReceipt?.referenceNumber}`}
        subtitle={`Supplier: ${activeReceipt?.supplier}`}
        size="lg"
      >
        {activeReceipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <StatusBadge status={activeReceipt.status} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Destination Facility</span>
                <span className="font-semibold text-white">{activeReceipt.warehouse?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Destination Bin</span>
                <span className="font-mono text-white">{activeReceipt.location?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Created By</span>
                <span className="text-slate-200">{activeReceipt.createdBy?.name}</span>
              </div>
            </div>

            {/* Status Workflow Controls */}
            {activeReceipt.status !== 'DONE' && activeReceipt.status !== 'CANCELED' && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Progress Status:</span>
                <div className="flex items-center gap-2">
                  {activeReceipt.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeReceipt.id, 'WAITING')}
                    >
                      Mark as Waiting
                    </Button>
                  )}
                  {(activeReceipt.status === 'DRAFT' || activeReceipt.status === 'WAITING') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeReceipt.id, 'READY')}
                    >
                      Mark as Ready
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setReceiptToValidate(activeReceipt);
                    }}
                  >
                    Validate & Increase Stock
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
                    <th className="py-2.5 px-3">Expected Qty</th>
                    <th className="py-2.5 px-3">Received Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeReceipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{item.product?.name}</div>
                        <div className="font-mono text-[10px] text-brand-400">{item.product?.sku}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{item.expectedQty}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {item.receivedQty || item.expectedQty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        ${item.unitCost?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activeReceipt.notes && (
              <p className="text-xs text-slate-400 italic">Notes: {activeReceipt.notes}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal to Validate Receipt */}
      <ConfirmationModal
        isOpen={!!receiptToValidate}
        onClose={() => setReceiptToValidate(null)}
        onConfirm={handleValidateReceipt}
        title="Validate & Process Receipt"
        message={`Validating receipt ${receiptToValidate?.referenceNumber} will atomically increase inventory levels for all item lines in ${receiptToValidate?.location?.name} and create an immutable Stock Ledger audit record. (Example: 100 stock + 50 received = 150)`}
        confirmLabel="Validate & Increase Stock"
        isLoading={isValidating}
      />

      {/* Create Receipt Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Inbound Receipt"
        subtitle="Receipt starts in Draft status and will not alter stock until validated"
        size="lg"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Apex Energy Systems"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

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
                Receiving Location *
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
              Notes / Delivery Note #
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inbound PO #4402 - Dock inspection passed"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Product Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Products to Receive
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
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min={1}
                      value={row.expectedQty}
                      onChange={(e) =>
                        handleItemChange(index, 'expectedQty', parseInt(e.target.value, 10) || 1)
                      }
                      placeholder="Qty"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={row.unitCost}
                      onChange={(e) =>
                        handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Unit $"
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
              Create Receipt (Draft)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
