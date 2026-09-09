import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModuleFacturacion() {
  const [tab, setTab] = useState("cartera");
  const totalMora = APARTMENTS.reduce((s, a) => s + a.balance, 0);
  const moraCount = APARTMENTS.filter(a => a.status === "En mora").length;
  const recaudoPct = Math.round((APARTMENTS.filter(a => a.status === "Al día").length / APARTMENTS.length) * 100);

  return (
    <div>
      <SectionHead
        title="Facturación y Recaudo"
        subtitle="Control de cartera, facturación y pagos del conjunto"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary"><FileText size={13} /> Generar Factura</Btn>
            <Btn><Plus size={13} /> Registrar Pago</Btn>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPI label="Recaudo del Mes" value={fmtM(9400000)} sub="Julio 2026" icon={TrendingUp} color="emerald" />
        <KPI label="Cartera en Mora" value={fmtM(totalMora)} sub={`${moraCount} apartamentos`} icon={AlertTriangle} color="red" />
        <KPI label="% de Recaudo" value={`${recaudoPct}%`} sub="Sobre cuota ordinaria mensual" icon={BarChart3} color="blue" />
      </div>

      <div className="flex gap-0 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[{ key: "cartera", label: "Estado de Cartera" }, { key: "historial", label: "Historial de Recaudo" }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cartera" ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Unidad", "Propietario", "Estado", "Días Mora", "Saldo Pendiente", "Último Pago", "Acciones"].map(h => (
                  <th key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APARTMENTS.map(a => (
                <tr key={a.unit} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${a.daysLate > 60 ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800" style={{ fontFamily: "'DM Mono', monospace" }}>Apto {a.unit}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{a.owner}</td>
                  <td className="px-4 py-3"><Badge label={a.status} /></td>
                  <td className="px-4 py-3 text-sm" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {a.daysLate > 0 ? <span className="text-red-600 font-bold">{a.daysLate}d</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {a.balance > 0 ? <span className="text-red-600">{fmt(a.balance)}</span> : <span className="text-emerald-600">$0</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400" style={{ fontFamily: "'DM Mono', monospace" }}>{a.lastPayment}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Total mora: <strong className="text-red-600">{fmt(totalMora)}</strong></span>
              <span>Aptos al día: <strong className="text-emerald-600">{APARTMENTS.filter(a => a.status === "Al día").length}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Recaudo mensual vs Mora — Últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={BILLING_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtM(v)} />
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
