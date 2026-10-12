import { useEffect, useState } from 'react';
import { hasPermission } from '../../app/permissions.js';
import {
  getInsurancePolicies,
  createInsurancePolicy,
  getInsuranceAlertSettings,
  saveInsuranceAlertSettings
} from '../../services/api.js';

const emptyForm = {
  number: '',
  insurer: '',
  coverage: '',
  insuredValue: '',
  validFrom: '',
  validUntil: ''
};
const colors = {
  Vigente: 'bg-green-100 text-green-800',
  'Próxima a vencer': 'bg-amber-100 text-amber-800',
  Vencida: 'bg-red-100 text-red-800',
  'Pendiente de inicio': 'bg-slate-100 text-slate-700'
};

export function InsurancePolicies({ buildingId, permissions }) {
  const [policies, setPolicies] = useState([]);
  const [days, setDays] = useState('30');
  const [savedDays, setSavedDays] = useState(30);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canEdit = hasPermission(permissions, 'insurance.update');

  useEffect(() => {
    let active = true;
    if (!buildingId) {
      setLoading(false);
      return;
    }
    Promise.all([getInsurancePolicies(buildingId), getInsuranceAlertSettings(buildingId)])
      .then(([list, settings]) => {
        if (!active) return;
        setPolicies(list.data);
        setDays(String(settings.data.alertDays));
        setSavedDays(settings.data.alertDays);
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
  }, [buildingId]);

  async function save(event, registering = false) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (registering) {
        await createInsurancePolicy(buildingId, {
          ...form,
          insuredValue: Number(form.insuredValue)
        });
        setForm(emptyForm);
        setShowForm(false);
        setMessage('Póliza registrada.');
      } else {
        await saveInsuranceAlertSettings(buildingId, Number(days));
        setSavedDays(Number(days));
        setMessage('Anticipación guardada.');
      }
      const list = await getInsurancePolicies(buildingId);
      setPolicies(list.data);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }

  if (!buildingId) return <p>Selecciona un edificio para consultar sus pólizas.</p>;
  if (loading) return <p role="status">Cargando pólizas…</p>;
  const alerts = policies.filter((policy) =>
    ['Vencida', 'Próxima a vencer'].includes(policy.expirationStatus)
  );
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-green-700">
          {message}
        </p>
      )}
      <form
        onSubmit={save}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
      >
        <label className="text-sm">
          Días de anticipación (0 a 365)
          <input
            aria-label="Días de anticipación"
            required
            type="number"
            min="0"
            max="365"
            step="1"
            value={days}
            disabled={!canEdit || saving}
            onChange={(event) => setDays(event.target.value)}
            className="block border rounded px-3 py-2"
          />
        </label>
        {canEdit && (
          <button
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Guardar anticipación
          </button>
        )}
        <p className="text-sm text-slate-600">
          Configuración actual: {savedDays} días. El día de vencimiento está incluido.
        </p>
      </form>
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.keys(colors).map((status) => (
          <span key={status}>
            {status}:{' '}
            <strong>{policies.filter((p) => p.expirationStatus === status).length}</strong>
          </span>
        ))}
      </div>
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-semibold">Pólizas que requieren atención</h3>
          <ul>
            {alerts.map((p) => (
              <li key={p.id}>
                {p.number} · {p.insurer} · {p.expirationStatus} · {p.validUntil}
              </li>
            ))}
          </ul>
        </div>
      )}
      {canEdit && (
        <button
          type="button"
          disabled={saving}
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          {showForm ? 'Cancelar registro' : 'Registrar póliza'}
        </button>
      )}
      {showForm && (
        <form
          onSubmit={(event) => save(event, true)}
          className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2"
        >
          {[
            ['number', 'Número de póliza', 'text'],
            ['insurer', 'Aseguradora', 'text'],
            ['coverage', 'Cobertura', 'text'],
            ['insuredValue', 'Valor asegurado (COP)', 'number'],
            ['validFrom', 'Inicio de vigencia', 'date'],
            ['validUntil', 'Fin de vigencia', 'date']
          ].map(([name, label, type]) => (
            <label key={name} className="text-sm">
              {label}
              <input
                required
                type={type}
                value={form[name]}
                disabled={saving}
                min={type === 'number' ? '0' : undefined}
                step={type === 'number' ? '0.01' : undefined}
                maxLength={name === 'number' ? 100 : name === 'insurer' ? 150 : 5000}
                onChange={(event) => setForm({ ...form, [name]: event.target.value })}
                className="block w-full rounded border px-3 py-2"
              />
            </label>
          ))}
          <button
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Guardar póliza
          </button>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                'Póliza',
                'Aseguradora',
                'Cobertura',
                'Vigencia',
                'Valor asegurado',
                'Estado',
                'Vencimiento'
              ].map((label) => (
                <th key={label} className="p-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.number}</td>
                <td className="p-3">{p.insurer}</td>
                <td className="p-3">{p.coverage}</td>
                <td className="p-3">
                  {p.validFrom} — {p.validUntil}
                </td>
                <td className="p-3">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(
                    p.insuredValue
                  )}
                </td>
                <td className="p-3">
                  <span className={`rounded px-2 py-1 ${colors[p.expirationStatus]}`}>
                    {p.expirationStatus}
                  </span>
                </td>
                <td className="p-3">
                  {p.daysRemaining < 0
                    ? `Hace ${-p.daysRemaining} días`
                    : p.daysRemaining === 0
                      ? 'Hoy'
                      : `En ${p.daysRemaining} días`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies.length === 0 && !error && (
          <p className="p-4 text-slate-600">No hay pólizas registradas en este edificio.</p>
        )}
      </div>
    </div>
  );
}
