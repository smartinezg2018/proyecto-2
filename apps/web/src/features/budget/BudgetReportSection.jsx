import { useEffect, useRef, useState } from 'react';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { formatCurrency as fmt } from '../fixtures.js';
import { getBudgetReport } from '../../services/api.js';

const CURRENT_YEAR = new Date().getFullYear();

function buildCsv(report) {
  const header = ['codigo', 'partida', 'clasificacion', 'presupuestado', 'ejecutado', 'disponible'];
  const rows = (report.lines ?? []).map((line) =>
    [
      line.code,
      `"${String(line.name).replace(/"/g, '""')}"`,
      line.classification,
      line.budgetedAmount,
      line.executedAmount,
      line.availableAmount
    ].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function BudgetReportSection({ activeBuildingId }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [fromDate, setFromDate] = useState(`${CURRENT_YEAR}-01-01`);
  const [toDate, setToDate] = useState(`${CURRENT_YEAR}-12-31`);
  const [lineCode, setLineCode] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    setReport(null);
    setError('');
  }, [activeBuildingId]);

  async function loadReport() {
    if (!activeBuildingId || year === '') return;
    setLoading(true);
    setError('');
    try {
      const response = await getBudgetReport(activeBuildingId, {
        year,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        lineCode: lineCode || undefined
      });
      setReport(response.data);
    } catch (requestError) {
      setReport(null);
      setError(requestError.message || 'No fue posible generar el reporte.');
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([buildCsv(report)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `reporte-presupuesto-${report.year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!printRef.current) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>Reporte presupuestal ${report?.year ?? ''}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        p { font-size: 12px; color: #64748b; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        th { text-transform: uppercase; color: #94a3b8; font-size: 11px; }
      </style></head><body>${printRef.current.innerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Reporte presupuestal</h3>
        <p className="mt-1 text-xs text-slate-500">
          Filtre por vigencia, periodo y partida; descargue CSV o imprima el estado del
          presupuesto.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
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
        <label className="text-xs font-semibold text-slate-500">
          Desde
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Hasta
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Código partida
          <input
            value={lineCode}
            onChange={(event) => setLineCode(event.target.value)}
            placeholder="Opcional"
            maxLength={50}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Btn type="button" onClick={loadReport} disabled={loading || !activeBuildingId}>
          {loading ? 'Generando...' : 'Generar reporte'}
        </Btn>
        <Btn type="button" onClick={downloadCsv} disabled={!report}>
          Descargar CSV
        </Btn>
        <Btn type="button" onClick={printReport} disabled={!report}>
          Imprimir
        </Btn>
      </div>

      {report && (
        <div ref={printRef}>
          <h1 className="text-sm font-bold text-slate-800">
            Reporte presupuestal {report.year}
          </h1>
          <p className="mb-4 text-xs text-slate-500">
            Edificio {report.buildingId} · Periodo {report.fromDate} a {report.toDate}
            {report.lineCode ? ` · Partida ${report.lineCode}` : ''} · Estado{' '}
            {report.budgetStatus || 'sin presupuesto'}
          </p>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Presupuestado
              </p>
              <p className="text-sm font-bold text-slate-800">{fmt(report.totalBudgeted)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Ejecutado
              </p>
              <p className="text-sm font-bold text-slate-800">{fmt(report.totalExecuted)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Disponible
              </p>
              <p className="text-sm font-bold text-slate-800">{fmt(report.totalAvailable)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Partida', 'Clasificación', 'Presupuestado', 'Ejecutado', 'Disponible'].map(
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
                {(report.lines ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-sm text-slate-400">
                      Sin partidas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  report.lines.map((line) => (
                    <tr key={line.budgetLineId} className="border-b border-slate-50">
                      <td className="px-3 py-2 text-sm font-semibold text-slate-800">
                        {line.code} — {line.name}
                      </td>
                      <td className="px-3 py-2 text-sm capitalize text-slate-500">
                        {line.classification}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-500">{fmt(line.budgetedAmount)}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{fmt(line.executedAmount)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-emerald-700">
                        {fmt(line.availableAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
