async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    },
    credentials: 'include'
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'No fue posible completar la operación.');
  }

  return payload;
}

export function login(credentials) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export function logout() {
  return apiRequest('/api/v1/auth/logout', { method: 'POST' });
}

export function getCurrentUser() {
  return apiRequest('/api/v1/auth/me');
}

export function getMyBuildings() {
  return apiRequest('/api/v1/auth/buildings');
}

export function generateOrdinaryInvoices(buildingId, invoice) {
  return apiRequest(`/api/v1/billing/buildings/${buildingId}/invoices/ordinary`, {
    method: 'POST',
    body: JSON.stringify(invoice)
  });
}

export function generateExtraordinaryCharges(buildingId, charge) {
  return apiRequest(`/api/v1/billing/buildings/${buildingId}/charges/extraordinary`, {
    method: 'POST',
    body: JSON.stringify(charge)
  });
}

export function generateRetroactiveCharges(buildingId, charge) {
  return apiRequest(`/api/v1/billing/buildings/${buildingId}/charges/retroactive`, {
    method: 'POST',
    body: JSON.stringify(charge)
  });
}

export function getPaymentSlip(invoiceId) {
  return fetch(`/api/v1/billing/invoices/${invoiceId}/payment-slip`, {
    credentials: 'include'
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error?.message || 'No fue posible generar la colilla.');
    }
    return response.blob();
  });
}

export function getBuildings() {
  return apiRequest('/api/v1/administration/buildings');
}

export function getBuilding(buildingId) {
  return apiRequest(`/api/v1/administration/buildings/${buildingId}`);
}

export function createBuilding(building) {
  return apiRequest('/api/v1/administration/buildings', {
    method: 'POST',
    body: JSON.stringify(building)
  });
}

export function updateBuilding(buildingId, building) {
  return apiRequest(`/api/v1/administration/buildings/${buildingId}`, {
    method: 'PUT',
    body: JSON.stringify(building)
  });
}

export function getUnits(buildingId) {
  return apiRequest(`/api/v1/administration/buildings/${buildingId}/units`);
}

export function createUnit(buildingId, unit) {
  return apiRequest(`/api/v1/administration/buildings/${buildingId}/units`, {
    method: 'POST',
    body: JSON.stringify(unit)
  });
}

export function createResponsible(person) {
  return apiRequest('/api/v1/administration/persons', {
    method: 'POST',
    body: JSON.stringify(person)
  });
}

export function getAssets(buildingId) {
  return apiRequest(`/api/v1/assets/buildings/${buildingId}/assets`);
}

export function createAsset(buildingId, asset) {
  return apiRequest(`/api/v1/assets/buildings/${buildingId}/assets`, {
    method: 'POST',
    body: JSON.stringify(asset)
  });
}

export function updateAsset(assetId, asset) {
  return apiRequest(`/api/v1/assets/${assetId}`, {
    method: 'PUT',
    body: JSON.stringify(asset)
  });
}

export function changeAssetStatus(assetId, payload) {
  return apiRequest(`/api/v1/assets/${assetId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function getAssetHistory(assetId) {
  return apiRequest(`/api/v1/assets/${assetId}/history`);
}

export function getSuppliers() {
  return apiRequest('/api/v1/assets/suppliers');
}

export function createSupplier(supplier) {
  return apiRequest('/api/v1/assets/suppliers', {
    method: 'POST',
    body: JSON.stringify(supplier)
  });
}

export function getAssetSupplier(assetId) {
  return apiRequest(`/api/v1/assets/${assetId}/supplier`);
}

export function assignAssetSupplier(assetId, payload) {
  return apiRequest(`/api/v1/assets/${assetId}/supplier`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function registerAcquisitionCost(assetId, payload) {
  return apiRequest(`/api/v1/assets/${assetId}/costs/acquisition`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function registerOperatingCost(assetId, payload) {
  return apiRequest(`/api/v1/assets/${assetId}/costs`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getAssetCosts(assetId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return apiRequest(`/api/v1/assets/${assetId}/costs${query ? `?${query}` : ''}`);
}

export function getAcquisitionCost(assetId) {
  return getAssetCosts(assetId, { type: 'adquisicion' }).then((payload) => ({
    data: payload.data[0] || null,
    meta: payload.meta
  }));
}

export function getAssetCostsSummary(assetId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return apiRequest(`/api/v1/assets/${assetId}/costs/summary${query ? `?${query}` : ''}`);
}

export function registerMaintenance(assetId, payload) {
  return apiRequest(`/api/v1/maintenance/assets/${assetId}/maintenances`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getAssetMaintenances(assetId) {
  return apiRequest(`/api/v1/maintenance/assets/${assetId}/maintenances`);
}

export function getBuildingMaintenances(buildingId) {
  return apiRequest(`/api/v1/maintenance/buildings/${buildingId}/maintenances`);
}

export function getMaintenanceAlertSettings(buildingId) {
  return apiRequest(`/api/v1/maintenance/buildings/${buildingId}/alert-settings`);
}

export function saveMaintenanceAlertSettings(buildingId, alertDays) {
  return apiRequest(`/api/v1/maintenance/buildings/${buildingId}/alert-settings`, {
    method: 'PUT',
    body: JSON.stringify({ alertDays })
  });
}

export function getMaintenanceAlerts(buildingId) {
  return apiRequest(`/api/v1/maintenance/buildings/${buildingId}/alerts`);
}

export function attendMaintenanceAlert(alertId) {
  return apiRequest(`/api/v1/maintenance/alerts/${alertId}/attend`, {
    method: 'PATCH'
  });
}

export function updateMaintenanceStatus(maintenanceId, status) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function updateMaintenanceCosts(maintenanceId, costs) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/costs`, {
    method: 'PATCH',
    body: JSON.stringify(costs)
  });
}

export function assignMaintenanceSupplier(maintenanceId, supplier) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/supplier`, {
    method: 'PUT',
    body: JSON.stringify(supplier)
  });
}

export function getMaintenanceStatusHistory(maintenanceId) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/status-history`);
}

export function getMaintenanceQuotes(maintenanceId) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/quotes`);
}

export function createMaintenanceQuote(maintenanceId, quote) {
  return apiRequest(`/api/v1/maintenance/maintenances/${maintenanceId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(quote)
  });
}

export function getInsuranceQuotes(buildingId) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/quotes`);
}

export function getInsurancePolicies(buildingId) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/policies`);
}

export function createInsurancePolicy(buildingId, policy) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/policies`, {
    method: 'POST',
    body: JSON.stringify(policy)
  });
}

export function getInsuranceAlertSettings(buildingId) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/alert-settings`);
}

export function saveInsuranceAlertSettings(buildingId, alertDays) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/alert-settings`, {
    method: 'PUT',
    body: JSON.stringify({ alertDays })
  });
}

export function getInsuranceClaims(buildingId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.policyId) params.set('policyId', filters.policyId);
  if (filters.assetId) params.set('assetId', filters.assetId);
  const query = params.toString();
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/claims${query ? `?${query}` : ''}`);
}

export function createInsuranceClaim(buildingId, claim, files = []) {
  const body = new FormData();
  body.append('payload', JSON.stringify(claim));
  for (const file of files) body.append('documents', file);
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/claims`, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body
  });
}

export function createInsuranceQuote(buildingId, quote) {
  return apiRequest(`/api/v1/insurance/buildings/${buildingId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(quote)
  });
}

export function createUser(user) {
  return apiRequest('/api/v1/administration/users', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

export function createProfile(profile) {
  return apiRequest('/api/v1/administration/profiles', {
    method: 'POST',
    body: JSON.stringify(profile)
  });
}

export function getPermissions(signal) {
  return apiRequest('/api/v1/administration/permissions', { signal });
}

export function listUsers() {
  return apiRequest('/api/v1/administration/users');
}

export function listProfiles() {
  return apiRequest('/api/v1/administration/profiles');
}

export function getUserProfiles(userId) {
  return apiRequest(`/api/v1/administration/users/${userId}/profiles`);
}

export function assignUserProfiles(userId, profileIds) {
  return apiRequest(`/api/v1/administration/users/${userId}/profiles`, {
    method: 'PUT',
    body: JSON.stringify({ profileIds })
  });
}

export function getUserBuildings(userId) {
  return apiRequest(`/api/v1/administration/users/${userId}/buildings`);
}

export function assignUserBuildings(userId, buildingIds) {
  return apiRequest(`/api/v1/administration/users/${userId}/buildings`, {
    method: 'PUT',
    body: JSON.stringify({ buildingIds })
  });
}

export function getBuildingProjects(buildingId, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return apiRequest(
    `/api/v1/projects/buildings/${buildingId}/projects${query ? `?${query}` : ''}`
  );
}

export function registerProject(buildingId, project) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects`, {
    method: 'POST',
    body: JSON.stringify(project)
  });
}

export function getProjectQuotes(buildingId, projectId) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects/${projectId}/quotes`);
}

export function registerProjectQuote(buildingId, projectId, quote) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects/${projectId}/quotes`, {
    method: 'POST',
    body: JSON.stringify(quote)
  });
}

export function selectProjectQuote(buildingId, projectId, selection) {
  return apiRequest(
    `/api/v1/projects/buildings/${buildingId}/projects/${projectId}/quotes/selection`,
    {
      method: 'POST',
      body: JSON.stringify(selection)
    }
  );
}

export function getProjectProgress(buildingId, projectId) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects/${projectId}/progress`);
}

export function registerProjectProgress(buildingId, projectId, progress) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects/${projectId}/progress`, {
    method: 'POST',
    body: JSON.stringify(progress)
  });
}

export function closeProject(buildingId, projectId, closure) {
  return apiRequest(`/api/v1/projects/buildings/${buildingId}/projects/${projectId}/close`, {
    method: 'POST',
    body: JSON.stringify(closure)
  });
}

export function listAuditLogs(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/v1/administration/audit-logs${suffix}`);
}
