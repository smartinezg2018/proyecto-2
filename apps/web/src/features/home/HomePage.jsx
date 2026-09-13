import { useEffect, useState } from 'react';
import { Package, Shield, Receipt, BarChart3, AlertTriangle, Building2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import {
  getBuildingDashboard,
  formatCurrency as fmt,
  formatCompactCurrency as fmtM
} from '../fixtures.js';
import { getAssets, getUnits } from '../../services/api.js';
import { StatusBadge as Badge } from '../../components/StatusBadge.jsx';
import { MetricCard } from '../../components/MetricCard.jsx';

const PIE_COLORS = ['#10b981', '#ef4444'];

function currentPeriodLabel() {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date());
}

export function ModuleHome({ activeBuilding }) {
  const [assets, setAssets] = useState([]);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeBuilding?.id) {
      setAssets([]);
      setUnits([]);
      setError('');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([getAssets(activeBuilding.id), getUnits(activeBuilding.id)])
      .then(([assetsResponse, unitsResponse]) => {
        if (cancelled) return;
        setAssets(assetsResponse.data ?? []);
        setUnits(unitsResponse.data ?? []);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setAssets([]);
        setUnits([]);
        const message = requestError.message || '';
        if (!/permisos|FORBIDDEN|No cuenta con permisos/i.test(message)) {
          setError(message || 'No fue posible cargar el panel del edificio.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBuilding?.id]);

  if (!activeBuilding) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Building2 size={28} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Panel de Control</h1>
        <p className="mt-2 text-sm text-slate-400">
          Selecciona un edificio en la barra superior para ver su información.
        </p>
      </div>
    );
  }

  const dashboard = getBuildingDashboard(activeBuilding);
  const apartments = dashboard.apartments;
  const policies = dashboard.policies;
  const totalMora = apartments.reduce((sum, apartment) => sum + apartment.balance, 0);
  const moraCount = apartments.filter((apartment) => apartment.status === 'En mora').length;
  const alDia = apartments.filter((apartment) => apartment.status === 'Al día').length;
  const expiringSoon = policies.filter((policy) => policy.daysLeft < 30);
  const assetsInMaintenance = assets.filter((asset) => asset.status === 'en_mantenimiento').length;
  const periodLabel = currentPeriodLabel();

  const pieData = [
    { name: 'Al día', value: alDia },
    { name: 'En mora', value: moraCount }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-sm text-slate-400 mt-0.5 capitalize">
          {activeBuilding.name} · {periodLabel}
        </p>
        {activeBuilding.address && (
          <p className="text-xs text-slate-400 mt-0.5">{activeBuilding.address}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Activos Registrados"
          value={isLoading ? '…' : String(assets.length)}
          sub={
            isLoading
              ? 'Cargando inventario…'
              : `${assetsInMaintenance} en mantenimiento`
          }
          icon={Package}
          color="blue"
        />
        <MetricCard
          label="Pólizas Activas"
          value={String(dashboard.activePolicies)}
          sub={`${dashboard.policiesExpiringSoon} vencen pronto`}
          icon={Shield}
          color="amber"
        />
        <MetricCard
          label="Cartera en Mora"
          value={fmtM(totalMora)}
          sub={`${moraCount} unidades en mora · ${units.length} inmuebles`}
          icon={Receipt}
          color="red"
        />
        <MetricCard
          label="Ejecución Presupuestal"
          value={`${dashboard.budgetExecutionPercent}%`}
          sub="Del presupuesto anual"
          icon={BarChart3}
          color="emerald"
        />
      </div>

      {(expiringSoon.length > 0 || apartments.some((apartment) => apartment.daysLate > 60)) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-600" />
            <span className="text-sm font-bold text-red-800">Alertas Urgentes</span>
          </div>
          <div className="space-y-2">
            {expiringSoon.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-red-100"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{policy.coverage}</p>
                  <p className="text-xs text-slate-400">
                    {policy.insurer} · {policy.id}
                  </p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                  {policy.daysLeft} días
                </span>
              </div>
            ))}
            {apartments
              .filter((apartment) => apartment.daysLate > 60)
              .map((apartment) => (
                <div
                  key={apartment.unit}
                  className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-amber-100"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Unidad {apartment.unit} · {apartment.owner}
                    </p>
                    <p className="text-xs text-slate-400">
                      Cartera crítica · {fmt(apartment.balance)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    {apartment.daysLate} días mora
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Recaudo vs Mora · Últimos 6 meses
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboard.billingChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
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
              <Bar dataKey="recaudo" fill="#2563eb" radius={[4, 4, 0, 0]} name="Recaudo" />
              <Bar dataKey="mora" fill="#fca5a5" radius={[4, 4, 0, 0]} name="En Mora" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Estado de Cartera</h3>
          <ResponsiveContainer width="100%" height={160}>
            <RePieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={68}
                dataKey="value"
                paddingAngle={3}
                strokeWidth={0}
              >
                {pieData.map((_, index) => (
                  <Cell key={pieData[index].name} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
            </RePieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-1">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: PIE_COLORS[index] }}
                />
                <span className="text-xs text-slate-500">
                  {item.name}: <strong className="text-slate-800">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Total mora</p>
            <p className="text-lg font-bold text-red-600">{fmtM(totalMora)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Mantenimientos en Proceso</h3>
          <span className="text-xs text-slate-400">
            {dashboard.maintenanceInProgress.length} activos
          </span>
        </div>
        {dashboard.maintenanceInProgress.length === 0 ? (
          <p className="text-sm text-slate-400">No hay mantenimientos en proceso para este edificio.</p>
        ) : (
          <div className="space-y-2">
            {dashboard.maintenanceInProgress.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.responsible}</p>
                </div>
                <Badge label={item.type} />
                <Badge label={item.priority} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
