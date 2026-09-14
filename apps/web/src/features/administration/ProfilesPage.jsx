import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { createProfile, getPermissions, listProfiles, getCurrentUser } from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';
import { hasPermission } from '../../app/permissions.js';

const emptyForm = { name: '', description: '', permissionIds: [] };

export function ProfilesPage() {
  const [form, setForm] = useState(emptyForm);
  const [permissions, setPermissions] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const canCreate = hasPermission(userPermissions, 'profiles.create');

  useEffect(() => {
    getCurrentUser()
      .then((response) => setUserPermissions(response.data.user.permissions ?? []))
      .catch(() => setUserPermissions([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      setIsLoading(true);
      setLoadError('');
      try {
        const profilesResponse = await listProfiles();
        if (!controller.signal.aborted) setProfiles(profilesResponse.data);
        if (canCreate) {
          const response = await getPermissions(controller.signal);
          if (!controller.signal.aborted) setPermissions(response.data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError('No fue posible cargar los perfiles. Intenta nuevamente.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadData();
    return () => controller.abort();
  }, [loadAttempt, canCreate]);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function togglePermission(permissionId) {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId]
    }));
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!canCreate || isSaving || isLoading || loadError) return;
    setIsSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await createProfile(form);
      setStatus({
        type: 'success',
        message: `Perfil "${response.data.name}" creado correctamente.`
      });
      setForm(emptyForm);
      setLoadAttempt((attempt) => attempt + 1);
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error instanceof TypeError || error instanceof SyntaxError
            ? 'No fue posible conectar con el servidor. Intenta nuevamente.'
            : error.message
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Perfiles"
        subtitle="Consulta perfiles y define funcionalidades permitidas"
      />

      {status.message && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {status.message}
        </p>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3">
          <p role="alert" className="mb-3 text-sm text-red-700">
            {loadError}
          </p>
          <ActionButton
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            variant="secondary"
          >
            Reintentar
          </ActionButton>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-800">{profile.name}</td>
                <td className="px-3 py-2 text-slate-600">
                  {profile.description || 'Sin descripción'}
                </td>
              </tr>
            ))}
            {!isLoading && profiles.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-xs text-slate-400">
                  No hay perfiles registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-base font-bold text-slate-900">Crear perfil</h3>
          <form onSubmit={submitForm} aria-busy={isSaving || isLoading}>
            <fieldset disabled={isSaving} className="grid gap-4 disabled:opacity-60">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Nombre *</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  required
                  maxLength={150}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Descripción</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
              <fieldset
                disabled={isLoading || Boolean(loadError)}
                className="rounded-lg border border-slate-200 p-4"
              >
                <legend className="px-1 text-xs font-bold text-slate-500">
                  Funcionalidades permitidas
                </legend>
                {isLoading && (
                  <p role="status" className="text-sm text-slate-400">
                    Cargando funcionalidades...
                  </p>
                )}
                {!isLoading && !loadError && permissions.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No hay funcionalidades disponibles. Puedes crear el perfil sin permisos.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      {permission.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={isLoading || Boolean(loadError)} className="disabled:opacity-60">
                <ActionButton type="submit">
                  <Save size={14} /> {isSaving ? 'Guardando...' : 'Crear perfil'}
                </ActionButton>
              </fieldset>
            </fieldset>
          </form>
        </div>
      )}
    </div>
  );
}
