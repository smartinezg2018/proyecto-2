export function requirePermission(code) {
  return requireAnyPermission(code);
}

export function requireAnyPermission(...codes) {
  return function requirePermissionMiddleware(request, response, next) {
    const permissions = request.user?.permissions ?? [];
    if (
      permissions.includes('admin.all') ||
      codes.some((code) => permissions.includes(code))
    ) {
      next();
      return;
    }
    response.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'No cuenta con permisos para esta operación.',
        requestId: request.id
      }
    });
  };
}
