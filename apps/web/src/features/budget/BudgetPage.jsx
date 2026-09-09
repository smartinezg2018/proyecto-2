import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModulePresupuesto() {
  const [method, setMethod] = useState("Histórica");
  const totalP = BUDGET_ITEMS.reduce((s, b) => s + b.projected, 0);
  const totalE = BUDGET_ITEMS.reduce((s, b) => s + b.executed, 0);
  const execPct = Math.round((totalE / totalP) * 100);

  const chartData = BUDGET_ITEMS.map(b => ({
    name: b.rubro.length > 20 ? b.rubro.substring(0, 20) + "…" : b.rubro,
    proyectado: b.projected / 1_000_000,
    ejecutado: b.executed / 1_000_000,
  }));

  return (
    <div>
      <SectionHead
        title="Presupuesto Anual 2026"
        subtitle="Control de ejecución presupuestal por categorías y rubros"
        action={<Btn><Plus size={14} /> Registrar Ejecución</Btn>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPI label="Presupuesto Total" value={fmtM(totalP)} sub="Aprobado en Asamblea" icon={DollarSign} color="blue" />
        <KPI label="Ejecutado" value={fmtM(totalE)} sub={`${execPct}% del total aprobado`} icon={TrendingUp} color="emerald" />
        <KPI label="Disponible" value={fmtM(totalP - totalE)} sub="Saldo por ejecutar" icon={BarChart3} color="amber" />
      </div>

      {/* Methodology selector */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-slate-500 font-semibold">Metodología:</span>
        {["Base 0", "Mixta", "Histórica"].map(m => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${method === m ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Proyectado vs Ejecutado por Rubro</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-slate-200 inline-block" /><span className="text-xs text-slate-500">Proyectado</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /><span className="text-xs text-slate-500">Ejecutado</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${v}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => `$${v.toFixed(1)}M`} />
            <Bar dataKey="proyectado" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Proyectado" />
            <Bar dataKey="ejecutado" fill="#2563eb" radius={[4, 4, 0, 0]} name="Ejecutado" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Rubro", "Categoría", "Proyectado", "Ejecutado", "Variación", "Progreso"].map(h => (
                <th key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BUDGET_ITEMS.map((b, i) => {
              const pct = Math.round((b.executed / b.projected) * 100);
              const over = b.executed > b.projected;
              return (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{b.rubro}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">{b.category}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtM(b.projected)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtM(b.executed)}</td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                    <span className={over ? "text-red-500" : "text-emerald-600"}>
                      {over ? "+" : "−"}{fmtM(Math.abs(b.executed - b.projected))}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 85 ? "bg-amber-400" : "bg-blue-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${over ? "text-red-500" : "text-slate-600"}`}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
