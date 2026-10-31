import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

import { getBuildingProjects, registerProject } from '../../services/api.js';
import { hasPermission } from '../../app/permissions.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';

const PROJECT_TYPE_OPTIONS = [
  { value: 'obra', label: 'Obra' },
  { value: 'mejora', label: 'Mejora' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro', label: 'Otro' }
];

const PROJECT_TYPE_LABELS = Object.fromEntries(
  PROJECT_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const PROJECT_STATUS_LABELS = {
  aprobado: 'Aprobado',
  en_ejecucion: 'En ejecución',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};

const inputClassName =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500';

function formatDateDisplay(value) {
  if (!value) return '—';
  const text = String(value);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return '—';
}

function formatCurrency(value) {
  if (value === null || value === undefined) return 'Sin registrar';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2
  }).format(Number(value));
}

function createEmptyForm() {
  return {
    name: '',
    objective: '',
    projectType: 'obra',
    budget: '',
    startDate: '',
    endDate: '',
    responsible: '',
    approvalReference: ''
  };
}

export function ModuleProyectos({ permissions = [], activeBuildingId = null }) {
  const canCreate = hasPermission(permissions, 'projects.create');
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!activeBuildingId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    getBuildingProjects(activeBuildingId)
      .then((response) => setProjects(response.data ?? []))
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setIsLoading(false));
  }, [activeBuildingId]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!activeBuildingId) return;
    setStatus({ type: '', message: '' });
    setIsSaving(true);

    try {
      await registerProject(activeBuildingId, {
        name: form.name,
        objective: form.objective,
        projectType: form.projectType,
        budget: Number(form.budget),
        startDate: form.startDate,
        endDate: form.endDate,
        responsible: form.responsible,
        approvalReference: form.approvalReference
      });
      const response = await getBuildingProjects(activeBuildingId);
      setProjects(response.data ?? []);
      setForm(createEmptyForm());
      setIsFormOpen(false);
      setStatus({ type: 'success', message: 'Proyecto registrado correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Proyectos"
        subtitle="Registro de proyectos aprobados por edificio"
        action={
          canCreate ? (
            <ActionButton onClick={() => setIsFormOpen(true)} disabled={!activeBuildingId}>
              <Plus size={14} /> Nuevo proyecto
            </ActionButton>
          ) : null
        }
      />

      {status.message && (
        <p
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {status.message}
        </p>
      )}

      {!activeBuildingId && (
        <p className="mb-4 text-sm text-slate-400">
          Selecciona un edificio para ver sus proyectos.
        </p>
      )}

      {isFormOpen && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Registrar proyecto</h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-500">Nombre *</span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                required
                className={inputClassName}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Tipo *</span>
              <select
                name="projectType"
                value={form.projectType}
                onChange={updateField}
                className={inputClassName}
              >
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-3">
              <span className="mb-1 block text-xs font-bold text-slate-500">Objetivo *</span>
              <textarea
                name="objective"
                value={form.objective}
                onChange={updateField}
                required
                rows={3}
                className={inputClassName}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">
                Presupuesto (COP) *
              </span>
              <input
                name="budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={updateField}
                required
                className={inputClassName}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Fecha de inicio *</span>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={updateField}
                required
                className={inputClassName}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Fecha de fin *</span>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={updateField}
                required
                className={inputClassName}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Responsable *</span>
              <input
                name="responsible"
                value={form.responsible}
                onChange={updateField}
                required
                className={inputClassName}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-500">
                Referencia de aprobación *
              </span>
              <input
                name="approvalReference"
                value={form.approvalReference}
                onChange={updateField}
                required
                placeholder="Acta de asamblea, resolución..."
                className={inputClassName}
              />
            </label>
            <div className="sm:col-span-3">
              <ActionButton type="submit" disabled={isSaving}>
                <Save size={14} /> Guardar proyecto
              </ActionButton>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {!isLoading &&
          projects.map((project) => (
            <div key={project.id} className="rounded-xl border border-slate-200/80 bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{project.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {PROJECT_TYPE_LABELS[project.projectType] || project.projectType} ·{' '}
                    {project.approvalReference}
                  </p>
                </div>
                <StatusBadge label={PROJECT_STATUS_LABELS[project.status] || project.status} />
              </div>
              <p className="mb-4 text-sm text-slate-600">{project.objective}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-0.5 text-xs text-slate-400">Presupuesto</p>
                  <p className="text-sm font-bold text-slate-800">
                    {formatCurrency(project.budget)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-0.5 text-xs text-slate-400">Responsable</p>
                  <p className="text-sm font-bold text-slate-800">{project.responsible}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-0.5 text-xs text-slate-400">Inicio</p>
                  <p className="font-mono text-sm font-bold text-slate-800">
                    {formatDateDisplay(project.startDate)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="mb-0.5 text-xs text-slate-400">Fin</p>
                  <p className="font-mono text-sm font-bold text-slate-800">
                    {formatDateDisplay(project.endDate)}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {!isLoading && activeBuildingId && projects.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          No hay proyectos registrados en este edificio.
        </p>
      )}
      {isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          Cargando proyectos...
        </p>
      )}
    </div>
  );
}
