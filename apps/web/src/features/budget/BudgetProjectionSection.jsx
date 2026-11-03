import { useEffect, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import { previewBudgetProjection, registerAnnualBudget } from '../../services/api.js';

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function annualProjected(category) {
  return roundMoney(category.months.reduce((sum, month) => sum + month.projectedAmount, 0));
}

export function BudgetProjectionSection({ activeBuildingId, canUpdateBudget }) {
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [month, setMonth] = useState('');
  const [globalPercent, setGlobalPercent] = useState('0');
  const [percents, setPercents] = useState({});
  const [manualAmounts, setManualAmounts] = useState({});
  const [extraLines, setExtraLines] = useState([]);
  const [draftLine, setDraftLine] = useState({ code: '', name: '', amount: '' });
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setProjection(null);
    setPercents({});
    setManualAmounts({});
    setExtraLines([]);
    setMessage('');
    setError('');
  }, [activeBuildingId]);

  useEffect(() => {
    if (!activeBuildingId || year === '') return undefined;
    const invalidPercent = Object.values(percents).some(
      (value) => value !== '' && !Number.isFinite(Number(value))
    );
    if (invalidPercent) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const manualLines = extraLines
          .filter(
            (line) =>
              line.code.trim() &&
              line.name.trim() &&
              line.amount !== '' &&
              Number.isFinite(Number(line.amount))
          )
          .map((line) => ({
            code: line.code.trim(),
            name: line.name.trim(),
            amount: Number(line.amount)
          }));
        const response = await previewBudgetProjection(activeBuildingId, {
          year: Number(year),
          ...(month ? { month: Number(month) } : {}),
          increments: Object.entries(percents)
            .filter(([code, value]) => value !== '' && manualAmounts[code] == null)
            .map(([code, value]) => ({ code, percent: Number(value) })),
          overrides: Object.entries(manualAmounts)
            .filter(([, value]) => value !== '' && Number.isFinite(Number(value)))
            .map(([code, value]) => ({ code, amount: Number(value) })),
          manualLines
        });
        if (!cancelled) setProjection(response.data);
      } catch (requestError) {
        if (!cancelled) {
          setProjection(null);
          setError(requestError.message || 'No fue posible calcular la proyección.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeBuildingId, year, month, percents, manualAmounts, extraLines]);

  function applyGlobalPercent() {
    if (!projection || !Number.isFinite(Number(globalPercent))) return;
    const value = globalPercent === '' ? '0' : globalPercent;
    setPercents(
      Object.fromEntries(
        projection.categories
          .filter((category) => category.source !== 'manual' && manualAmounts[category.code] == null)
          .map((category) => [category.code, value])
      )
    );
  }

  function addManualLine() {
    const code = draftLine.code.trim().toUpperCase();
    const name = draftLine.name.trim();
    const amount = Number(draftLine.amount);
    if (!code || !name || !Number.isFinite(amount) || amount < 0) {
      setError('Indique código, nombre y valor anual de la partida nueva.');
      return;
    }
    if (extraLines.some((line) => line.code.trim().toUpperCase() === code)) {
      setError('Esa partida manual ya fue agregada.');
      return;
    }
    setError('');
    setExtraLines((current) => [...current, { code, name, amount: draftLine.amount }]);
    setDraftLine({ code: '', name: '', amount: '' });
  }

  async function saveProjection() {
    if (!activeBuildingId || !canUpdateBudget || !projection) return;
    const lines = projection.categories
      .map((category) => ({
        code: category.code,
        name: category.name,
        classification: 'gasto',
        amount: annualProjected(category)
      }))
      .filter((line) => line.amount > 0);
    if (lines.length === 0) {
      setError('La proyección anual es cero. Ajuste la base o los porcentajes antes de registrar.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await registerAnnualBudget(activeBuildingId, {
        year: projection.targetYear,
        status: 'borrador',
        lines
      });
      setMessage(
        `Presupuesto ${response.data.year} v${response.data.version} registrado con el gasto proyectado del año.`
      );
    } catch (requestError) {
      setError(requestError.message || 'No fue posible registrar la proyección.');
    } finally {
      setSaving(false);
    }
  }

  const periodLabel = month ? MONTHS[Number(month) - 1] : `año ${year || ''}`;

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Proyección de gasto</h3>
        <p className="mt-1 text-xs text-slate-500">
          Toma los gastos del año anterior, deja por fuera los extraordinarios y los demás no
          recurrentes, y aplica un porcentaje de incremento a cada partida. El gasto al final del
          periodo es la suma de esos valores. Puede fijar una partida a mano o agregar una que no
          se ejecutó el año anterior.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[140px_180px_140px_auto]">
        <label className="text-xs font-semibold text-slate-500">
          Año base
          <input
            type="number"
            min="2000"
            max="2099"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setMessage('');
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Discriminar por mes
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Todos los meses</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Crecimiento (%)
          <input
            type="number"
            step="0.01"
            min="-100"
            max="1000"
            value={globalPercent}
            onChange={(event) => setGlobalPercent(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end">
          <Btn type="button" variant="secondary" onClick={applyGlobalPercent} disabled={!projection}>
            Aplicar a todas las partidas
          </Btn>
        </div>
      </div>

      {!activeBuildingId ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Seleccione un edificio para proyectar su gasto.
        </p>
      ) : (
        <>
          {projection?.basis === 'administracion' && (
            <p className="mb-3 text-xs text-amber-700">
              Este año no tiene partidas de gasto. La base usada son los pagos de administración;
              las multas y los valores marcados como no administración quedan por fuera.
            </p>
          )}

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Base {periodLabel}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {projection ? fmt(projection.totalBase) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Excluido no recurrente
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {projection ? fmt(projection.totalExcluded) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                Gasto al final de {periodLabel}
              </p>
              <p className="mt-1 text-lg font-bold text-blue-700">
                {loading && !projection ? 'Calculando...' : projection ? fmt(projection.totalProjected) : '—'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Partida', 'Base del periodo', 'Crecimiento %', 'Valor manual', 'Proyectado'].map(
                    (heading) => (
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
                {(projection?.categories ?? []).map((category) => (
                  <tr key={category.code} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                      {category.code} — {category.name}
                      {category.source === 'manual' && (
                        <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          Nueva
                        </span>
                      )}
                      {category.manual && category.source !== 'manual' && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">{fmt(category.baseAmount)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="-100"
                        max="1000"
                        disabled={category.source === 'manual' || manualAmounts[category.code] != null}
                        value={
                          category.source === 'manual'
                            ? '0'
                            : (percents[category.code] ?? String(category.incrementPercent))
                        }
                        onChange={(event) =>
                          setPercents((current) => ({
                            ...current,
                            [category.code]: event.target.value
                          }))
                        }
                        className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {category.source === 'manual' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExtraLines((current) =>
                              current.filter(
                                (line) => line.code.trim().toUpperCase() !== category.code
                              )
                            )
                          }
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Quitar
                        </button>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Opcional"
                          value={manualAmounts[category.code] ?? ''}
                          onChange={(event) =>
                            setManualAmounts((current) => {
                              const next = { ...current };
                              if (event.target.value === '') delete next[category.code];
                              else next[category.code] = event.target.value;
                              return next;
                            })
                          }
                          className="w-32 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                      {fmt(category.projectedAmount)}
                    </td>
                  </tr>
                ))}
                {projection && projection.categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-sm text-slate-400">
                      No hay gastos recurrentes para el año seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-lg border border-slate-100 p-4">
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Partida que no se ejecutó el año anterior
            </h4>
            <p className="mb-3 text-xs text-slate-500">
              El valor anual se reparte en partes iguales entre los doce meses y entra en la suma
              del gasto proyectado.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_160px_auto]">
              <input
                value={draftLine.code}
                onChange={(event) =>
                  setDraftLine((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="Código"
                maxLength={50}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={draftLine.name}
                onChange={(event) =>
                  setDraftLine((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nombre de la partida"
                maxLength={255}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftLine.amount}
                onChange={(event) =>
                  setDraftLine((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="Valor anual"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <Btn type="button" variant="secondary" onClick={addManualLine}>
                Agregar partida
              </Btn>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Excluidos del cálculo
            </h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Concepto', 'Motivo', 'Valor excluido'].map((heading) => (
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
                {(projection?.excluded ?? []).map((item) => (
                  <tr key={item.code} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-sm text-slate-700">{item.name}</td>
                    <td className="px-3 py-2 text-sm text-slate-500">{item.reason}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-700">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!month && (projection?.categories.length ?? 0) > 0 && (
            <div className="mt-5 overflow-x-auto">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Proyectado por partida y mes
              </h4>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Partida
                    </th>
                    {MONTHS.map((name) => (
                      <th
                        key={name}
                        className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-400"
                      >
                        {name.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projection.categories.map((category) => (
                    <tr key={`month-${category.code}`} className="border-b border-slate-50">
                      <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                        {category.code}
                      </td>
                      {category.months.map((item) => (
                        <td key={item.month} className="px-2 py-2 text-xs text-slate-600">
                          {fmt(item.projectedAmount)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Discriminación mensual
            </h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Mes', 'Base', 'Proyectado', 'Excluido'].map((heading) => (
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
                {(projection?.months ?? []).map((item) => {
                  const selected = String(item.month) === String(month);
                  return (
                    <tr
                      key={item.month}
                      className={`border-b border-slate-50 ${selected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setMonth(selected ? '' : String(item.month))}
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          {MONTHS[item.month - 1]}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">{fmt(item.baseAmount)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                        {fmt(item.projectedAmount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-500">{fmt(item.excludedAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canUpdateBudget && projection && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Registrar guarda el gasto proyectado de los doce meses para {projection.targetYear},
                aunque esté viendo un solo mes.
              </p>
              <Btn type="button" onClick={saveProjection} disabled={saving || loading}>
                {saving ? 'Guardando...' : `Registrar presupuesto ${projection.targetYear}`}
              </Btn>
            </div>
          )}
        </>
      )}

      {(message || error) && (
        <p className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
