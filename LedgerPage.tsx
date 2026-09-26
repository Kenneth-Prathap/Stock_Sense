import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Warehouse as WarehouseIcon,
  User,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StockLedgerEntry, Product } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface LedgerPageProps {
  products: Product[];
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ products }) => {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { addToast } = useToast();

  const fetchLedger = async (page = 1) => {
    try {
      setIsLoading(true);
      const res = await api.getLedger({
        search: searchQuery || undefined,
        movementType: movementTypeFilter !== 'ALL' ? movementTypeFilter : undefined,
        productId: productFilter !== 'ALL' ? productFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 25,
      });
      setEntries(res.records);
      setTotalRecords(res.total);
      setCurrentPage(res.page);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch stock ledger', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(1);
  }, [searchQuery, movementTypeFilter, productFilter, startDate, endDate]);

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = [
      'Timestamp',
      'Reference',
      'Movement Type',
      'SKU',
      'Product Name',
      'Source Facility',
      'Source Location',
      'Dest Facility',
      'Dest Location',
      'Quantity Changed',
      'Before Stock',
      'After Stock',
      'User Officer',
      'Notes',
    ];

    const rows = entries.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.referenceNumber,
      e.movementType,
      e.sku,
      `"${e.productName.replace(/"/g, '""')}"`,
      e.sourceWarehouse || '',
      e.sourceLocation || '',
      e.destWarehouse || '',
      e.destLocation || '',
      e.quantity,
      e.beforeStock,
      e.afterStock,
      e.userName,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockSense_Ledger_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Audit trail exported to CSV successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Stock Ledger & Audit Trail
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Immutable History
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete cryptographic audit trail of every receipt, delivery, transfer, and adjustment with before/after stock proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference (REC/DEL/INT/ADJ), SKU, product, or user..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Movement Type */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Type:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Movements</option>
                <option value="RECEIPT">Receipt (Inbound)</option>
                <option value="DELIVERY">Delivery (Outbound)</option>
                <option value="TRANSFER">Internal Transfer</option>
                <option value="ADJUSTMENT">Stock Adjustment</option>
              </select>
            </div>

            {/* Product Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Product:</span>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            {(searchQuery ||
              movementTypeFilter !== 'ALL' ||
              productFilter !== 'ALL' ||
              startDate ||
              endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMovementTypeFilter('ALL');
                  setProductFilter('ALL');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Source → Destination</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Stock Transition</th>
                <th className="py-3 px-4">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No ledger entries match your filter.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {entry.referenceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={entry.movementType} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{entry.productName}</div>
                      <div className="font-mono text-[10px] text-brand-400">{entry.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400">
                          {entry.sourceLocation || entry.sourceWarehouse || 'External Supplier'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-white font-medium">
                          {entry.destLocation || entry.destWarehouse || 'Customer Dispatch'}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                          {entry.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-black text-sm ${
                          entry.movementType === 'RECEIPT' || entry.quantity > 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {entry.movementType === 'RECEIPT' && entry.quantity > 0
                          ? `+${entry.quantity}`
                          : entry.movementType === 'DELIVERY'
                          ? `-${entry.quantity}`
                          : entry.quantity > 0
                          ? `+${entry.quantity}`
                          : entry.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                      <span className="text-slate-400">{entry.beforeStock}</span>
                      <span className="text-slate-500 mx-1.5">→</span>
                      <span className="font-bold text-white">{entry.afterStock}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {entry.userName}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/50 text-xs">
            <span className="text-slate-400 font-mono">
              Showing page {currentPage} of {totalPages} ({totalRecords} total entries)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => fetchLedger(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => fetchLedger(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
