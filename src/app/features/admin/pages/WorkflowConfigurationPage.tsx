import { useEffect, useState } from 'react';
import { PageTitle } from '../AdminLayout';
import { Panel, ToneBadge } from '../../shared/components/Ui';
import {
  getAdminWorkflows,
  updateAdminWorkflow,
  type CriticalRiskEscalationWorkflowConfig,
  type CrossTeamFollowUpSlaWorkflowConfig,
  type IntakeAssignmentWorkflowConfig,
  type SessionNoShowWorkflowConfig,
  type WorkflowConfigPayload,
  type WorkflowConfigSummary,
  type WorkflowKey,
} from '../../shared/services/adminApi';
import { notifyError, notifySuccess } from '../../shared/lib/toast';

const WORKFLOW_KEYS: WorkflowKey[] = [
  'intake_assignment',
  'session_no_show',
  'critical_risk_escalation',
  'cross_team_follow_up_sla',
];

function parseList(value: string) {
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)));
}

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Never updated';
}

export default function WorkflowConfigurationPage() {
  const [workflows, setWorkflows] = useState<WorkflowConfigSummary[]>([]);
  const [reasons, setReasons] = useState<Record<WorkflowKey, string>>({
    intake_assignment: '',
    session_no_show: '',
    critical_risk_escalation: '',
    cross_team_follow_up_sla: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<WorkflowKey | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    getAdminWorkflows()
      .then((data) => {
        if (!active) return;
        setWorkflows(data);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load workflow configuration.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function updateWorkflowConfig(key: WorkflowKey, nextConfig: WorkflowConfigPayload) {
    setWorkflows((current) => current.map((workflow) => (
      workflow.key === key ? { ...workflow, config: nextConfig } : workflow
    )));
  }

  async function saveWorkflow(workflow: WorkflowConfigSummary) {
    setSavingKey(workflow.key);

    try {
      const result = await updateAdminWorkflow(workflow.key, workflow.config, reasons[workflow.key]);
      setWorkflows((current) => current.map((item) => (
        item.key === workflow.key ? result.workflow : item
      )));
      setReasons((current) => ({ ...current, [workflow.key]: '' }));
      notifySuccess(result.message);
    } catch (error) {
      notifyError(error, 'Unable to update workflow.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Workflow Configuration" subtitle="Operational flows for booking, escalation, and follow-ups." />
      {loadError ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p> : null}
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {WORKFLOW_KEYS.map((key) => {
            const workflow = workflows.find((item) => item.key === key);
            if (!workflow) return null;

            return (
              <Panel key={workflow.key} title={workflow.label}>
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-600">{workflow.description}</p>
                    <ToneBadge tone="neutral">{workflow.key}</ToneBadge>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <p>Last update: {formatTimestamp(workflow.updatedAt)}</p>
                    <p className="mt-1">Updated by: {workflow.updatedBy?.name ?? 'System default'}</p>
                  </div>

                  {workflow.key === 'intake_assignment' ? (
                    <IntakeAssignmentEditor
                      config={workflow.config as IntakeAssignmentWorkflowConfig}
                      onChange={(config) => updateWorkflowConfig(workflow.key, config)}
                    />
                  ) : null}

                  {workflow.key === 'session_no_show' ? (
                    <SessionNoShowEditor
                      config={workflow.config as SessionNoShowWorkflowConfig}
                      onChange={(config) => updateWorkflowConfig(workflow.key, config)}
                    />
                  ) : null}

                  {workflow.key === 'critical_risk_escalation' ? (
                    <CriticalRiskEditor
                      config={workflow.config as CriticalRiskEscalationWorkflowConfig}
                      onChange={(config) => updateWorkflowConfig(workflow.key, config)}
                    />
                  ) : null}

                  {workflow.key === 'cross_team_follow_up_sla' ? (
                    <CrossTeamSlaEditor
                      config={workflow.config as CrossTeamFollowUpSlaWorkflowConfig}
                      onChange={(config) => updateWorkflowConfig(workflow.key, config)}
                    />
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Save reason</label>
                    <textarea
                      value={reasons[workflow.key]}
                      onChange={(event) => setReasons((current) => ({ ...current, [workflow.key]: event.target.value }))}
                      placeholder="Explain why this workflow is changing"
                      className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void saveWorkflow(workflow)}
                      disabled={savingKey === workflow.key || !reasons[workflow.key].trim()}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingKey === workflow.key ? 'Saving...' : 'Save workflow'}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recent revisions</h3>
                    <div className="mt-3 space-y-3">
                      {workflow.revisions.length ? workflow.revisions.map((revision) => (
                        <article key={revision.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                          <p className="font-medium text-slate-900">{revision.reason}</p>
                          <p className="mt-1 text-slate-600">
                            {revision.actor?.name ?? 'Unknown'} • {formatTimestamp(revision.createdAt)}
                          </p>
                        </article>
                      )) : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                          No manual revisions recorded yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntakeAssignmentEditor({
  config,
  onChange,
}: {
  config: IntakeAssignmentWorkflowConfig;
  onChange: (config: IntakeAssignmentWorkflowConfig) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">High-risk symptoms</span>
        <input
          value={config.highRiskSymptoms.join(', ')}
          onChange={(event) => onChange({ ...config, highRiskSymptoms: parseList(event.target.value) })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Stress threshold</span>
          <input
            type="number"
            min={1}
            max={10}
            value={config.stressThreshold}
            onChange={(event) => onChange({ ...config, stressThreshold: Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Review ETA hours</span>
          <input
            type="number"
            min={1}
            value={config.reviewEtaHours}
            onChange={(event) => onChange({ ...config, reviewEtaHours: Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>
    </div>
  );
}

function SessionNoShowEditor({
  config,
  onChange,
}: {
  config: SessionNoShowWorkflowConfig;
  onChange: (config: SessionNoShowWorkflowConfig) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Grace period after session end (minutes)</span>
        <input
          type="number"
          min={1}
          value={config.delayAfterEndMinutes}
          onChange={(event) => onChange({ ...config, delayAfterEndMinutes: Number(event.target.value) })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Eligible statuses</span>
        <input
          value={config.eligibleStatuses.join(', ')}
          onChange={(event) => onChange({
            ...config,
            eligibleStatuses: parseList(event.target.value).filter((item): item is 'scheduled' | 'rescheduled' => (
              item === 'scheduled' || item === 'rescheduled'
            )),
          })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={config.notifyClient}
          onChange={(event) => onChange({ ...config, notifyClient: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Notify client when an appointment is auto-marked as no-show
      </label>
    </div>
  );
}

function CriticalRiskEditor({
  config,
  onChange,
}: {
  config: CriticalRiskEscalationWorkflowConfig;
  onChange: (config: CriticalRiskEscalationWorkflowConfig) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Recipient roles</span>
        <input
          value={config.recipientRoles.join(', ')}
          onChange={(event) => onChange({
            ...config,
            recipientRoles: parseList(event.target.value).filter((item): item is 'admin' | 'helpdesk' => (
              item === 'admin' || item === 'helpdesk'
            )),
          })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Notification title template</span>
        <input
          value={config.titleTemplate}
          onChange={(event) => onChange({ ...config, titleTemplate: event.target.value })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
    </div>
  );
}

function CrossTeamSlaEditor({
  config,
  onChange,
}: {
  config: CrossTeamFollowUpSlaWorkflowConfig;
  onChange: (config: CrossTeamFollowUpSlaWorkflowConfig) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Support request due minutes</span>
        <input
          type="number"
          min={1}
          value={config.supportRequestDueMinutes}
          onChange={(event) => onChange({ ...config, supportRequestDueMinutes: Number(event.target.value) })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        {(['low', 'medium', 'high'] as const).map((priority) => (
          <label key={priority} className="text-sm">
            <span className="mb-1.5 block font-medium capitalize text-slate-700">{priority} escalation SLA</span>
            <input
              type="number"
              min={1}
              value={config.escalationDueMinutesByPriority[priority]}
              onChange={(event) => onChange({
                ...config,
                escalationDueMinutesByPriority: {
                  ...config.escalationDueMinutesByPriority,
                  [priority]: Number(event.target.value),
                },
              })}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        ))}
      </div>
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Breach recipient roles</span>
        <input
          value={config.breachRecipientRoles.join(', ')}
          onChange={(event) => onChange({
            ...config,
            breachRecipientRoles: parseList(event.target.value).filter((item): item is 'admin' | 'helpdesk' => (
              item === 'admin' || item === 'helpdesk'
            )),
          })}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </label>
    </div>
  );
}
