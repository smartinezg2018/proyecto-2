import { useEffect, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import {
  listAnnualBudgets,
  registerAnnualBudget,
  updateAnnualBudgetStatus
} from '../../services/api.js';

const EMPTY_LINE = { code: '', name: '', classification: 'gasto', amount: '' };
const CURRENT_YEAR = new Date().getFullYear();

export function AnnualBudgetSection({ activeBuildingId, canUpdateBudget }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [status, setStatus] = useState('borrador');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refreshBudgets() {
    if (!activeBuildingId) {
      setBudgets([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await listAnnualBudgets(activeBuildingId, year);
      setBudgets(response.data ?? []);
    } catch (requestError) {
      setBudgets([]);
      setError(requestError.message || 'No fue posible consultar los presupuestos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMessage('');
    setError('');
    refreshBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuildingId, year]);

  function updateLine(index, field, value) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    );
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (!activeBuildingId || !canUpdateBudget) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await registerAnnualBudget(activeBuildingId, {
        year: Number(year),
        status,
        lines: lines.map((line) => ({
          code: line.code,
          name: line.name,
          classification: line.classification,
          amount: Number(line.amount)
        }))
      });
      setMessage(
        `Presupuesto ${response.data.year} v${response.data.version} registrado (${response.data.status}).`
      );
      setLines([{ ...EMPTY_LINE }]);
      await refreshBudgets();
    } catch (requestError) {
      setError(requestError.message || 'No fue posible registrar el presupuesto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(budgetId, nextStatus) {
    if (!activeBuildingId || !canUpdateBudget) return;
    setError('');
    setMessage('');
    try {
      const response = await updateAnnualBudgetStatus(activeBuildingId, budgetId, nextStatus);
      setMessage(`Presupuesto actualizado a estado ${response.data.status}.`);
      await refreshBudgets();
    } catch (requestError) {
      setError(requestError.message || 'No fue posible actualizar el estado.');
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Registrar presupuesto anual</h3>
        <p className="mt-1 text-xs text-slate-500">
          Defina vigencia, partidas, valores y clasificación de ingresos o gastos. Cada registro
          genera una versión del presupuesto.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500">
            Vigencia (año)
            <input
              type="number"
              min="2000"
              max="2100"
              required
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Estado inicial
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={!canUpdateBudget}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="borrador">Elaboración (borrador)</option>
              <option value="aprobado">Aprobado</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Código', 'Nombre', 'Clasificación', 'Valor'].map((heading) => (
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
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-slate-50">
                  <td className="px-3 py-2">
                    <input
                      required
                      value={line.code}
                      onChange={(event) => updateLine(index, 'code', event.target.value)}
                      disabled={!canUpdateBudget}
                      className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      required
                      value={line.name}
                      onChange={(event) => updateLine(index, 'name', event.target.value)}
                      disabled={!canUpdateBudget}
                      className="w-full min-w-[160px] rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.classification}
                      onChange={(event) => updateLine(index, 'classification', event.target.value)}
                      disabled={!canUpdateBudget}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      <option value="gasto">Gasto</option>
                      <option value="ingreso">Ingreso</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={line.amount}
                      onChange={(event) => updateLine(index, 'amount', event.target.value)}
                      disabled={!canUpdateBudget}
                      className="w-36 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canUpdateBudget && (
          <div className="flex flex-wrap gap-2">
            <Btn
              type="button"
              variant="secondary"
              onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
            >
              Agregar partida
            </Btn>
            <Btn type="submit" disabled={saving || !activeBuildingId}>
              {saving ? 'Guardando...' : 'Registrar presupuesto'}
            </Btn>
          </div>
        )}
      </form>

      <div className="mt-6">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Versiones registradas {loading ? '(cargando...)' : ''}
        </h4>
        {!activeBuildingId ? (
          <p className="text-sm text-slate-400">Seleccione un edificio para ver sus presupuestos.</p>
        ) : budgets.length === 0 ? (
          <p className="text-sm text-slate-400">No hay presupuestos para la vigencia seleccionada.</p>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {budget.year} · versión {budget.version}
                    </p>
                    <p className="text-xs capitalize text-slate-500">Estado: {budget.status}</p>
                  </div>
                  {canUpdateBudget && budget.status === 'borrador' && (
                    <Btn
                      type="button"
                      variant="secondary"
                      onClick={() => handleStatusChange(budget.id, 'aprobado')}
                    >
                      Aprobar
                    </Btn>
                  )}
                </div>
                <ul className="space-y-1 text-sm text-slate-600">
                  {budget.lines.map((line) => (
                    <li key={line.id}>
                      {line.code} — {line.name} ({line.classification}): {fmt(line.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {(message || error) && (
        <p className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
