import { useEffect, useState } from 'react';
import { Panel, ToneBadge } from '../shared/components/Ui';
import { getHelpdeskWorkflowCases, updateWorkflowCase, type WorkflowCase, type WorkflowCaseAction } from '../shared/services/adminApi';
import { notifyError, notifySuccess } from '../shared/lib/toast';

function priorityTone(priority: WorkflowCase['priority']) {
  return priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral';
}

function statusTone(status: WorkflowCase['status']) {
  return status === 'resolved' || status === 'closed'
    ? 'success'
    : status === 'breached'
      ? 'danger'
      : status === 'acknowledged'
        ? 'warning'
        : 'neutral';
}

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not set';
}

export default function HelpdeskTicketsPage() {
  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingCaseId, setActingCaseId] = useState<number | null>(null);

  useEffect(() => {
    void refreshCases();
  }, []);

  async function refreshCases() {
    setLoading(true);
    try {
      setCases(await getHelpdeskWorkflowCases());
    } catch (error) {
      notifyError(error, 'Unable to load helpdesk tickets.');
    } finally {
      setLoading(false);
    }
  }

  async function actOnCase(workflowCase: WorkflowCase, action: WorkflowCaseAction) {
    setActingCaseId(workflowCase.id);

    try {
      const result = await updateWorkflowCase(workflowCase.id, action);
      setCases((current) => current.map((item) => (
        item.id === workflowCase.id ? result.case : item
      )));
      notifySuccess(result.message);
    } catch (error) {
      notifyError(error, 'Unable to update helpdesk ticket.');
    } finally {
      setActingCaseId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Helpdesk Tickets</h1>
        <p className="mt-1 text-sm text-slate-600">Live support requests tracked against the follow-up SLA workflow.</p>
      </div>
      <Panel title="Support queue">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)
          ) : cases.length ? cases.map((workflowCase) => (
            <article key={workflowCase.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{workflowCase.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{workflowCase.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {workflowCase.subject.label} • {workflowCase.subject.secondaryLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={priorityTone(workflowCase.priority)}>{workflowCase.priority}</ToneBadge>
                  <ToneBadge tone={statusTone(workflowCase.status)}>{workflowCase.status}</ToneBadge>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <p>Owner role: {workflowCase.ownerRole}</p>
                <p>Due at: {formatTimestamp(workflowCase.dueAt)}</p>
                <p>Updated: {formatTimestamp(workflowCase.updatedAt)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {workflowCase.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => void actOnCase(workflowCase, 'acknowledge')}
                    disabled={actingCaseId === workflowCase.id}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                ) : null}
                {workflowCase.status !== 'resolved' && workflowCase.status !== 'closed' ? (
                  <button
                    type="button"
                    onClick={() => void actOnCase(workflowCase, 'resolve')}
                    disabled={actingCaseId === workflowCase.id}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Resolve
                  </button>
                ) : null}
                {workflowCase.status === 'resolved' || workflowCase.status === 'closed' || workflowCase.status === 'breached' ? (
                  <button
                    type="button"
                    onClick={() => void actOnCase(workflowCase, 'reopen')}
                    disabled={actingCaseId === workflowCase.id}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Reopen
                  </button>
                ) : null}
              </div>
            </article>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No support workflow cases are currently assigned to helpdesk.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
