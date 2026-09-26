import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Warehouse as WarehouseIcon,
  Eye,
  Check,
  PackageCheck,
  AlertOctagon,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { DeliveryOrder, Product, Warehouse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface DeliveriesPageProps {
  warehouses: Warehouse[];
  products: Product[];
  selectedWarehouseId: string;
  onRefreshData?: () => void;
}

export const DeliveriesPage: React.FC<DeliveriesPageProps> = ({
  warehouses,
  products,
  selectedWarehouseId,
  onRefreshData,
}) => {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // View / Detail modal
  const [activeDelivery, setActiveDelivery] = useState<DeliveryOrder | null>(null);

  // Validate confirmation modal
  const [deliveryToValidate, setDeliveryToValidate] = useState<DeliveryOrder | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Create Delivery modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [locationId, setLocationId] = useState(warehouses[0]?.locations[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { productId: string; requestedQty: number; unitPrice: number }[]
  >([{ productId: products[0]?.id || '', requestedQty: 10, unitPrice: 50 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDeliveries({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        search: searchQuery || undefined,
      });
      setDeliveries(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch delivery orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter, selectedWarehouseId, searchQuery]);

  // Keep location in sync with warehouse selection
  useEffect(() => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (wh && wh.locations.length > 0) {
      setLocationId(wh.locations[0].id);
    }
  }, [warehouseId, warehouses]);

  const handleAddItemRow = () => {
    setItems([...items, { productId: products[0]?.id || '', requestedQty: 5, unitPrice: 0 }]);
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

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      addToast('Please enter customer name', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createDelivery({
        customer,
        warehouseId,
        locationId,
        notes,
        items,
      });
      addToast(`Delivery order ${created.referenceNumber} created in Draft status!`, 'success');
      setIsCreateOpen(false);
      fetchDeliveries();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create delivery order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateDelivery = async () => {
    if (!deliveryToValidate) return;

    setIsValidating(true);
    try {
      const res = await api.validateDelivery(deliveryToValidate.id);
      addToast(
        `Delivery ${deliveryToValidate.referenceNumber} validated & dispatched! Stock decreased.`,
        'success'
      );
      setDeliveryToValidate(null);
      if (activeDelivery?.id === deliveryToValidate.id) {
        setActiveDelivery(res.delivery);
      }
      fetchDeliveries();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Validation failed: Insufficient stock', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdateStatus = async (deliveryId: string, newStatus: string) => {
    try {
      await api.updateDeliveryStatus(deliveryId, newStatus);
      addToast(`Delivery status updated to ${newStatus}`, 'info');
      fetchDeliveries();
      if (activeDelivery && activeDelivery.id === deliveryId) {
        setActiveDelivery({ ...activeDelivery, status: newStatus as any });
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
            Outbound Delivery Orders
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Pick • Pack • Dispatch
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fulfill customer orders. Stock strictly decrements only upon validation; deliveries beyond available stock are blocked.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setCustomer('');
            setNotes('');
            setItems([{ productId: products[0]?.id || '', requestedQty: 10, unitPrice: 65 }]);
            setIsCreateOpen(true);
          }}
        >
          New Delivery Order
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
              placeholder="Search by reference (e.g. DEL-2026-0001) or customer..."
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
              <option value="PICKED">Picked</option>
              <option value="PACKED">Packed</option>
              <option value="DONE">Done (Stock Decreased)</option>
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

      {/* Deliveries Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Dispatch Source</th>
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
                    Loading delivery orders...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No delivery orders found. Create one to dispatch items!
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => {
                  const totalQty = d.items.reduce(
                    (sum, item) => sum + (item.deliveredQty || item.requestedQty),
                    0
                  );

                  return (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {d.referenceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{d.customer}</td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-medium text-white">{d.warehouse?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {d.location?.name} ({d.location?.code})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white text-sm">{totalQty}</span>{' '}
                        <span className="text-[11px] text-slate-400">({d.items.length} items)</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-slate-400 hover:text-white"
                            onClick={() => setActiveDelivery(d)}
                            title="View Delivery Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {d.status !== 'DONE' && d.status !== 'CANCELED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs px-2.5 py-1"
                              onClick={() => setDeliveryToValidate(d)}
                            >
                              Validate Dispatch
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

      {/* View Delivery Details Modal */}
      <Modal
        isOpen={!!activeDelivery}
        onClose={() => setActiveDelivery(null)}
        title={`Delivery Order: ${activeDelivery?.referenceNumber}`}
        subtitle={`Customer: ${activeDelivery?.customer}`}
        size="lg"
      >
        {activeDelivery && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Status</span>
                <StatusBadge status={activeDelivery.status} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Source Facility</span>
                <span className="font-semibold text-white">{activeDelivery.warehouse?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Dispatch Bin</span>
                <span className="font-mono text-white">{activeDelivery.location?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Created By</span>
                <span className="text-slate-200">{activeDelivery.createdBy?.name}</span>
              </div>
            </div>

            {/* Workflow Progress Action Bar */}
            {activeDelivery.status !== 'DONE' && activeDelivery.status !== 'CANCELED' && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-300 font-semibold">Workflow Actions:</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeDelivery.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeDelivery.id, 'WAITING')}
                    >
                      Move to Waiting
                    </Button>
                  )}
                  {(activeDelivery.status === 'DRAFT' || activeDelivery.status === 'WAITING') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeDelivery.id, 'PICKED')}
                    >
                      Pick Items
                    </Button>
                  )}
                  {activeDelivery.status === 'PICKED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(activeDelivery.id, 'PACKED')}
                    >
                      Pack Items
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setDeliveryToValidate(activeDelivery);
                    }}
                  >
                    Validate & Dispatch (Stock -)
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
                    <th className="py-2.5 px-3">Requested Qty</th>
                    <th className="py-2.5 px-3">Delivered Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeDelivery.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{item.product?.name}</div>
                        <div className="font-mono text-[10px] text-purple-400">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{item.requestedQty}</td>
                      <td className="py-3 px-3 font-mono font-bold text-purple-400">
                        {item.deliveredQty || item.requestedQty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        ${item.unitPrice?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activeDelivery.notes && (
              <p className="text-xs text-slate-400 italic">Notes: {activeDelivery.notes}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal to Validate Delivery */}
      <ConfirmationModal
        isOpen={!!deliveryToValidate}
        onClose={() => setDeliveryToValidate(null)}
        onConfirm={handleValidateDelivery}
        title="Validate & Dispatch Delivery"
        message={`Validating delivery ${deliveryToValidate?.referenceNumber} will decrement inventory levels for all items from ${deliveryToValidate?.location?.name} and append an immutable Stock Ledger audit record. (Example: 100 stock - 10 delivered = 90). The database strictly prevents dispatch beyond available inventory.`}
        confirmLabel="Validate & Dispatch"
        isLoading={isValidating}
      />

      {/* Create Delivery Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Outbound Delivery Order"
        subtitle="Order starts in Draft and will not decrease stock until validated"
        size="lg"
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Tesla Gigafactory"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Source Warehouse *
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
                Source Location *
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
              Delivery Notes / Shipping Manifest
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Priority dispatch - Carrier tracking #TRK-8891"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Product Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Products to Dispatch
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

                  <div className="w-24">
                    <input
                      type="number"
                      min={1}
                      value={row.requestedQty}
                      onChange={(e) =>
                        handleItemChange(index, 'requestedQty', parseInt(e.target.value, 10) || 1)
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
                      value={row.unitPrice}
                      onChange={(e) =>
                        handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Price $"
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
              Create Delivery Order (Draft)
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
