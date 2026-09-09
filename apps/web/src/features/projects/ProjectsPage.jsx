import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModuleProyectos() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <SectionHead
        title="Proyectos"
        subtitle="Proyectos aprobados en asamblea y su estado de ejecución"
        action={<Btn><Plus size={14} /> Nuevo Proyecto</Btn>}
      />

      {/* Project cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {PROJECTS.map(p => {
          const isSelected = selected === p.id;
          const over = p.spent > p.budget;
          return (
            <div
              key={p.id}
              onClick={() => setSelected(isSelected ? null : p.id)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-blue-400 ring-2 ring-blue-100 shadow-md" : "border-slate-200/80"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-3">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.approved}</p>
                </div>
                <Badge label={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">Presupuesto</p>
                  <p className="text-base font-bold text-slate-800">{fmtM(p.budget)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">Ejecutado</p>
                  <p className={`text-base font-bold ${over ? "text-red-600" : "text-slate-800"}`}>{fmtM(p.spent)}</p>
                </div>
              </div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Avance de obra</span>
                <span className="text-xs font-bold text-slate-700">{p.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${p.status === "Finalizado" ? "bg-emerald-500" : p.status === "En Curso" ? "bg-blue-500" : "bg-slate-300"}`}
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={11} />
                <span>Fecha límite: <span style={{ fontFamily: "'DM Mono', monospace" }}>{p.deadline}</span></span>
              </div>
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  <button className="text-xs text-blue-600 font-semibold hover:underline">Ver hitos</button>
                  <span className="text-slate-200">·</span>
                  <button className="text-xs text-blue-600 font-semibold hover:underline">Actualizar avance</button>
                  {p.status === "En Curso" && (
                    <>
                      <span className="text-slate-200">·</span>
                      <button className="text-xs text-emerald-600 font-semibold hover:underline">Finalizar y rendir cuentas</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cotizaciones table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Cuadro Comparativo de Cotizaciones</h3>
            <p className="text-xs text-slate-400 mt-0.5">Reparación Cubierta Torre B · 3 propuestas evaluadas</p>
          </div>
          <Btn variant="secondary"><Plus size={13} /> Agregar Propuesta</Btn>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Criterio</th>
              {[
                { name: "Constructora Andina SAS", rec: false },
                { name: "Técnicos del Norte Ltda.", rec: true },
                { name: "BuildPro Colombia", rec: false },
              ].map(p => (
                <th key={p.name} className={`px-4 py-3 text-xs font-bold uppercase tracking-wider ${p.rec ? "text-emerald-700 bg-emerald-50" : "text-slate-400"}`}>
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.rec && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold normal-case tracking-normal">Recomendada</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[
              ["Valor Total", "$58.500.000", "$61.000.000", "$72.000.000"],
              ["Plazo de Ejecución", "90 días", "75 días", "120 días"],
              ["Garantía de Obra", "12 meses", "24 meses", "18 meses"],
              ["Experiencia en PH", "8 años", "15 años", "5 años"],
              ["Materiales incluidos", "Parcial", "Total", "Total"],
              ["Referencias verificadas", "2", "5", "1"],
            ].map(([criterio, ...vals]) => (
              <tr key={criterio} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-slate-600">{criterio}</td>
                {vals.map((v, i) => (
                  <td key={i} className={`px-4 py-3 text-sm ${i === 1 ? "bg-emerald-50/40 font-bold text-slate-800" : "text-slate-600"}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
