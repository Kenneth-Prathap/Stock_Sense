import {
  User,
  Category,
  Warehouse,
  Location,
  Product,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  StockAdjustment,
  StockLedgerEntry,
  DashboardMetrics,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('stocksense_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- AUTH ---
  async login(credentials: { email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(data: { name: string; email: string; password: string; role?: string }) {
    return this.request<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestPasswordResetOtp(email: string) {
    return this.request<{ message: string; email?: string; otpCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { email: string; otpCode: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request<User>('/auth/profile');
  }

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- DASHBOARD ---
  async getDashboardMetrics(params?: {
    warehouseId?: string;
    categoryId?: string;
    status?: string;
    docType?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.docType) searchParams.append('docType', params.docType);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<DashboardMetrics>(`/dashboard/metrics${qs}`);
  }

  // --- PRODUCTS ---
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    stockStatus?: string;
    warehouseId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.stockStatus) searchParams.append('stockStatus', params.stockStatus);
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<Product[]>(`/products${qs}`);
  }

  async getProductById(id: string) {
    return this.request<Product & { recentLogs: StockLedgerEntry[] }>(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // --- CATEGORIES ---
  async getCategories() {
    return this.request<Category[]>('/categories');
  }

  async createCategory(data: { name: string; description?: string }) {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- WAREHOUSES & LOCATIONS ---
  async getWarehouses() {
    return this.request<Warehouse[]>('/warehouses');
  }

  async createWarehouse(data: { name: string; code: string; address?: string }) {
    return this.request<Warehouse>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createLocation(data: {
    warehouseId: string;
    name: string;
    code: string;
    type?: string;
    rack?: string;
    aisle?: string;
  }) {
    return this.request<Location>('/warehouses/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- RECEIPTS (INBOUND) ---
  async getReceipts(params?: { status?: string; warehouseId?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<Receipt[]>(`/receipts${qs}`);
  }

  async getReceiptById(id: string) {
    return this.request<Receipt>(`/receipts/${id}`);
  }

  async createReceipt(data: any) {
    return this.request<Receipt>('/receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReceiptStatus(id: string, status: string) {
    return this.request<Receipt>(`/receipts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async validateReceipt(id: string) {
    return this.request<{ message: string; receipt: Receipt }>(`/receipts/${id}/validate`, {
      method: 'POST',
    });
  }

  // --- DELIVERIES (OUTBOUND) ---
  async getDeliveries(params?: { status?: string; warehouseId?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<DeliveryOrder[]>(`/deliveries${qs}`);
  }

  async getDeliveryById(id: string) {
    return this.request<DeliveryOrder>(`/deliveries/${id}`);
  }

  async createDelivery(data: any) {
    return this.request<DeliveryOrder>('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeliveryStatus(id: string, status: string) {
    return this.request<DeliveryOrder>(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async validateDelivery(id: string) {
    return this.request<{ message: string; delivery: DeliveryOrder }>(`/deliveries/${id}/validate`, {
      method: 'POST',
    });
  }

  // --- INTERNAL TRANSFERS ---
  async getTransfers(params?: { status?: string; sourceWarehouseId?: string; destWarehouseId?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.sourceWarehouseId) searchParams.append('sourceWarehouseId', params.sourceWarehouseId);
    if (params?.destWarehouseId) searchParams.append('destWarehouseId', params.destWarehouseId);
    if (params?.search) searchParams.append('search', params.search);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<InternalTransfer[]>(`/transfers${qs}`);
  }

  async getTransferById(id: string) {
    return this.request<InternalTransfer>(`/transfers/${id}`);
  }

  async createTransfer(data: any) {
    return this.request<InternalTransfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransferStatus(id: string, status: string) {
    return this.request<InternalTransfer>(`/transfers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async validateTransfer(id: string) {
    return this.request<{ message: string; transfer: InternalTransfer }>(`/transfers/${id}/validate`, {
      method: 'POST',
    });
  }

  // --- STOCK ADJUSTMENTS ---
  async getAdjustments(params?: { warehouseId?: string; productId?: string; reason?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.warehouseId) searchParams.append('warehouseId', params.warehouseId);
    if (params?.productId) searchParams.append('productId', params.productId);
    if (params?.reason) searchParams.append('reason', params.reason);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<StockAdjustment[]>(`/adjustments${qs}`);
  }

  async createAdjustment(data: {
    warehouseId: string;
    locationId: string;
    productId: string;
    physicalQty: number;
    reason: string;
    notes?: string;
  }) {
    return this.request<{ message: string; adjustment: StockAdjustment }>('/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- STOCK LEDGER (AUDIT TRAIL) ---
  async getLedger(params?: {
    search?: string;
    movementType?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.movementType) searchParams.append('movementType', params.movementType);
    if (params?.productId) searchParams.append('productId', params.productId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<{
      total: number;
      page: number;
      totalPages: number;
      records: StockLedgerEntry[];
    }>(`/ledger${qs}`);
  }

  // --- DEMO RESET ---
  async resetDemoData() {
    return this.request<{ message: string }>('/demo/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
