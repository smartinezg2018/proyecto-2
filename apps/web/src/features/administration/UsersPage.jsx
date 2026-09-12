import { useState } from "react";
import { Save } from "lucide-react";
import { createUser } from "../../services/api.js";
import { SectionHeader } from "../../components/SectionHeader.jsx";
import { ActionButton } from "../../components/ActionButton.jsx";

const emptyForm = { identification: "", name: "", email: "", status: "active" };

export function UsersPage() {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await createUser(form);
      setStatus({ type: "success", message: `Usuario "${response.data.name}" registrado correctamente.` });
      setForm(emptyForm);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof TypeError || error instanceof SyntaxError
          ? "No fue posible conectar con el servidor. Intenta nuevamente."
          : error.message
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Usuarios" subtitle="Registra usuarios administrativos" />

      {status.message && (
        <p role={status.type === "error" ? "alert" : "status"} className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {status.message}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-bold text-slate-900">Registrar usuario</h3>
        <form onSubmit={submitForm} aria-busy={isSaving}>
          <fieldset disabled={isSaving} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
            {[
              ["identification", "Identificación", "text", 50],
              ["name", "Nombre", "text", 150],
              ["email", "Correo electrónico", "email", 150]
            ].map(([name, label, type, maxLength]) => (
              <label key={name}>
                <span className="mb-1 block text-xs font-bold text-slate-500">{label} *</span>
                <input name={name} value={form[name]} onChange={updateField} required type={type} maxLength={maxLength} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Estado *</span>
              <select name="status" value={form.status} onChange={updateField} required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit"><Save size={14} /> {isSaving ? "Guardando..." : "Registrar usuario"}</ActionButton>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
