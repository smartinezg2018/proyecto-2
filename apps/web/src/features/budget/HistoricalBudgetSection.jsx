import { useEffect, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import { createBudgetFromExecution, getPreviousBudgetExecution } from '../../services/api.js';

const CURRENT_YEAR = new Date().getFullYear();

export function HistoricalBudgetSection({ activeBuildingId, canUpdateBudget }) {
  const [sourceYear, setSourceYear] = useState(CURRENT_YEAR - 1);
  const [targetYear, setTargetYear] = useState(CURRENT_YEAR);
  const [execution, setExecution] = useState(null);
  const [baseAmounts, setBaseAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setExecution(null);
    setBaseAmounts({});
    setMessage('');
    setError('');
  }, [activeBuildingId]);

  async function loadPreviousExecution() {
    if (!activeBuildingId) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await getPreviousBudgetExecution(activeBuildingId, sourceYear);
      setExecution(response.data);
      setTargetYear(Number(sourceYear) + 1);
      setBaseAmounts(
        Object.fromEntries(
          (response.data.lines ?? []).map((line) => [line.sourceLineId, line.executedAmount])
        )
      );
    } catch (requestError) {
      setExecution(null);
      setBaseAmounts({});
      setError(requestError.message || 'No fue posible consultar la ejecución anterior.');
    } finally {
      setLoading(false);
    }
  }

  async function copyExecutionAsBudget() {
    if (!activeBuildingId || !execution?.lines?.length) return;
    setCopying(true);
    setMessage('');
    setError('');
    try {
      const response = await createBudgetFromExecution(activeBuildingId, {
        sourceYear: Number(sourceYear),
        targetYear: Number(targetYear),
        lines: execution.lines.map((line) => ({
          sourceLineId: line.sourceLineId,
          amount: Number(baseAmounts[line.sourceLineId] ?? 0)
        }))
      });
      setMessage(
        `Presupuesto ${response.data.year} creado en borrador con ${response.data.lines.length} partidas.`
      );
    } catch (requestError) {
      setError(requestError.message || 'No fue posible crear el presupuesto base.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Presupuesto desde ejecución anterior</h3>
        <p className="mt-1 text-xs text-slate-500">
          Consulte la ejecución real por partida y úsela como base editable del siguiente año.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[160px_160px_auto]">
        <label className="text-xs font-semibold text-slate-500">
          Año ejecutado
          <input
            type="number"
            min="2000"
            max="2099"
            value={sourceYear}
            onChange={(event) => {
              const year = event.target.value;
              setSourceYear(year);
              setTargetYear(year === '' ? '' : Number(year) + 1);
              setExecution(null);
              setMessage('');
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Año destino
          <input
            type="number"
            value={targetYear}
            readOnly
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <Btn
            type="button"
            variant="secondary"
            onClick={loadPreviousExecution}
            disabled={!activeBuildingId || loading || sourceYear === ''}
          >
            {loading ? 'Consultando...' : 'Consultar ejecución'}
          </Btn>
        </div>
      </div>

      {!activeBuildingId ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Seleccione un edificio para consultar su ejecución presupuestal.
        </p>
      ) : execution && execution.lines.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No existen partidas presupuestales para el año seleccionado.
        </p>
      ) : execution?.lines?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Partida', 'Clasificación', 'Presupuestado', 'Ejecutado', 'Base editable'].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {execution.lines.map((line) => (
                <tr key={line.sourceLineId} className="border-b border-slate-50">
                  <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                    {line.code} — {line.name}
                  </td>
                  <td className="px-3 py-2 text-sm capitalize text-slate-500">
                    {line.classification}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-500">{fmt(line.budgetedAmount)}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                    {fmt(line.executedAmount)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={baseAmounts[line.sourceLineId] ?? ''}
                      onChange={(event) =>
                        setBaseAmounts((current) => ({
                          ...current,
                          [line.sourceLineId]: event.target.value
                        }))
                      }
                      disabled={!canUpdateBudget}
                      className="w-40 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Ejecutado total: <strong>{fmt(execution.totalExecuted)}</strong>
            </p>
            {canUpdateBudget && (
              <Btn type="button" onClick={copyExecutionAsBudget} disabled={copying}>
                {copying ? 'Creando...' : 'Crear presupuesto base'}
              </Btn>
            )}
          </div>
        </div>
      ) : null}

      {(message || error) && (
        <p className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
