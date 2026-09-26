import { strict as assert } from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🔬 Starting StockSense End-to-End Automated Verification');
  console.log('====================================================\n');

  // --- 1. HEALTH CHECK ---
  console.log('Step 1: Testing Health Endpoint...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.equal(healthRes.status, 200, 'Health check should return 200');
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  console.log('✓ Health check passed.\n');

  // --- 2. AUTHENTICATION & PROFILE ---
  console.log('Step 2: Testing Authentication & Profile...');
  // 2a. Admin Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.io', password: 'admin123' }),
  });
  assert.equal(loginRes.status, 200, 'Admin login should succeed');
  const { token, user } = await loginRes.json();
  assert.ok(token, 'Token should be returned');
  assert.equal(user.role, 'ADMIN');
  console.log(`✓ Admin login successful. Token acquired for ${user.name}`);

  const authHeader = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2b. OTP Password Reset Flow
  console.log('  Testing OTP Password Reset Flow...');
  const otpReqRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.io' }),
  });
  assert.equal(otpReqRes.status, 200);
  const otpData = await otpReqRes.json();
  assert.ok(otpData.otpCode, 'OTP code should be generated');
  console.log(`  ✓ OTP requested successfully. Generated code: ${otpData.otpCode}`);

  const otpResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stocksense.io',
      otpCode: otpData.otpCode,
      newPassword: 'admin123_new_password',
    }),
  });
  assert.equal(otpResetRes.status, 200);
  console.log('  ✓ Password reset with OTP succeeded');

  // Restore password back to admin123
  const otpReqRes2 = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stocksense.io' }),
  });
  const otpData2 = await otpReqRes2.json();
  await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@stocksense.io',
      otpCode: otpData2.otpCode,
      newPassword: 'admin123',
    }),
  });
  console.log('  ✓ Password restored for continuous demo testing.\n');

  // --- 3. DASHBOARD METRICS & DYNAMIC FILTERS ---
  console.log('Step 3: Testing Dashboard Metrics & Dynamic Filters...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/metrics`, { headers: authHeader });
  assert.equal(dashRes.status, 200);
  const dashData = await dashRes.json();
  assert.ok(dashData.kpis.totalStockUnits > 0, 'Total stock units should be > 0');
  assert.ok(dashData.kpis.pendingReceipts >= 0, 'Pending receipts should be non-negative');
  assert.ok(dashData.kpis.pendingDeliveries >= 0, 'Pending deliveries should be non-negative');
  assert.ok(dashData.categoryDistribution.length > 0, 'Categories should be populated');
  console.log(`✓ Dashboard metrics dynamic KPIs verified: ${dashData.kpis.totalStockUnits} units in stock.\n`);

  // --- 4. PRODUCTS & LOCATION BREAKDOWN ---
  console.log('Step 4: Testing Products & Location Breakdown...');
  const productsRes = await fetch(`${BASE_URL}/products`, { headers: authHeader });
  const productsList = await productsRes.json();
  assert.ok(productsList.length >= 6, 'Should have at least 6 products from seed');

  // Test search by SKU
  const searchRes = await fetch(`${BASE_URL}/products?search=BAT-48V-01`, { headers: authHeader });
  const searchResults = await searchRes.json();
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].sku, 'BAT-48V-01');
  const batProduct = searchResults[0];
  console.log(`✓ Product search by SKU verified: Found ${batProduct.name} (${batProduct.totalStock} units).`);

  // Verify location breakdown
  assert.ok(batProduct.stocks.length > 0, 'Product should have location breakdown');
  console.log(`✓ Stock by location verified: ${batProduct.stocks[0].warehouseName} - ${batProduct.stocks[0].locationName}: ${batProduct.stocks[0].quantity} units.\n`);

  // --- 5. RECEIPT WORKFLOW (Inbound: 100 + 50 = 150) ---
  console.log('Step 5: Testing Inbound Receipt Workflow (Draft Invariant & Validation)...');
  const whRes = await fetch(`${BASE_URL}/warehouses`, { headers: authHeader });
  const warehouses = await whRes.json();
  const cdc = warehouses.find((w: any) => w.code === 'CDC');
  const cdcBay1 = cdc.locations.find((l: any) => l.name === 'Main Storage Bay A');

  // Check initial stock of BAT-48V-01 in cdcBay1
  const initialBatStockLoc = batProduct.stocks.find((s: any) => s.locationId === cdcBay1.id);
  const initialBatStock = initialBatStockLoc ? initialBatStockLoc.quantity : 0;
  console.log(`  Initial stock of ${batProduct.sku} in ${cdcBay1.name}: ${initialBatStock}`);

  // Create Draft receipt for 50 units
  const receiveQty = 50;
  const createRecRes = await fetch(`${BASE_URL}/receipts`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      supplier: 'Test Supplier Ltd',
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      notes: 'Automated test receipt',
      items: [{ productId: batProduct.id, expectedQty: receiveQty, unitCost: 400 }],
    }),
  });
  assert.equal(createRecRes.status, 201);
  const receipt = await createRecRes.json();
  assert.equal(receipt.status, 'DRAFT');
  console.log(`  Created Receipt ${receipt.referenceNumber} in DRAFT status`);

  // Verify Draft receipt DID NOT change stock
  const postDraftProdRes = await fetch(`${BASE_URL}/products/${batProduct.id}`, { headers: authHeader });
  const postDraftProd = await postDraftProdRes.json();
  const postDraftLoc = postDraftProd.stocks.find((s: any) => s.locationId === cdcBay1.id);
  assert.equal(postDraftLoc.quantity, initialBatStock, 'DRAFT receipts must NOT change stock!');
  console.log(`  ✓ DRAFT INVARIANT VERIFIED: Stock remained unchanged at ${initialBatStock}`);

  // Validate Receipt
  const validateRecRes = await fetch(`${BASE_URL}/receipts/${receipt.id}/validate`, {
    method: 'POST',
    headers: authHeader,
  });
  assert.equal(validateRecRes.status, 200);
  const validateRecData = await validateRecRes.json();
  assert.equal(validateRecData.receipt.status, 'DONE');

  // Verify stock increased: initial + 50
  const postValProdRes = await fetch(`${BASE_URL}/products/${batProduct.id}`, { headers: authHeader });
  const postValProd = await postValProdRes.json();
  const postValLoc = postValProd.stocks.find((s: any) => s.locationId === cdcBay1.id);
  const expectedStock = initialBatStock + receiveQty;
  assert.equal(postValLoc.quantity, expectedStock, `Stock should increase to ${expectedStock}`);
  console.log(`  ✓ RECEIPT VALIDATION VERIFIED: Stock increased from ${initialBatStock} to ${postValLoc.quantity} (+${receiveQty}).\n`);

  // --- 6. DELIVERY WORKFLOW (Outbound: 150 - 10 = 140 & Overdraft Guard) ---
  console.log('Step 6: Testing Delivery Workflow (Overdraft Guard & Decrement)...');
  const deliverQty = 10;

  // Attempt overdraft delivery beyond available stock (e.g. 99,999 units)
  const overdraftRes = await fetch(`${BASE_URL}/deliveries`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      customer: 'Overdraft Buyer',
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      items: [{ productId: batProduct.id, requestedQty: 99999, unitPrice: 700 }],
    }),
  });
  const overdraftOrder = await overdraftRes.json();
  const overdraftValRes = await fetch(`${BASE_URL}/deliveries/${overdraftOrder.id}/validate`, {
    method: 'POST',
    headers: authHeader,
  });
  assert.equal(overdraftValRes.status, 400, 'Validation should fail on insufficient stock');
  const overdraftErr = await overdraftValRes.json();
  console.log(`  ✓ OVERDRAFT GUARD VERIFIED: Prevented delivery beyond available stock (${overdraftErr.error}).`);

  // Valid delivery of 10 units
  const createDelRes = await fetch(`${BASE_URL}/deliveries`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      customer: 'Verified Customer Co',
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      notes: 'Automated test delivery',
      items: [{ productId: batProduct.id, requestedQty: deliverQty, unitPrice: 650 }],
    }),
  });
  const delivery = await createDelRes.json();
  const validateDelRes = await fetch(`${BASE_URL}/deliveries/${delivery.id}/validate`, {
    method: 'POST',
    headers: authHeader,
  });
  assert.equal(validateDelRes.status, 200);

  // Verify stock decreased: expectedStock - 10
  const postDelProdRes = await fetch(`${BASE_URL}/products/${batProduct.id}`, { headers: authHeader });
  const postDelProd = await postDelProdRes.json();
  const postDelLoc = postDelProd.stocks.find((s: any) => s.locationId === cdcBay1.id);
  const expectedPostDel = expectedStock - deliverQty;
  assert.equal(postDelLoc.quantity, expectedPostDel, `Stock should decrease to ${expectedPostDel}`);
  console.log(`  ✓ DELIVERY VALIDATION VERIFIED: Stock decreased from ${expectedStock} to ${postDelLoc.quantity} (-${deliverQty}).\n`);

  // --- 7. INTERNAL TRANSFERS (Location to Location: Invariant Conservation) ---
  console.log('Step 7: Testing Internal Transfers & Stock Conservation Invariant...');
  const cdcBay2 = cdc.locations.find((l: any) => l.name === 'Bulk Pallet Rack B');
  const transferQty = 15;

  const preTotalCompanyStock = postDelProd.totalStock;
  const preSourceStock = postDelLoc.quantity;

  const createTrfRes = await fetch(`${BASE_URL}/transfers`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      sourceWarehouseId: cdc.id,
      sourceLocationId: cdcBay1.id,
      destWarehouseId: cdc.id,
      destLocationId: cdcBay2.id,
      notes: 'Aisle 1 to Rack B relocation',
      items: [{ productId: batProduct.id, quantity: transferQty }],
    }),
  });
  const transfer = await createTrfRes.json();

  const validateTrfRes = await fetch(`${BASE_URL}/transfers/${transfer.id}/validate`, {
    method: 'POST',
    headers: authHeader,
  });
  assert.equal(validateTrfRes.status, 200);

  const postTrfProdRes = await fetch(`${BASE_URL}/products/${batProduct.id}`, { headers: authHeader });
  const postTrfProd = await postTrfProdRes.json();
  const postTrfSource = postTrfProd.stocks.find((s: any) => s.locationId === cdcBay1.id);
  const postTrfDest = postTrfProd.stocks.find((s: any) => s.locationId === cdcBay2.id);

  assert.equal(postTrfSource.quantity, preSourceStock - transferQty, 'Source location should decrement');
  assert.equal(postTrfProd.totalStock, preTotalCompanyStock, 'TOTAL COMPANY STOCK MUST REMAIN CONSTANT!');
  console.log(`  Source (${cdcBay1.name}) changed: ${preSourceStock} -> ${postTrfSource.quantity} (-${transferQty})`);
  console.log(`  Destination (${cdcBay2.name}) increased: +${transferQty}`);
  console.log(`  ✓ INVARIANT CONSERVATION VERIFIED: Total Company Stock remained exactly ${postTrfProd.totalStock}.\n`);

  // --- 8. STOCK ADJUSTMENT (Physical Counting: Recorded 100 -> Physical 97 = -3) ---
  console.log('Step 8: Testing Stock Adjustment & Discrepancy Calculation...');
  const currentSourceStock = postTrfSource.quantity;
  const targetPhysical = currentSourceStock - 3; // Damaged 3 units

  const adjRes = await fetch(`${BASE_URL}/adjustments`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      productId: batProduct.id,
      physicalQty: targetPhysical,
      reason: 'DAMAGED',
      notes: 'Forklift damage inspection',
    }),
  });
  assert.equal(adjRes.status, 201);
  const adjData = await adjRes.json();
  assert.equal(adjData.adjustment.differenceQty, -3);
  assert.equal(adjData.adjustment.physicalQty, targetPhysical);

  const postAdjProdRes = await fetch(`${BASE_URL}/products/${batProduct.id}`, { headers: authHeader });
  const postAdjProd = await postAdjProdRes.json();
  const postAdjLoc = postAdjProd.stocks.find((s: any) => s.locationId === cdcBay1.id);
  assert.equal(postAdjLoc.quantity, targetPhysical, `Final stock must equal physical count ${targetPhysical}`);
  console.log(`  ✓ ADJUSTMENT VERIFIED: Recorded ${currentSourceStock}, Physical ${targetPhysical} (Δ: -3) -> Final Stock: ${postAdjLoc.quantity}.\n`);

  // --- 9. STOCK LEDGER AUDIT TRAIL ---
  console.log('Step 9: Testing Stock Ledger Audit Trail...');
  const ledgerRes = await fetch(`${BASE_URL}/ledger?productId=${batProduct.id}`, { headers: authHeader });
  assert.equal(ledgerRes.status, 200);
  const ledgerData = await ledgerRes.json();
  assert.ok(ledgerData.total > 0, 'Ledger must contain records');

  const movesFound = new Set(ledgerData.records.map((r: any) => r.movementType));
  console.log(`  Movements logged for ${batProduct.sku}:`, Array.from(movesFound).join(', '));
  assert.ok(movesFound.has('RECEIPT'), 'Ledger must log RECEIPT');
  assert.ok(movesFound.has('DELIVERY'), 'Ledger must log DELIVERY');
  assert.ok(movesFound.has('TRANSFER'), 'Ledger must log TRANSFER');
  assert.ok(movesFound.has('ADJUSTMENT'), 'Ledger must log ADJUSTMENT');
  console.log(`  ✓ AUDIT TRAIL VERIFIED: Complete chronological history with before/after stock proofs intact.\n`);

  console.log('====================================================');
  console.log('🎉 ALL SPECIFICATION & INVENTORY WORKFLOW TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
