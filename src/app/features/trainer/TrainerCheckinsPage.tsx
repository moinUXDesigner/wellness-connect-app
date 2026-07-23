import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Panel, ToneBadge } from '../shared/components/Ui';
import { createTrainerCheckIn, getTrainerCheckIns, getTrainerPlans, type TrainerActivity, type TrainerCheckIn, type TrainerPlan } from './trainerWorkspaceApi';
import { notifyError, notifySuccess } from '../shared/lib/toast';

const today = new Date().toISOString().slice(0, 10);

export default function TrainerCheckinsPage() {
  const [plans, setPlans] = useState<TrainerPlan[]>([]);
  const [checkIns, setCheckIns] = useState<TrainerCheckIn[]>([]);
  const [draft, setDraft] = useState({ planId: '', checkedInOn: today, weightKg: '', goalProgressPercent: 0, notes: '', painReported: false, painSeverity: 'mild' as 'mild' | 'moderate' | 'severe', painNotes: '' });
  const [activityUpdates, setActivityUpdates] = useState<Record<number, TrainerActivity['status']>>({});
  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === Number(draft.planId)), [plans, draft.planId]);

  async function refresh() {
    try {
      const [nextPlans, nextCheckIns] = await Promise.all([getTrainerPlans(), getTrainerCheckIns()]);
      setPlans(nextPlans.filter((plan) => plan.status === 'active'));
      setCheckIns(nextCheckIns);
    } catch (error) {
      notifyError(error, 'Unable to load check-ins.');
    }
  }
  useEffect(() => { void refresh(); }, []);

  function selectPlan(planId: string) {
    const plan = plans.find((item) => item.id === Number(planId));
    const defaults = Object.fromEntries(
      (plan?.activities ?? []).filter((item) => item.status === 'scheduled').map((activity) => [activity.id, 'completed']),
    ) as Record<number, TrainerActivity['status']>;
    setDraft({ ...draft, planId });
    setActivityUpdates(defaults);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await createTrainerCheckIn({
        planId: Number(draft.planId),
        checkedInOn: draft.checkedInOn,
        weightKg: draft.weightKg ? Number(draft.weightKg) : undefined,
        goalProgressPercent: draft.goalProgressPercent,
        notes: draft.notes,
        painReported: draft.painReported,
        painSeverity: draft.painReported ? draft.painSeverity : undefined,
        painNotes: draft.painReported ? draft.painNotes : undefined,
        activityUpdates: Object.entries(activityUpdates).map(([id, status]) => ({ id: Number(id), status })),
      });
      setDraft({ planId: '', checkedInOn: today, weightKg: '', goalProgressPercent: 0, notes: '', painReported: false, painSeverity: 'mild', painNotes: '' });
      setActivityUpdates({});
      notifySuccess('Check-in recorded and dashboard signals updated.');
      await refresh();
    } catch (error) {
      notifyError(error, 'Unable to record check-in.');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase text-indigo-600">Trainer Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Check-ins</h1>
        <p className="mt-1 text-sm text-slate-600">Capture workout outcomes, measurable progress, and safety concerns.</p>
      </header>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Record Check-in">
          <form onSubmit={submit} className="space-y-3">
            <select required value={draft.planId} onChange={(e) => selectPlan(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option value="">Select active plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.clientName} - {plan.goalTitle}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-600">Check-in date<input required type="date" value={draft.checkedInOn} onChange={(e) => setDraft({ ...draft, checkedInOn: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-600">Weight (kg)<input type="number" min="20" max="400" step="0.1" value={draft.weightKg} onChange={(e) => setDraft({ ...draft, weightKg: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            </div>
            <label className="block text-sm text-slate-600">Goal progress: <span className="font-semibold text-slate-900">{draft.goalProgressPercent}%</span>
              <input type="range" min="0" max="100" value={draft.goalProgressPercent} onChange={(e) => setDraft({ ...draft, goalProgressPercent: Number(e.target.value) })} className="mt-2 w-full" />
            </label>
            {selectedPlan?.activities.length ? (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Workout outcomes</p>
                {selectedPlan.activities.filter((item) => item.status === 'scheduled').map((activity) => (
                  <div key={activity.id} className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span>{activity.title} <span className="text-slate-400">{activity.scheduledFor}</span></span>
                    <select value={activityUpdates[activity.id]} onChange={(e) => setActivityUpdates({ ...activityUpdates, [activity.id]: e.target.value as TrainerActivity['status'] })} className="rounded-md border px-2 py-1 text-xs">
                      <option value="completed">Completed</option><option value="missed">Missed</option><option value="modified">Modified</option><option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Progress notes" className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <label className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <input type="checkbox" checked={draft.painReported} onChange={(e) => setDraft({ ...draft, painReported: e.target.checked })} />
              Pain or injury concern reported
            </label>
            {draft.painReported ? (
              <div className="space-y-2 rounded-lg border border-rose-100 p-3">
                <select value={draft.painSeverity} onChange={(e) => setDraft({ ...draft, painSeverity: e.target.value as 'mild' | 'moderate' | 'severe' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                </select>
                <textarea value={draft.painNotes} onChange={(e) => setDraft({ ...draft, painNotes: e.target.value })} placeholder="Safety notes" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            ) : null}
            <button disabled={!draft.planId} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save check-in</button>
          </form>
        </Panel>

        <Panel title="Recent Check-ins">
          <div className="space-y-3">
            {checkIns.length ? checkIns.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><ClipboardCheck size={15} />{item.clientName}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.planTitle} | {item.checkedInOn}</p>
                  </div>
                  {item.painReported ? <ToneBadge tone="danger">Pain: {item.painSeverity}</ToneBadge> : <ToneBadge tone="success">Routine</ToneBadge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1"><Activity size={14} /> Progress {item.goalProgressPercent}%</span>
                  {item.weightKg !== null ? <span>{item.weightKg} kg</span> : null}
                  {item.painReported ? <span className="inline-flex items-center gap-1 text-rose-700"><AlertTriangle size={14} /> Requires review</span> : null}
                </div>
                {item.notes ? <p className="mt-3 text-sm text-slate-600">{item.notes}</p> : null}
              </article>
            )) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No check-ins recorded yet.</p>}
          </div>
        </Panel>
      </section>
    </div>
  );
}
