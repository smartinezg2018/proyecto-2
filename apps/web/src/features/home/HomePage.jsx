import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModuleHome() {
  const totalMora = APARTMENTS.reduce((s, a) => s + a.balance, 0);
  const moraCount = APARTMENTS.filter(a => a.status === "En mora").length;
  const alDia = APARTMENTS.filter(a => a.status === "Al día").length;
  const expiringSoon = POLICIES.filter(p => p.daysLeft < 30);

  const pieData = [
    { name: "Al día", value: alDia },
    { name: "En mora", value: moraCount },
  ];
  const PIE_COLORS = ["#10b981", "#ef4444"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-sm text-slate-400 mt-0.5">Conjunto Residencial El Nogal · Agosto 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Activos Registrados" value="8" sub="2 en mantenimiento" icon={Package} color="blue" />
        <KPI label="Pólizas Activas" value="5" sub="2 vencen pronto" icon={Shield} color="amber" />
        <KPI label="Cartera en Mora" value={fmtM(totalMora)} sub={`${moraCount} aptos en mora`} icon={Receipt} color="red" />
        <KPI label="Ejecución Presupuestal" value="58%" sub="Del presupuesto anual" icon={BarChart3} color="emerald" />
      </div>

      {/* Alerts */}
      {expiringSoon.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-600" />
            <span className="text-sm font-bold text-red-800">Alertas Urgentes</span>
          </div>
          <div className="space-y-2">
            {expiringSoon.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.coverage}</p>
                  <p className="text-xs text-slate-400">{p.insurer} · {p.id}</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{p.daysLeft} días</span>
              </div>
            ))}
            {APARTMENTS.filter(a => a.daysLate > 60).map(a => (
              <div key={a.unit} className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-amber-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Apto {a.unit} — {a.owner}</p>
                  <p className="text-xs text-slate-400">Cartera crítica · {fmt(a.balance)}</p>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">{a.daysLate} días mora</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Recaudo vs Mora — Últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BILLING_CHART} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtM(v)} />
              <Bar dataKey="recaudo" fill="#2563eb" radius={[4, 4, 0, 0]} name="Recaudo" />
              <Bar dataKey="mora" fill="#fca5a5" radius={[4, 4, 0, 0]} name="En Mora" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Estado de Cartera</h3>
          <ResponsiveContainer width="100%" height={160}>
            <RePieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" paddingAngle={3} strokeWidth={0}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
            </RePieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-1">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-xs text-slate-500">{d.name}: <strong className="text-slate-800">{d.value}</strong></span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">Total mora</p>
            <p className="text-lg font-bold text-red-600">{fmtM(totalMora)}</p>
          </div>
        </div>
      </div>

      {/* Active maintenance */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Mantenimientos en Proceso</h3>
          <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">Ver todos →</span>
        </div>
        <div className="space-y-2">
          {KANBAN.enProceso.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{m.title}</p>
                <p className="text-xs text-slate-400">{m.responsible}</p>
              </div>
              <Badge label={m.type} />
              <Badge label={m.priority} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
