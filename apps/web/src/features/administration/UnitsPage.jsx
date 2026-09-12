import { useEffect, useState } from 'react';
import { Plus, Save, UserPlus, X } from 'lucide-react';
import { createResponsible, createUnit, getBuildings, getUnits } from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

const PROPERTY_KIND_OPTIONS = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'parqueadero', label: 'Parqueadero' }
];

const PROPERTY_KIND_LABELS = {
  apartamento: 'Apartamento',
  parqueadero: 'Parqueadero'
};

const UNIT_STATUS_OPTIONS = [
  { value: 'ocupada', label: 'Ocupada' },
  { value: 'desocupada', label: 'Desocupada' },
  { value: 'inhabitada', label: 'Inhabitada' }
];

const UNIT_STATUS_LABELS = {
  ocupada: 'Ocupada',
  desocupada: 'Desocupada',
  inhabitada: 'Inhabitada'
};

const emptyUnitForm = {
  kind: 'apartamento',
  number: '',
  tower: '',
  coefficient: '',
  status: 'desocupada'
};

const emptyResponsibleForm = {
  identification: '',
  name: '',
  phone: '',
  email: '',
  unitIds: []
};

export function UnitsPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [units, setUnits] = useState([]);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [responsibleForm, setResponsibleForm] = useState(emptyResponsibleForm);
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [isResponsibleFormOpen, setIsResponsibleFormOpen] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

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

  async function loadUnits(selectedBuildingId) {
    if (!selectedBuildingId) {
      setUnits([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getUnits(selectedBuildingId);
      setUnits(response.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    loadUnits(buildingId);
  }, [buildingId]);

  function openUnitForm() {
    setUnitForm(emptyUnitForm);
    setStatus({ type: '', message: '' });
    setIsUnitFormOpen(true);
  }

  function openResponsibleForm() {
    setResponsibleForm(emptyResponsibleForm);
    setStatus({ type: '', message: '' });
    setIsResponsibleFormOpen(true);
  }

  function updateUnitField(event) {
    setUnitForm({ ...unitForm, [event.target.name]: event.target.value });
  }

  function updateResponsibleField(event) {
    setResponsibleForm({ ...responsibleForm, [event.target.name]: event.target.value });
  }

  function toggleResponsibleUnit(unitId) {
    const selected = responsibleForm.unitIds.includes(unitId)
      ? responsibleForm.unitIds.filter((id) => id !== unitId)
      : [...responsibleForm.unitIds, unitId];
    setResponsibleForm({ ...responsibleForm, unitIds: selected });
  }

  async function submitUnit(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      await createUnit(buildingId, {
        ...unitForm,
        coefficient: Number(unitForm.coefficient)
      });
      setStatus({ type: 'success', message: 'Inmueble registrado correctamente.' });
      setIsUnitFormOpen(false);
      await loadUnits(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function submitResponsible(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    if (responsibleForm.unitIds.length === 0) {
      setStatus({
        type: 'error',
        message: 'Primero guarda el inmueble y luego márcalo en Inmuebles asociados.'
      });
      return;
    }

    try {
      await createResponsible({
        ...responsibleForm,
        unitIds: responsibleForm.unitIds
      });
      setStatus({ type: 'success', message: 'Responsable registrado y asociado a los inmuebles.' });
      setIsResponsibleFormOpen(false);
      await loadUnits(buildingId);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div>
      <SectionHeader
        title="Inmuebles"
        subtitle="Registra apartamentos o parqueaderos y sus responsables de cobro, sin crearles acceso al sistema"
        action={
          <div className="flex gap-2">
            <ActionButton variant="secondary" onClick={openResponsibleForm} disabled={!buildingId}>
              <UserPlus size={14} /> Registrar responsable
            </ActionButton>
            <ActionButton onClick={openUnitForm} disabled={!buildingId}>
              <Plus size={14} /> Registrar inmueble
            </ActionButton>
          </div>
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
              {['Tipo', 'Número', 'Torre o bloque', 'Coeficiente', 'Estado', 'Responsable'].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">
                  {PROPERTY_KIND_LABELS[unit.kind] || unit.kind}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                  {unit.number}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{unit.tower || 'Sin torre'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{unit.coefficient}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={UNIT_STATUS_LABELS[unit.status] || unit.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {unit.responsible
                    ? `${unit.responsible.name} · ${unit.responsible.identification}`
                    : 'Sin responsable'}
                </td>
              </tr>
            ))}
            {!isLoading && units.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  {buildingId
                    ? 'No hay inmuebles registrados en este edificio.'
                    : 'Registra un edificio antes de crear inmuebles.'}
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  Cargando inmuebles...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isUnitFormOpen && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Registrar inmueble</h3>
            <button
              onClick={() => setIsUnitFormOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          {status.message && (
            <p
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
            >
              {status.message}
            </p>
          )}
          <form onSubmit={submitUnit} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Tipo *</span>
              <select
                name="kind"
                value={unitForm.kind}
                onChange={updateUnitField}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {PROPERTY_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Número *</span>
              <input
                name="number"
                value={unitForm.number}
                onChange={updateUnitField}
                required
                placeholder={unitForm.kind === 'parqueadero' ? 'PQ15' : '0301'}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Torre o bloque</span>
              <input
                name="tower"
                value={unitForm.tower}
                onChange={updateUnitField}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Coeficiente *</span>
              <input
                name="coefficient"
                type="number"
                min="0"
                max="100"
                step="any"
                value={unitForm.coefficient}
                onChange={updateUnitField}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Estado *</span>
              <select
                name="status"
                value={unitForm.status}
                onChange={updateUnitField}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {UNIT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Guardar inmueble
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {isResponsibleFormOpen && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Registrar responsable</h3>
            <button
              onClick={() => setIsResponsibleFormOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            El responsable se guarda como tercero de cobro. No se le crean credenciales ni acceso.
          </p>
          {status.message && (
            <p
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
            >
              {status.message}
            </p>
          )}
          <form onSubmit={submitResponsible} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Identificación *</span>
              <input
                name="identification"
                value={responsibleForm.identification}
                onChange={updateResponsibleField}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Nombre *</span>
              <input
                name="name"
                value={responsibleForm.name}
                onChange={updateResponsibleField}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Teléfono</span>
              <input
                name="phone"
                value={responsibleForm.phone}
                onChange={updateResponsibleField}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">
                Correo electrónico
              </span>
              <input
                name="email"
                type="email"
                value={responsibleForm.email}
                onChange={updateResponsibleField}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-xs font-bold text-slate-500">
                Inmuebles asociados *
              </legend>
              {units.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Primero registra un inmueble para poder asociar un responsable.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {units.map((unit) => (
                    <label
                      key={unit.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={responsibleForm.unitIds.includes(unit.id)}
                        onChange={() => toggleResponsibleUnit(unit.id)}
                      />
                      {`${PROPERTY_KIND_LABELS[unit.kind] || 'Inmueble'} · ${unit.number}`}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Guardar responsable
              </ActionButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
