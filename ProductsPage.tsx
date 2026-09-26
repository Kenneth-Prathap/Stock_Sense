import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Warehouse as WarehouseIcon,
  MapPin,
  AlertTriangle,
  Edit2,
  Trash2,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Product, Warehouse, Category } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ProductsPageProps {
  warehouses: Warehouse[];
  categories: Category[];
  selectedWarehouseId: string;
  onRefreshData?: () => void;
  selectedProductForDetail?: Product | null;
  onClearSelectedProduct?: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  warehouses,
  categories,
  selectedWarehouseId,
  onRefreshData,
  selectedProductForDetail,
  onClearSelectedProduct,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Location breakdown drawer / modal
  const [activeProductStock, setActiveProductStock] = useState<Product | null>(null);

  // Create / Edit modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    uom: 'Units',
    minStock: 10,
    maxStock: 500,
    reorderQty: 50,
    costPrice: 0,
    sellingPrice: 0,
    initialStock: 0,
    initialLocationId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getProducts({
        search: searchQuery || undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        stockStatus: stockStatusFilter !== 'all' ? stockStatusFilter : undefined,
        warehouseId: selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
      });
      setProducts(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, categoryFilter, stockStatusFilter, selectedWarehouseId]);

  useEffect(() => {
    if (selectedProductForDetail) {
      setActiveProductStock(selectedProductForDetail);
      if (onClearSelectedProduct) onClearSelectedProduct();
    }
  }, [selectedProductForDetail]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      categoryId: categories[0]?.id || '',
      uom: 'Units',
      minStock: 15,
      maxStock: 300,
      reorderQty: 50,
      costPrice: 0,
      sellingPrice: 0,
      initialStock: 0,
      initialLocationId: warehouses[0]?.locations[0]?.id || '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      categoryId: p.categoryId,
      uom: p.uom,
      minStock: p.minStock,
      maxStock: p.maxStock,
      reorderQty: p.reorderQty,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      initialStock: 0,
      initialLocationId: '',
    });
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        addToast(`Product '${formData.name}' updated successfully!`, 'success');
      } else {
        await api.createProduct(formData);
        addToast(`Product '${formData.name}' created with initial stock logged!`, 'success');
      }
      setIsFormOpen(false);
      fetchProducts();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete ${p.name} (${p.sku})?`)) return;

    try {
      await api.deleteProduct(p.id);
      addToast('Product removed successfully', 'success');
      fetchProducts();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Products & Inventory Catalog
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {products.length} Items
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage SKU specifications, reordering thresholds, and stock allocation across warehouse bins.
          </p>
        </div>

        <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Create Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* SKU / Name Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU code, name, or description..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Health Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Health:</span>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Levels</option>
                <option value="in">In Stock Only</option>
                <option value="low">Low Stock (≤ Min)</option>
                <option value="out">Out of Stock (0)</option>
              </select>
            </div>

            {(searchQuery || categoryFilter !== 'ALL' || stockStatusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setStockStatusFilter('all');
                }}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Products Data Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">SKU / Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">UoM</th>
                <th className="py-3 px-4">Total Stock</th>
                <th className="py-3 px-4">Reordering Rules</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading inventory products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono text-brand-400 font-bold">{p.sku}</div>
                      <div className="font-semibold text-white text-sm">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <Badge variant="neutral">{p.category?.name || 'General'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{p.uom}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setActiveProductStock(p)}
                        className="group flex items-center gap-1.5 font-mono text-sm font-extrabold text-white hover:text-brand-400 transition-colors"
                        title="Click to view stock by location"
                      >
                        <span>{p.totalStock}</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400 transition-colors" />
                      </button>
                      <div className="text-[10px] text-slate-400">
                        across {p.stocks.length} location{p.stocks.length === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-300">
                        Min: <span className="font-mono font-bold text-amber-400">{p.minStock}</span> | Max:{' '}
                        <span className="font-mono font-bold">{p.maxStock}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Reorder Qty: <span className="font-mono text-brand-400">{p.reorderQty}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-slate-400 hover:text-white"
                          onClick={() => setActiveProductStock(p)}
                          title="View Locations"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-slate-400 hover:text-brand-400"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-slate-400 hover:text-rose-400"
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock Availability by Location Modal / Drawer */}
      <Modal
        isOpen={!!activeProductStock}
        onClose={() => setActiveProductStock(null)}
        title={`Stock Availability by Location`}
        subtitle={`${activeProductStock?.name} (SKU: ${activeProductStock?.sku})`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <div>
              <div className="text-xs uppercase font-bold text-slate-400">Total Company Stock</div>
              <div className="text-2xl font-black text-white font-mono">
                {activeProductStock?.totalStock} {activeProductStock?.uom}
              </div>
            </div>
            <StatusBadge status={activeProductStock?.status || 'IN_STOCK'} />
          </div>

          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Location Breakdown ({activeProductStock?.stocks.length || 0} locations)
          </div>

          <div className="space-y-2">
            {!activeProductStock?.stocks || activeProductStock.stocks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                This item is currently not stored in any warehouse location.
              </p>
            ) : (
              activeProductStock.stocks.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-brand-400">
                      <WarehouseIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {loc.warehouseName}
                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                          {loc.warehouseCode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                        <span>{loc.locationName}</span>
                        {(loc.rack || loc.aisle) && (
                          <span className="text-[10px] text-brand-300 font-mono">
                            [{loc.aisle || ''} {loc.rack ? `• ${loc.rack}` : ''}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-base font-extrabold text-white">
                      {loc.quantity} {activeProductStock.uom}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">Code: {loc.locationCode}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Create / Edit Product Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
        subtitle={
          editingProduct
            ? `Updating SKU: ${editingProduct.sku}`
            : 'Register product with SKU, reordering rules, and initial location stock'
        }
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Lithium-Ion Battery Pack 48V"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                SKU / Product Code *
              </label>
              <input
                type="text"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. BAT-48V-01"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Unit of Measure (UoM)
              </label>
              <input
                type="text"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                placeholder="Units, kg, m, boxes, pairs..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specifications, model numbers, or application notes..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Reordering Rules Section */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Reordering Rules & Thresholds
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Min Stock (Alert)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Max Stock Limit</label>
                <input
                  type="number"
                  min={1}
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Reorder Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={formData.reorderQty}
                  onChange={(e) => setFormData({ ...formData, reorderQty: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Initial Stock Allocation on Create */}
          {!editingProduct && (
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-300">
                Initial Stock Allocation (Optional)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Initial Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({ ...formData, initialStock: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Destination Storage Bin</label>
                  <select
                    value={formData.initialLocationId}
                    onChange={(e) => setFormData({ ...formData, initialLocationId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    {warehouses.flatMap((wh) =>
                      wh.locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {wh.code} - {loc.name} ({loc.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
