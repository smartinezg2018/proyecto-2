import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../../../shared/errors/AppError.js';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;
const defaultRoot = fileURLToPath(new URL('../../../../storage/claim-documents/', import.meta.url));
const types = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

export function validateDocument(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const buffer = file.buffer;
  const signature = buffer.subarray(0, 8);
  const detected =
    signature.subarray(0, 5).toString() === '%PDF-'
      ? 'application/pdf'
      : signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : signature.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          ? 'image/jpeg'
          : null;
  if (!buffer.length || buffer.length > MAX_DOCUMENT_BYTES) {
    throw new AppError(
      'Cada archivo debe tener entre 1 byte y 5 MB.',
      413,
      'INVALID_DOCUMENT_SIZE'
    );
  }
  if (!detected || types[extension] !== detected || file.mimetype !== detected) {
    throw new AppError(
      'Solo se permiten PDF, PNG y JPEG con contenido y extensión coincidentes.',
      400,
      'INVALID_DOCUMENT_TYPE'
    );
  }
  // Original names are labels only; never use a client filename as a storage path.
  const originalName =
    path
      .basename(file.originalname.replaceAll('\\', '/'))
      .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
      .slice(0, 150) || 'documento';
  return { id: randomUUID(), originalName, mimeType: detected, sizeBytes: buffer.length };
}

export class ClaimDocumentStorage {
  constructor(root = defaultRoot) {
    this.root = path.resolve(root);
  }

  filePath(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new AppError('Documento no encontrado.', 404, 'DOCUMENT_NOT_FOUND');
    }
    return path.join(this.root, id);
  }

  async save(files) {
    if (files.length > MAX_DOCUMENTS)
      throw new AppError('Máximo 5 archivos.', 400, 'TOO_MANY_DOCUMENTS');
    const documents = files.map(validateDocument);
    const written = [];
    try {
      if (documents.length) await mkdir(this.root, { recursive: true, mode: 0o700 });
      for (let index = 0; index < documents.length; index += 1) {
        await writeFile(this.filePath(documents[index].id), files[index].buffer, {
          flag: 'wx',
          mode: 0o600
        });
        written.push(documents[index]);
      }
      return documents;
    } catch (error) {
      await this.remove(written);
      throw error;
    }
  }

  async remove(documents) {
    for (const document of documents) {
      await unlink(this.filePath(document.id)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}
