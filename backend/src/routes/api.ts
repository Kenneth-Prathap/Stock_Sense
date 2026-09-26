import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as prodCtrl from '../controllers/productController.js';
import * as recCtrl from '../controllers/receiptController.js';
import * as delCtrl from '../controllers/deliveryController.js';
import * as trfCtrl from '../controllers/transferController.js';
import * as adjCtrl from '../controllers/adjustmentController.js';
import * as ldgCtrl from '../controllers/ledgerController.js';
import * as dshCtrl from '../controllers/dashboardController.js';
import * as whCtrl from '../controllers/warehouseController.js';
import * as catCtrl from '../controllers/categoryController.js';
import { seedDatabase } from '../seed.js';

const router = Router();

// Public Auth routes
router.post('/auth/signup', authCtrl.signup);
router.post('/auth/login', authCtrl.login);
router.post('/auth/forgot-password', authCtrl.requestPasswordResetOtp);
router.post('/auth/reset-password', authCtrl.resetPasswordWithOtp);

// Protected routes
router.use(authenticateToken);

// Auth profile
router.get('/auth/profile', authCtrl.getProfile);
router.put('/auth/profile', authCtrl.updateProfile);

// Dashboard
router.get('/dashboard/metrics', dshCtrl.getDashboardMetrics);

// Products
router.get('/products', prodCtrl.getProducts);
router.get('/products/:id', prodCtrl.getProductById);
router.post('/products', prodCtrl.createProduct);
router.put('/products/:id', prodCtrl.updateProduct);
router.delete('/products/:id', prodCtrl.deleteProduct);

// Categories
router.get('/categories', catCtrl.getCategories);
router.post('/categories', catCtrl.createCategory);

// Warehouses & Locations
router.get('/warehouses', whCtrl.getWarehouses);
router.post('/warehouses', whCtrl.createWarehouse);
router.post('/warehouses/locations', whCtrl.createLocation);

// Receipts (Inbound)
router.get('/receipts', recCtrl.getReceipts);
router.get('/receipts/:id', recCtrl.getReceiptById);
router.post('/receipts', recCtrl.createReceipt);
router.patch('/receipts/:id/status', recCtrl.updateReceiptStatus);
router.post('/receipts/:id/validate', recCtrl.validateReceipt);

// Delivery Orders (Outbound)
router.get('/deliveries', delCtrl.getDeliveries);
router.get('/deliveries/:id', delCtrl.getDeliveryById);
router.post('/deliveries', delCtrl.createDelivery);
router.patch('/deliveries/:id/status', delCtrl.updateDeliveryStatus);
router.post('/deliveries/:id/validate', delCtrl.validateDelivery);

// Internal Transfers
router.get('/transfers', trfCtrl.getTransfers);
router.get('/transfers/:id', trfCtrl.getTransferById);
router.post('/transfers', trfCtrl.createTransfer);
router.patch('/transfers/:id/status', trfCtrl.updateTransferStatus);
router.post('/transfers/:id/validate', trfCtrl.validateTransfer);

// Stock Adjustments
router.get('/adjustments', adjCtrl.getAdjustments);
router.post('/adjustments', adjCtrl.createAdjustment);

// Stock Ledger (Audit Trail)
router.get('/ledger', ldgCtrl.getLedger);

// Demo reset endpoint
router.post('/demo/reset', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Demo environment successfully reset with clean realistic seed data!' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset demo data', details: error.message });
  }
});

export default router;
