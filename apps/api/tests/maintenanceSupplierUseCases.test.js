import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceSupplierUseCases } from '../src/modules/maintenance/application/maintenanceSupplierUseCases.js';

function setup() {
  const suppliers = [];
  const maintenances = [{ id: 1, buildingId: 10, supplier: null }];
  const auditEntries = [];
  const maintenanceRepository = {
    async findById(id) {
      return maintenances.find((maintenance) => maintenance.id === Number(id)) ?? null;
    },
    async updateSupplier(id, supplierId, documentRef) {
      const maintenance = maintenances.find((item) => item.id === Number(id));
      maintenance.supplier = suppliers.find((item) => item.id === supplierId);
      maintenance.supplierDocumentRef = documentRef;
      return maintenance;
    }
  };
  const supplierRepository = {
    async findById(id) {
      return suppliers.find((supplier) => supplier.id === Number(id)) ?? null;
    },
    async findByIdentification(identification) {
      return suppliers.find((supplier) => supplier.identification === identification) ?? null;
    },
    async create(input) {
      const supplier = { id: suppliers.length + 1, ...input };
      suppliers.push(supplier);
      return supplier;
    }
  };
  const useCases = createMaintenanceSupplierUseCases(
    maintenanceRepository,
    supplierRepository,
    { record: async (entry) => auditEntries.push(entry) }
  );
  return { useCases, suppliers, maintenances, auditEntries };
}

test('registra un proveedor nuevo con contacto y documento del mantenimiento', async () => {
  const { useCases, maintenances, auditEntries } = setup();
  const supplier = await useCases.assign(1, {
    identification: '900123456',
    name: 'Mantenimientos Andinos',
    phone: '3001234567',
    email: 'contacto@andinos.test',
    documentRef: 'orden-123.pdf'
  }, 7);

  assert.equal(supplier.name, 'Mantenimientos Andinos');
  assert.equal(maintenances[0].supplierDocumentRef, 'orden-123.pdf');
  assert.equal(auditEntries[0].entity, 'maintenance_supplier');
});

test('selecciona un proveedor existente', async () => {
  const { useCases, suppliers, maintenances } = setup();
  suppliers.push({ id: 4, identification: '800111222', name: 'Proveedor existente' });
  const supplier = await useCases.assign(1, { supplierId: 4 }, 7);

  assert.equal(supplier.id, 4);
  assert.equal(maintenances[0].supplier.id, 4);
});

test('rechaza un mantenimiento inexistente', async () => {
  const { useCases } = setup();
  await assert.rejects(() => useCases.assign(99, { supplierId: 4 }), {
    statusCode: 404,
    code: 'MAINTENANCE_NOT_FOUND'
  });
});