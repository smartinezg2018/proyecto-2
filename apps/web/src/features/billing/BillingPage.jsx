import { Fragment, useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { formatCurrency as fmt, formatCompactCurrency as fmtM } from '../fixtures.js';
import {
  getInvoiceDetail,
  getInvoiceHistory,
  getInterestSettings,
  getPortfolio,
  getUnits,
  applyPayment,
  registerPayment,
  saveInterestSettings
} from '../../services/api.js';
import { StatusBadge as Badge } from '../../components/StatusBadge.jsx';
import { MetricCard } from '../../components/MetricCard.jsx';
import { SectionHeader as SectionHead } from '../../components/SectionHeader.jsx';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';

const EMPTY_FILTERS = { unitId: '', period: '', status: '' };
const EMPTY_HISTORY_FILTERS = { unitId: '', period: '', status: '' };
const EMPTY_PAYMENT_FORM = {
  unitId: '',
  paymentDate: '',
  amount: '',
  paymentMethod: 'transferencia',
  reference: '',
  applyAuto: true
};
const STATUS_LABELS = new Map([
  ['al_dia', 'Al día'],
  ['pendiente', 'Pendiente'],
  ['en_mora', 'En mora'],
  ['parcialmente_pagada', 'Parcialmente pagada'],
  ['pagada', 'Pagada'],
  ['aplicado', 'Aplicado'],
  ['registrado', 'Registrado'],
  ['reversado', 'Reversado']
]);

export function ModuleFacturacion({ activeBuildingId, canManageInterest = false }) {
  const [tab, setTab] = useState('cartera');
  const [portfolio, setPortfolio] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [annualRate, setAnnualRate] = useState('0');
  const [interestSaving, setInterestSaving] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [interestError, setInterestError] = useState('');
  const [portfolioRefresh, setPortfolioRefresh] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setHistoryFilters(EMPTY_HISTORY_FILTERS);
    setUnits([]);
    setInvoiceHistory([]);
    setInvoiceDetail(null);
    setShowPaymentForm(false);
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setPaymentMessage('');
    setPaymentError('');
    setAnnualRate('0');
    setInterestMessage('');
    setInterestError('');
    if (!activeBuildingId) return undefined;

    let cancelled = false;
    Promise.all([getUnits(activeBuildingId), getInterestSettings(activeBuildingId)])
      .then(([unitsResponse, settingsResponse]) => {
        if (cancelled) return;
        setUnits((unitsResponse.data ?? []).filter((unit) => unit.kind === 'apartamento'));
        setAnnualRate(String(settingsResponse.data?.annualRate ?? 0));
      })
      .catch((requestError) => {
        if (cancelled) return;
        setUnits([]);
        setInterestError(requestError.message || 'No fue posible consultar la tasa de mora.');
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId]);

  useEffect(() => {
    if (!activeBuildingId) {
      setPortfolio([]);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    getPortfolio(activeBuildingId, filters)
      .then((response) => {
        if (!cancelled) setPortfolio(response.data ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setPortfolio([]);
          setError(requestError.message || 'No fue posible consultar la cartera.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId, filters, portfolioRefresh]);

  useEffect(() => {
    setInvoiceDetail(null);
    setDetailError('');
    if (!activeBuildingId || !historyFilters.unitId) {
      setInvoiceHistory([]);
      setHistoryError('');
      return undefined;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError('');
    getInvoiceHistory(activeBuildingId, historyFilters)
      .then((response) => {
        if (!cancelled) setInvoiceHistory(response.data ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setInvoiceHistory([]);
          setHistoryError(
            requestError.message || 'No fue posible consultar el historial de facturación.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId, historyFilters, historyRefresh]);

  const totals = useMemo(
    () =>
      portfolio.reduce(
        (result, row) => ({
          capital: result.capital + Number(row.capital || 0),
          payments: result.payments + Number(row.payments || 0),
          balance: result.balance + Number(row.totalBalance || 0)
        }),
        { capital: 0, payments: 0, balance: 0 }
      ),
    [portfolio]
  );

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function updateHistoryFilter(event) {
    const { name, value } = event.target;
    setHistoryFilters((current) => ({ ...current, [name]: value }));
  }

  async function toggleInvoiceDetail(invoiceId) {
    if (invoiceDetail?.id === invoiceId) {
      setInvoiceDetail(null);
      setDetailError('');
      return;
    }

    setDetailLoadingId(invoiceId);
    setDetailError('');
    try {
      const response = await getInvoiceDetail(activeBuildingId, invoiceId);
      setInvoiceDetail(response.data);
    } catch (requestError) {
      setInvoiceDetail(null);
      setDetailError(requestError.message || 'No fue posible consultar el detalle de la factura.');
    } finally {
      setDetailLoadingId(null);
    }
  }

  function updatePaymentForm(event) {
    const { name, value, type, checked } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!activeBuildingId) return;

    setPaymentSaving(true);
    setPaymentMessage('');
    setPaymentError('');
    try {
      const response = await registerPayment(activeBuildingId, {
        unitId: Number(paymentForm.unitId),
        paymentDate: paymentForm.paymentDate,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference.trim()
      });
      let message = `Pago ${response.data.reference} registrado por ${fmt(response.data.amount)}.`;
      if (paymentForm.applyAuto) {
        const applied = await applyPayment(activeBuildingId, response.data.id, { mode: 'auto' });
        message += ` Aplicado a ${applied.data.allocations.length} factura(s); saldo a favor ${fmt(
          applied.data.creditBalance
        )}.`;
        if (applied.data.cashReceipt?.receiptNumber) {
          message += ` Recibo de caja N° ${applied.data.cashReceipt.receiptNumber}.`;
        }
      }
      setPaymentMessage(message);
      setPaymentForm(EMPTY_PAYMENT_FORM);
      setShowPaymentForm(false);
      setPortfolioRefresh((current) => current + 1);
      setHistoryRefresh((current) => current + 1);
      setInvoiceDetail(null);
    } catch (requestError) {
      setPaymentError(requestError.message || 'No fue posible registrar el pago.');
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleSaveInterestRate() {
    setInterestSaving(true);
    setInterestMessage('');
    setInterestError('');
    try {
      const response = await saveInterestSettings(activeBuildingId, Number(annualRate));
      setAnnualRate(String(response.data.settings.annualRate));
      setInterestMessage(
        `Cálculo actualizado para ${response.data.calculation.processed} facturas.`
      );
      setPortfolioRefresh((current) => current + 1);
    } catch (requestError) {
      setInterestError(requestError.message || 'No fue posible recalcular los intereses.');
    } finally {
      setInterestSaving(false);
    }
  }

  return (
    <div>
      <SectionHead
        title="Facturación y Recaudo"
        subtitle="Control de cartera, facturación y pagos del conjunto"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary">
              <FileText size={13} /> Generar Factura
            </Btn>
            <Btn onClick={() => setShowPaymentForm((current) => !current)}>
              <Plus size={13} /> Registrar Pago
            </Btn>
          </div>
        }
      />

      {(paymentMessage || paymentError) && (
        <p className={`mb-4 text-sm ${paymentError ? 'text-red-600' : 'text-emerald-700'}`}>
          {paymentError || paymentMessage}
        </p>
      )}

      {showPaymentForm && (
        <form
          onSubmit={submitPayment}
          className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end border border-slate-200 rounded-lg p-4 bg-white"
        >
          <label className="text-sm text-slate-600">
            Apartamento
            <select
              name="unitId"
              value={paymentForm.unitId}
              onChange={updatePaymentForm}
              required
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5"
            >
              <option value="">Seleccione</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.tower ? `${unit.tower} - ${unit.number}` : unit.number}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Fecha
            <input
              type="date"
              name="paymentDate"
              value={paymentForm.paymentDate}
              onChange={updatePaymentForm}
              required
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-slate-600">
            Valor
            <input
              type="number"
              name="amount"
              min="0.01"
              step="0.01"
              value={paymentForm.amount}
              onChange={updatePaymentForm}
              required
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-slate-600">
            Medio
            <select
              name="paymentMethod"
              value={paymentForm.paymentMethod}
              onChange={updatePaymentForm}
              required
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="pse">PSE</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Referencia
            <input
              type="text"
              name="reference"
              value={paymentForm.reference}
              onChange={updatePaymentForm}
              required
              maxLength={100}
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="md:col-span-5 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="applyAuto"
              checked={paymentForm.applyAuto}
              onChange={updatePaymentForm}
            />
            Aplicar automáticamente a facturas por antigüedad
          </label>
          <div className="md:col-span-5 flex justify-end gap-2">
            <Btn
              type="button"
              variant="secondary"
              onClick={() => setShowPaymentForm(false)}
              disabled={paymentSaving}
            >
              Cancelar
            </Btn>
            <Btn type="submit" disabled={paymentSaving || !activeBuildingId}>
              {paymentSaving ? 'Guardando...' : 'Guardar pago'}
            </Btn>
          </div>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Capital facturado"
          value={fmtM(totals.capital)}
          sub="Según los filtros seleccionados"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          label="Pagos aplicados"
          value={fmtM(totals.payments)}
          sub="Sin movimientos reversados"
          icon={BarChart3}
          color="emerald"
        />
        <MetricCard
          label="Saldo pendiente"
          value={fmtM(totals.balance)}
          sub={`${portfolio.filter((row) => row.status === 'en_mora').length} apartamentos en mora`}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="flex gap-0 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: 'cartera', label: 'Estado de Cartera' },
          { key: 'historial', label: 'Historial de Facturación' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === item.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'cartera' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
            <label className="text-xs font-semibold text-slate-500">
              Tasa anual de mora (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={annualRate}
                onChange={(event) => setAnnualRate(event.target.value)}
                disabled={!activeBuildingId || !canManageInterest || interestSaving}
                className="mt-1 block w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>
            {canManageInterest && (
              <Btn
                onClick={handleSaveInterestRate}
                disabled={!activeBuildingId || annualRate === '' || interestSaving}
              >
                {interestSaving ? 'Calculando…' : 'Guardar y recalcular'}
              </Btn>
            )}
            {interestMessage && <p className="pb-2 text-xs text-emerald-600">{interestMessage}</p>}
            {interestError && <p className="pb-2 text-xs text-red-600">{interestError}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-500">
              Apartamento
              <select
                name="unitId"
                value={filters.unitId}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Todos</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.tower ? `${unit.tower} - ` : ''}
                    {unit.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Periodo
              <input
                type="month"
                name="period"
                value={filters.period}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Estado
              <select
                name="status"
                value={filters.status}
                onChange={updateFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Todos</option>
                <option value="al_dia">Al día</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_mora">En mora</option>
              </select>
            </label>
            <div className="flex items-end">
              <Btn
                variant="secondary"
                onClick={() => setFilters(EMPTY_FILTERS)}
                disabled={!activeBuildingId}
              >
                Limpiar filtros
              </Btn>
            </div>
          </div>

          {!activeBuildingId ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              Selecciona un edificio para consultar su cartera.
            </p>
          ) : error ? (
            <p className="px-4 py-12 text-center text-sm text-red-600">{error}</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[
                    'Apartamento',
                    'Capital',
                    'Otros conceptos',
                    'Intereses',
                    'Pagos',
                    'Saldo total',
                    'Estado'
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      Consultando cartera…
                    </td>
                  </tr>
                ) : portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      No hay apartamentos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  portfolio.map((row) => (
                    <tr key={row.unitId} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">
                        {row.tower ? `${row.tower} - ` : ''}
                        {row.unitNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{fmt(row.capital)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fmt(row.otherConcepts)}</td>
                      <td className="px-4 py-3 text-sm text-amber-700">{fmt(row.interests)}</td>
                      <td className="px-4 py-3 text-sm text-emerald-700">{fmt(row.payments)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-600">
                        {fmt(row.totalBalance)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={STATUS_LABELS.get(row.status) ?? row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 md:grid-cols-4">
            <label className="text-xs font-semibold text-slate-500">
              Apartamento
              <select
                name="unitId"
                value={historyFilters.unitId}
                onChange={updateHistoryFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Seleccionar</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.tower ? `${unit.tower} - ` : ''}
                    {unit.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Periodo
              <input
                type="month"
                name="period"
                value={historyFilters.period}
                onChange={updateHistoryFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Estado
              <select
                name="status"
                value={historyFilters.status}
                onChange={updateHistoryFilter}
                disabled={!activeBuildingId}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcialmente_pagada">Parcialmente pagada</option>
                <option value="pagada">Pagada</option>
              </select>
            </label>
            <div className="flex items-end">
              <Btn
                variant="secondary"
                onClick={() => setHistoryFilters(EMPTY_HISTORY_FILTERS)}
                disabled={!activeBuildingId}
              >
                Limpiar filtros
              </Btn>
            </div>
          </div>

          {!activeBuildingId ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              Selecciona un edificio para consultar su historial.
            </p>
          ) : !historyFilters.unitId ? (
            <p className="px-4 py-12 text-center text-sm text-slate-400">
              Selecciona un apartamento para consultar sus facturas.
            </p>
          ) : historyError ? (
            <p className="px-4 py-12 text-center text-sm text-red-600">{historyError}</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Periodo', 'Vencimiento', 'Total', 'Pagos', 'Saldo', 'Estado', 'Acciones'].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      Consultando historial…
                    </td>
                  </tr>
                ) : invoiceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      No hay facturas que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  invoiceHistory.map((invoice) => (
                    <Fragment key={invoice.id}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-800">
                          {invoice.period}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{invoice.dueDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{fmt(invoice.total)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-700">
                          {fmt(invoice.appliedPayments)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600">
                          {fmt(invoice.balance)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={STATUS_LABELS.get(invoice.status) ?? invoice.status} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleInvoiceDetail(invoice.id)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {detailLoadingId === invoice.id
                              ? 'Consultando…'
                              : invoiceDetail?.id === invoice.id
                                ? 'Cerrar detalle'
                                : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>
                      {invoiceDetail?.id === invoice.id && (
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <td colSpan={7} className="p-4">
                            <InvoiceDetail detail={invoiceDetail} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          )}
          {detailError && (
            <p className="border-t border-slate-100 p-4 text-sm text-red-600">{detailError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function InvoiceDetail({ detail }) {
  return (
    <div>
      <p className="mb-4 text-xs font-semibold text-slate-500">
        Referencia {detail.paymentReference} · Apartamento{' '}
        {detail.tower ? `${detail.tower} - ` : ''}
        {detail.unitNumber}
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Conceptos</h4>
          <div className="space-y-2">
            {detail.items.length === 0 ? (
              <p className="text-sm text-slate-400">No hay conceptos registrados.</p>
            ) : (
              detail.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-slate-600">
                  <span>
                    {item.concept}{' '}
                    <span className="text-xs text-slate-400">
                      ({item.itemType === 'other' ? 'Otro concepto' : 'Capital'})
                    </span>
                  </span>
                  <strong>{fmt(item.amount)}</strong>
                </div>
              ))
            )}
            {detail.interests > 0 && (
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm text-amber-700">
                <span>Intereses</span>
                <strong>{fmt(detail.interests)}</strong>
              </div>
            )}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Pagos</h4>
          <div className="space-y-2">
            {detail.payments.length === 0 ? (
              <p className="text-sm text-slate-400">No hay pagos aplicados.</p>
            ) : (
              detail.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-700">{payment.reference}</span>
                    <Badge label={STATUS_LABELS.get(payment.status) ?? payment.status} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>
                      {payment.paymentDate} · {payment.paymentMethod}
                    </span>
                    <strong className="text-emerald-700">{fmt(payment.amount)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm">
            <span className="font-semibold text-slate-600">Saldo pendiente</span>
            <strong className="text-red-600">{fmt(detail.balance)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
