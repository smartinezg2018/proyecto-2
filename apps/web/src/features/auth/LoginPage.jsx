import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '../../services/api.js';
import { ActionButton } from '../../components/ActionButton.jsx';

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await login(form);
      onLogin(response.data.user);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError || requestError instanceof SyntaxError
          ? 'No fue posible conectar con el servidor. Intenta nuevamente.'
          : requestError.message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-400">Accede al sistema administrativo</p>
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={submitForm} aria-busy={isSubmitting} className="grid gap-4">
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Correo electrónico *</span>
            <input
              name="email"
              value={form.email}
              onChange={updateField}
              required
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-500">Contraseña *</span>
            <input
              name="password"
              value={form.password}
              onChange={updateField}
              required
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <ActionButton type="submit" disabled={isSubmitting}>
            <LogIn size={14} /> {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
