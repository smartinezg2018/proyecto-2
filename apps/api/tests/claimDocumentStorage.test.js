import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ClaimDocumentStorage,
  validateDocument
} from '../src/modules/insurance/infrastructure/claimDocumentStorage.js';
import { createInsuranceClaimUseCases } from '../src/modules/insurance/application/insuranceClaimUseCases.js';

test('adjuntos: nombre original nunca controla la ruta; tipos y tamaños restringidos', () => {
  const file = {
    originalname: '../../acta.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF')
  };
  const document = validateDocument(file);
  assert.equal(document.originalName, 'acta.pdf');
  assert.notEqual(document.id, file.originalname);
  assert.throws(() => new ClaimDocumentStorage().filePath('../../secret'), {
    code: 'DOCUMENT_NOT_FOUND'
  });
  for (const changed of [
    { ...file, originalname: 'acta.exe' },
    { ...file, mimetype: 'image/png' },
    { ...file, buffer: Buffer.from('<html>not pdf</html>') }
  ])
    assert.throws(() => validateDocument(changed), { code: 'INVALID_DOCUMENT_TYPE' });
});

test('adjuntos: revierte archivos cuando falla la persistencia', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'claim-documents-test-'));
  const storage = new ClaimDocumentStorage(root);
  const entity = {
    async findById() {
      return { buildingId: 1 };
    }
  };
  const useCases = createInsuranceClaimUseCases(
    {
      async create() {
        throw new Error('database failed');
      }
    },
    entity,
    entity,
    entity,
    () => '2026-10-11',
    storage
  );
  try {
    await assert.rejects(
      () =>
        useCases.create(
          1,
          {
            policyId: 1,
            claimDate: '2026-10-10',
            description: 'test',
            assetIds: [1],
            documentRefs: []
          },
          1,
          [
            {
              originalname: 'acta.pdf',
              mimetype: 'application/pdf',
              buffer: Buffer.from('%PDF-1.4\n%%EOF')
            }
          ]
        ),
      /database failed/
    );
    assert.deepEqual(await readdir(root), []);
  } finally {
    await rmdir(root);
  }
});
