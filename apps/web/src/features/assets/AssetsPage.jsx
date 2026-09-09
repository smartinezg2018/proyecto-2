import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModuleInventario() {
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const filtered = ASSETS
    .filter(a => filter === "Todos" || a.status === filter)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionHead
        title="Inventario y Activos"
        subtitle="Registro y gestión de activos del conjunto residencial"
        action={<Btn><Plus size={14} /> Registrar Activo</Btn>}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["Todos", "Activo", "Mantenimiento", "Dado de Baja"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <Search size={13} className="text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar activo..."
            className="text-sm outline-none w-40 bg-transparent text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {["Código", "Nombre", "Categoría", "Ubicación", "Estado", "Proveedor", "Costo Inicial"].map(h => (
                <th key={h} className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{a.id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{a.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{a.category}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{a.location}</td>
                <td className="px-4 py-3"><Badge label={a.status} /></td>
                <td className="px-4 py-3 text-sm text-slate-500">{a.provider}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtM(a.cost)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-sm text-slate-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{filtered.length} de {ASSETS.length} activos</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md transition-colors">‹ Anterior</button>
            <button className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md">1</button>
            <button className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md transition-colors">Siguiente ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
