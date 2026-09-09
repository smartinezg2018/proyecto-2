import { useState } from "react";
import { Package, Wrench, Shield, Receipt, BarChart3, FolderKanban, Plus, Search, Filter, ChevronDown, MoreHorizontal, Calendar, Clock, CheckCircle, AlertCircle, AlertTriangle, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from "recharts";
import { ASSETS, KANBAN, POLICIES, APARTMENTS, BUDGET_ITEMS, BILLING_CHART, PROJECTS, formatCurrency as fmt, formatCompactCurrency as fmtM } from "../fixtures.js";
import { StatusBadge as Badge } from "../../components/StatusBadge.jsx";
import { MetricCard as KPI } from "../../components/MetricCard.jsx";
import { SectionHeader as SectionHead } from "../../components/SectionHeader.jsx";
import { ActionButton as Btn } from "../../components/ActionButton.jsx";

export function ModuleMantenimientos() {
  const cols = [
    { key: "programado", label: "Programado", dot: "bg-blue-500", data: KANBAN.programado },
    { key: "enProceso", label: "En Proceso", dot: "bg-amber-500", data: KANBAN.enProceso },
    { key: "completado", label: "Completado", dot: "bg-emerald-500", data: KANBAN.completado },
  ];

  return (
    <div>
      <SectionHead
        title="Mantenimientos"
        subtitle="Tablero Kanban de mantenimientos preventivos y correctivos"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary"><Calendar size={13} /> Programar</Btn>
            <Btn><Plus size={13} /> Registrar</Btn>
          </div>
        }
      />

      {/* Budget widget */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Balance Presupuestal de Mantenimiento 2026</p>
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs text-slate-400">Asignado</p>
            <p className="text-xl font-bold text-slate-800">{fmtM(180000000)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Ejecutado</p>
            <p className="text-xl font-bold text-blue-600">{fmtM(112000000)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Disponible</p>
            <p className="text-xl font-bold text-emerald-600">{fmtM(68000000)}</p>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Ejecución presupuestal</span>
              <span className="text-xs font-bold text-slate-700">62%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-[62%] transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-4">
        {cols.map(col => (
          <div key={col.key} className="bg-slate-50 rounded-xl border border-slate-200 p-3 min-h-[400px]">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
              <span className="text-sm font-bold text-slate-700">{col.label}</span>
              <span className="ml-auto text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{col.data.length}</span>
            </div>
            <div className="space-y-2.5">
              {col.data.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-3.5 hover:shadow-sm transition-all cursor-pointer">
                  <p className="text-sm font-semibold text-slate-800 leading-snug mb-2.5">{item.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    <Badge label={item.type} />
                    <Badge label={item.priority} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                    <Calendar size={11} />
                    <span style={{ fontFamily: "'DM Mono', monospace" }}>{item.date}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.responsible}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-dashed border-slate-200 flex items-center justify-center gap-1">
              <Plus size={12} /> Agregar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
