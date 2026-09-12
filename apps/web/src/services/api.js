async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include'
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'No fue posible completar la operación.');
  }

  return payload;
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
