import React, { useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Boxes,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Warehouse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface WarehousesPageProps {
  warehouses: Warehouse[];
  onRefreshData?: () => void;
  onNavigateToProducts: () => void;
}

export const WarehousesPage: React.FC<WarehousesPageProps> = ({
  warehouses,
  onRefreshData,
  onNavigateToProducts,
}) => {
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // New Warehouse form state
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');

  // New Location form state
  const [targetWhId, setTargetWhId] = useState(warehouses[0]?.id || '');
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState('INTERNAL');
  const [locRack, setLocRack] = useState('');
  const [locAisle, setLocAisle] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) {
      addToast('Please enter both name and code', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createWarehouse({
        name: whName,
        code: whCode.toUpperCase(),
        address: whAddress,
      });
      addToast(`Warehouse '${whName}' created with default bays!`, 'success');
      setIsWarehouseModalOpen(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create warehouse', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      addToast('Please enter location name and code', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLocation({
        warehouseId: targetWhId,
        name: locName,
        code: locCode.toUpperCase(),
        type: locType,
        rack: locRack || undefined,
        aisle: locAisle || undefined,
      });
      addToast(`Storage bin '${locName}' added!`, 'success');
      setIsLocationModalOpen(false);
      setLocName('');
      setLocCode('');
      setLocRack('');
      setLocAisle('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to create location', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Warehouses, Zones & Racks
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Multi-Facility Architecture
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hierarchical multi-warehouse management with precise aisle, rack, shelf, and receiving dock allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setTargetWhId(warehouses[0]?.id || '');
              setIsLocationModalOpen(true);
            }}
          >
            Add Storage Bin / Rack
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Building2 className="w-4 h-4" />}
            onClick={() => setIsWarehouseModalOpen(true)}
          >
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <Card key={wh.id} className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{wh.name}</h3>
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
                      Code: {wh.code}
                    </span>
                  </div>
                </div>
                <Badge variant="success">Operational</Badge>
              </div>

              {wh.address && <p className="text-xs text-slate-400 mb-4">{wh.address}</p>}

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Bins</span>
                  <span className="font-mono font-bold text-white text-base">
                    {wh.locations.length}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Stock Load</span>
                  <span className="font-mono font-bold text-brand-400 text-base">
                    {wh.totalStockUnits?.toLocaleString() || 0} units
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Bins & Racks ({wh.locations.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {wh.locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-white font-medium">{loc.name}</span>
                          {(loc.aisle || loc.rack) && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                              [{loc.aisle || ''} {loc.rack ? `• ${loc.rack}` : ''}]
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                        {loc.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={onNavigateToProducts}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Browse Inventory in {wh.code}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Warehouse Modal */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title="Add New Warehouse Facility"
        subtitle="Register a new distribution center or regional depot"
        size="md"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Warehouse Facility Name *
            </label>
            <input
              type="text"
              required
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              placeholder="e.g. Southern Regional Depot"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Warehouse Code (Unique 3-4 chars) *
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={whCode}
              onChange={(e) => setWhCode(e.target.value.toUpperCase())}
              placeholder="e.g. SRD"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Physical Address
            </label>
            <input
              type="text"
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="e.g. 500 Industrial Parkway, Atlanta, GA"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsWarehouseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Create Warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Location Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Add Storage Bin or Rack"
        subtitle="Define precise coordinates within a warehouse facility"
        size="md"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Warehouse *
            </label>
            <select
              value={targetWhId}
              onChange={(e) => setTargetWhId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                required
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. Pallet Rack C4"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Location Code *
              </label>
              <input
                type="text"
                required
                value={locCode}
                onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                placeholder="e.g. CDC-RACK-C4"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Type
              </label>
              <select
                value={locType}
                onChange={(e) => setLocType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="INTERNAL">Internal Storage</option>
                <option value="RACK">High-Bay Rack</option>
                <option value="SHELF">Small Parts Shelf</option>
                <option value="RECEIVING">Receiving Dock</option>
                <option value="DISPATCH">Dispatch Staging</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Aisle / Zone
              </label>
              <input
                type="text"
                value={locAisle}
                onChange={(e) => setLocAisle(e.target.value)}
                placeholder="Aisle 04"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rack / Level
              </label>
              <input
                type="text"
                value={locRack}
                onChange={(e) => setLocRack(e.target.value)}
                placeholder="Rack C"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Create Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
