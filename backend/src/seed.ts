import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

export async function seedDatabase() {
  console.log('--- Starting StockSense Database Seeding ---');

  // Clear existing data cleanly in proper order
  await prisma.stockLedger.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.transferItem.deleteMany();
  await prisma.internalTransfer.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.deliveryOrder.deleteMany();
  await prisma.receiptItem.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.stockLocation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'admin@stocksense.io',
      passwordHash,
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Alex Mercer',
      email: 'manager@stocksense.io',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: 'MANAGER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  console.log('✓ Users created');

  // 2. Seed Warehouses
  const cdc = await prisma.warehouse.create({
    data: {
      name: 'Central Distribution Center',
      code: 'CDC',
      address: '100 Logistics Blvd, Chicago, IL',
    },
  });

  const ecd = await prisma.warehouse.create({
    data: {
      name: 'East Coast Depot',
      code: 'ECD',
      address: '45 Harbor Road, Newark, NJ',
    },
  });

  const wcl = await prisma.warehouse.create({
    data: {
      name: 'West Coast Logistics Hub',
      code: 'WCL',
      address: '880 Pacific Way, Oakland, CA',
    },
  });

  console.log('✓ Warehouses created');

  // 3. Seed Locations (Zones, Racks, Aisles)
  const cdcBay1 = await prisma.location.create({
    data: {
      warehouseId: cdc.id,
      name: 'Main Storage Bay A',
      code: 'CDC-BAY-A1',
      type: 'INTERNAL',
      aisle: 'Aisle 01',
      rack: 'Rack A',
    },
  });

  const cdcBay2 = await prisma.location.create({
    data: {
      warehouseId: cdc.id,
      name: 'Bulk Pallet Rack B',
      code: 'CDC-RACK-B2',
      type: 'RACK',
      aisle: 'Aisle 02',
      rack: 'Rack B',
    },
  });

  const cdcRcv = await prisma.location.create({
    data: {
      warehouseId: cdc.id,
      name: 'Receiving Dock 1',
      code: 'CDC-RCV-01',
      type: 'RECEIVING',
      aisle: 'Inbound Dock',
    },
  });

  const ecdShelf1 = await prisma.location.create({
    data: {
      warehouseId: ecd.id,
      name: 'Small Parts Bin Zone',
      code: 'ECD-BIN-01',
      type: 'SHELF',
      aisle: 'Aisle 01',
      rack: 'Rack 1',
    },
  });

  const ecdShelf2 = await prisma.location.create({
    data: {
      warehouseId: ecd.id,
      name: 'Fast Moving Shelf B',
      code: 'ECD-SHLF-B2',
      type: 'SHELF',
      aisle: 'Aisle 03',
      rack: 'Rack B',
    },
  });

  const wclRack1 = await prisma.location.create({
    data: {
      warehouseId: wcl.id,
      name: 'High-Bay Pallet Rack 1',
      code: 'WCL-HIGH-01',
      type: 'RACK',
      aisle: 'High-Bay 1',
      rack: 'Rack 10',
    },
  });

  console.log('✓ Warehouse locations & racks created');

  // 4. Seed Categories
  const catElectronics = await prisma.category.create({
    data: { name: 'Electronics & Robotics', description: 'Semiconductors, batteries, sensors, and robotics modules' },
  });
  const catIndustrial = await prisma.category.create({
    data: { name: 'Industrial Equipment', description: 'Power tools, heavy-duty pneumatic machinery and parts' },
  });
  const catSafety = await prisma.category.create({
    data: { name: 'Safety & PPE', description: 'Personal protective equipment, gloves, helmets, harnesses' },
  });
  const catPackaging = await prisma.category.create({
    data: { name: 'Packaging & Logistics', description: 'Cartons, strapping, bubble film, pallet wrap' },
  });

  console.log('✓ Categories created');

  // 5. Seed Products
  const p1 = await prisma.product.create({
    data: {
      name: 'Lithium-Ion Battery Pack 48V 100Ah',
      sku: 'BAT-48V-01',
      description: 'High energy density rechargeable battery module for industrial AMR robots',
      categoryId: catElectronics.id,
      uom: 'Units',
      minStock: 20,
      maxStock: 200,
      reorderQty: 50,
      costPrice: 420.0,
      sellingPrice: 650.0,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Microcontroller Unit STM32H743',
      sku: 'MCU-STM32-H7',
      description: 'Cortex-M7 480MHz 2MB Flash industrial microcontroller',
      categoryId: catElectronics.id,
      uom: 'Units',
      minStock: 50,
      maxStock: 500,
      reorderQty: 100,
      costPrice: 12.5,
      sellingPrice: 28.0,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: 'Brushless DC Motor 800W',
      sku: 'MOT-BRUSH-800',
      description: 'Brushless DC motor with integrated Hall sensors for automated conveyor lines',
      categoryId: catIndustrial.id,
      uom: 'Units',
      minStock: 15,
      maxStock: 100,
      reorderQty: 30,
      costPrice: 85.0,
      sellingPrice: 150.0,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Cordless Impact Wrench',
      sku: 'WRN-IMP-20V',
      description: 'Brushless 1/2-inch cordless impact wrench 1000Nm torque',
      categoryId: catIndustrial.id,
      uom: 'Units',
      minStock: 10,
      maxStock: 80,
      reorderQty: 25,
      costPrice: 110.0,
      sellingPrice: 189.0,
    },
  });

  const p5 = await prisma.product.create({
    data: {
      name: 'Level-5 Cut-Resistant Work Gloves',
      sku: 'GLV-CUT5-L',
      description: 'HPPE nitrile coated breathable heavy duty safety gloves',
      categoryId: catSafety.id,
      uom: 'Pairs',
      minStock: 80,
      maxStock: 600,
      reorderQty: 150,
      costPrice: 4.5,
      sellingPrice: 12.0,
    },
  });

  const p6 = await prisma.product.create({
    data: {
      name: 'Double-Wall Corrugated Shipping Box (Large)',
      sku: 'BOX-HVY-DOUB',
      description: 'Heavy duty corrugated export box 600x400x400mm',
      categoryId: catPackaging.id,
      uom: 'Boxes',
      minStock: 150,
      maxStock: 1500,
      reorderQty: 300,
      costPrice: 1.8,
      sellingPrice: 3.5,
    },
  });

  console.log('✓ Products created');

  // 6. Assign Initial Stock to Locations
  // P1: 100 units in CDC Bay 1
  await prisma.stockLocation.create({
    data: { productId: p1.id, locationId: cdcBay1.id, quantity: 100 },
  });

  // P2: 45 units in ECD Shelf 1 (Low stock! min is 50)
  await prisma.stockLocation.create({
    data: { productId: p2.id, locationId: ecdShelf1.id, quantity: 45 },
  });

  // P3: 0 units (Out of stock! min is 15)
  await prisma.stockLocation.create({
    data: { productId: p3.id, locationId: cdcBay1.id, quantity: 0 },
  });

  // P4: 55 units in CDC Bay 2
  await prisma.stockLocation.create({
    data: { productId: p4.id, locationId: cdcBay2.id, quantity: 55 },
  });

  // P5: 220 pairs in CDC Bay 1
  await prisma.stockLocation.create({
    data: { productId: p5.id, locationId: cdcBay1.id, quantity: 220 },
  });

  // P6: 500 boxes in ECD Shelf 2
  await prisma.stockLocation.create({
    data: { productId: p6.id, locationId: ecdShelf2.id, quantity: 500 },
  });

  console.log('✓ Initial Stock distributed');

  // 7. Seed Stock Ledger History (Initial records)
  const initialMoves = [
    {
      productId: p1.id,
      sku: p1.sku,
      productName: p1.name,
      movementType: 'RECEIPT',
      referenceNumber: 'REC-2026-0001',
      destWarehouse: cdc.name,
      destLocation: cdcBay1.name,
      quantity: 100,
      beforeStock: 0,
      afterStock: 100,
      userId: admin.id,
      userName: admin.name,
      notes: 'Initial warehouse intake from Apex Energy Systems',
    },
    {
      productId: p2.id,
      sku: p2.sku,
      productName: p2.name,
      movementType: 'RECEIPT',
      referenceNumber: 'REC-2026-0002',
      destWarehouse: ecd.name,
      destLocation: ecdShelf1.name,
      quantity: 75,
      beforeStock: 0,
      afterStock: 75,
      userId: manager.id,
      userName: manager.name,
      notes: 'Initial batch from STMicroelectronics',
    },
    {
      productId: p2.id,
      sku: p2.sku,
      productName: p2.name,
      movementType: 'DELIVERY',
      referenceNumber: 'DEL-2026-0001',
      sourceWarehouse: ecd.name,
      sourceLocation: ecdShelf1.name,
      quantity: 30,
      beforeStock: 75,
      afterStock: 45,
      userId: admin.id,
      userName: admin.name,
      notes: 'Dispatched to RoboTech Industries',
    },
    {
      productId: p4.id,
      sku: p4.sku,
      productName: p4.name,
      movementType: 'RECEIPT',
      referenceNumber: 'REC-2026-0003',
      destWarehouse: cdc.name,
      destLocation: cdcBay2.name,
      quantity: 55,
      beforeStock: 0,
      afterStock: 55,
      userId: manager.id,
      userName: manager.name,
      notes: 'Inbound shipment from Milwaukee Tool Direct',
    },
    {
      productId: p5.id,
      sku: p5.sku,
      productName: p5.name,
      movementType: 'RECEIPT',
      referenceNumber: 'REC-2026-0004',
      destWarehouse: cdc.name,
      destLocation: cdcBay1.name,
      quantity: 220,
      beforeStock: 0,
      afterStock: 220,
      userId: admin.id,
      userName: admin.name,
      notes: 'Safety gear bulk intake from Ansell Protective',
    },
  ];

  for (const move of initialMoves) {
    await prisma.stockLedger.create({ data: move });
  }

  // 8. Seed pending receipts, deliveries, and transfers for dynamic dashboard KPIs
  // Pending Receipt (Waiting)
  await prisma.receipt.create({
    data: {
      referenceNumber: 'REC-2026-0005',
      supplier: 'Apex Energy Systems',
      status: 'WAITING',
      warehouseId: cdc.id,
      locationId: cdcRcv.id,
      notes: 'Incoming 100 units of Battery Packs expected tomorrow',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: p1.id,
            expectedQty: 100,
            receivedQty: 0,
            unitCost: 410.0,
          },
        ],
      },
    },
  });

  // Pending Receipt (Draft)
  await prisma.receipt.create({
    data: {
      referenceNumber: 'REC-2026-0006',
      supplier: 'Nidec Motor Corp',
      status: 'DRAFT',
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      notes: 'Draft restock purchase order for Brushless Motors',
      createdById: admin.id,
      items: {
        create: [
          {
            productId: p3.id,
            expectedQty: 50,
            receivedQty: 0,
            unitCost: 82.0,
          },
        ],
      },
    },
  });

  // Pending Delivery (Picked)
  await prisma.deliveryOrder.create({
    data: {
      referenceNumber: 'DEL-2026-0002',
      customer: 'Tesla Gigafactory 1',
      status: 'PICKED',
      warehouseId: cdc.id,
      locationId: cdcBay1.id,
      notes: 'Priority dispatch scheduled for 20 units of 48V Battery Packs',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: p1.id,
            requestedQty: 20,
            deliveredQty: 20,
            unitPrice: 650.0,
          },
        ],
      },
    },
  });

  // Scheduled Internal Transfer (Ready)
  await prisma.internalTransfer.create({
    data: {
      referenceNumber: 'INT-2026-0001',
      status: 'READY',
      sourceWarehouseId: cdc.id,
      sourceLocationId: cdcBay1.id,
      destWarehouseId: wcl.id,
      destLocationId: wclRack1.id,
      notes: 'Scheduled inter-warehouse replenishment: 15 battery packs to West Coast',
      createdById: admin.id,
      items: {
        create: [
          {
            productId: p1.id,
            quantity: 15,
          },
        ],
      },
    },
  });

  console.log('✓ Pending documents seeded (Receipts, Deliveries, Transfers)');
  console.log('--- Database Seeding Completed Successfully ---');
}

// Automatically invoke ONLY if run directly via CLI
if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
