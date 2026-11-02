import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BILLING_CHART,
  formatCurrency as fmt,
  formatCompactCurrency as fmtM
} from '../fixtures.js';
import { getPortfolio, getUnits } from '../../services/api.js';
import { StatusBadge as Badge } from '../../components/StatusBadge.jsx';
import { MetricCard } from '../../components/MetricCard.jsx';
import { SectionHeader as SectionHead } from '../../components/SectionHeader.jsx';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';

const EMPTY_FILTERS = { unitId: '', period: '', status: '' };
const STATUS_LABELS = new Map([
  ['al_dia', 'Al día'],
  ['pendiente', 'Pendiente'],
  ['en_mora', 'En mora']
]);

export function ModuleFacturacion({ activeBuildingId }) {
  const [tab, setTab] = useState('cartera');
  const [portfolio, setPortfolio] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setUnits([]);
    if (!activeBuildingId) return undefined;

    let cancelled = false;
    getUnits(activeBuildingId)
      .then((response) => {
        if (!cancelled) {
          setUnits((response.data ?? []).filter((unit) => unit.kind === 'apartamento'));
        }
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId]);

  useEffect(() => {
    if (!activeBuildingId) {
      setPortfolio([]);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    getPortfolio(activeBuildingId, filters)
      .then((response) => {
        if (!cancelled) setPortfolio(response.data ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setPortfolio([]);
          setError(requestError.message || 'No fue posible consultar la cartera.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId, filters]);

  const totals = useMemo(
    () =>
      portfolio.reduce(
        (result, row) => ({
          capital: result.capital + row.capital,
          payments: result.payments + row.payments,
          balance: result.balance + row.totalBalance
        }),
        { capital: 0, payments: 0, balance: 0 }
      ),
    [portfolio]
  );

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <div>
      <SectionHead
        title="Facturación y Recaudo"
        subtitle="Control de cartera, facturación y pagos del conjunto"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary">
              <FileText size={13} /> Generar Factura
            </Btn>
            <Btn>
              <Plus size={13} /> Registrar Pago
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Capital facturado"
          value={fmtM(totals.capital)}
          sub="Según los filtros seleccionados"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          label="Pagos aplicados"
          value={fmtM(totals.payments)}
          sub="Sin movimientos reversados"
          icon={BarChart3}
          color="emerald"
        />
        <MetricCard
          label="Saldo pendiente"
          value={fmtM(totals.balance)}
          sub={`${portfolio.filter((row) => row.status === 'en_mora').length} apartamentos en mora`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="flex gap-0 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'cartera', label: 'Estado de Cartera' },
          { key: 'historial', label: 'Historial de Recaudo' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'cartera' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-500">
              Apartamento
              <select
                name="unitId"
                value={filters.unitId}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Todos</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.tower ? `${unit.tower} - ` : ''}
                    {unit.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Periodo
              <input
                type="month"
                name="period"
                value={filters.period}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Estado
              <select
                name="status"
                value={filters.status}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Todos</option>
                <option value="al_dia">Al día</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_mora">En mora</option>
              </select>
            </label>
            <div className="flex items-end">
              <Btn
                variant="secondary"
                onClick={() => setFilters(EMPTY_FILTERS)}
                disabled={!activeBuildingId}
              >
                Limpiar filtros
              </Btn>
            </div>
          </div>

          {!activeBuildingId ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              Selecciona un edificio para consultar su cartera.
            </p>
          ) : error ? (
            <p className="px-4 py-12 text-center text-sm text-red-600">{error}</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Apartamento', 'Capital', 'Intereses', 'Pagos', 'Saldo total', 'Estado'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      Consultando cartera…
                    </td>
                  </tr>
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      No hay apartamentos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  portfolio.map((row) => (
                    <tr key={row.unitId} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">
                        {row.tower ? `${row.tower} - ` : ''}
                        {row.unitNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{fmt(row.capital)}</td>
                      <td className="px-4 py-3 text-sm text-amber-700">{fmt(row.interests)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-700">{fmt(row.payments)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        {fmt(row.totalBalance)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={STATUS_LABELS.get(row.status) ?? row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Recaudo mensual vs Mora · Últimos 6 meses
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={BILLING_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1_000_000).toFixed(0)}M`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => fmtM(value)} />
              <Legend />
              <Bar dataKey="recaudo" fill="#2563eb" radius={[4, 4, 0, 0]} name="Recaudo" />
              <Bar dataKey="mora" fill="#fca5a5" radius={[4, 4, 0, 0]} name="En Mora" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
