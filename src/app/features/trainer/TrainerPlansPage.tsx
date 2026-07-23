import { useEffect, useState, type FormEvent } from 'react';
import { CalendarPlus, Dumbbell, Plus } from 'lucide-react';
import { Panel, ToneBadge } from '../shared/components/Ui';
import {
  createTrainerActivity,
  createTrainerPlan,
  getTrainerClients,
  getTrainerPlans,
  updateTrainerActivity,
  updateTrainerPlan,
  type TrainerClient,
  type TrainerPlan,
} from './trainerWorkspaceApi';
import { notifyError, notifySuccess } from '../shared/lib/toast';

const today = new Date().toISOString().slice(0, 10);

export default function TrainerPlansPage() {
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [plans, setPlans] = useState<TrainerPlan[]>([]);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState({ clientUserId: '', goalTitle: '', goalDescription: '', startsOn: today, targetDate: '' });
  const [activityDraft, setActivityDraft] = useState<{ planId: number | null; title: string; scheduledFor: string }>({ planId: null, title: '', scheduledFor: today });

  async function refresh() {
    try {
      const [nextClients, nextPlans] = await Promise.all([getTrainerClients(), getTrainerPlans()]);
      setClients(nextClients);
      setPlans(nextPlans);
    } catch (error) {
      notifyError(error, 'Unable to load training plans.');
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function submitPlan(event: FormEvent) {
    event.preventDefault();
    try {
      await createTrainerPlan({
        clientUserId: Number(planDraft.clientUserId),
        goalTitle: planDraft.goalTitle,
        goalDescription: planDraft.goalDescription,
        startsOn: planDraft.startsOn,
        targetDate: planDraft.targetDate || undefined,
      });
      setPlanDraft({ clientUserId: '', goalTitle: '', goalDescription: '', startsOn: today, targetDate: '' });
      setShowNewPlan(false);
      notifySuccess('Training plan assigned.');
      await refresh();
    } catch (error) {
      notifyError(error, 'Unable to create plan.');
    }
  }

  async function submitActivity(event: FormEvent) {
    event.preventDefault();
    if (!activityDraft.planId) return;
    await createTrainerActivity(activityDraft.planId, { title: activityDraft.title, scheduledFor: activityDraft.scheduledFor });
    setActivityDraft({ planId: null, title: '', scheduledFor: today });
    notifySuccess('Workout scheduled.');
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header>
          <p className="text-xs font-semibold uppercase text-indigo-600">Trainer Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Plans</h1>
          <p className="mt-1 text-sm text-slate-600">Client goals and scheduled workout activities.</p>
        </header>
        <button type="button" onClick={() => setShowNewPlan((open) => !open)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} /> Assign plan
        </button>
      </div>

      {showNewPlan ? (
        <Panel title="Assign Client Plan">
          <form onSubmit={submitPlan} className="grid gap-3 md:grid-cols-2">
            <select required value={planDraft.clientUserId} onChange={(e) => setPlanDraft({ ...planDraft, clientUserId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option value="">Choose booked client</option>
              {clients.filter((client) => client.eligibleForPlan).map((client) => <option value={client.id} key={client.id}>{client.name} ({client.email})</option>)}
            </select>
            <input required value={planDraft.goalTitle} onChange={(e) => setPlanDraft({ ...planDraft, goalTitle: e.target.value })} placeholder="Primary goal" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="date" required value={planDraft.startsOn} onChange={(e) => setPlanDraft({ ...planDraft, startsOn: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input type="date" value={planDraft.targetDate} onChange={(e) => setPlanDraft({ ...planDraft, targetDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <textarea value={planDraft.goalDescription} onChange={(e) => setPlanDraft({ ...planDraft, goalDescription: e.target.value })} placeholder="Goal details" className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5 text-sm md:col-span-2" />
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create plan</button>
          </form>
        </Panel>
      ) : null}

      <div className="space-y-4">
        {plans.length ? plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{plan.clientName}</h2>
                <p className="mt-1 text-sm font-medium text-indigo-700">{plan.goalTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{plan.goalDescription || 'No additional goal notes.'}</p>
              </div>
              <div className="flex gap-2">
                <ToneBadge tone={plan.status === 'active' ? 'success' : 'neutral'}>{plan.status}</ToneBadge>
                <ToneBadge tone={plan.weeklyAdherence === null ? 'neutral' : plan.weeklyAdherence < 70 ? 'danger' : 'success'}>
                  {plan.weeklyAdherence === null ? 'No adherence yet' : `${plan.weeklyAdherence}% adherence`}
                </ToneBadge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setActivityDraft({ planId: plan.id, title: '', scheduledFor: today })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                <CalendarPlus size={15} /> Schedule workout
              </button>
              {plan.status === 'active' ? (
                <button type="button" onClick={async () => { await updateTrainerPlan(plan.id, { status: 'completed' }); await refresh(); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Complete plan</button>
              ) : null}
            </div>
            {activityDraft.planId === plan.id ? (
              <form onSubmit={submitActivity} className="mt-4 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row">
                <input required value={activityDraft.title} onChange={(e) => setActivityDraft({ ...activityDraft, title: e.target.value })} placeholder="Workout activity" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input required type="date" value={activityDraft.scheduledFor} onChange={(e) => setActivityDraft({ ...activityDraft, scheduledFor: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Add</button>
              </form>
            ) : null}
            <div className="mt-4 space-y-2">
              {plan.activities.map((activity) => (
                <div key={activity.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="inline-flex items-center gap-2 text-sm text-slate-700"><Dumbbell size={14} />{activity.title} <span className="text-slate-400">{activity.scheduledFor}</span></p>
                  <select
                    value={activity.status}
                    onChange={async (e) => { await updateTrainerActivity(activity.id, { status: e.target.value as typeof activity.status }); await refresh(); }}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="modified">Modified</option><option value="cancelled">Cancelled</option>
                  </select>
                </div>
              ))}
              {!plan.activities.length ? <p className="text-sm text-slate-500">No scheduled workouts yet.</p> : null}
            </div>
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No assigned plans. Plans can be created after a client has booked a training session.</p>}
      </div>
    </div>
  );
}
