import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Warehouse, Product } from '../../types';
import { api } from '../../services/api';

interface NavbarProps {
  onQuickAction: (action: 'receipt' | 'delivery' | 'transfer' | 'adjustment' | 'product') => void;
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  warehouses: Warehouse[];
  lowStockProducts: Product[];
  onOpenProductDetail: (product: Product) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onQuickAction,
  selectedWarehouseId,
  onSelectWarehouse,
  warehouses,
  lowStockProducts,
  onOpenProductDetail,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowQuickMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Warehouse Filter Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-sm">
          <WarehouseIcon className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Facility:</span>
          <select
            value={selectedWarehouseId}
            onChange={(e) => onSelectWarehouse(e.target.value)}
            className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-white">
              All Warehouses & Hubs
            </option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id} className="bg-slate-900 text-white">
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Quick Actions & Notification Bell */}
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {/* Quick Action Dropdown */}
        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowQuickMenu(!showQuickMenu)}
          >
            <span>New Operation</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
          </Button>

          {showQuickMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickAction('receipt');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div>New Receipt</div>
                  <div className="text-[10px] text-slate-400 font-normal">Receive supplier shipment</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickAction('delivery');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div>New Delivery Order</div>
                  <div className="text-[10px] text-slate-400 font-normal">Pick, pack & dispatch</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickAction('transfer');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div>Internal Transfer</div>
                  <div className="text-[10px] text-slate-400 font-normal">Warehouse / Rack relocation</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onQuickAction('adjustment');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div>Stock Adjustment</div>
                  <div className="text-[10px] text-slate-400 font-normal">Physical count reconciliation</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Low Stock Alert Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-all relative"
            title="Inventory Alerts"
          >
            <Bell className="w-4 h-4" />
            {lowStockProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {lowStockProducts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Stock Alerts ({lowStockProducts.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Dynamic Real-time</span>
              </div>

              <div className="py-2 max-h-72 overflow-y-auto space-y-2">
                {lowStockProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">All stock levels healthy!</p>
                ) : (
                  lowStockProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenProductDetail(p);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white truncate max-w-[170px]">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.sku}</p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            p.totalStock === 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.totalStock === 0 ? 'Out of Stock' : `${p.totalStock} left (Min: ${p.minStock})`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {lowStockProducts.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setShowNotifications(false);
                      onQuickAction('receipt');
                    }}
                  >
                    Quick Restock via Receipt
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
