import { useEffect, useRef, useState } from 'react';
import { getCurrentUser, getMyBuildings, logout } from '../services/api.js';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { ModuleHome } from '../features/home/HomePage.jsx';
import { ModuleInventario } from '../features/assets/AssetsPage.jsx';
import { ModuleMantenimientos } from '../features/maintenance/MaintenancePage.jsx';
import { ModuleSeguros } from '../features/insurance/InsurancePage.jsx';
import { ModuleFacturacion } from '../features/billing/BillingPage.jsx';
import { ModulePresupuesto } from '../features/budget/BudgetPage.jsx';
import { ModuleProyectos } from '../features/projects/ProjectsPage.jsx';
import { BuildingsPage } from '../features/administration/BuildingsPage.jsx';
import { UnitsPage } from '../features/administration/UnitsPage.jsx';
import { UsersPage } from '../features/administration/UsersPage.jsx';
import { ProfilesPage } from '../features/administration/ProfilesPage.jsx';
import { AuditPage } from '../features/administration/AuditPage.jsx';
import {
  Package,
  Wrench,
  Shield,
  Receipt,
  BarChart3,
  FolderKanban,
  Bell,
  Search,
  Building2,
  Home,
  ChevronDown,
  ChevronRight,
  Menu,
  Settings,
  DoorOpen,
  Users,
  ShieldCheck,
  ClipboardList,
  LogOut,
  Check
} from 'lucide-react';
import { hasPermission } from './permissions.js';

const ACTIVE_BUILDING_KEY = 'adminph.activeBuildingId';

const NAV = [
  { id: 'home', label: 'Panel General', icon: Home },
  { id: 'edificios', label: 'Edificios', icon: Building2, permission: 'buildings.list' },
  { id: 'inmuebles', label: 'Inmuebles', icon: DoorOpen, permission: 'units.list' },
  { id: 'inventario', label: 'Inventario', icon: Package, permission: 'assets.list' },
  {
    id: 'mantenimientos',
    label: 'Mantenimientos',
    icon: Wrench,
    permission: 'maintenance.view'
  },
  { id: 'seguros', label: 'Seguros y Pólizas', icon: Shield, permission: 'insurance.view' },
  { id: 'facturacion', label: 'Facturación', icon: Receipt, permission: 'billing.view' },
  { id: 'presupuesto', label: 'Presupuesto', icon: BarChart3, permission: 'budget.view' },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban, permission: 'projects.view' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, permission: 'users.list' },
  { id: 'perfiles', label: 'Perfiles', icon: ShieldCheck, permission: 'profiles.list' },
  { id: 'auditoria', label: 'Auditoría', icon: ClipboardList, permission: 'audit.read' }
];

function readStoredBuildingId() {
  const value = localStorage.getItem(ACTIVE_BUILDING_KEY);
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function App() {
  const [session, setSession] = useState({ status: 'loading', user: null });
  const [active, setActive] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [activeBuildingId, setActiveBuildingId] = useState(readStoredBuildingId);
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);
  const buildingMenuRef = useRef(null);

  useEffect(() => {
    getCurrentUser()
      .then((response) => setSession({ status: 'authenticated', user: response.data.user }))
      .catch(() => setSession({ status: 'unauthenticated', user: null }));
  }, []);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      setBuildings([]);
      return;
    }

    getMyBuildings()
      .then((response) => {
        const list = response.data ?? [];
        setBuildings(list);
        setActiveBuildingId((current) => {
          if (current && list.some((building) => building.id === current)) return current;
          const firstId = list[0]?.id ?? null;
          if (firstId != null) localStorage.setItem(ACTIVE_BUILDING_KEY, String(firstId));
          else localStorage.removeItem(ACTIVE_BUILDING_KEY);
          return firstId;
        });
      })
      .catch(() => setBuildings([]));
  }, [session.status, session.user?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (buildingMenuRef.current && !buildingMenuRef.current.contains(event.target)) {
        setBuildingMenuOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setBuildingMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    await logout();
    setBuildingMenuOpen(false);
    setBuildings([]);
    setActiveBuildingId(null);
    localStorage.removeItem(ACTIVE_BUILDING_KEY);
    setSession({ status: 'unauthenticated', user: null });
  }

  function selectBuilding(buildingId) {
    setActiveBuildingId(buildingId);
    localStorage.setItem(ACTIVE_BUILDING_KEY, String(buildingId));
    setBuildingMenuOpen(false);
  }

  if (session.status === 'loading') return null;
  if (session.status === 'unauthenticated') {
    return (
      <LoginPage
        onLogin={(user) => setSession({ status: 'authenticated', user })}
      />
    );
  }

  const activeBuilding = buildings.find((building) => building.id === activeBuildingId) ?? null;
  const permissions = session.user.permissions ?? [];
  const visibleNav = NAV.filter((item) => hasPermission(permissions, item.permission));
  const activeNavItem = visibleNav.find((item) => item.id === active) ?? visibleNav[0] ?? null;
  const activeModule = activeNavItem?.id ?? 'home';

  const userInitials = session.user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const renderModule = () => {
    if (!hasPermission(permissions, NAV.find((item) => item.id === activeModule)?.permission)) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <h1 className="text-lg font-bold text-slate-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-400">
            No tienes permisos para ver esta sección. Contacta al administrador general.
          </p>
        </div>
      );
    }

    switch (activeModule) {
      case 'home':
        return <ModuleHome activeBuilding={activeBuilding} />;
      case 'edificios':
        return <BuildingsPage />;
      case 'inmuebles':
        return <UnitsPage />;
      case 'inventario':
        return <ModuleInventario />;
      case 'mantenimientos':
        return <ModuleMantenimientos />;
      case 'seguros':
        return <ModuleSeguros />;
      case 'facturacion':
        return <ModuleFacturacion />;
      case 'presupuesto':
        return <ModulePresupuesto />;
      case 'proyectos':
        return <ModuleProyectos />;
      case 'usuarios':
        return <UsersPage />;
      case 'perfiles':
        return <ProfilesPage />;
      case 'auditoria':
        return <AuditPage />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-100"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <aside
        className="flex-shrink-0 bg-slate-900 flex flex-col transition-all duration-200"
        style={{ width: collapsed ? 64 : 232 }}
      >
        <div
          className={`flex items-center gap-3 border-b border-white/5 ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-bold leading-tight truncate">AdminPH</p>
              <p className="text-slate-400 text-xs truncate">
                {activeBuilding?.name ?? 'Sin edificio'}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 transition-colors text-left ${collapsed ? 'px-0 justify-center py-2.5' : 'px-4 py-2.5'} ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={17} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-sm font-semibold flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={13} className="flex-shrink-0 opacity-60" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-3 space-y-1">
          {!collapsed && (
            <button className="w-full flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
              <Settings size={15} className="flex-shrink-0" />
              <span className="text-xs font-semibold">Configuración</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg py-2 transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'}`}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <Menu size={15} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs font-semibold">Contraer menú</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center gap-4 px-5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-64">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              placeholder="Buscar en el sistema..."
              className="text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400 w-full"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={buildingMenuRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={buildingMenuOpen}
                onClick={() => setBuildingMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors"
              >
                <Building2 size={13} className="text-blue-600 flex-shrink-0" />
                <span className="hidden sm:inline max-w-48 truncate">
                  {activeBuilding?.name ?? 'Seleccionar edificio'}
                </span>
                <ChevronDown
                  size={11}
                  className={`text-slate-400 transition-transform ${buildingMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {buildingMenuOpen && (
                <div
                  role="listbox"
                  aria-label="Edificios asignados"
                  className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden"
                >
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Cambiar edificio
                    </p>
                  </div>
                  {buildings.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-400">
                      No tienes edificios asignados.
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {buildings.map((building) => {
                        const selected = building.id === activeBuildingId;
                        return (
                          <li key={building.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => selectBuilding(building.id)}
                              className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                            >
                              <Building2
                                size={14}
                                className={`mt-0.5 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-slate-400'}`}
                              />
                              <span className="flex-1 min-w-0">
                                <span
                                  className={`block text-sm font-semibold truncate ${selected ? 'text-blue-700' : 'text-slate-800'}`}
                                >
                                  {building.name}
                                </span>
                                <span className="block text-xs text-slate-400 truncate">
                                  NIT {building.nit}
                                </span>
                              </span>
                              {selected && (
                                <Check size={14} className="mt-0.5 text-blue-600 flex-shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={17} className="text-slate-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="w-px h-6 bg-slate-200" />

            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userInitials || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-800 leading-tight">{session.user.name}</p>
                <p className="text-xs text-slate-400 leading-tight">{session.user.email}</p>
              </div>
              <LogOut size={14} className="text-slate-400 ml-0.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">{renderModule()}</div>
        </main>
      </div>
    </div>
  );
}
