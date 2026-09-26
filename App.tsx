import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { HackathonDemoGuide } from './components/common/HackathonDemoGuide';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { TransfersPage } from './pages/TransfersPage';
import { AdjustmentsPage } from './pages/AdjustmentsPage';
import { LedgerPage } from './pages/LedgerPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { ProfilePage } from './pages/ProfilePage';
import { Warehouse, Category, Product } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

const StockSenseApp: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState<number>(0);
  const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState<number>(0);

  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  const fetchGlobalData = useCallback(async () => {
    if (!user) return;
    try {
      const [whList, catList, prodList, metrics] = await Promise.all([
        api.getWarehouses().catch(() => []),
        api.getCategories().catch(() => []),
        api.getProducts().catch(() => []),
        api.getDashboardMetrics().catch(() => null),
      ]);

      setWarehouses(whList);
      setCategories(catList);
      setProducts(prodList);

      const alerts = prodList.filter((p) => p.isLowStock || p.isOutOfStock);
      setLowStockProducts(alerts);

      if (metrics?.kpis) {
        setPendingReceiptsCount(metrics.kpis.pendingReceipts);
        setPendingDeliveriesCount(metrics.kpis.pendingDeliveries);
      }
    } catch (err) {
      console.error('Failed to load global data', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchGlobalData();
    }
  }, [user, fetchGlobalData]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-xs font-mono tracking-wider uppercase">Loading StockSense Session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleQuickAction = (
    action: 'receipt' | 'delivery' | 'transfer' | 'adjustment' | 'product'
  ) => {
    if (action === 'receipt') setCurrentTab('receipts');
    else if (action === 'delivery') setCurrentTab('deliveries');
    else if (action === 'transfer') setCurrentTab('transfers');
    else if (action === 'adjustment') setCurrentTab('adjustments');
    else if (action === 'product') setCurrentTab('products');
  };

  const handleOpenProductDetailFromAlert = (p: Product) => {
    setCurrentTab('products');
    setSelectedProductForDetail(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lowStockCount={lowStockProducts.length}
        pendingReceiptsCount={pendingReceiptsCount}
        pendingDeliveriesCount={pendingDeliveriesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar
          onQuickAction={handleQuickAction}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={setSelectedWarehouseId}
          warehouses={warehouses}
          lowStockProducts={lowStockProducts}
          onOpenProductDetail={handleOpenProductDetailFromAlert}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-24">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentTab}
              warehouses={warehouses}
              categories={categories}
              selectedWarehouseId={selectedWarehouseId}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage
              warehouses={warehouses}
              categories={categories}
              selectedWarehouseId={selectedWarehouseId}
              onRefreshData={fetchGlobalData}
              selectedProductForDetail={selectedProductForDetail}
              onClearSelectedProduct={() => setSelectedProductForDetail(null)}
            />
          )}

          {currentTab === 'receipts' && (
            <ReceiptsPage
              warehouses={warehouses}
              products={products}
              selectedWarehouseId={selectedWarehouseId}
              onRefreshData={fetchGlobalData}
            />
          )}

          {currentTab === 'deliveries' && (
            <DeliveriesPage
              warehouses={warehouses}
              products={products}
              selectedWarehouseId={selectedWarehouseId}
              onRefreshData={fetchGlobalData}
            />
          )}

          {currentTab === 'transfers' && (
            <TransfersPage
              warehouses={warehouses}
              products={products}
              selectedWarehouseId={selectedWarehouseId}
              onRefreshData={fetchGlobalData}
            />
          )}

          {currentTab === 'adjustments' && (
            <AdjustmentsPage
              warehouses={warehouses}
              products={products}
              selectedWarehouseId={selectedWarehouseId}
              onRefreshData={fetchGlobalData}
            />
          )}

          {currentTab === 'ledger' && <LedgerPage products={products} />}

          {currentTab === 'warehouses' && (
            <WarehousesPage
              warehouses={warehouses}
              onRefreshData={fetchGlobalData}
              onNavigateToProducts={() => setCurrentTab('products')}
            />
          )}

          {currentTab === 'profile' && <ProfilePage onRefreshData={fetchGlobalData} />}
        </main>
      </div>

      {/* Interactive Hackathon Judge Demo Walkthrough Assistant */}
      <HackathonDemoGuide
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        onRefreshData={fetchGlobalData}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StockSenseApp />
      </AuthProvider>
    </ToastProvider>
  );
}
