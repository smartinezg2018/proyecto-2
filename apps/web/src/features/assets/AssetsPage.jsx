import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCcw, Save, X } from 'lucide-react';
import {
  assignAssetProvider,
  changeAssetStatus,
  createAsset,
  getAssetHistory,
  getAssets,
  getBuildings,
  getProviders,
  updateAsset
} from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

const ASSET_STATUS_OPTIONS = [
  { value: 'activo', label: 'Activo' },
  { value: 'en_mantenimiento', label: 'Mantenimiento' },
  { value: 'fuera_de_servicio', label: 'Fuera de servicio' },
  { value: 'retirado', label: 'Retirado' }
];

const ASSET_TYPE_OPTIONS = [
  { value: 'electromecanico', label: 'Electromecánico' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'hidraulico', label: 'Hidráulico' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'accesos', label: 'Accesos' },
  { value: 'emergencias', label: 'Emergencias' },
  { value: 'otro', label: 'Otro' }
];

const ASSET_STATUS_LABELS = Object.fromEntries(
  ASSET_STATUS_OPTIONS.map((option) => [option.value, option.label])
);
const ASSET_TYPE_LABELS = Object.fromEntries(
  ASSET_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const HISTORY_FIELD_LABELS = {
  status: 'Estado',
  name: 'Nombre',
  description: 'Descripción',
  type: 'Tipo',
  location: 'Ubicación',
  acquisitionDate: 'Fecha de adquisición',
  code: 'Código',
  providerId: 'Proveedor'
};

const emptyCreateForm = {
  code: '',
  name: '',
  description: '',
  type: 'electromecanico',
  status: 'activo',
  location: '',
  acquisitionDate: ''
};

const emptyEditForm = {
  name: '',
  description: '',
  type: 'electromecanico',
  location: '',
  acquisitionDate: ''
};

const emptyStatusForm = {
  status: 'en_mantenimiento',
  reason: ''
};

function getChangeTypeLabel(changeType) {
  if (changeType === 'creacion') {
    return 'Registro';
  }
  if (changeType === 'actualizacion') {
    return 'Actualización';
  }
  if (changeType === 'cambio_estado') {
    return 'Cambio de estado';
  }
  return changeType;
}

function formatHistoryValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return 'Sin valor';
  }
  if (field === 'status') {
    return ASSET_STATUS_LABELS[value] || value;
  }
  if (field === 'type') {
    return ASSET_TYPE_LABELS[value] || value;
  }
  return value;
}

export function ModuleInventario() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [statusForm, setStatusForm] = useState(emptyStatusForm);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerMode, setProviderMode] = useState('existing');
  const [providerForm, setProviderForm] = useState({
    providerId: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: ''
  });

  async function loadBuildings() {
    try {
      const response = await getBuildings();
      setBuildings(response.data);
      if (response.data.length > 0) {
        setBuildingId(String(response.data[0].id));
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function loadAssets(selectedBuildingId) {
    if (!selectedBuildingId) {
      setAssets([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getAssets(selectedBuildingId);
      setAssets(response.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadHistory(assetId) {
    const response = await getAssetHistory(assetId);
    setHistory(response.data);
  }

  async function loadProviders() {
    try {
      const response = await getProviders();
      setProviders(response.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  useEffect(() => {
    loadBuildings();
    loadProviders();
  }, []);

  useEffect(() => {
    setSelectedAsset(null);
    setHistory([]);
    loadAssets(buildingId);
  }, [buildingId]);

  function openCreateForm() {
    setCreateForm(emptyCreateForm);
    setIsCreateOpen(true);
    setIsEditOpen(false);
    setIsStatusOpen(false);
    setStatus({ type: '', message: '' });
  }

  async function openAsset(asset) {
    setSelectedAsset(asset);
    setIsCreateOpen(false);
    setStatus({ type: '', message: '' });
    try {
      await loadHistory(asset.id);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function openEditForm(asset) {
    setEditForm({
      name: asset.name,
      description: asset.description || '',
      type: asset.type,
      location: asset.location || '',
      acquisitionDate: asset.acquisitionDate
    });
    setIsEditOpen(true);
    setIsStatusOpen(false);
    setIsCreateOpen(false);
  }

  function openStatusForm(asset) {
    setStatusForm({ status: asset.status, reason: '' });
    setIsStatusOpen(true);
    setIsEditOpen(false);
    setIsCreateOpen(false);
  }

  async function submitCreate(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      await createAsset(buildingId, createForm);
      setStatus({ type: 'success', message: 'Activo registrado correctamente.' });
      setIsCreateOpen(false);
      await loadAssets(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function submitEdit(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      const response = await updateAsset(selectedAsset.id, editForm);
      setSelectedAsset(response.data);
      setStatus({ type: 'success', message: 'Activo actualizado correctamente.' });
      setIsEditOpen(false);
      await loadAssets(buildingId);
      await loadHistory(selectedAsset.id);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function submitProvider(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    const payload =
      providerMode === 'existing'
        ? { providerId: Number(providerForm.providerId) }
        : {
            name: providerForm.name,
            contactName: providerForm.contactName,
            email: providerForm.email,
            phone: providerForm.phone,
            address: providerForm.address
          };

    try {
      const response = await assignAssetProvider(selectedAsset.id, payload);
      setSelectedAsset(response.data);
      setStatus({ type: 'success', message: 'Proveedor asociado al activo.' });
      await loadProviders();
      await loadHistory(selectedAsset.id);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function submitStatus(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      const response = await changeAssetStatus(selectedAsset.id, statusForm);
      setSelectedAsset(response.data);
      setStatus({ type: 'success', message: 'Estado del activo actualizado.' });
      setIsStatusOpen(false);
      await loadAssets(buildingId);
      await loadHistory(selectedAsset.id);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div>
      <SectionHeader
        title="Inventario y activos"
        subtitle="Registro, consulta, actualización e historial de los bienes de cada edificio"
        action={
          <ActionButton onClick={openCreateForm} disabled={!buildingId}>
            <Plus size={14} /> Registrar activo
          </ActionButton>
        }
      />

      <label className="mb-4 block max-w-sm">
        <span className="mb-1 block text-xs font-bold text-slate-500">Edificio</span>
        <select
          value={buildingId}
          onChange={(event) => setBuildingId(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          {buildings.length === 0 && <option value="">No hay edificios registrados</option>}
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

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Código', 'Nombre', 'Tipo', 'Estado', 'Ubicación'].map((heading) => (
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
            {assets.map((asset) => (
              <tr
                key={asset.id}
                onClick={() => openAsset(asset)}
                className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${selectedAsset?.id === asset.id ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                  {asset.code}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{asset.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {ASSET_TYPE_LABELS[asset.type] || asset.type}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge label={ASSET_STATUS_LABELS[asset.status] || asset.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {asset.location || 'Sin ubicación'}
                </td>
              </tr>
            ))}
            {!isLoading && assets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  {buildingId
                    ? 'No hay activos registrados en este edificio.'
                    : 'Registra un edificio antes de crear activos.'}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Cargando activos...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Registrar activo</h3>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitCreate} className="grid gap-4 sm:grid-cols-2">
            {[
              ['code', 'Código'],
              ['name', 'Nombre'],
              ['location', 'Ubicación'],
              ['acquisitionDate', 'Fecha de adquisición']
            ].map(([name, label]) => (
              <label key={name}>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  {label}
                  {name !== 'location' ? ' *' : ''}
                </span>
                <input
                  name={name}
                  type={name === 'acquisitionDate' ? 'date' : 'text'}
                  value={createForm[name]}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, [event.target.name]: event.target.value })
                  }
                  required={name !== 'location'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Tipo *</span>
              <select
                name="type"
                value={createForm.type}
                onChange={(event) => setCreateForm({ ...createForm, type: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {ASSET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Estado *</span>
              <select
                name="status"
                value={createForm.status}
                onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {ASSET_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-500">Descripción</span>
              <textarea
                name="description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm({ ...createForm, description: event.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Guardar activo
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {selectedAsset && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Detalle del activo</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditForm(selectedAsset)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                  title="Actualizar activo"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => openStatusForm(selectedAsset)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                  title="Cambiar estado"
                >
                  <RefreshCcw size={15} />
                </button>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                  title="Cerrar detalle"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <strong>Código:</strong> {selectedAsset.code}
              </p>
              <p>
                <strong>Nombre:</strong> {selectedAsset.name}
              </p>
              <p>
                <strong>Tipo:</strong> {ASSET_TYPE_LABELS[selectedAsset.type] || selectedAsset.type}
              </p>
              <p>
                <strong>Estado:</strong>{' '}
                {ASSET_STATUS_LABELS[selectedAsset.status] || selectedAsset.status}
              </p>
              <p>
                <strong>Ubicación:</strong> {selectedAsset.location || 'Sin ubicación'}
              </p>
              <p>
                <strong>Adquisicion:</strong> {selectedAsset.acquisitionDate}
              </p>
              <p className="sm:col-span-2">
                <strong>Descripción:</strong> {selectedAsset.description || 'Sin descripción'}
              </p>
              <p className="sm:col-span-2">
                <strong>Proveedor:</strong>{' '}
                {selectedAsset.provider
                  ? `${selectedAsset.provider.name} · ${selectedAsset.provider.phone || selectedAsset.provider.email || 'Sin contacto'}`
                  : 'Sin proveedor asociado'}
              </p>
            </div>
            <form
              onSubmit={submitProvider}
              className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
            >
              <h4 className="sm:col-span-2 text-sm font-bold text-slate-800">
                Registrar proveedor del activo
              </h4>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">Modo</span>
                <select
                  value={providerMode}
                  onChange={(event) => setProviderMode(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="existing">Seleccionar existente</option>
                  <option value="new">Registrar nuevo</option>
                </select>
              </label>
              {providerMode === 'existing' ? (
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Proveedor *</span>
                  <select
                    value={providerForm.providerId}
                    onChange={(event) =>
                      setProviderForm({ ...providerForm, providerId: event.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccione un proveedor</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  {[
                    ['name', 'Nombre *'],
                    ['contactName', 'Contacto'],
                    ['email', 'Correo'],
                    ['phone', 'Teléfono']
                  ].map(([name, label]) => (
                    <label key={name}>
                      <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
                      <input
                        value={providerForm[name]}
                        onChange={(event) =>
                          setProviderForm({ ...providerForm, [name]: event.target.value })
                        }
                        required={name === 'name'}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </label>
                  ))}
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-bold text-slate-500">Dirección</span>
                    <input
                      value={providerForm.address}
                      onChange={(event) =>
                        setProviderForm({ ...providerForm, address: event.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </label>
                </>
              )}
              <div className="sm:col-span-2">
                <ActionButton type="submit">
                  <Save size={14} /> Guardar proveedor
                </ActionButton>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-base font-bold text-slate-900">Historial del activo</h3>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400">Aún no hay cambios registrados.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-blue-200 pl-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      {getChangeTypeLabel(entry.changeType)}
                      {entry.field ? ` · ${HISTORY_FIELD_LABELS[entry.field] || entry.field}` : ''}
                    </p>
                    <p className="text-slate-500">
                      {formatHistoryValue(entry.field, entry.oldValue)} →{' '}
                      {formatHistoryValue(entry.field, entry.newValue)}
                    </p>
                    {entry.reason && <p className="text-slate-500">Motivo: {entry.reason}</p>}
                    <p className="text-xs text-slate-400">
                      {new Date(entry.createdAt).toLocaleString()} - Usuario{' '}
                      {entry.createdBy ?? 'no registrado'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {isEditOpen && selectedAsset && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Actualizar activo</h3>
            <button
              onClick={() => setIsEditOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitEdit} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Nombre *</span>
              <input
                name="name"
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Tipo *</span>
              <select
                name="type"
                value={editForm.type}
                onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {ASSET_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Ubicación</span>
              <input
                name="location"
                value={editForm.location}
                onChange={(event) => setEditForm({ ...editForm, location: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">
                Fecha de adquisición *
              </span>
              <input
                name="acquisitionDate"
                type="date"
                value={editForm.acquisitionDate}
                onChange={(event) =>
                  setEditForm({ ...editForm, acquisitionDate: event.target.value })
                }
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-500">Descripción</span>
              <textarea
                name="description"
                value={editForm.description}
                onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Guardar cambios
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {isStatusOpen && selectedAsset && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Cambiar estado del activo</h3>
            <button
              onClick={() => setIsStatusOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitStatus} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Nuevo estado *</span>
              <select
                name="status"
                value={statusForm.status}
                onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {ASSET_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-500">Motivo *</span>
              <textarea
                name="reason"
                value={statusForm.reason}
                onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })}
                required
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Confirmar cambio de estado
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
