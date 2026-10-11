import test from 'node:test';
import assert from 'node:assert/strict';
import { createInsuranceQuoteUseCases } from '../src/modules/insurance/application/insuranceQuoteUseCases.js';

function setup() {
  const quotes = [];
  const quoteRepository = {
    async create(input) { const quote = { id: quotes.length + 1, ...input }; quotes.push(quote); return quote; },
    async findByBuilding(id) { return quotes.filter((quote) => quote.buildingId === Number(id)); }
  };
  const buildingRepository = { async findById(id) { return Number(id) === 1 ? { id: 1 } : null; } };
  return { quotes, useCases: createInsuranceQuoteUseCases(quoteRepository, buildingRepository) };
}

test('registra una cotización de seguro con cobertura, prima, vigencia y documento', async () => {
  const { useCases, quotes } = setup();
  const quote = await useCases.create(1, {
    insurer: 'Aseguradora Andina',
    coverage: 'Incendio y daños eléctricos',
    premium: 3200000,
    validFrom: '2026-07-01',
    validUntil: '2027-06-30',
    documentRef: 'seguro-2026.pdf'
  }, 7);

  assert.equal(quote.insurer, 'Aseguradora Andina');
  assert.equal(quote.premium, 3200000);
  assert.equal(quotes.length, 1);
});

test('consulta las cotizaciones del edificio para compararlas', async () => {
  const { useCases, quotes } = setup();
  quotes.push({ id: 1, buildingId: 1, premium: 300 }, { id: 2, buildingId: 1, premium: 200 });
  const list = await useCases.list(1);
  assert.equal(list.length, 2);
});

test('rechaza una vigencia invertida', async () => {
  const { useCases } = setup();
  await assert.rejects(() => useCases.create(1, {
    insurer: 'Aseguradora', coverage: 'General', premium: 1,
    validFrom: '2027-01-01', validUntil: '2026-01-01'
  }), { code: 'VALIDATION_ERROR' });
});