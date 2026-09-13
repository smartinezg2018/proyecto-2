import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { listAuditLogs, listUsers, getBuildings } from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';

const emptyFilters = {
  userId: '',
  buildingId: '',
  module: '',
  entity: '',
  from: '',
  to: '',
  page: 1,
  pageSize: 20
};

export function AuditPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0 });
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listUsers().then((r) => setUsers(r.data)).catch(() => {});
    getBuildings().then((r) => setBuildings(r.data)).catch(() => {});
    load(emptyFilters);
  }, []);

  async function load(query) {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await listAuditLogs(query);
      setItems(response.data);
      setMeta(response.meta);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function updateField(event) {
    setFilters({ ...filters, [event.target.name]: event.target.value, page: 1 });
  }

  function submit(event) {
    event.preventDefault();
    load({ ...filters, page: 1 });
  }

  function changePage(delta) {
    const nextPage = Math.max(1, filters.page + delta);
    const next = { ...filters, page: nextPage };
    setFilters(next);
    load(next);
  }

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 20)));

  return (
    <div>
      <SectionHeader
        title="Auditoría"
        subtitle="Consulta las operaciones realizadas por los usuarios"
      />

      {status.message && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.message}
        </p>
      )}

      <form
        onSubmit={submit}
        className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
      >
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Usuario</span>
          <select
            name="userId"
            value={filters.userId}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Edificio</span>
          <select
            name="buildingId"
            value={filters.buildingId}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Módulo</span>
          <select
            name="module"
            value={filters.module}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="administration">administration</option>
            <option value="assets">assets</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Entidad</span>
          <select
            name="entity"
            value={filters.entity}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            <option value="building">building</option>
            <option value="unit">unit</option>
            <option value="person">person</option>
            <option value="user">user</option>
            <option value="profile">profile</option>
            <option value="asset">asset</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Desde</span>
          <input
            type="datetime-local"
            name="from"
            value={filters.from}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold text-slate-500">Hasta</span>
          <input
            type="datetime-local"
            name="to"
            value={filters.to}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-3">
          <ActionButton type="submit">
            <Search size={14} /> {isLoading ? 'Buscando...' : 'Buscar'}
          </ActionButton>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">Módulo</th>
              <th className="px-3 py-2">Entidad</th>
              <th className="px-3 py-2">Edificio</th>
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-600">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  <span className="block font-semibold">{item.userName ?? 'Sistema'}</span>
                  {item.userEmail && (
                    <span className="block text-xs text-slate-400">{item.userEmail}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-700">{item.action}</td>
                <td className="px-3 py-2 text-slate-700">{item.module}</td>
                <td className="px-3 py-2 text-slate-700">
                  {item.entity}
                  {item.entityId ? ` #${item.entityId}` : ''}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {item.buildingName ?? (item.buildingId ? `#${item.buildingId}` : '-')}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {item.metadata ? JSON.stringify(item.metadata) : '-'}
                </td>
              </tr>
            ))}
            {items.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400">
                  Sin operaciones para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Página {meta.page} de {totalPages} · {meta.total} operaciones
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={filters.page <= 1 || isLoading}
            onClick={() => changePage(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={filters.page >= totalPages || isLoading}
            onClick={() => changePage(1)}
            className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
