import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditUseCases } from '../src/modules/administration/application/auditUseCases.js';

function createRepository() {
  const calls = [];
  return {
    calls,
    async find(filters) {
      calls.push(filters);
      return { items: [{ id: 1, action: 'create' }], total: 1 };
    }
  };
}

test('list aplica filtros por defecto y devuelve paginación', async () => {
  const repository = createRepository();
  const useCases = createAuditUseCases(repository);
  const result = await useCases.list({});
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
  assert.equal(result.total, 1);
  assert.deepEqual(repository.calls[0].userId, null);
});

test('list valida enteros y rango de fechas', async () => {
  const useCases = createAuditUseCases(createRepository());
  await assert.rejects(() => useCases.list({ userId: 'abc' }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(() => useCases.list({ page: 0 }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(() => useCases.list({ from: 'not-a-date' }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(
    () => useCases.list({ from: '2026-02-01T00:00:00Z', to: '2026-01-01T00:00:00Z' }),
    { code: 'VALIDATION_ERROR' }
  );
});

test('list limita pageSize al máximo permitido', async () => {
  const repository = createRepository();
  const useCases = createAuditUseCases(repository);
  const result = await useCases.list({ pageSize: 10000 });
  assert.equal(result.pageSize, 100);
});
