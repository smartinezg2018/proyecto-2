const statusClasses = {
  Activo: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Mantenimiento: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "Dado de Baja": "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  "Al día": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "En mora": "bg-red-50 text-red-700 ring-1 ring-red-200",
  Activa: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Vence pronto": "bg-red-50 text-red-700 ring-1 ring-red-200",
  "Activa·largo": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Preventivo: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  Correctivo: "bg-red-50 text-red-600 ring-1 ring-red-100",
  Alta: "bg-red-50 text-red-700 ring-1 ring-red-100",
  Media: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  Baja: "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
  "En Curso": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Aprobado: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Finalizado: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export function StatusBadge({ label }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClasses[label] ?? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
      {label}
    </span>
  );
}
