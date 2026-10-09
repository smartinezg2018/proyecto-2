import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

import {
  getAssets,
  getBuildingMaintenances,
  getMaintenanceStatusHistory,
  getMyBuildings,
  registerMaintenance,
  updateMaintenanceCosts,
  updateMaintenanceStatus
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

const MAINTENANCE_STATUS_OPTIONS = [
  { value: 'programado', label: 'Programado' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' }
];

const MAINTENANCE_STATUS_LABELS = Object.fromEntries(
  MAINTENANCE_STATUS_OPTIONS.map((option) => [option.value, option.label])
);

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCurrency(value) {
  if (value === null || value === undefined) return 'Sin registrar';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2
  }).format(Number(value));
}

function costInputValue(value) {
  return value === null || value === undefined ? '' : String(value);
}

function costPayloadValue(value) {
  return value.trim() === '' ? null : value.trim();
}

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
    description: '',
    failure: '',
    cause: '',
    actionsTaken: '',
    estimatedCost: '',
    actualCost: ''
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
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [nextStatus, setNextStatus] = useState('');
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [costForm, setCostForm] = useState({ estimatedCost: '', actualCost: '' });
  const [isCostSaving, setIsCostSaving] = useState(false);

  const canRegister = hasPermission(permissions, 'maintenance.create');
  const canUpdateStatus = hasPermission(permissions, 'maintenance.update');
  const selectedMaintenance =
    maintenances.find((maintenance) => maintenance.id === selectedMaintenanceId) ?? null;
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
    setSelectedMaintenanceId(null);
    setStatusHistory([]);
    setNextStatus('');
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
      const payload = {
        maintenanceType: form.maintenanceType,
        maintenanceDate: form.maintenanceDate,
        estimatedCost: costPayloadValue(form.estimatedCost),
        actualCost: costPayloadValue(form.actualCost)
      };

      if (form.maintenanceType === 'correctivo') {
        payload.failure = form.failure;
        payload.cause = form.cause;
        payload.actionsTaken = form.actionsTaken;
        if (form.description.trim() !== '') {
          payload.description = form.description;
        }
      } else {
        payload.description = form.description;
      }

      await registerMaintenance(form.assetId, payload);
      setStatus({ type: 'success', message: 'Mantenimiento registrado correctamente.' });
      setIsFormOpen(false);
      await loadMaintenances(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function openStatus(maintenance) {
    setSelectedMaintenanceId(maintenance.id);
    setNextStatus(maintenance.nextStatuses?.[0] ?? '');
    setCostForm({
      estimatedCost: costInputValue(maintenance.estimatedCost),
      actualCost: costInputValue(maintenance.actualCost)
    });
    setStatusHistory([]);
    setStatus({ type: '', message: '' });
    setIsStatusLoading(true);

    try {
      const response = await getMaintenanceStatusHistory(maintenance.id);
      setStatusHistory(response.data ?? []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function submitStatus(event) {
    event.preventDefault();
    if (!selectedMaintenance || !nextStatus) return;

    setStatus({ type: '', message: '' });
    setIsStatusSaving(true);

    try {
      const response = await updateMaintenanceStatus(selectedMaintenance.id, nextStatus);
      setStatus({ type: 'success', message: 'Estado del mantenimiento actualizado.' });
      setNextStatus(response.data.nextStatuses?.[0] ?? '');
      await loadMaintenances(buildingId);
      const historyResponse = await getMaintenanceStatusHistory(selectedMaintenance.id);
      setStatusHistory(historyResponse.data ?? []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsStatusSaving(false);
    }
  }

  async function submitCosts(event) {
    event.preventDefault();
    if (!selectedMaintenance) return;

    setStatus({ type: '', message: '' });
    setIsCostSaving(true);

    try {
      const response = await updateMaintenanceCosts(selectedMaintenance.id, {
        estimatedCost: costPayloadValue(costForm.estimatedCost),
        actualCost: costPayloadValue(costForm.actualCost)
      });
      setCostForm({
        estimatedCost: costInputValue(response.data.estimatedCost),
        actualCost: costInputValue(response.data.actualCost)
      });
      setStatus({ type: 'success', message: 'Costos del mantenimiento actualizados.' });
      await loadMaintenances(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsCostSaving(false);
    }
  }

  const nextStatusOptions = (selectedMaintenance?.nextStatuses ?? []).map((value) => ({
    value,
    label: MAINTENANCE_STATUS_LABELS[value] || value
  }));

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
              {form.maintenanceType === 'correctivo' ? (
                <>
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs font-bold text-slate-500">Falla *</span>
                    <textarea
                      name="failure"
                      value={form.failure}
                      onChange={updateField}
                      required
                      rows={2}
                      placeholder="Describe la falla reportada"
                      className={inputClassName}
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs font-bold text-slate-500">Causa *</span>
                    <textarea
                      name="cause"
                      value={form.cause}
                      onChange={updateField}
                      required
                      rows={2}
                      placeholder="Explica la causa identificada"
                      className={inputClassName}
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      Acciones ejecutadas *
                    </span>
                    <textarea
                      name="actionsTaken"
                      value={form.actionsTaken}
                      onChange={updateField}
                      required
                      rows={2}
                      placeholder="Describe las reparaciones realizadas"
                      className={inputClassName}
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      Notas adicionales
                    </span>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={updateField}
                      rows={2}
                      placeholder="Opcional"
                      className={inputClassName}
                    />
                  </label>
                </>
              ) : (
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
              )}
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Costo estimado (COP)
                </span>
                <input
                  name="estimatedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedCost}
                  onChange={updateField}
                  placeholder="Opcional"
                  className={inputClassName}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Costo real (COP)
                </span>
                <input
                  name="actualCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actualCost}
                  onChange={updateField}
                  placeholder="Opcional"
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

      {selectedMaintenance && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Detalle del mantenimiento</h3>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-mono text-xs font-bold text-blue-600">
                  {selectedMaintenance.asset?.code}
                </span>{' '}
                {selectedMaintenance.asset?.name} · {selectedMaintenance.maintenanceDate}
              </p>
            </div>
            <button
              onClick={() => setSelectedMaintenanceId(null)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Estado actual</span>
            <StatusBadge
              label={
                MAINTENANCE_STATUS_LABELS[selectedMaintenance.status] || selectedMaintenance.status
              }
            />
          </div>

          {canUpdateStatus && nextStatusOptions.length > 0 && (
            <form onSubmit={submitStatus} className="mb-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Nuevo estado *</span>
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value)}
                  className={inputClassName}
                >
                  {nextStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <ActionButton type="submit" disabled={isStatusSaving || !nextStatus}>
                  <Save size={14} /> Confirmar cambio de estado
                </ActionButton>
              </div>
            </form>
          )}

          {canUpdateStatus && nextStatusOptions.length === 0 && (
            <p className="mb-5 text-sm text-slate-500">
              Este mantenimiento no admite más cambios de estado.
            </p>
          )}

          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Costos de la intervención
          </h4>
          {canUpdateStatus ? (
            <form onSubmit={submitCosts} className="mb-5 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Costo estimado (COP)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costForm.estimatedCost}
                  onChange={(event) =>
                    setCostForm({ ...costForm, estimatedCost: event.target.value })
                  }
                  placeholder="Sin registrar"
                  className={inputClassName}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Costo real (COP)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costForm.actualCost}
                  onChange={(event) => setCostForm({ ...costForm, actualCost: event.target.value })}
                  placeholder="Sin registrar"
                  className={inputClassName}
                />
              </label>
              <div className="flex items-end">
                <ActionButton type="submit" disabled={isCostSaving}>
                  <Save size={14} /> Guardar costos
                </ActionButton>
              </div>
            </form>
          ) : (
            <div className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                <strong>Estimado:</strong> {formatCurrency(selectedMaintenance.estimatedCost)}
              </p>
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                <strong>Real:</strong> {formatCurrency(selectedMaintenance.actualCost)}
              </p>
            </div>
          )}

          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Historial de cambios
          </h4>
          {isStatusLoading ? (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          ) : statusHistory.length === 0 ? (
            <p className="text-sm text-slate-400">No hay cambios de estado registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {statusHistory.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                  <span className="font-semibold text-slate-800">
                    {entry.fromStatus
                      ? `${MAINTENANCE_STATUS_LABELS[entry.fromStatus] || entry.fromStatus} → ${MAINTENANCE_STATUS_LABELS[entry.toStatus] || entry.toStatus}`
                      : `Estado inicial: ${MAINTENANCE_STATUS_LABELS[entry.toStatus] || entry.toStatus}`}
                  </span>
                  <span className="text-slate-500">{formatDateTime(entry.changedAt)}</span>
                  <span className="text-slate-500">
                    {entry.changedByName ||
                      (entry.changedBy ? `Usuario ${entry.changedBy}` : 'Usuario no identificado')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Fecha', 'Activo', 'Tipo', 'Estado', 'Costos', 'Descripción'].map((heading) => (
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
                <tr
                  key={maintenance.id}
                  className={`border-b border-slate-50 align-top ${selectedMaintenanceId === maintenance.id ? 'bg-blue-50' : ''}`}
                >
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
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <StatusBadge
                        label={
                          MAINTENANCE_STATUS_LABELS[maintenance.status] ||
                          maintenance.status ||
                          'Programado'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => openStatus(maintenance)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {canUpdateStatus ? 'Estado y costos' : 'Ver detalle'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    <div>
                      <span className="font-semibold text-slate-700">Est.:</span>{' '}
                      {formatCurrency(maintenance.estimatedCost)}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Real:</span>{' '}
                      {formatCurrency(maintenance.actualCost)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-pre-line">
                    {maintenance.maintenanceType === 'correctivo' &&
                    (maintenance.failure || maintenance.cause || maintenance.actionsTaken) ? (
                      <div className="space-y-1">
                        {maintenance.failure && (
                          <div>
                            <span className="font-semibold text-slate-700">Falla:</span>{' '}
                            {maintenance.failure}
                          </div>
                        )}
                        {maintenance.cause && (
                          <div>
                            <span className="font-semibold text-slate-700">Causa:</span>{' '}
                            {maintenance.cause}
                          </div>
                        )}
                        {maintenance.actionsTaken && (
                          <div>
                            <span className="font-semibold text-slate-700">Acciones:</span>{' '}
                            {maintenance.actionsTaken}
                          </div>
                        )}
                      </div>
                    ) : (
                      maintenance.description
                    )}
                  </td>
                </tr>
              ))}
            {!isLoading && maintenances.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  {buildingId
                    ? 'No hay mantenimientos registrados en este edificio.'
                    : 'Selecciona un edificio para consultar sus mantenimientos.'}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
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
