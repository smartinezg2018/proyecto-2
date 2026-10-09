import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

import {
  getAssets,
  getBuildingMaintenances,
  getMyBuildings,
  registerMaintenance
} from '../../services/api.js';
import { hasPermission } from '../../app/permissions.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';

const MAINTENANCE_TYPE_OPTIONS = [
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'correctivo', label: 'Correctivo' }
];

const MAINTENANCE_TYPE_LABELS = Object.fromEntries(
  MAINTENANCE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function createEmptyForm() {
  return {
    assetId: '',
    maintenanceType: 'preventivo',
    maintenanceDate: todayString(),
    description: ''
  };
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500';

export function ModuleMantenimientos({ permissions = [], activeBuildingId = null }) {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(activeBuildingId ? String(activeBuildingId) : '');
  const [assets, setAssets] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const canRegister = hasPermission(permissions, 'maintenance.create');
  const registrableAssets = assets.filter((asset) => asset.status !== 'retirado');

  useEffect(() => {
    getMyBuildings()
      .then((response) => {
        const list = response.data ?? [];
        setBuildings(list);
        setBuildingId((current) => {
          if (current && list.some((building) => String(building.id) === current)) return current;
          return list[0] ? String(list[0].id) : '';
        });
      })
      .catch((error) => setStatus({ type: 'error', message: error.message }));
  }, []);

  async function loadMaintenances(selectedBuildingId) {
    const response = await getBuildingMaintenances(selectedBuildingId);
    setMaintenances(response.data);
  }

  useEffect(() => {
    setIsFormOpen(false);
    if (!buildingId) {
      setAssets([]);
      setMaintenances([]);
      return;
    }

    setIsLoading(true);
    Promise.all([getAssets(buildingId), getBuildingMaintenances(buildingId)])
      .then(([assetsResponse, maintenancesResponse]) => {
        setAssets(assetsResponse.data);
        setMaintenances(maintenancesResponse.data);
      })
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setIsLoading(false));
  }, [buildingId]);

  function openForm() {
    setForm({
      ...createEmptyForm(),
      assetId: registrableAssets[0] ? String(registrableAssets[0].id) : ''
    });
    setIsFormOpen(true);
    setStatus({ type: '', message: '' });
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSaving(true);

    try {
      await registerMaintenance(form.assetId, {
        maintenanceType: form.maintenanceType,
        maintenanceDate: form.maintenanceDate,
        description: form.description
      });
      setStatus({ type: 'success', message: 'Mantenimiento registrado correctamente.' });
      setIsFormOpen(false);
      await loadMaintenances(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Mantenimientos"
        subtitle="Registro e historial de las intervenciones realizadas sobre los activos"
        action={
          canRegister && (
            <ActionButton onClick={openForm} disabled={!buildingId}>
              <Plus size={14} /> Registrar mantenimiento
            </ActionButton>
          )
        }
      />

      <label className="mb-4 block max-w-sm">
        <span className="mb-1 block text-xs font-bold text-slate-500">Edificio</span>
        <select
          value={buildingId}
          onChange={(event) => setBuildingId(event.target.value)}
          className={inputClassName}
        >
          {buildings.length === 0 && <option value="">No tienes edificios asignados</option>}
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </label>

      {status.message && (
        <p
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {status.message}
        </p>
      )}

      {isFormOpen && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Registrar mantenimiento</h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          {registrableAssets.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay activos disponibles para registrar mantenimientos en este edificio.
            </p>
          ) : (
            <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Activo *</span>
                <select
                  name="assetId"
                  value={form.assetId}
                  onChange={updateField}
                  required
                  className={inputClassName}
                >
                  {registrableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.code} · {asset.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Tipo *</span>
                <select
                  name="maintenanceType"
                  value={form.maintenanceType}
                  onChange={updateField}
                  className={inputClassName}
                >
                  {MAINTENANCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Fecha *</span>
                <input
                  name="maintenanceDate"
                  type="date"
                  value={form.maintenanceDate}
                  max={todayString()}
                  onChange={updateField}
                  required
                  className={inputClassName}
                />
              </label>
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-bold text-slate-500">Descripción *</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  required
                  rows={3}
                  className={inputClassName}
                />
              </label>
              <div className="sm:col-span-3">
                <ActionButton type="submit" disabled={isSaving}>
                  <Save size={14} /> Guardar mantenimiento
                </ActionButton>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Fecha', 'Activo', 'Tipo', 'Descripción'].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              maintenances.map((maintenance) => (
                <tr key={maintenance.id} className="border-b border-slate-50 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {maintenance.maintenanceDate}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {maintenance.asset?.code}
                    </span>{' '}
                    <span className="font-semibold text-slate-800">{maintenance.asset?.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={
                        MAINTENANCE_TYPE_LABELS[maintenance.maintenanceType] ||
                        maintenance.maintenanceType
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-pre-line">
                    {maintenance.description}
                  </td>
                </tr>
              ))}
            {!isLoading && maintenances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  {buildingId
                    ? 'No hay mantenimientos registrados en este edificio.'
                    : 'Selecciona un edificio para consultar sus mantenimientos.'}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Cargando mantenimientos...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
