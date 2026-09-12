import { useState } from 'react';
import { Shield, Plus, AlertTriangle, DollarSign } from 'lucide-react';

import { POLICIES, formatCompactCurrency as fmtM } from '../fixtures.js';
import { StatusBadge as Badge } from '../../components/StatusBadge.jsx';
import { MetricCard } from '../../components/MetricCard.jsx';
import { SectionHeader as SectionHead } from '../../components/SectionHeader.jsx';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';

export function ModuleSeguros() {
  const [activeTab, setActiveTab] = useState('polizas');
  const expiring = POLICIES.filter((p) => p.daysLeft < 30);

  const polStatus = (p) => {
    if (p.daysLeft < 30) return 'Vence pronto';
    if (p.daysLeft < 90) return 'Vence en 5 meses';
    return 'Activa';
  };

  return (
    <div>
      <SectionHead
        title="Seguros y Pólizas"
        subtitle="Gestión de pólizas de seguros y seguimiento a siniestralidad"
        action={
          <Btn>
            <Plus size={14} /> Registrar Póliza
          </Btn>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Pólizas Activas"
          value="5"
          sub="4 aseguradoras distintas"
          icon={Shield}
          color="blue"
        />
        <MetricCard
          label="Próximas a Vencer"
          value={`${expiring.length}`}
          sub="Menos de 30 días"
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          label="Total Asegurado"
          value="$3.53B"
          sub="Valor nominal total COP"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {expiring.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-sm font-bold text-red-800">
              Vencimientos Urgentes — Acción Requerida
            </span>
          </div>
          <div className="space-y-2">
            {expiring.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-red-100"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.coverage}</p>
                  <p className="text-xs text-slate-400">
                    {p.insurer} · {p.id} · Vence: {p.end}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">{p.daysLeft} días</span>
                  <button className="text-xs text-blue-600 font-semibold border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                    Renovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'polizas', label: 'Pólizas Registradas' },
          { key: 'siniestros', label: 'Seguimiento Siniestralidad' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'polizas' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  'Póliza',
                  'Aseguradora',
                  'Activo Cubierto',
                  'Cobertura',
                  'Vigencia',
                  'Valor Asegurado',
                  'Estado'
                ].map((h) => (
                  <th
                    key={h}
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POLICIES.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{p.id}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{p.insurer}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.asset}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.coverage}</td>
                  <td
                    className="px-4 py-3 text-xs text-slate-500"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {p.start} ? {p.end}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-semibold text-slate-700"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {fmtM(p.value)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={polStatus(p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              Registro de Reclamaciones e Indemnizaciones
            </p>
            <Btn variant="secondary">
              <Plus size={13} /> Registrar Siniestro
            </Btn>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  'Radicado',
                  'Fecha',
                  'Póliza',
                  'Descripción',
                  'Estado',
                  'Monto Aprobado',
                  'Monto Recibido'
                ].map((h) => (
                  <th
                    key={h}
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                  RAD-2026-001
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">2026-03-14</td>
                <td className="px-4 py-3 text-sm text-slate-500">POL-2025-003</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  Daño eléctrico planta de emergencia
                </td>
                <td className="px-4 py-3">
                  <Badge label="Activo" />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">$18.500.000</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-600">$18.500.000</td>
              </tr>
              <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                  RAD-2026-002
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">2026-06-08</td>
                <td className="px-4 py-3 text-sm text-slate-500">POL-2025-001</td>
                <td className="px-4 py-3 text-sm text-slate-700">Daño cubierta por granizo</td>
                <td className="px-4 py-3">
                  <Badge label="En mora" />
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">$42.000.000</td>
                <td className="px-4 py-3 text-sm text-slate-300">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
