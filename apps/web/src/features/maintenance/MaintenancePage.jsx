import { useEffect, useState } from 'react';
import { Bell, Plus, Save, X } from 'lucide-react';

import {
  getAssets,
  getBuildingMaintenances,
  getMaintenanceAlertSettings,
  getMaintenanceAlerts,
  getMaintenanceStatusHistory,
  getMyBuildings,
  getSuppliers,
  registerMaintenance,
  assignMaintenanceSupplier,
  attendMaintenanceAlert,
  saveMaintenanceAlertSettings,
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

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Sin programar (registro puntual)' },
  { value: 'unica', label: 'Única vez' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' }
];

const FREQUENCY_LABELS = Object.fromEntries(
  FREQUENCY_OPTIONS.filter((option) => option.value).map((option) => [option.value, option.label])
);

function formatDateDisplay(value) {
  if (!value) return '—';
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDateDisplay(value)} ${date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit'
  })}`;
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
    maintenanceDate: '',
    description: '',
    failure: '',
    cause: '',
    actionsTaken: '',
    frequency: '',
    responsible: ''
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
  const [costForm, setCostForm] = useState({ amount: '' });
  const [isCostSaving, setIsCostSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierForm, setSupplierForm] = useState({
    supplierId: '',
    name: '',
    phone: '',
    email: '',
    documentRef: ''
  });
  const [isSupplierSaving, setIsSupplierSaving] = useState(false);
  const [assetFilter, setAssetFilter] = useState('');
  const [alertDays, setAlertDays] = useState('7');
  const [alerts, setAlerts] = useState([]);
  const [isAlertSaving, setIsAlertSaving] = useState(false);

  const canRegister = hasPermission(permissions, 'maintenance.create');
  const canUpdateStatus = hasPermission(permissions, 'maintenance.update');
  const selectedMaintenance =
    maintenances.find((maintenance) => maintenance.id === selectedMaintenanceId) ?? null;
  const registrableAssets = assets.filter((asset) => asset.status !== 'retirado');
  const visibleMaintenances = assetFilter
    ? maintenances.filter((maintenance) => String(maintenance.assetId) === assetFilter)
    : maintenances;
  const pendingAlerts = alerts.filter((alert) => alert.status === 'pendiente');

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
      setAlerts([]);
      return;
    }

    setIsLoading(true);
    setAssetFilter('');
    Promise.all([
      getAssets(buildingId),
      getBuildingMaintenances(buildingId),
      getMaintenanceAlertSettings(buildingId),
      getMaintenanceAlerts(buildingId)
    ])
      .then(([assetsResponse, maintenancesResponse, settingsResponse, alertsResponse]) => {
        setAssets(assetsResponse.data);
        setMaintenances(maintenancesResponse.data);
        setAlertDays(String(settingsResponse.data?.alertDays ?? 7));
        setAlerts(alertsResponse.data ?? []);
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
    const { name, value } = event.target;
    if (name === 'maintenanceType' && value === 'correctivo') {
      setForm({
        ...form,
        maintenanceType: value,
        frequency: '',
        responsible: ''
      });
      return;
    }
    if (name === 'maintenanceType' && value === 'preventivo') {
      setForm({
        ...form,
        maintenanceType: value,
        maintenanceDate: ''
      });
      return;
    }
    setForm({ ...form, [name]: value });
  }

  async function submitForm(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    setIsSaving(true);

    try {
      const payload = {
        maintenanceType: form.maintenanceType,
        maintenanceDate: form.maintenanceDate
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
        if (form.frequency) {
          payload.frequency = form.frequency;
          payload.responsible = form.responsible;
        }
      }

      await registerMaintenance(form.assetId, payload);
      setStatus({
        type: 'success',
        message: form.frequency
          ? 'Mantenimiento preventivo programado correctamente.'
          : 'Mantenimiento registrado correctamente.'
      });
      setIsFormOpen(false);
      await loadMaintenances(buildingId);
      const alertsResponse = await getMaintenanceAlerts(buildingId);
      setAlerts(alertsResponse.data ?? []);
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
      amount: costInputValue(maintenance.actualCost ?? maintenance.estimatedCost)
    });
    setSupplierForm({
      supplierId: maintenance.supplier?.id ? String(maintenance.supplier.id) : '',
      name: maintenance.supplier?.name ?? '',
      phone: maintenance.supplier?.phone ?? '',
      email: maintenance.supplier?.email ?? '',
      documentRef: maintenance.supplierDocumentRef ?? ''
    });
    setStatusHistory([]);
    setStatus({ type: '', message: '' });
    setIsStatusLoading(true);
    loadSuppliers();

    try {
      const response = await getMaintenanceStatusHistory(maintenance.id);
      setStatusHistory(response.data ?? []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      const response = await getSuppliers();
      setSuppliers(response.data ?? []);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function submitSupplier(event) {
    event.preventDefault();
    if (!selectedMaintenance) return;
    setIsSupplierSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = supplierForm.supplierId
        ? { supplierId: supplierForm.supplierId, documentRef: supplierForm.documentRef }
        : {
            name: supplierForm.name,
            phone: supplierForm.phone,
            email: supplierForm.email,
            documentRef: supplierForm.documentRef
          };
      await assignMaintenanceSupplier(selectedMaintenance.id, payload);
      setStatus({ type: 'success', message: 'Proveedor del mantenimiento actualizado.' });
      await loadMaintenances(buildingId);
      const updated = maintenances.find((item) => item.id === selectedMaintenance.id);
      if (updated) openStatus(updated);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSupplierSaving(false);
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
        actualCost: costPayloadValue(costForm.amount)
      });
      setCostForm({
        amount: costInputValue(response.data.actualCost ?? response.data.estimatedCost)
      });
      setStatus({ type: 'success', message: 'Costo del mantenimiento actualizado.' });
      await loadMaintenances(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsCostSaving(false);
    }
  }

  async function saveAlertDays(event) {
    event.preventDefault();
    setIsAlertSaving(true);
    setStatus({ type: '', message: '' });
    try {
      await saveMaintenanceAlertSettings(buildingId, Number(alertDays));
      const alertsResponse = await getMaintenanceAlerts(buildingId);
      setAlerts(alertsResponse.data ?? []);
      setStatus({ type: 'success', message: 'Anticipación de alertas guardada.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsAlertSaving(false);
    }
  }

  async function attendAlert(alertId) {
    setStatus({ type: '', message: '' });
    try {
      await attendMaintenanceAlert(alertId);
      const alertsResponse = await getMaintenanceAlerts(buildingId);
      setAlerts(alertsResponse.data ?? []);
      setStatus({ type: 'success', message: 'Alerta marcada como atendida.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
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
        subtitle="Programación preventiva, historial por activo y alertas de próximas intervenciones"
        action={
          canRegister && (
            <ActionButton onClick={openForm} disabled={!buildingId}>
              <Plus size={14} /> Registrar mantenimiento
            </ActionButton>
          )
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 max-w-3xl">
        <label>
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
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">
            Historial por activo
          </span>
          <select
            value={assetFilter}
            onChange={(event) => setAssetFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="">Todos los activos</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.code} · {asset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status.message && (
        <p
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {status.message}
        </p>
      )}

      {buildingId && (
        <form
          onSubmit={saveAlertDays}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">
              Días de anticipación (0 a 365)
            </span>
            <input
              type="number"
              min="0"
              max="365"
              step="1"
              value={alertDays}
              onChange={(event) => setAlertDays(event.target.value)}
              disabled={!canUpdateStatus || isAlertSaving}
              className={inputClassName}
            />
          </label>
          {canUpdateStatus && (
            <ActionButton type="submit" disabled={isAlertSaving}>
              <Save size={14} /> Guardar anticipación
            </ActionButton>
          )}
          <p className="text-sm text-slate-500">
            Se genera una alerta persistente por cada mantenimiento próximo, preventivo o
            correctivo, sin duplicar la misma fecha.
          </p>
        </form>
      )}

      {pendingAlerts.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Bell size={16} /> Mantenimientos próximos
          </h3>
          <ul className="space-y-2 text-sm text-amber-950">
            {pendingAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2"
              >
                <span>
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {alert.asset?.code}
                  </span>{' '}
                  {alert.asset?.name}
                  {alert.maintenanceType
                    ? ` · ${MAINTENANCE_TYPE_LABELS[alert.maintenanceType] || alert.maintenanceType}`
                    : ''}{' '}
                  · ejecución {formatDateDisplay(alert.targetDate)}
                  {alert.responsible ? ` · ${alert.responsible}` : ''}
                  {alert.frequency ? ` · ${FREQUENCY_LABELS[alert.frequency] || alert.frequency}` : ''}
                  {alert.failure ? ` · ${alert.failure}` : ''}
                </span>
                <span className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const maintenance = maintenances.find(
                        (item) => String(item.id) === String(alert.maintenanceId)
                      );
                      if (maintenance) {
                        openStatus(maintenance);
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Ver detalle
                  </button>
                  {canUpdateStatus && (
                    <button
                      type="button"
                      onClick={() => attendAlert(alert.id)}
                      className="text-xs font-semibold text-amber-800 hover:text-amber-950"
                    >
                      Marcar atendida
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
              {form.maintenanceType === 'preventivo' && (
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">Frecuencia</span>
                  <select
                    name="frequency"
                    value={form.frequency}
                    onChange={updateField}
                    className={inputClassName}
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Fecha de registro
                </span>
                <input
                  type="date"
                  value={todayString()}
                  readOnly
                  className={`${inputClassName} bg-slate-50 text-slate-500`}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Se guarda hoy. No genera la alerta.
                </span>
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Fecha de ejecución *
                </span>
                <input
                  name="maintenanceDate"
                  type="date"
                  value={form.maintenanceDate}
                  onChange={updateField}
                  required
                  className={inputClassName}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Día en que se debe hacer. Puedes elegir una fecha futura. La alerta usa esta
                  fecha.
                </span>
              </label>
              {form.maintenanceType === 'preventivo' && form.frequency && (
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    Responsable o empresa *
                  </span>
                  <input
                    name="responsible"
                    value={form.responsible}
                    onChange={updateField}
                    required
                    placeholder="Persona o empresa a cargo"
                    className={inputClassName}
                  />
                </label>
              )}
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
                  <span className="mb-1 block text-xs font-bold text-slate-500">
                    Descripción *
                  </span>
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
                {selectedMaintenance.asset?.name} · ejecución{' '}
                {formatDateDisplay(selectedMaintenance.maintenanceDate)}
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

          <div className="mb-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p className="rounded-lg bg-slate-50 px-3 py-2">
              <strong>Fecha de registro:</strong> {formatDateTime(selectedMaintenance.createdAt)}
            </p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">
              <strong>Fecha de ejecución:</strong>{' '}
              {formatDateDisplay(selectedMaintenance.maintenanceDate)}
            </p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">
              <strong>Frecuencia:</strong>{' '}
              {FREQUENCY_LABELS[selectedMaintenance.frequency] ||
                selectedMaintenance.frequency ||
                'Sin programar'}
            </p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">
              <strong>Responsable o empresa:</strong>{' '}
              {selectedMaintenance.responsible || 'Sin asignar'}
            </p>
            {selectedMaintenance.nextExecutionDate && (
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                <strong>Próxima ejecución:</strong>{' '}
                {formatDateDisplay(selectedMaintenance.nextExecutionDate)}
              </p>
            )}
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

          <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Cada dato se guarda con su propio botón: proveedor, evidencia y costo a pagar.
          </p>

          <h4 className="mb-1 text-sm font-bold text-blue-800">Proveedor</h4>
          <p className="mb-3 text-sm text-slate-600">
            Puedes registrar todos los proveedores que quieras: quedan guardados en la lista. En
            cada mantenimiento solo eliges cuál va a hacer el trabajo, o registras uno nuevo si
            todavía no existe.
          </p>
          <p className="mb-3 text-sm font-semibold text-slate-800">
            {selectedMaintenance.supplier?.name
              ? `Asignado a este mantenimiento: ${selectedMaintenance.supplier.name}`
              : 'Este mantenimiento todavía no tiene proveedor asignado.'}
            {selectedMaintenance.supplier?.email ? ` · ${selectedMaintenance.supplier.email}` : ''}
          </p>
          {canUpdateStatus && (
            <form onSubmit={submitSupplier} className="mb-5 grid gap-4 sm:grid-cols-3">
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  ¿Ya está en la lista o es nuevo?
                </span>
                <select
                  value={supplierForm.supplierId}
                  onFocus={loadSuppliers}
                  onChange={(event) =>
                    setSupplierForm({ ...supplierForm, supplierId: event.target.value })
                  }
                  className={inputClassName}
                >
                  <option value="">Registrar uno nuevo</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              {!supplierForm.supplierId && (
                <>
                  <input
                    required
                    placeholder="Nombre *"
                    value={supplierForm.name}
                    onChange={(event) =>
                      setSupplierForm({ ...supplierForm, name: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <input
                    placeholder="Teléfono"
                    value={supplierForm.phone}
                    onChange={(event) =>
                      setSupplierForm({ ...supplierForm, phone: event.target.value })
                    }
                    className={inputClassName}
                  />
                  <input
                    type="email"
                    placeholder="Correo"
                    value={supplierForm.email}
                    onChange={(event) =>
                      setSupplierForm({ ...supplierForm, email: event.target.value })
                    }
                    className={inputClassName}
                  />
                </>
              )}
              <input
                placeholder="Evidencia o documento (opcional)"
                value={supplierForm.documentRef}
                onChange={(event) =>
                  setSupplierForm({ ...supplierForm, documentRef: event.target.value })
                }
                className={inputClassName}
              />
              <div className="flex items-end">
                <ActionButton type="submit" disabled={isSupplierSaving}>
                  <Save size={14} /> Guardar proveedor
                </ActionButton>
              </div>
            </form>
          )}

          <h4 className="mb-2 text-sm font-bold text-orange-700">Costo a pagar</h4>
          {canUpdateStatus ? (
            <form onSubmit={submitCosts} className="mb-5 grid gap-4 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Costo (COP)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costForm.amount}
                  onChange={(event) => setCostForm({ amount: event.target.value })}
                  placeholder="Valor a pagar"
                  className={inputClassName}
                />
              </label>
              <div className="flex items-end">
                <ActionButton type="submit" disabled={isCostSaving}>
                  <Save size={14} /> Guardar costo
                </ActionButton>
              </div>
            </form>
          ) : (
            <p className="mb-5 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {formatCurrency(selectedMaintenance.actualCost ?? selectedMaintenance.estimatedCost)}
            </p>
          )}

          <h4 className="mb-2 text-sm font-bold text-slate-800">Historial de cambios</h4>
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
            <tr className="bg-blue-600">
              {['Fecha de ejecución', 'Activo', 'Tipo', 'Programación', 'Estado', 'Costo', 'Descripción'].map(
                (heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-white"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading &&
              visibleMaintenances.map((maintenance) => (
                <tr
                  key={maintenance.id}
                  className={`border-b border-slate-50 align-top ${selectedMaintenanceId === maintenance.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {formatDateDisplay(maintenance.maintenanceDate)}
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
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>
                      {FREQUENCY_LABELS[maintenance.frequency] ||
                        maintenance.frequency ||
                        'Puntual'}
                    </div>
                    {maintenance.responsible && <div>{maintenance.responsible}</div>}
                    {maintenance.nextExecutionDate && (
                      <div>Próxima: {formatDateDisplay(maintenance.nextExecutionDate)}</div>
                    )}
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
                        className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {formatCurrency(maintenance.actualCost ?? maintenance.estimatedCost)}
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
            {!isLoading && visibleMaintenances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  {buildingId
                    ? assetFilter
                      ? 'Este activo no tiene mantenimientos registrados.'
                      : 'No hay mantenimientos registrados en este edificio.'
                    : 'Selecciona un edificio para consultar sus mantenimientos.'}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
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
