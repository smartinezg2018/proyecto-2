import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

import {
  closeProject,
  createSupplier,
  getBuildingProjects,
  getSuppliers,
  registerProject,
  registerProjectProgress,
  registerProjectQuote,
  selectProjectQuote
} from '../../services/api.js';
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

const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

function isProjectOpen(status) {
  return status !== 'finalizado' && status !== 'cancelado';
}

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

function createEmptyQuoteForm() {
  return {
    supplierMode: 'existing',
    supplierId: '',
    identification: '',
    supplierName: '',
    amount: '',
    validUntil: '',
    scope: '',
    conditions: '',
    deliveryDays: '',
    documentRef: ''
  };
}

function createEmptyProgressForm() {
  return {
    quoteId: '',
    progressDate: '',
    percentage: '',
    executedCost: '',
    observations: '',
    evidenceRef: ''
  };
}

function createEmptyFilters() {
  return {
    status: '',
    projectType: '',
    dateFrom: '',
    dateTo: ''
  };
}

function createEmptyCloseForm() {
  return {
    closeDate: '',
    totalCost: '',
    result: '',
    closingDocumentRef: ''
  };
}

export function ModuleProyectos({ permissions = [], activeBuildingId = null }) {
  const canCreate = hasPermission(permissions, 'projects.create');
  const canAddQuote = hasPermission(permissions, 'projects.update');
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [quoteFormProjectId, setQuoteFormProjectId] = useState(null);
  const [quoteForm, setQuoteForm] = useState(createEmptyQuoteForm);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [selectionForm, setSelectionForm] = useState({ quoteId: '', justification: '' });
  const [selectionProjectId, setSelectionProjectId] = useState(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [progressFormProjectId, setProgressFormProjectId] = useState(null);
  const [progressForm, setProgressForm] = useState(createEmptyProgressForm);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [filters, setFilters] = useState(createEmptyFilters);
  const [closeFormProjectId, setCloseFormProjectId] = useState(null);
  const [closeForm, setCloseForm] = useState(createEmptyCloseForm);
  const [isSavingClose, setIsSavingClose] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  async function reloadProjects(nextFilters = filters) {
    const response = await getBuildingProjects(activeBuildingId, nextFilters);
    setProjects(response.data ?? []);
  }

  useEffect(() => {
    if (!activeBuildingId) {
      setProjects([]);
      return;
    }

    const nextFilters = createEmptyFilters();
    setFilters(nextFilters);
    setIsLoading(true);
    getBuildingProjects(activeBuildingId, nextFilters)
      .then((response) => setProjects(response.data ?? []))
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setIsLoading(false));
  }, [activeBuildingId]);

  useEffect(() => {
    getSuppliers()
      .then((response) => setSuppliers(response.data ?? []))
      .catch(() => setSuppliers([]));
  }, []);

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
      await reloadProjects();
      setForm(createEmptyForm());
      setIsFormOpen(false);
      setStatus({ type: 'success', message: 'Proyecto registrado correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  function openQuoteForm(projectId) {
    setQuoteFormProjectId(projectId);
    setQuoteForm(createEmptyQuoteForm());
    setStatus({ type: '', message: '' });
  }

  function updateQuoteField(event) {
    const { name, value } = event.target;
    setQuoteForm({ ...quoteForm, [name]: value });
  }

  async function submitQuote(event) {
    event.preventDefault();
    if (!activeBuildingId || !quoteFormProjectId) return;
    setStatus({ type: '', message: '' });
    setIsSavingQuote(true);

    try {
      let supplierId = Number(quoteForm.supplierId);
      if (quoteForm.supplierMode === 'new') {
        const created = await createSupplier({
          identification: quoteForm.identification,
          name: quoteForm.supplierName
        });
        supplierId = created.data.id;
        const supplierResponse = await getSuppliers();
        setSuppliers(supplierResponse.data ?? []);
      }

      await registerProjectQuote(activeBuildingId, quoteFormProjectId, {
        supplierId,
        amount: Number(quoteForm.amount),
        validUntil: quoteForm.validUntil,
        scope: quoteForm.scope,
        conditions: quoteForm.conditions,
        deliveryDays: Number(quoteForm.deliveryDays),
        documentRef: quoteForm.documentRef || null
      });
      await reloadProjects();
      setQuoteForm(createEmptyQuoteForm());
      setQuoteFormProjectId(null);
      setStatus({ type: 'success', message: 'Cotización registrada correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingQuote(false);
    }
  }

  function openSelectionForm(project) {
    setSelectionProjectId(project.id);
    setSelectionForm({
      quoteId: project.selectedQuoteId ? String(project.selectedQuoteId) : '',
      justification: project.selectionJustification ?? ''
    });
    setStatus({ type: '', message: '' });
  }

  async function submitSelection(event) {
    event.preventDefault();
    if (!activeBuildingId || !selectionProjectId) return;
    setStatus({ type: '', message: '' });
    setIsSavingSelection(true);

    try {
      await selectProjectQuote(activeBuildingId, selectionProjectId, {
        quoteId: Number(selectionForm.quoteId),
        justification: selectionForm.justification
      });
      await reloadProjects();
      setSelectionProjectId(null);
      setStatus({ type: 'success', message: 'Propuesta seleccionada correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingSelection(false);
    }
  }

  function openProgressForm(project) {
    setProgressFormProjectId(project.id);
    setProgressForm({
      ...createEmptyProgressForm(),
      quoteId: project.selectedQuoteId ? String(project.selectedQuoteId) : ''
    });
    setStatus({ type: '', message: '' });
  }

  function updateProgressField(event) {
    const { name, value } = event.target;
    setProgressForm({ ...progressForm, [name]: value });
  }

  async function submitProgress(event) {
    event.preventDefault();
    if (!activeBuildingId || !progressFormProjectId) return;
    setStatus({ type: '', message: '' });
    setIsSavingProgress(true);

    try {
      await registerProjectProgress(activeBuildingId, progressFormProjectId, {
        quoteId: Number(progressForm.quoteId),
        progressDate: progressForm.progressDate,
        percentage: Number(progressForm.percentage),
        executedCost: Number(progressForm.executedCost),
        observations: progressForm.observations,
        evidenceRef: progressForm.evidenceRef || null
      });
      await reloadProjects();
      setProgressForm(createEmptyProgressForm());
      setProgressFormProjectId(null);
      setStatus({ type: 'success', message: 'Avance registrado correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingProgress(false);
    }
  }

  function updateFilterField(event) {
    const { name, value } = event.target;
    setFilters({ ...filters, [name]: value });
  }

  async function applyFilters(event) {
    event.preventDefault();
    if (!activeBuildingId) return;
    setStatus({ type: '', message: '' });
    setIsLoading(true);
    try {
      await reloadProjects(filters);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function clearFilters() {
    const nextFilters = createEmptyFilters();
    setFilters(nextFilters);
    if (!activeBuildingId) return;
    setStatus({ type: '', message: '' });
    setIsLoading(true);
    try {
      await reloadProjects(nextFilters);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function openCloseForm(project) {
    setCloseFormProjectId(project.id);
    setCloseForm({
      closeDate: project.endDate || '',
      totalCost:
        project.currentExecutedCost === null || project.currentExecutedCost === undefined
          ? ''
          : String(project.currentExecutedCost),
      result: '',
      closingDocumentRef: ''
    });
    setStatus({ type: '', message: '' });
  }

  function updateCloseField(event) {
    const { name, value } = event.target;
    setCloseForm({ ...closeForm, [name]: value });
  }

  async function submitClose(event) {
    event.preventDefault();
    if (!activeBuildingId || !closeFormProjectId) return;
    setStatus({ type: '', message: '' });
    setIsSavingClose(true);

    try {
      await closeProject(activeBuildingId, closeFormProjectId, {
        closeDate: closeForm.closeDate,
        totalCost: Number(closeForm.totalCost),
        result: closeForm.result,
        closingDocumentRef: closeForm.closingDocumentRef || null
      });
      await reloadProjects();
      setCloseForm(createEmptyCloseForm());
      setCloseFormProjectId(null);
      setStatus({ type: 'success', message: 'Proyecto cerrado correctamente.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSavingClose(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Proyectos"
        subtitle="Registro, consulta, avances y cierre de proyectos"
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

      {activeBuildingId && (
        <form
          onSubmit={applyFilters}
          className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-5"
        >
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Estado</span>
            <select
              name="status"
              value={filters.status}
              onChange={updateFilterField}
              className={inputClassName}
            >
              <option value="">Todos</option>
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Tipo</span>
            <select
              name="projectType"
              value={filters.projectType}
              onChange={updateFilterField}
              className={inputClassName}
            >
              <option value="">Todos</option>
              {PROJECT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Desde</span>
            <input
              name="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={updateFilterField}
              className={inputClassName}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Hasta</span>
            <input
              name="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={updateFilterField}
              className={inputClassName}
            />
          </label>
          <div className="flex items-end gap-2">
            <ActionButton type="submit" disabled={isLoading}>
              Filtrar
            </ActionButton>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              Limpiar
            </button>
          </div>
        </form>
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
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Avance físico</span>
                  <span className="font-bold text-slate-800">
                    {Number(project.currentPercentage ?? 0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.min(100, Number(project.currentPercentage ?? 0))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Costo ejecutado {formatCurrency(project.currentExecutedCost ?? 0)}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Cotizaciones ({(project.quotes ?? []).length})
                  </p>
                  {canAddQuote && isProjectOpen(project.status) && (
                    <button
                      type="button"
                      onClick={() => openQuoteForm(project.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Registrar cotización
                    </button>
                  )}
                </div>

                {(project.quotes ?? []).length === 0 && quoteFormProjectId !== project.id && (
                  <p className="text-xs text-slate-400">Aún no hay cotizaciones en este proyecto.</p>
                )}

                {(project.quotes ?? []).length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-3 py-2 font-bold">Criterio</th>
                          {(project.quotes ?? []).map((quote) => (
                            <th key={quote.id} className="px-3 py-2 font-bold text-slate-600">
                              {quote.supplier?.name || 'Proveedor'}
                              {Number(project.selectedQuoteId) === Number(quote.id) ? (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                                  Seleccionada
                                </span>
                              ) : null}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-50">
                          <td className="px-3 py-2 text-xs font-bold text-slate-400">Precio</td>
                          {(project.quotes ?? []).map((quote) => (
                            <td key={`${quote.id}-price`} className="px-3 py-2 font-semibold">
                              {formatCurrency(quote.amount)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="px-3 py-2 text-xs font-bold text-slate-400">Alcance</td>
                          {(project.quotes ?? []).map((quote) => (
                            <td key={`${quote.id}-scope`} className="px-3 py-2 text-slate-600">
                              {quote.scope}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="px-3 py-2 text-xs font-bold text-slate-400">Tiempo</td>
                          {(project.quotes ?? []).map((quote) => (
                            <td key={`${quote.id}-time`} className="px-3 py-2 text-slate-600">
                              {quote.deliveryDays
                                ? `${quote.deliveryDays} días`
                                : 'Sin registrar'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-xs font-bold text-slate-400">
                            Condiciones
                          </td>
                          {(project.quotes ?? []).map((quote) => (
                            <td key={`${quote.id}-conditions`} className="px-3 py-2 text-slate-600">
                              {quote.conditions || 'Sin registrar'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {project.selectionJustification && (
                  <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-bold">Justificación: </span>
                    {project.selectionJustification}
                  </p>
                )}

                {canAddQuote &&
                  isProjectOpen(project.status) &&
                  (project.quotes ?? []).length >= 2 && (
                  <div className="mt-3">
                    {selectionProjectId !== project.id ? (
                      <button
                        type="button"
                        onClick={() => openSelectionForm(project)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {project.selectedQuoteId
                          ? 'Cambiar propuesta seleccionada'
                          : 'Seleccionar propuesta'}
                      </button>
                    ) : (
                      <form onSubmit={submitSelection} className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            Propuesta *
                          </span>
                          <select
                            value={selectionForm.quoteId}
                            onChange={(event) =>
                              setSelectionForm({ ...selectionForm, quoteId: event.target.value })
                            }
                            required
                            className={inputClassName}
                          >
                            <option value="">Selecciona una cotización</option>
                            {(project.quotes ?? []).map((quote) => (
                              <option key={quote.id} value={quote.id}>
                                {quote.supplier?.name || 'Proveedor'} · {formatCurrency(quote.amount)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            Justificación *
                          </span>
                          <textarea
                            value={selectionForm.justification}
                            onChange={(event) =>
                              setSelectionForm({
                                ...selectionForm,
                                justification: event.target.value
                              })
                            }
                            required
                            rows={2}
                            className={inputClassName}
                          />
                        </label>
                        <div className="flex gap-2 sm:col-span-2">
                          <ActionButton type="submit" disabled={isSavingSelection}>
                            <Save size={14} /> Guardar selección
                          </ActionButton>
                          <button
                            type="button"
                            onClick={() => setSelectionProjectId(null)}
                            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {quoteFormProjectId === project.id && (
                  <form onSubmit={submitQuote} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Proveedor *
                      </span>
                      <select
                        name="supplierMode"
                        value={quoteForm.supplierMode}
                        onChange={updateQuoteField}
                        className={inputClassName}
                      >
                        <option value="existing">Proveedor existente</option>
                        <option value="new">Nuevo proveedor</option>
                      </select>
                    </label>
                    {quoteForm.supplierMode === 'existing' ? (
                      <label>
                        <span className="mb-1 block text-xs font-bold text-slate-500">
                          Seleccionar *
                        </span>
                        <select
                          name="supplierId"
                          value={quoteForm.supplierId}
                          onChange={updateQuoteField}
                          required
                          className={inputClassName}
                        >
                          <option value="">Selecciona un proveedor</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <label>
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            Identificación *
                          </span>
                          <input
                            name="identification"
                            value={quoteForm.identification}
                            onChange={updateQuoteField}
                            required
                            className={inputClassName}
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="mb-1 block text-xs font-bold text-slate-500">
                            Nombre del proveedor *
                          </span>
                          <input
                            name="supplierName"
                            value={quoteForm.supplierName}
                            onChange={updateQuoteField}
                            required
                            className={inputClassName}
                          />
                        </label>
                      </>
                    )}
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Valor (COP) *
                      </span>
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={quoteForm.amount}
                        onChange={updateQuoteField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Vigencia *
                      </span>
                      <input
                        name="validUntil"
                        type="date"
                        value={quoteForm.validUntil}
                        onChange={updateQuoteField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Tiempo (días) *
                      </span>
                      <input
                        name="deliveryDays"
                        type="number"
                        min="1"
                        step="1"
                        value={quoteForm.deliveryDays}
                        onChange={updateQuoteField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">Alcance *</span>
                      <textarea
                        name="scope"
                        value={quoteForm.scope}
                        onChange={updateQuoteField}
                        required
                        rows={2}
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Condiciones *
                      </span>
                      <textarea
                        name="conditions"
                        value={quoteForm.conditions}
                        onChange={updateQuoteField}
                        required
                        rows={2}
                        placeholder="Forma de pago, garantías, exclusiones..."
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Documento
                      </span>
                      <input
                        name="documentRef"
                        value={quoteForm.documentRef}
                        onChange={updateQuoteField}
                        placeholder="Nombre del archivo o referencia"
                        className={inputClassName}
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <ActionButton type="submit" disabled={isSavingQuote}>
                        <Save size={14} /> Guardar cotización
                      </ActionButton>
                      <button
                        type="button"
                        onClick={() => setQuoteFormProjectId(null)}
                        className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Avances ({(project.progressEntries ?? []).length})
                  </p>
                  {canAddQuote && isProjectOpen(project.status) && (
                      <button
                        type="button"
                        onClick={() => openProgressForm(project)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Registrar avance
                      </button>
                    )}
                </div>

                {(project.progressEntries ?? []).length === 0 &&
                  progressFormProjectId !== project.id && (
                    <p className="text-xs text-slate-400">
                      Aún no hay avances registrados en este proyecto.
                    </p>
                  )}

                {(project.progressEntries ?? []).length > 0 && (
                  <div className="space-y-2">
                    {(project.progressEntries ?? []).map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-800">
                            {entry.percentage}% · {formatDateDisplay(entry.progressDate)}
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            {formatCurrency(entry.executedCost)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          Ejecutado por {entry.supplierName || 'Proveedor no registrado'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{entry.observations}</p>
                        {entry.evidenceRef ? (
                          <p className="mt-1 text-xs text-slate-400">{entry.evidenceRef}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {progressFormProjectId === project.id && (
                  <form onSubmit={submitProgress} className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="sm:col-span-3">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Ejecutado por *
                      </span>
                      <select
                        name="quoteId"
                        value={progressForm.quoteId}
                        onChange={updateProgressField}
                        required
                        className={inputClassName}
                      >
                        <option value="">Seleccione el proveedor</option>
                        {(project.quotes ?? []).map((quote) => (
                          <option key={quote.id} value={quote.id}>
                            {quote.supplier?.name || 'Proveedor'} · {formatCurrency(quote.amount)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">Fecha *</span>
                      <input
                        name="progressDate"
                        type="date"
                        value={progressForm.progressDate}
                        onChange={updateProgressField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Porcentaje *
                      </span>
                      <input
                        name="percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={progressForm.percentage}
                        onChange={updateProgressField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Costo ejecutado (COP) *
                      </span>
                      <input
                        name="executedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={progressForm.executedCost}
                        onChange={updateProgressField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-3">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Observaciones *
                      </span>
                      <textarea
                        name="observations"
                        value={progressForm.observations}
                        onChange={updateProgressField}
                        required
                        rows={2}
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-3">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Evidencias
                      </span>
                      <input
                        name="evidenceRef"
                        value={progressForm.evidenceRef}
                        onChange={updateProgressField}
                        placeholder="Informe, fotos, acta..."
                        className={inputClassName}
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-3">
                      <ActionButton type="submit" disabled={isSavingProgress}>
                        <Save size={14} /> Guardar avance
                      </ActionButton>
                      <button
                        type="button"
                        onClick={() => setProgressFormProjectId(null)}
                        className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Cierre
                  </p>
                  {canAddQuote &&
                    isProjectOpen(project.status) &&
                    closeFormProjectId !== project.id && (
                      <button
                        type="button"
                        onClick={() => openCloseForm(project)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Cerrar proyecto
                      </button>
                    )}
                </div>

                {project.status === 'finalizado' && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-0.5 text-xs text-emerald-700">Fecha de cierre</p>
                        <p className="text-sm font-bold text-slate-800">
                          {formatDateDisplay(project.closeDate)}
                        </p>
                      </div>
                      <div>
                        <p className="mb-0.5 text-xs text-emerald-700">Costo total</p>
                        <p className="text-sm font-bold text-slate-800">
                          {formatCurrency(project.totalCost)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{project.result}</p>
                    {project.closingDocumentRef ? (
                      <p className="mt-1 text-xs text-slate-500">{project.closingDocumentRef}</p>
                    ) : null}
                  </div>
                )}

                {project.status !== 'finalizado' && closeFormProjectId !== project.id && (
                  <p className="text-xs text-slate-400">
                    El cierre queda documentado con fecha, costo, resultado y acta.
                  </p>
                )}

                {closeFormProjectId === project.id && (
                  <form onSubmit={submitClose} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Fecha de cierre *
                      </span>
                      <input
                        name="closeDate"
                        type="date"
                        value={closeForm.closeDate}
                        onChange={updateCloseField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Costo total (COP) *
                      </span>
                      <input
                        name="totalCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={closeForm.totalCost}
                        onChange={updateCloseField}
                        required
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Resultado *
                      </span>
                      <textarea
                        name="result"
                        value={closeForm.result}
                        onChange={updateCloseField}
                        required
                        rows={2}
                        className={inputClassName}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">
                        Documento de cierre
                      </span>
                      <input
                        name="closingDocumentRef"
                        value={closeForm.closingDocumentRef}
                        onChange={updateCloseField}
                        placeholder="Acta, informe final..."
                        className={inputClassName}
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <ActionButton type="submit" disabled={isSavingClose}>
                        <Save size={14} /> Guardar cierre
                      </ActionButton>
                      <button
                        type="button"
                        onClick={() => setCloseFormProjectId(null)}
                        className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
      </div>

      {!isLoading && activeBuildingId && projects.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          No hay proyectos que coincidan con la consulta.
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
