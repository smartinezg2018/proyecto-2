import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { InsurancePolicies } from './InsurancePolicies.jsx';
import { InsuranceClaims } from './InsuranceClaims.jsx';
import { SectionHeader as SectionHead } from '../../components/SectionHeader.jsx';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';
import { createInsuranceQuote, getInsuranceQuotes } from '../../services/api.js';

export function ModuleSeguros({ activeBuildingId = null, permissions = [] }) {
  const [activeTab, setActiveTab] = useState('polizas');
  const [quotes, setQuotes] = useState([]);
  const [quoteForm, setQuoteForm] = useState({
    insurer: '',
    coverage: '',
    premium: '',
    validFrom: '',
    validUntil: '',
    documentRef: ''
  });
  const [quoteMessage, setQuoteMessage] = useState('');

  useEffect(() => {
    if (!activeBuildingId) return;
    getInsuranceQuotes(activeBuildingId)
      .then((response) => setQuotes(response.data ?? []))
      .catch((error) => setQuoteMessage(error.message));
  }, [activeBuildingId]);

  async function submitQuote(event) {
    event.preventDefault();
    if (!activeBuildingId) return;
    try {
      await createInsuranceQuote(activeBuildingId, {
        ...quoteForm,
        premium: quoteForm.premium.trim()
      });
      const response = await getInsuranceQuotes(activeBuildingId);
      setQuotes(response.data ?? []);
      setQuoteForm({
        insurer: '',
        coverage: '',
        premium: '',
        validFrom: '',
        validUntil: '',
        documentRef: ''
      });
      setQuoteMessage('Cotización registrada.');
    } catch (error) {
      setQuoteMessage(error.message);
    }
  }

  return (
    <div>
      <SectionHead
        title="Seguros y Pólizas"
        subtitle="Gestión de pólizas de seguros y seguimiento a siniestralidad"
      />

      {/* Tabs */}
      <div className="flex gap-0 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'polizas', label: 'Pólizas Registradas' },
          { key: 'cotizaciones', label: 'Cotizaciones' },
          { key: 'siniestros', label: 'Seguimiento Siniestralidad' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'polizas' ? (
        <InsurancePolicies
          key={activeBuildingId ?? 'none'}
          buildingId={activeBuildingId}
          permissions={permissions}
        />
      ) : activeTab === 'cotizaciones' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden p-4">
          <form onSubmit={submitQuote} className="grid gap-3 md:grid-cols-3 mb-5">
            <input
              required
              placeholder="Aseguradora *"
              value={quoteForm.insurer}
              onChange={(event) => setQuoteForm({ ...quoteForm, insurer: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Cobertura *"
              value={quoteForm.coverage}
              onChange={(event) => setQuoteForm({ ...quoteForm, coverage: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Prima *"
              value={quoteForm.premium}
              onChange={(event) => setQuoteForm({ ...quoteForm, premium: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              type="date"
              value={quoteForm.validFrom}
              onChange={(event) => setQuoteForm({ ...quoteForm, validFrom: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              type="date"
              value={quoteForm.validUntil}
              onChange={(event) => setQuoteForm({ ...quoteForm, validUntil: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Documento"
              value={quoteForm.documentRef}
              onChange={(event) => setQuoteForm({ ...quoteForm, documentRef: event.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <Btn type="submit">
              <Plus size={14} /> Registrar cotización
            </Btn>
          </form>
          {quoteMessage && <p className="mb-3 text-sm text-slate-500">{quoteMessage}</p>}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-400">
                <th className="px-2 py-2">Aseguradora</th>
                <th className="px-2 py-2">Cobertura</th>
                <th className="px-2 py-2">Prima</th>
                <th className="px-2 py-2">Vigencia</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b border-slate-50">
                  <td className="px-2 py-2 font-semibold">{quote.insurer}</td>
                  <td className="px-2 py-2">{quote.coverage}</td>
                  <td className="px-2 py-2">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(
                      quote.premium
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {quote.validFrom} - {quote.validUntil}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <InsuranceClaims
          key={activeBuildingId ?? 'none'}
          buildingId={activeBuildingId}
          permissions={permissions}
        />
      )}
    </div>
  );
}
