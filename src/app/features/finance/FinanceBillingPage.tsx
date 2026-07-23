import { useEffect, useState } from 'react';
import { getFinanceBilling, refundPayment, type FinanceSummary } from '../shared/services/membershipApi';
import { notifyError, notifySuccess } from '../shared/lib/toast';

function inr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
}

export default function FinanceBillingPage() {
  const [data, setData] = useState<{ summary: FinanceSummary; payments: any[]; receipts: any[]; refunds: any[] } | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('client_request');
  const [reason, setReason] = useState('');
  async function refresh() {
    setData(await getFinanceBilling());
  }
  useEffect(() => { refresh().catch((error) => notifyError(error, 'Unable to load billing data.')); }, []);
  async function submitRefund() {
    if (!selected) return;
    try {
      const result = await refundPayment(selected.id, Math.round(Number(amount) * 100), category, reason.trim());
      notifySuccess(result.message); setSelected(null); setAmount(''); setReason(''); await refresh();
    } catch (error) { notifyError(error, 'Refund failed.'); }
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Billing & Receipts</h1><p className="mt-1 text-sm text-slate-600">Captured payments, deferred revenue, receipts, and controlled refunds.</p></div>
      {!data ? <div className="h-32 animate-pulse rounded-xl bg-slate-100" /> : <>
        <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[['Captured', inr(data.summary.capturedMinor)], ['Refunded', inr(data.summary.refundedMinor)], ['Deferred', inr(data.summary.deferredMinor)], ['Earned', inr(data.summary.earnedMinor)], ['Active plans', String(data.summary.activeMemberships)]].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-2 font-semibold text-slate-900">{value}</p></article>
          ))}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Payments</h2>
          <table className="mt-4 min-w-full text-left text-sm"><thead className="text-slate-500"><tr><th className="py-2">Payment</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
            {data.payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="py-3">{payment.provider_payment_id ?? payment.provider_order_id ?? `#${payment.id}`}</td><td>{inr(payment.amount_minor)}</td><td className="capitalize">{payment.status}</td><td className="text-right"><button onClick={() => setSelected(payment)} className="rounded-lg border px-3 py-1.5">Refund</button></td></tr>)}
          </tbody></table>
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Receipts</h2>
            <div className="mt-4 space-y-2">{data.receipts.length ? data.receipts.map((receipt) => <p key={receipt.id} className="rounded-lg bg-slate-50 p-3 text-sm">{receipt.receipt_number} - {receipt.client_email} - {inr(receipt.amount_minor)}</p>) : <p className="text-sm text-slate-500">No receipts issued.</p>}</div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Refund History</h2>
            <div className="mt-4 space-y-2">{data.refunds.length ? data.refunds.map((refund) => <p key={refund.id} className="rounded-lg bg-slate-50 p-3 text-sm">{refund.category.replaceAll('_', ' ')} - {inr(refund.amount_minor)} - <span className="capitalize">{refund.status}</span></p>) : <p className="text-sm text-slate-500">No refunds recorded.</p>}</div>
          </article>
        </section>
      </>}
      {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-xl font-semibold">Submit Refund</h2>
        <input type="number" min="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount in INR" className="mt-4 w-full rounded-xl border p-3" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-3 w-full rounded-xl border p-3"><option value="client_request">Client request</option><option value="duplicate_payment">Duplicate payment</option><option value="service_not_delivered">Service not delivered</option><option value="billing_error">Billing error</option><option value="goodwill">Goodwill</option></select>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for refund" className="mt-3 w-full rounded-xl border p-3" />
        <div className="mt-5 flex justify-end gap-2"><button onClick={() => setSelected(null)} className="rounded-xl border px-4 py-2">Cancel</button><button disabled={!reason.trim() || !amount} onClick={() => void submitRefund()} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Submit</button></div>
      </section></div> : null}
    </div>
  );
}
