import { useEffect, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import { getBudgetComparison } from '../../services/api.js';

const CURRENT_YEAR = new Date().getFullYear();

function alertLabel(alert) {
  if (alert === 'sobreejecucion') return 'Sobreejecución';
  if (alert === 'baja_ejecucion') return 'Baja ejecución';
  return 'En rango';
}

function rowClass(alert) {
  if (alert === 'sobreejecucion') return 'bg-red-50/80';
  if (alert === 'baja_ejecucion') return 'bg-amber-50/80';
  return '';
}

function formatPercent(value) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function BudgetComparisonSection({ activeBuildingId }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadComparison() {
    if (!activeBuildingId || year === '') return;
    setLoading(true);
    setError('');
    try {
      const response = await getBudgetComparison(activeBuildingId, year);
      setComparison(response.data);
    } catch (requestError) {
      setComparison(null);
      setError(requestError.message || 'No fue posible comparar el presupuesto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setComparison(null);
    setError('');
  }, [activeBuildingId, year]);

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Comparar presupuesto y ejecución</h3>
        <p className="mt-1 text-xs text-slate-500">
          Identifique desviaciones por partida: variación en valor, porcentaje y alertas de
          sobreejecución o baja ejecución.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-slate-500">
          Vigencia
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="mt-1 w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <Btn type="button" onClick={loadComparison} disabled={loading || !activeBuildingId}>
          {loading ? 'Comparando...' : 'Comparar'}
        </Btn>
      </div>

      {comparison && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Presupuestado
              </p>
              <p className="text-sm font-bold text-slate-800">{fmt(comparison.totalBudgeted)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Ejecutado
              </p>
              <p className="text-sm font-bold text-slate-800">{fmt(comparison.totalExecuted)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Variación
              </p>
              <p className="text-sm font-bold text-slate-800">
                {fmt(comparison.totalVariance)} ({formatPercent(comparison.totalVariancePercent)})
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Alertas
              </p>
              <p className="text-sm font-bold text-slate-800">
                {comparison.overExecutedCount} sobre · {comparison.underExecutedCount} baja
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    'Partida',
                    'Presupuestado',
                    'Ejecutado',
                    'Variación',
                    '%',
                    'Alerta'
                  ].map((heading) => (
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
                {(comparison.lines ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-sm text-slate-400">
                      No hay presupuesto para la vigencia seleccionada.
                    </td>
                  </tr>
                ) : (
                  comparison.lines.map((line) => (
                    <tr
                      key={line.sourceLineId}
                      className={`border-b border-slate-50 ${rowClass(line.alert)}`}
                    >
                      <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                        {line.code} — {line.name}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-500">{fmt(line.budgetedAmount)}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{fmt(line.executedAmount)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                        {fmt(line.varianceAmount)}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                        {formatPercent(line.variancePercent)}
                      </td>
                      <td className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                        {alertLabel(line.alert)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {comparison.budgetStatus && (
            <p className="mt-3 text-xs text-slate-400">
              Base de comparación: presupuesto {comparison.budgetStatus} (id {comparison.budgetId}).
            </p>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
