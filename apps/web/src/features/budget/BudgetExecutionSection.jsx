import { useEffect, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import { listBudgetLines, registerBudgetExecution } from '../../services/api.js';

const CURRENT_YEAR = new Date().getFullYear();

export function BudgetExecutionSection({ activeBuildingId, canUpdateBudget }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [lines, setLines] = useState([]);
  const [budgetLineId, setBudgetLineId] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [extraordinary, setExtraordinary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refreshLines() {
    if (!activeBuildingId || year === '') {
      setLines([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await listBudgetLines(activeBuildingId, year);
      setLines(response.data ?? []);
      if ((response.data ?? []).length && !budgetLineId) {
        setBudgetLineId(String(response.data[0].id));
      }
    } catch (requestError) {
      setLines([]);
      setError(requestError.message || 'No fue posible consultar las partidas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMessage('');
    setBudgetLineId('');
    refreshLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuildingId, year]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!activeBuildingId || !canUpdateBudget) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await registerBudgetExecution(activeBuildingId, {
        budgetLineId: Number(budgetLineId),
        executionDate,
        amount: Number(amount),
        description: description || undefined,
        extraordinary
      });
      setMessage(
        `Ejecución registrada en ${response.data.line.code}. Disponible: ${fmt(response.data.line.availableAmount)}.`
      );
      setAmount('');
      setDescription('');
      setExtraordinary(false);
      await refreshLines();
    } catch (requestError) {
      setError(requestError.message || 'No fue posible registrar la ejecución.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Registrar ejecución presupuestal</h3>
        <p className="mt-1 text-xs text-slate-500">
          Asocie cada movimiento a una partida y actualice el valor ejecutado y el saldo disponible.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[160px_auto]">
        <label className="text-xs font-semibold text-slate-500">
          Vigencia
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {canUpdateBudget && (
        <form onSubmit={handleSubmit} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-500 md:col-span-2">
            Partida
            <select
              required
              value={budgetLineId}
              onChange={(event) => setBudgetLineId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Seleccione una partida</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.code} — {line.name} (disp. {fmt(line.availableAmount)})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Fecha de ejecución
            <input
              type="date"
              required
              value={executionDate}
              onChange={(event) => setExecutionDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Valor ejecutado
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500 md:col-span-2">
            Descripción
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
            <input
              type="checkbox"
              checked={extraordinary}
              onChange={(event) => setExtraordinary(event.target.checked)}
            />
            Gasto extraordinario (no recurrente). Queda fuera de la base del presupuesto siguiente.
          </label>
          <div>
            <Btn type="submit" disabled={saving || !activeBuildingId || !budgetLineId}>
              {saving ? 'Registrando...' : 'Registrar ejecución'}
            </Btn>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Partida', 'Presupuestado', 'Ejecutado', 'Disponible'].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-slate-400">
                  Cargando partidas...
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-slate-400">
                  No hay partidas para la vigencia seleccionada.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                    {line.code} — {line.name}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-500">{fmt(line.budgetedAmount)}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                    {fmt(line.executedAmount)}
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-emerald-700">
                    {fmt(line.availableAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(message || error) && (
        <p className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
