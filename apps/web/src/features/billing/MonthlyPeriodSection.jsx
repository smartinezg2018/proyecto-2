import { useEffect, useState } from 'react';
import { formatCurrency as fmt } from '../fixtures.js';
import {
  assignExtraCharge,
  assignFine,
  getMonthlySummary,
  getYearlySummary,
  setExtraChargeStatus,
  setFineStatus,
  setPeriodMark
} from '../../services/api.js';
import { StatusBadge as Badge } from '../../components/StatusBadge.jsx';
import { ActionButton as Btn } from '../../components/ActionButton.jsx';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const STATUS_LABELS = new Map([
  ['pagado', 'Pagado'],
  ['no_pagado', 'No pagado'],
  ['parcial', 'Pago parcial'],
  ['pendiente', 'Pendiente'],
  ['pagada', 'Pagada'],
  ['sin_cuota', 'Sin cuota']
]);

const EMPTY_CHARGE = { unitId: '', reason: '', amount: '' };

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function unitLabel(unit) {
  return unit.tower ? `${unit.tower} - ${unit.number ?? unit.unitNumber}` : unit.number ?? unit.unitNumber;
}

export function MonthlyPeriodSection({
  activeBuildingId,
  canManage = false,
  units = [],
  unitsLoading = false,
  initialPeriod = '',
  refreshKey = 0,
  onPeriodChange,
  onDataChange
}) {
  const initialParts = /^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriod)
    ? initialPeriod.split('-').map(Number)
    : [currentYear(), currentMonth()];
  const [year, setYear] = useState(initialParts[0]);
  const [month, setMonth] = useState(initialParts[1]);
  const [yearly, setYearly] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [savingKey, setSavingKey] = useState('');
  const [fineForm, setFineForm] = useState(EMPTY_CHARGE);
  const [extraForm, setExtraForm] = useState(EMPTY_CHARGE);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const period = `${year}-${String(month).padStart(2, '0')}`;

  function notifyDataChange() {
    onDataChange?.();
  }

  function selectMonth(nextMonth) {
    setMonth(nextMonth);
    onPeriodChange?.(`${year}-${String(nextMonth).padStart(2, '0')}`);
  }

  function selectYear(nextYear) {
    setYear(nextYear);
    onPeriodChange?.(`${nextYear}-${String(month).padStart(2, '0')}`);
  }

  useEffect(() => {
    setYearly(null);
    setSummary(null);
    setError('');
    setFormError('');
    setFormMessage('');
    setFineForm(EMPTY_CHARGE);
    setExtraForm(EMPTY_CHARGE);
  }, [activeBuildingId]);

  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriod)) return;
    const [nextYear, nextMonth] = initialPeriod.split('-').map(Number);
    setYear((current) => (current === nextYear ? current : nextYear));
    setMonth((current) => (current === nextMonth ? current : nextMonth));
  }, [initialPeriod]);

  useEffect(() => {
    if (!activeBuildingId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      getYearlySummary(activeBuildingId, year),
      getMonthlySummary(activeBuildingId, period)
    ])
      .then(([yearResponse, monthResponse]) => {
        if (cancelled) return;
        setYearly(yearResponse.data ?? null);
        setSummary(monthResponse.data ?? null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setYearly(null);
        setSummary(null);
        setError(requestError.message || 'No fue posible consultar los pagos del periodo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBuildingId, year, period, refresh, refreshKey]);

  async function markMonth(unitId, status) {
    setSavingKey(`mark-${unitId}`);
    setFormError('');
    setFormMessage('');
    try {
      await setPeriodMark(activeBuildingId, { unitId, period, status });
      setRefresh((current) => current + 1);
      notifyDataChange();
    } catch (requestError) {
      setFormError(requestError.message || 'No fue posible actualizar el estado del mes.');
    } finally {
      setSavingKey('');
    }
  }

  async function toggleFine(fine) {
    const status = fine.status === 'pagada' ? 'pendiente' : 'pagada';
    setSavingKey(`fine-${fine.id}`);
    setFormError('');
    try {
      await setFineStatus(activeBuildingId, fine.id, status);
      setRefresh((current) => current + 1);
      notifyDataChange();
    } catch (requestError) {
      setFormError(requestError.message || 'No fue posible actualizar la multa.');
    } finally {
      setSavingKey('');
    }
  }

  async function toggleExtra(charge) {
    const status = charge.status === 'pagada' ? 'pendiente' : 'pagada';
    setSavingKey(`extra-${charge.id}`);
    setFormError('');
    try {
      await setExtraChargeStatus(activeBuildingId, charge.id, status);
      setRefresh((current) => current + 1);
      notifyDataChange();
    } catch (requestError) {
      setFormError(requestError.message || 'No fue posible actualizar el pago extra.');
    } finally {
      setSavingKey('');
    }
  }

  async function submitCharge(event, kind) {
    event.preventDefault();
    const form = kind === 'fine' ? fineForm : extraForm;
    setFormError('');
    setFormMessage('');
    setSavingKey(kind);
    try {
      const payload = {
        unitId: Number(form.unitId),
        period,
        reason: form.reason.trim(),
        amount: Number(form.amount)
      };
      if (kind === 'fine') {
        await assignFine(activeBuildingId, payload);
        setFineForm(EMPTY_CHARGE);
        setFormMessage('Multa asignada.');
      } else {
        await assignExtraCharge(activeBuildingId, payload);
        setExtraForm(EMPTY_CHARGE);
        setFormMessage('Pago extra asignado.');
      }
      setRefresh((current) => current + 1);
      notifyDataChange();
    } catch (requestError) {
      setFormError(requestError.message || 'No fue posible guardar el cobro.');
    } finally {
      setSavingKey('');
    }
  }

  if (!activeBuildingId) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
        Selecciona un edificio para consultar los pagos por mes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-500">
          Año
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => selectYear(Number(event.target.value) || currentYear())}
            className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
        </label>
        <p className="text-sm text-slate-500">
          Detalle de <strong className="text-slate-800">{MONTHS[month - 1]} {year}</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        {(yearly?.months ?? MONTHS.map((_, index) => ({ period: `${year}-${String(index + 1).padStart(2, '0')}` }))).map(
          (item) => {
            const itemMonth = Number(item.period.slice(5, 7));
            const selected = itemMonth === month;
            return (
              <button
                key={item.period}
                type="button"
                onClick={() => selectMonth(itemMonth)}
                className={`rounded-xl border px-3 py-2 text-left ${
                  selected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-bold text-slate-800">{MONTHS[itemMonth - 1]}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Admin. {fmt(item.adminPaid ?? 0)}
                </span>
                <span className="block text-xs text-slate-500">
                  Multas {item.finesCount ?? 0} · Extra {item.extrasCount ?? 0}
                </span>
              </button>
            );
          }
        )}
      </div>

      {(formMessage || formError || error) && (
        <p className={`text-sm ${formError || error ? 'text-red-600' : 'text-emerald-700'}`}>
          {formError || error || formMessage}
        </p>
      )}

      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChargeForm
            title="Asignar multa"
            submitLabel="Asignar multa"
            form={fineForm}
            units={units}
            unitsLoading={unitsLoading}
            saving={savingKey === 'fine'}
            onChange={setFineForm}
            onSubmit={(event) => submitCharge(event, 'fine')}
          />
          <ChargeForm
            title="Asignar pago extra"
            submitLabel="Asignar pago extra"
            form={extraForm}
            units={units}
            unitsLoading={unitsLoading}
            saving={savingKey === 'extra'}
            onChange={setExtraForm}
            onSubmit={(event) => submitCharge(event, 'extra')}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <div className="flex flex-wrap gap-6 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Debido del mes{' '}
            <strong className="text-slate-800">{fmt(summary?.totals.due ?? 0)}</strong>
          </span>
          <span>
            Recaudado{' '}
            <strong className="text-emerald-700">{fmt(summary?.totals.collected ?? 0)}</strong>
          </span>
          <span>
            Saldo{' '}
            <strong className="text-red-600">{fmt(summary?.totals.balance ?? 0)}</strong>
          </span>
          <span>
            Administración{' '}
            <strong className="text-slate-800">{fmt(summary?.totals.adminPaid ?? 0)}</strong>
            {' / '}
            {fmt(summary?.totals.adminDue ?? 0)}
          </span>
          <span>
            Multas{' '}
            <strong className="text-emerald-700">{fmt(summary?.totals.finesPaid ?? 0)}</strong>
            {' / '}
            {fmt(summary?.totals.finesAmount ?? 0)}
          </span>
          <span>
            Pagos extra{' '}
            <strong className="text-emerald-700">{fmt(summary?.totals.extraChargesPaid ?? 0)}</strong>
            {' / '}
            {fmt(summary?.totals.extraChargesAmount ?? 0)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Apartamento', 'Administración', 'Estado del mes', 'Multas', 'Pagos extra'].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    Consultando pagos de {MONTHS[month - 1]}…
                  </td>
                </tr>
              ) : !summary || summary.units.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    No hay apartamentos registrados para este edificio.
                  </td>
                </tr>
              ) : (
                summary.units.map((row) => (
                  <tr key={row.unitId} className="border-b border-slate-50 align-top">
                    <td className="px-4 py-3 text-sm font-bold text-slate-800">{unitLabel(row)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>Cuota {fmt(row.adminFee)}</div>
                      <div className="text-emerald-700">Pagado {fmt(row.adminPaid)}</div>
                      {row.adminPayments?.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                          {row.adminPayments.map((payment) => (
                            <li key={payment.id}>
                              {payment.paymentDate} · {payment.reference} · {fmt(payment.amount)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABELS.get(row.adminStatus) ?? row.adminStatus} />
                      {canManage && (
                        <div className="mt-2 flex gap-1">
                          <MarkButton
                            active={row.adminMark === 'pagado'}
                            disabled={savingKey === `mark-${row.unitId}`}
                            onClick={() => markMonth(row.unitId, 'pagado')}
                          >
                            Pagado
                          </MarkButton>
                          <MarkButton
                            active={row.adminMark === 'no_pagado'}
                            disabled={savingKey === `mark-${row.unitId}`}
                            onClick={() => markMonth(row.unitId, 'no_pagado')}
                          >
                            No pagado
                          </MarkButton>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChargeList
                        items={row.fines}
                        emptyLabel="Sin multas en este mes."
                        canManage={canManage}
                        savingKey={savingKey}
                        keyPrefix="fine"
                        onToggle={toggleFine}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ChargeList
                        items={row.extraCharges}
                        emptyLabel="Sin pagos extra en este mes."
                        canManage={canManage}
                        savingKey={savingKey}
                        keyPrefix="extra"
                        onToggle={toggleExtra}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChargeForm({ title, submitLabel, form, units, unitsLoading, saving, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-500">
          Apartamento
          <select
            required
            value={form.unitId}
            onChange={(event) => onChange({ ...form, unitId: event.target.value })}
            disabled={unitsLoading || units.length === 0}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="">{unitsLoading ? 'Cargando…' : 'Seleccione'}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unitLabel(unit)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Motivo
          <input
            required
            maxLength={255}
            value={form.reason}
            onChange={(event) => onChange({ ...form, reason: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Valor
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(event) => onChange({ ...form, amount: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Btn type="submit" disabled={saving || units.length === 0}>
          {saving ? 'Guardando…' : submitLabel}
        </Btn>
      </div>
    </form>
  );
}

function ChargeList({ items = [], emptyLabel, canManage, savingKey, keyPrefix, onToggle }) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-400">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="text-sm text-slate-700">
          <div className="font-medium">{item.reason}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span>{fmt(item.amount)}</span>
            <Badge label={STATUS_LABELS.get(item.status) ?? item.status} />
            {canManage && (
              <button
                type="button"
                disabled={savingKey === `${keyPrefix}-${item.id}`}
                onClick={() => onToggle(item)}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
              >
                {item.status === 'pagada' ? 'Marcar pendiente' : 'Marcar pagada'}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function MarkButton({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50 ${
        active ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
