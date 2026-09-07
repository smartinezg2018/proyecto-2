export async function getBuildings() {
  const response = await fetch('/api/v1/administration/buildings', {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('No fue posible consultar los edificios.');
  }

  return response.json();
}
