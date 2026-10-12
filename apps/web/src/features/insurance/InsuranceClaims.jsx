import { useEffect, useState } from 'react';
import { hasPermission } from '../../app/permissions.js';
import {
  createInsuranceClaim,
  getAssets,
  getInsuranceClaims,
  getInsurancePolicies
} from '../../services/api.js';

const statusOptions = [
  ['reportada', 'Reportada'],
  ['en_revision', 'En revisión'],
  ['aprobada', 'Aprobada'],
  ['rechazada', 'Rechazada'],
  ['indemnizada', 'Indemnizada']
];
const statusLabel = (value) => statusOptions.find(([key]) => key === value)?.[1] ?? value;
const emptyForm = {
  policyId: '',
  claimDate: '',
  description: '',
  status: 'reportada',
  result: '',
  claimedAmount: '',
  indemnityAmount: '',
  resolvedAt: '',
  documentRefs: '',
  assetIds: []
};

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });

export function InsuranceClaims({ buildingId, permissions }) {
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ policyId: '', assetId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const canView = hasPermission(permissions, 'insurance.view');
  const canEdit = hasPermission(permissions, 'insurance.update');

  useEffect(() => {
    let active = true;
    if (!buildingId || !canView) {
      setLoading(false);
      return;
    }
    Promise.all([
      getInsuranceClaims(buildingId),
      getInsurancePolicies(buildingId),
      getAssets(buildingId)
    ])
      .then(([claimsResponse, policiesResponse, assetsResponse]) => {
        if (!active) return;
        setClaims(claimsResponse.data ?? []);
        setPolicies(policiesResponse.data ?? []);
        setAssets(assetsResponse.data ?? []);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildingId, canView]);

  async function applyFilters(event) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await getInsuranceClaims(buildingId, filters);
      setClaims(response.data ?? []);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearFilters() {
    setFilters({ policyId: '', assetId: '' });
    setLoading(true);
    setError('');
    try {
      const response = await getInsuranceClaims(buildingId);
      setClaims(response.data ?? []);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleAsset(assetId) {
    setForm((current) => ({
      ...current,
      assetIds: current.assetIds.includes(assetId)
        ? current.assetIds.filter((id) => id !== assetId)
        : [...current.assetIds, assetId]
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await createInsuranceClaim(
        buildingId,
        {
          ...form,
          policyId: Number(form.policyId),
          claimedAmount: Number(form.claimedAmount),
          result: form.result.trim() || null,
          indemnityAmount: form.indemnityAmount === '' ? null : Number(form.indemnityAmount),
          resolvedAt: form.resolvedAt || null,
          documentRefs: form.documentRefs
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean)
        },
        files
      );
      const matchesPolicy =
        !filters.policyId || Number(filters.policyId) === response.data.policyId;
      const matchesAsset =
        !filters.assetId ||
        (response.data.assets ?? []).some((asset) => Number(asset.id) === Number(filters.assetId));
      if (matchesPolicy && matchesAsset) setClaims((current) => [response.data, ...current]);
      setForm(emptyForm);
      setFiles([]);
      setShowForm(false);
      setMessage('Reclamación registrada correctamente.');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }

  if (!canView) return <p>No tienes permiso para consultar reclamaciones.</p>;
  if (!buildingId) return <p>Selecciona un edificio para consultar sus reclamaciones.</p>;
  if (loading) return <p role="status">Cargando reclamaciones…</p>;
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      <form
        onSubmit={applyFilters}
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <label className="text-sm font-medium">
          Póliza
          <select
            value={filters.policyId}
            onChange={(event) => setFilters({ ...filters, policyId: event.target.value })}
            className="mt-1 block w-full rounded-lg border px-3 py-2"
          >
            <option value="">Todas las pólizas</option>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.number} · {policy.insurer}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Activo
          <select
            value={filters.assetId}
            onChange={(event) => setFilters({ ...filters, assetId: event.target.value })}
            className="mt-1 block w-full rounded-lg border px-3 py-2"
          >
            <option value="">Todos los activos</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.code} · {asset.name}
              </option>
            ))}
          </select>
        </label>
        <button className="self-end rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
          Filtrar
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="self-end rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Limpiar
        </button>
      </form>
      {canEdit && (
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? 'Cancelar registro' : 'Registrar reclamación'}
        </button>
      )}
      {showForm && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-2"
        >
          <label className="text-sm font-medium">
            Póliza
            <select
              required
              value={form.policyId}
              onChange={(event) => setForm({ ...form, policyId: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            >
              <option value="">Seleccionar póliza</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.number} · {policy.insurer}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Fecha del siniestro
            <input
              required
              type="date"
              value={form.claimDate}
              onChange={(event) => setForm({ ...form, claimDate: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Descripción
            <textarea
              required
              maxLength="5000"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-1 block min-h-24 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Estado
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            >
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Valor reclamado (COP)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.claimedAmount}
              onChange={(event) => setForm({ ...form, claimedAmount: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Valor indemnizado (COP, opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.indemnityAmount}
              onChange={(event) => setForm({ ...form, indemnityAmount: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Fecha de resolución (opcional)
            <input
              type="date"
              min={form.claimDate || undefined}
              value={form.resolvedAt}
              onChange={(event) => setForm({ ...form, resolvedAt: event.target.value })}
              className="mt-1 block w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Resultado (opcional)
            <textarea
              maxLength="5000"
              value={form.result}
              onChange={(event) => setForm({ ...form, result: event.target.value })}
              placeholder="Resultado de la reclamación"
              className="mt-1 block min-h-20 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <fieldset className="rounded-lg border p-3 md:col-span-2">
            <legend className="px-1 text-sm font-medium">Activos afectados</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {assets.map((asset) => (
                <label key={asset.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.assetIds.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id)}
                  />
                  {asset.code} · {asset.name}
                </label>
              ))}
            </div>
            {assets.length === 0 && (
              <p className="text-sm text-slate-500">No hay activos registrados.</p>
            )}
          </fieldset>
          <label className="text-sm font-medium md:col-span-2">
            Adjuntar documentos (PDF, PNG o JPEG; máximo 5 de 5 MB)
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              disabled={saving}
              className="mt-1 block w-full"
              onChange={(event) => {
                const selected = Array.from(event.target.files);
                if (
                  selected.length > 5 ||
                  selected.some((file) => file.size > 5 * 1024 * 1024 || !file.size)
                ) {
                  setError('Selecciona hasta 5 archivos de entre 1 byte y 5 MB.');
                  event.target.value = '';
                  setFiles([]);
                  return;
                }
                setError('');
                setFiles(selected);
              }}
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Referencias adicionales (una por línea, opcional)
            <textarea
              value={form.documentRefs}
              onChange={(event) => setForm({ ...form, documentRefs: event.target.value })}
              placeholder="acta-siniestro.pdf"
              className="mt-1 block min-h-20 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <button
            disabled={saving || form.assetIds.length === 0 || policies.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar reclamación'}
          </button>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Radicado',
                'Fecha',
                'Póliza',
                'Descripción',
                'Activos',
                'Estado',
                'Resultado',
                'Valores',
                'Resolución',
                'Documentos'
              ].map((heading) => (
                <th
                  key={heading}
                  className="whitespace-nowrap px-3 py-3 text-xs uppercase text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t">
                <td className="whitespace-nowrap px-3 py-3 font-mono">
                  REC-{String(claim.id).padStart(6, '0')}
                </td>
                <td className="whitespace-nowrap px-3 py-3">{claim.claimDate}</td>
                <td className="px-3 py-3">{claim.policyNumber}</td>
                <td className="max-w-64 px-3 py-3">{claim.description}</td>
                <td className="px-3 py-3">{claim.assets.map((asset) => asset.code).join(', ')}</td>
                <td className="whitespace-nowrap px-3 py-3">{statusLabel(claim.status)}</td>
                <td className="max-w-64 px-3 py-3">{claim.result || 'Pendiente'}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="block">Reclamado: {currency.format(claim.claimedAmount)}</span>
                  <span className="block text-slate-500">
                    Indemnizado:{' '}
                    {claim.indemnityAmount == null
                      ? 'Pendiente'
                      : currency.format(claim.indemnityAmount)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3">{claim.resolvedAt || 'Pendiente'}</td>
                <td className="px-3 py-3">
                  {(claim.documents ?? []).map((document) => (
                    <a
                      key={document.id}
                      className="block text-blue-700 underline"
                      href={`/api/v1/insurance/buildings/${buildingId}/claims/${claim.id}/documents/${document.id}`}
                    >
                      Descargar {document.originalName}
                    </a>
                  ))}
                  {claim.documentRefs.join(', ')}
                  {!claim.documentRefs.length && !claim.documents?.length && 'Sin documentos'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {claims.length === 0 && !error && (
          <p className="p-4 text-sm text-slate-500">No hay reclamaciones registradas.</p>
        )}
      </div>
    </div>
  );
}
