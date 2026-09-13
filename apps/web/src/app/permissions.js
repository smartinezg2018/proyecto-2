export function hasPermission(permissions = [], code) {
  if (!code) return true;
  return permissions.includes('admin.all') || permissions.includes(code);
}

export function hasAnyPermission(permissions = [], codes = []) {
  if (!codes.length) return true;
  return codes.some((code) => hasPermission(permissions, code));
}
