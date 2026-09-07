import { useEffect, useState } from 'react';
import { getBuildings } from '../services/api.js';

export function App() {
  const [buildings, setBuildings] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getBuildings()
      .then((result) => {
        setBuildings(result.data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Administracion de copropiedades</p>
          <h1>Panel de gestion</h1>
        </div>
        <span className="status">{status === 'ready' ? 'API conectada' : 'Inicializando'}</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">Vista general</p>
        <h2>Organiza la operacion del edificio desde un solo lugar.</h2>
        <p>La plataforma centralizara activos, mantenimientos, seguros, cartera, presupuesto y proyectos.</p>
      </section>

      <section className="module-grid" aria-label="Modulos del sistema">
        {['Activos', 'Mantenimientos', 'Seguros', 'Facturacion', 'Presupuesto', 'Proyectos'].map((module) => (
          <article className="module" key={module}>
            <span className="module-number">01</span>
            <h3>{module}</h3>
            <p>Preparado para implementar el flujo del modulo.</p>
          </article>
        ))}
      </section>

      <section className="buildings">
        <div>
          <p className="eyebrow">Contexto activo</p>
          <h2>Edificios disponibles</h2>
        </div>
        {status === 'error' && <p className="error">No se pudo conectar con la API.</p>}
        {status === 'ready' && buildings.length === 0 && <p className="muted">Aun no hay edificios registrados.</p>}
      </section>
    </main>
  );
}
