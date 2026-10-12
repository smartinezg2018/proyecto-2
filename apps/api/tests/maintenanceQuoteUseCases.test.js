import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceQuoteUseCases } from '../src/modules/maintenance/application/maintenanceQuoteUseCases.js';

function setup() {
  const quotes = [];
  const quoteRepository = {
    async create(input) {
      const quote = { id: quotes.length + 1, ...input };
      quotes.push(quote);
      return quote;
    },
    async findByMaintenance(id) {
      return quotes.filter((quote) => quote.maintenanceId === Number(id));
    }
  };
  const maintenanceRepository = {
    async findById(id) {
      return Number(id) === 1 ? { id: 1 } : null;
    }
  };
  const supplierRepository = {
    async findById(id) {
      return Number(id) === 2 ? { id: 2 } : null;
    }
  };
  return {
    quotes,
    useCases: createMaintenanceQuoteUseCases(
      quoteRepository,
      maintenanceRepository,
      supplierRepository
    )
  };
}

test('registra una cotización de mantenimiento con alcance y condiciones', async () => {
  const { useCases, quotes } = setup();
  const quote = await useCases.create(
    1,
    {
      supplierId: 2,
      amount: 1500000,
      validUntil: '2026-12-31',
      documentRef: 'cotizacion.pdf',
      scope: 'Cambio de sello y pruebas',
      conditions: 'Pago 50% anticipo'
    },
    7
  );

  assert.equal(quote.amount, 1500000);
  assert.equal(quote.scope, 'Cambio de sello y pruebas');
  assert.equal(quotes.length, 1);
});

test('lista cotizaciones para comparar', async () => {
  const { useCases, quotes } = setup();
  quotes.push({ id: 1, maintenanceId: 1, amount: 200 }, { id: 2, maintenanceId: 1, amount: 100 });
  const list = await useCases.list(1);
  assert.equal(list.length, 2);
});

test('rechaza proveedor inexistente', async () => {
  const { useCases } = setup();
  await assert.rejects(
    () =>
      useCases.create(1, {
        supplierId: 9,
        amount: 1,
        validUntil: '2026-12-31',
        scope: 'x',
        conditions: 'y'
      }),
    { code: 'SUPPLIER_NOT_FOUND' }
  );
});
