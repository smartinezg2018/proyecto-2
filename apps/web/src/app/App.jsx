import { useState } from 'react';
import { ModuleHome } from '../features/home/HomePage.jsx';
import { ModuleInventario } from '../features/assets/AssetsPage.jsx';
import { ModuleMantenimientos } from '../features/maintenance/MaintenancePage.jsx';
import { ModuleSeguros } from '../features/insurance/InsurancePage.jsx';
import { ModuleFacturacion } from '../features/billing/BillingPage.jsx';
import { ModulePresupuesto } from '../features/budget/BudgetPage.jsx';
import { ModuleProyectos } from '../features/projects/ProjectsPage.jsx';
import { BuildingsPage } from '../features/administration/BuildingsPage.jsx';
import { UsersPage } from '../features/administration/UsersPage.jsx';
import { ProfilesPage } from '../features/administration/ProfilesPage.jsx';
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
  Users,
  ShieldCheck
} from 'lucide-react';

// ---- Navigation config ----
const NAV = [
  { id: 'home', label: 'Panel General', icon: Home },
  { id: 'edificios', label: 'Edificios', icon: Building2 },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'mantenimientos', label: 'Mantenimientos', icon: Wrench },
  { id: 'seguros', label: 'Seguros y Pólizas', icon: Shield },
  { id: 'facturacion', label: 'Facturación', icon: Receipt },
  { id: 'presupuesto', label: 'Presupuesto', icon: BarChart3 },
  { id: 'proyectos', label: 'Proyectos', icon: FolderKanban },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'perfiles', label: 'Perfiles', icon: ShieldCheck }
];

// ---- App Shell ----
export default function App() {
  const [active, setActive] = useState('home');
  const [collapsed, setCollapsed] = useState(false);

  const renderModule = () => {
    switch (active) {
      case 'home':
        return <ModuleHome />;
      case 'edificios':
        return <BuildingsPage />;
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
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-100"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="flex-shrink-0 bg-slate-900 flex flex-col transition-all duration-200"
        style={{ width: collapsed ? 64 : 232 }}
      >
        {/* Brand */}
        <div
          className={`flex items-center gap-3 border-b border-white/5 ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-bold leading-tight truncate">AdminPH</p>
              <p className="text-slate-400 text-xs truncate">El Nogal · Torre A+B</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = active === item.id;
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

        {/* Footer */}
        <div className={`border-t border-white/5 p-3 space-y-1`}>
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center gap-4 px-5 flex-shrink-0">
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-64">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              placeholder="Buscar en el sistema..."
              className="text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400 w-full"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Building selector */}
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors">
              <Building2 size={13} className="text-blue-600 flex-shrink-0" />
              <span className="hidden sm:inline">Conjunto El Nogal</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {/* Notifications */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={17} className="text-slate-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200" />

            {/* User */}
            <button className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                AM
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-800 leading-tight">Ana Martínez</p>
                <p className="text-xs text-slate-400 leading-tight">Administradora</p>
              </div>
              <ChevronDown size={11} className="text-slate-400 ml-0.5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">{renderModule()}</div>
        </main>
      </div>
    </div>
  );
}
