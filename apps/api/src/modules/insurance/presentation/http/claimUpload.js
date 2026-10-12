import multer from 'multer';
import { AppError } from '../../../../shared/errors/AppError.js';
import { MAX_DOCUMENT_BYTES, MAX_DOCUMENTS } from '../../infrastructure/claimDocumentStorage.js';

const parse = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_BYTES,
    files: MAX_DOCUMENTS,
    fields: 1,
    fieldSize: 32768,
    parts: 7
  }
}).array('documents', MAX_DOCUMENTS);
let activeUploads = 0;

// Only called after authentication and building authorization. Cap retained buffers per process.
export function claimUpload(request, response, next) {
  if (!request.is('multipart/form-data')) return next();
  // A cross-site HTML form cannot set this header; cross-origin JS must pass CORS preflight.
  if (
    request.get('X-Requested-With') !== 'XMLHttpRequest' ||
    request.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    return next(new AppError('Origen de carga no permitido.', 403, 'UPLOAD_ORIGIN_FORBIDDEN'));
  }
  if (activeUploads >= 2)
    return next(new AppError('Hay cargas en curso. Intenta de nuevo.', 429, 'UPLOAD_BUSY'));
  activeUploads += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeUploads -= 1;
    request.files = undefined;
  };
  response.once('finish', release);
  response.once('close', release);
  parse(request, response, (error) => {
    if (error)
      return next(
        new AppError(
          'Carga inválida. Máximo 5 archivos de 5 MB cada uno.',
          error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
          'INVALID_UPLOAD'
        )
      );
    try {
      request.body = JSON.parse(request.body.payload);
      next();
    } catch {
      next(new AppError('Datos de reclamación inválidos.', 400, 'VALIDATION_ERROR'));
    }
  });
}
