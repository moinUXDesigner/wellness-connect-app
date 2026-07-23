import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getAuthState } from '../auth/auth';
import { createCheckoutOrder, getPublishedMembershipPlans, verifyCheckout, type MembershipTier, type PublishedMembershipPlan } from '../shared/services/membershipApi';
import { notifyError, notifySuccess } from '../shared/lib/toast';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function inr(amountMinor: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amountMinor / 100);
}

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PublishedMembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    getPublishedMembershipPlans().then(setPlans).catch((error) => notifyError(error, 'Unable to load plans.')).finally(() => setLoading(false));
  }, []);

  async function checkout(plan: PublishedMembershipPlan, tier: MembershipTier) {
    const auth = getAuthState();
    if (!auth.token || auth.user?.role !== 'client') {
      navigate('/login', { state: { authNotice: 'Sign in as a client to purchase a membership plan.' } });
      return;
    }
    setPurchasing(tier.id);
    try {
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) throw new Error('Payment checkout could not be loaded.');
      const order = await createCheckoutOrder(tier.id);
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency,
        name: 'Aura Wellness Connect',
        description: `${plan.name} - ${tier.label}`,
        order_id: order.orderId,
        prefill: { name: auth.user?.name, email: auth.user?.email },
        handler: async (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
          const result = await verifyCheckout(order.paymentId, response.razorpay_payment_id, response.razorpay_signature);
          notifySuccess(result.message);
          navigate('/client/membership');
        },
      });
      checkout.open();
    } catch (error) {
      notifyError(error, 'Unable to start checkout.');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Membership Plans</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Choose support that fits your journey</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">Purchase included counselling and training credits securely through Razorpay. Regular appointment booking remains available without a membership.</p>
      </div>
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />) : plans.length ? plans.map((plan) => (
          <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
            <div className="mt-5 space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" />{plan.durationWeeks} weeks access period</p>
              <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" />{plan.credits.counselling ?? 0} counselling credits</p>
              <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-600" />{plan.credits.training ?? 0} training credits</p>
            </div>
            <div className="mt-6 space-y-3">
              {plan.tiers.map((tier) => (
                <button key={tier.id} type="button" disabled={purchasing === tier.id} onClick={() => void checkout(plan, tier)} className="flex w-full items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  <span>{tier.label}</span><span>{purchasing === tier.id ? 'Loading...' : inr(tier.amountMinor)}</span>
                </button>
              ))}
            </div>
          </article>
        )) : <p className="col-span-full rounded-xl bg-slate-50 p-8 text-center text-slate-600">Published membership plans will appear here once configured.</p>}
      </section>
    </div>
  );
}
