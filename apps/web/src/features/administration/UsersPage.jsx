import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  createUser,
  listUsers,
  listProfiles,
  getBuildings,
  getUserProfiles,
  getUserBuildings,
  assignUserProfiles,
  assignUserBuildings,
  getCurrentUser
} from '../../services/api.js';
import { SectionHeader } from '../../components/SectionHeader.jsx';
import { ActionButton } from '../../components/ActionButton.jsx';
import { hasPermission } from '../../app/permissions.js';

const emptyForm = { identification: '', name: '', email: '', password: '', status: 'active' };

export function UsersPage() {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [permissions, setPermissions] = useState([]);

  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);
  const [assignStatus, setAssignStatus] = useState({ type: '', message: '' });

  const canCreate = hasPermission(permissions, 'users.create');
  const canAssignProfiles = hasPermission(permissions, 'users.assign_profiles');
  const canAssignBuildings = hasPermission(permissions, 'users.assign_buildings');
  const canAssign = canAssignProfiles || canAssignBuildings;

  useEffect(() => {
    getCurrentUser()
      .then((response) => setPermissions(response.data.user.permissions ?? []))
      .catch(() => setPermissions([]));
    refreshUsers();
  }, []);

  useEffect(() => {
    if (!canAssign) return;
    if (canAssignProfiles) {
      listProfiles().then((r) => setProfiles(r.data)).catch(() => {});
    }
    if (canAssignBuildings) {
      getBuildings().then((r) => setBuildings(r.data)).catch(() => {});
    }
  }, [canAssign, canAssignProfiles, canAssignBuildings]);

  useEffect(() => {
    if (!selectedUserId || !canAssign) {
      setSelectedProfileIds([]);
      setSelectedBuildingIds([]);
      return;
    }
    const requests = [];
    if (canAssignProfiles) requests.push(getUserProfiles(selectedUserId));
    else requests.push(Promise.resolve({ data: { profileIds: [] } }));
    if (canAssignBuildings) requests.push(getUserBuildings(selectedUserId));
    else requests.push(Promise.resolve({ data: { buildingIds: [] } }));

    Promise.all(requests)
      .then(([profilesResponse, buildingsResponse]) => {
        setSelectedProfileIds(profilesResponse.data.profileIds);
        setSelectedBuildingIds(buildingsResponse.data.buildingIds);
      })
      .catch((error) => setAssignStatus({ type: 'error', message: error.message }));
  }, [selectedUserId, canAssign, canAssignProfiles, canAssignBuildings]);

  function refreshUsers() {
    listUsers()
      .then((response) => setUsers(response.data))
      .catch(() => {});
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await createUser(form);
      setStatus({
        type: 'success',
        message: `Usuario "${response.data.name}" registrado correctamente.`
      });
      setForm(emptyForm);
      refreshUsers();
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

  function toggleId(list, id) {
    return list.includes(id) ? list.filter((current) => current !== id) : [...list, id];
  }

  async function saveAssignments() {
    if (!selectedUserId || !canAssign) return;
    setAssignStatus({ type: '', message: '' });
    try {
      if (canAssignProfiles) await assignUserProfiles(selectedUserId, selectedProfileIds);
      if (canAssignBuildings) await assignUserBuildings(selectedUserId, selectedBuildingIds);
      setAssignStatus({ type: 'success', message: 'Asignaciones actualizadas correctamente.' });
    } catch (error) {
      setAssignStatus({ type: 'error', message: error.message });
    }
  }

  return (
    <div>
      <SectionHeader title="Usuarios" subtitle="Consulta y administra usuarios del sistema" />

      {status.message && (
        <p
          role={status.type === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
        >
          {status.message}
        </p>
      )}

      {canCreate && (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-bold text-slate-900">Registrar usuario</h3>
        <form onSubmit={submitForm} aria-busy={isSaving}>
          <fieldset disabled={isSaving} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
            {[
              ['identification', 'Identificación', 'text', 50],
              ['name', 'Nombre', 'text', 150],
              ['email', 'Correo electrónico', 'email', 150],
              ['password', 'Contraseña', 'password', 128]
            ].map(([name, label, type, maxLength]) => (
              <label key={name}>
                <span className="mb-1 block text-xs font-bold text-slate-500">{label} *</span>
                <input
                  name={name}
                  value={form[name]}
                  onChange={updateField}
                  required
                  type={type}
                  maxLength={maxLength}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-500">Estado *</span>
              <select
                name="status"
                value={form.status}
                onChange={updateField}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <ActionButton type="submit">
                <Save size={14} /> {isSaving ? 'Guardando...' : 'Registrar usuario'}
              </ActionButton>
            </div>
          </fieldset>
        </form>
      </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-800">{user.name}</td>
                <td className="px-3 py-2 text-slate-600">{user.email}</td>
                <td className="px-3 py-2 text-slate-600">{user.status}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-xs text-slate-400">
                  No hay usuarios para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canAssign && (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-bold text-slate-900">Asignar perfiles y edificios</h3>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-bold text-slate-500">Usuario</span>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Seleccione un usuario...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.email}
              </option>
            ))}
          </select>
        </label>

        {selectedUserId && (
          <>
            {assignStatus.message && (
              <p
                role={assignStatus.type === 'error' ? 'alert' : 'status'}
                className={`mb-4 rounded-lg px-4 py-3 text-sm ${assignStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
              >
                {assignStatus.message}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {canAssignProfiles && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">Perfiles</p>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {profiles.length === 0 && (
                    <p className="text-xs text-slate-400">No hay perfiles registrados.</p>
                  )}
                  {profiles.map((profile) => (
                    <label key={profile.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedProfileIds.includes(profile.id)}
                        onChange={() =>
                          setSelectedProfileIds(toggleId(selectedProfileIds, profile.id))
                        }
                      />
                      <span>{profile.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              )}

              {canAssignBuildings && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">Edificios</p>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {buildings.length === 0 && (
                    <p className="text-xs text-slate-400">No hay edificios registrados.</p>
                  )}
                  {buildings.map((building) => (
                    <label key={building.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedBuildingIds.includes(building.id)}
                        onChange={() =>
                          setSelectedBuildingIds(toggleId(selectedBuildingIds, building.id))
                        }
                      />
                      <span>{building.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              )}
            </div>

            <div className="mt-4">
              <ActionButton type="button" onClick={saveAssignments}>
                <Save size={14} /> Guardar asignaciones
              </ActionButton>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}
