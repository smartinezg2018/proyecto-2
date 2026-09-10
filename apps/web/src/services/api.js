export async function getBuildings() {
  const response = await fetch('/api/v1/administration/buildings', {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('No fue posible consultar los edificios.');
  }

  return response.json();
}

async function buildingRequest(url, options = {}) {
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

export function getBuilding(buildingId) {
  return buildingRequest(`/api/v1/administration/buildings/${buildingId}`);
}

export function createBuilding(building) {
  return buildingRequest('/api/v1/administration/buildings', {
    method: 'POST',
    body: JSON.stringify(building)
  });
}

export function updateBuilding(buildingId, building) {
  return buildingRequest(`/api/v1/administration/buildings/${buildingId}`, {
    method: 'PUT',
    body: JSON.stringify(building)
  });
}
