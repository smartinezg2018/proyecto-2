import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Save, X } from 'lucide-react';
import { createBuilding, getBuilding, getBuildings, updateBuilding } from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';

const emptyForm = {
  name: '',
  identification: '',
  address: '',
  phone: '',
  email: ''
};

export function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);

  async function loadBuildings() {
    setIsLoading(true);
    try {
      const response = await getBuildings();
      setBuildings(response.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBuildings();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setStatus({ type: '', message: '' });
    setIsFormOpen(true);
  }

  async function openDetails(buildingId) {
    try {
      const response = await getBuilding(buildingId);
      setSelectedBuilding(response.data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  function openEditForm(building) {
    setSelectedBuilding(null);
    setEditingId(building.id);
    setForm({
      name: building.name,
      identification: building.identification,
      address: building.address,
      phone: building.phone || '',
      email: building.email || ''
    });
    setStatus({ type: '', message: '' });
    setIsFormOpen(true);
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    setStatus({ type: '', message: '' });

    try {
      if (editingId) {
        await updateBuilding(editingId, form);
        setStatus({ type: 'success', message: 'Edificio actualizado correctamente.' });
      } else {
        await createBuilding(form);
        setStatus({ type: 'success', message: 'Edificio registrado correctamente.' });
      }
      setIsFormOpen(false);
      await loadBuildings();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div>
      <SectionHeader
        title="Edificios"
        subtitle="Administra las copropiedades asignadas a tu usuario"
        action={
          <ActionButton onClick={openCreateForm}>
            <Plus size={14} /> Registrar edificio
          </ActionButton>
        }
      />

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
              {['Nombre', 'Identificación', 'Dirección', 'Contacto', 'Acciones'].map((heading) => (
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
            {buildings.map((building) => (
              <tr key={building.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{building.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-600">
                  {building.identification}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{building.address}</td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {building.phone || building.email || 'Sin datos'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDetails(building.id)}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      title="Ver detalle"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => openEditForm(building)}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      title="Editar edificio"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && buildings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  No hay edificios asignados.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Cargando edificios...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {editingId ? 'Actualizar edificio' : 'Registrar edificio'}
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar formulario"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
            {[
              ['name', 'Nombre'],
              ['identification', 'Identificación'],
              ['address', 'Dirección'],
              ['phone', 'Teléfono'],
              ['email', 'Correo electrónico']
            ].map(([name, label]) => (
              <label key={name} className={name === 'address' ? 'sm:col-span-2' : ''}>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  {label}
                  {['name', 'identification', 'address'].includes(name) ? ' *' : ''}
                </span>
                <input
                  name={name}
                  value={form[name]}
                  onChange={updateField}
                  required={['name', 'identification', 'address'].includes(name)}
                  type={name === 'email' ? 'email' : 'text'}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> Guardar
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      {selectedBuilding && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Detalle del edificio</h3>
            <button
              onClick={() => setSelectedBuilding(null)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar detalle"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <strong>Nombre:</strong> {selectedBuilding.name}
            </p>
            <p>
              <strong>Identificación:</strong> {selectedBuilding.identification}
            </p>
            <p>
              <strong>Dirección:</strong> {selectedBuilding.address}
            </p>
            <p>
              <strong>Teléfono:</strong> {selectedBuilding.phone || 'No registrado'}
            </p>
            <p>
              <strong>Correo:</strong> {selectedBuilding.email || 'No registrado'}
            </p>
            <p>
              <strong>Actualizado:</strong> {new Date(selectedBuilding.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
