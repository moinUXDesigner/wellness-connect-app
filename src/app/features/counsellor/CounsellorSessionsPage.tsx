import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileText,
  MessageCircle,
  Save,
  Send,
  Share2,
  ShieldAlert,
  Star,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import {
  assignCounsellorCbtHomeworkRequest,
  completeCounsellorSessionRequest,
  createCounsellorAssessmentRequest,
  createCounsellorCbtPlanRequest,
  escalateCounsellorSessionRequest,
  followUpCounsellorSessionRequest,
  getCounsellorSessionsRequest,
  getCounsellorSessionWorkspaceRequest,
  saveCounsellorSessionFlowStepRequest,
  saveCounsellorSessionNotesRequest,
  saveCounsellorSessionSummaryRequest,
  startCounsellorSessionRequest,
  type CounsellorAssessmentType,
  type CounsellorFlowStepStatus,
  type CounsellorSessionFlowStep,
  type CounsellorSessionQueueItem,
  type CounsellorSessionSummary,
  type CounsellorSessionWorkspace,
} from '../shared/services/api';
import { getAuthState } from '../auth/auth';

type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type SummaryDraft = {
  sessionRating: number | null;
  clientFeedback: string;
  clinicianSummary: string;
  clientSummary: string;
  privateSummary: string;
  nextAgenda: string;
};

const tabs = [
  'Session Summary',
  'Guided CBT Flow',
  'Opening',
  'Assessment & Exploration',
  'Core CBT Intervention',
  'Planning',
  'Closure',
  'Notes',
  'Assessments',
  'CBT Care',
  'Treatment Plan',
  'Homework',
  'Case Conceptualization',
  'Documents',
  'History',
];

const assessmentLabels: Array<{ type: CounsellorAssessmentType; label: string }> = [
  { type: 'gad_7', label: 'GAD-7' },
  { type: 'phq_9', label: 'PHQ-9' },
  { type: 'pss', label: 'PSS' },
  { type: 'dass_21', label: 'DASS-21' },
  { type: 'bdi_ii', label: 'BDI-II' },
];

const responseFieldLabels: Record<string, string[]> = {
  mood_check_in: ['mood', 'anxiety', 'depression', 'stress', 'update'],
  todays_agenda: ['focus_one', 'focus_two', 'focus_three'],
  automatic_thoughts: ['situation', 'thought', 'emotion', 'intensity'],
  cognitive_distortions: ['distortions'],
  thought_challenge: ['evidence_for', 'evidence_against', 'alternative_explanation'],
  balanced_thoughts: ['balanced_thought'],
  risk_assessment: ['risk_status', 'protective_factors', 'safety_plan'],
  homework_assignment: ['objective', 'instructions', 'due_date'],
  next_session: ['date_time', 'focus', 'follow_up_plan'],
};

export default function CounsellorSessionsPage() {
  const [sessions, setSessions] = useState<CounsellorSessionQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<CounsellorSessionWorkspace | null>(null);
  const [draft, setDraft] = useState<SoapDraft>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [summaryDraft, setSummaryDraft] = useState<SummaryDraft>(emptySummaryDraft());
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAction, setSavingAction] = useState('');
  const [homeworkTemplateId, setHomeworkTemplateId] = useState<number | null>(null);
  const [creatingCbtPlan, setCreatingCbtPlan] = useState(false);

  const closeNotification = useCallback(() => {
    setMessage('');
    setError('');
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingQueue(true);
    getCounsellorSessionsRequest()
      .then((items) => {
        if (mounted) setSessions(items);
      })
      .catch((requestError: unknown) => {
        if (mounted) setError(errorMessage(requestError, 'Unable to load sessions.'));
      })
      .finally(() => {
        if (mounted) setLoadingQueue(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setWorkspace(null);
      return;
    }

    let mounted = true;
    setLoadingWorkspace(true);
    getCounsellorSessionWorkspaceRequest(selectedId)
      .then((data) => {
        if (!mounted) return;
        hydrateWorkspace(data);
      })
      .catch((requestError: unknown) => {
        if (mounted) setError(errorMessage(requestError, 'Unable to load session workspace.'));
      })
      .finally(() => {
        if (mounted) setLoadingWorkspace(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const selectedSession = useMemo(() => sessions.find((item) => item.id === selectedId) ?? null, [selectedId, sessions]);
  const notification = error ? { tone: 'danger' as const, message: error } : message ? { tone: 'success' as const, message } : null;

  function hydrateWorkspace(data: CounsellorSessionWorkspace) {
    setWorkspace(data);
    setDraft({
      subjective: data.notes.subjective ?? '',
      objective: data.notes.objective ?? '',
      assessment: data.notes.assessment ?? '',
      plan: data.notes.plan ?? '',
    });
    setSummaryDraft(summaryFromApi(data.sessionSummary));
    setHomeworkTemplateId(data.cbt.homeworkTemplates[0]?.id ?? null);
    setSessions((items) => items.map((item) => (item.id === data.session.id ? data.session : item)));
  }

  function replaceWorkspace(data: CounsellorSessionWorkspace, successMessage: string) {
    hydrateWorkspace(data);
    setMessage(successMessage);
    setError('');
  }

  async function runWorkspaceAction(label: string, action: () => Promise<CounsellorSessionWorkspace>, successMessage: string) {
    if (!workspace) return;
    setSavingAction(label);
    setMessage('');
    setError('');
    try {
      replaceWorkspace(await action(), successMessage);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update session.'));
    } finally {
      setSavingAction('');
    }
  }

  async function handleQueueAction(session: CounsellorSessionQueueItem) {
    setSelectedId(session.id);
    setFocusMode(true);
    setActiveTab(tabs[0]);
    if (session.workflowState !== 'upcoming') return;

    setSavingAction('start');
    try {
      replaceWorkspace(await startCounsellorSessionRequest(session.id), 'Session started.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to start session.'));
    } finally {
      setSavingAction('');
    }
  }

  async function handleSaveStep(step: CounsellorSessionFlowStep, clinicalNote: string, response: Record<string, unknown>, status: CounsellorFlowStepStatus) {
    if (!workspace) return;
    setSavingAction(step.stepKey);
    try {
      replaceWorkspace(await saveCounsellorSessionFlowStepRequest(workspace.session.id, step.stepKey, {
        status,
        clinical_note: clinicalNote,
        response_json: response,
      }), `${step.title} saved.`);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to save guided step.'));
    } finally {
      setSavingAction('');
    }
  }

  async function handleSaveSummary() {
    if (!workspace) return;
    await runWorkspaceAction('summary', () => saveCounsellorSessionSummaryRequest(workspace.session.id, {
      session_rating: summaryDraft.sessionRating,
      client_feedback: summaryDraft.clientFeedback,
      clinician_summary: summaryDraft.clinicianSummary,
      client_summary: summaryDraft.clientSummary,
      private_summary: summaryDraft.privateSummary,
      next_agenda: summaryDraft.nextAgenda,
    }), 'Session summary saved.');
  }

  async function handleAssessment(type: CounsellorAssessmentType) {
    if (!workspace) return;
    setSavingAction(type);
    try {
      const result = await createCounsellorAssessmentRequest(workspace.session.id, { assessment_type: type, score: 0 });
      replaceWorkspace(result.workspace, 'Assessment recorded.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to record assessment.'));
    } finally {
      setSavingAction('');
    }
  }

  async function handleSendHomework() {
    if (!workspace?.cbt.activePlan || !homeworkTemplateId) {
      setError('Create an active CBT plan before sending homework.');
      return;
    }
    setSavingAction('homework');
    try {
      await assignCounsellorCbtHomeworkRequest(workspace.cbt.activePlan.id, homeworkTemplateId);
      const refreshed = await getCounsellorSessionWorkspaceRequest(workspace.session.id);
      replaceWorkspace(refreshed, 'CBT homework sent.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to send homework.'));
    } finally {
      setSavingAction('');
    }
  }

  async function handleCreateCbtPlan(payload: { title: string; primaryGoal: string; description: string }) {
    if (!workspace) return;
    setCreatingCbtPlan(true);
    try {
      await createCounsellorCbtPlanRequest(workspace.client.id, {
        title: payload.title,
        primary_goal: payload.primaryGoal,
        description: payload.description,
        status: 'active',
        start_date: new Date().toISOString().slice(0, 10),
        review_frequency: 'weekly',
        risk_level: 'low',
        goals: [{ goal_title: payload.primaryGoal, goal_description: payload.description, baseline_score: 80, target_score: 40 }],
      });
      replaceWorkspace(await getCounsellorSessionWorkspaceRequest(workspace.session.id), 'CBT plan created.');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to create CBT plan.'));
    } finally {
      setCreatingCbtPlan(false);
    }
  }

  return (
    <div className="space-y-5">
      <Snackbar tone={notification?.tone ?? 'success'} message={notification?.message ?? ''} onClose={closeNotification} />

      <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-indigo-600">Counsellor command center</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#111941]">Sessions</h1>
            <p className="mt-1 text-sm text-slate-600">Today&apos;s queue, guided CBT workflow, documentation, and clinical actions.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">{sessions.length} scheduled</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-[#111941]">Today&apos;s Sessions</h2>
          <span className="text-xs font-semibold text-slate-500">Live clinical queue</span>
        </div>
        {loadingQueue ? <QueueSkeleton /> : sessions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className={`border-t border-slate-100 ${selectedId === session.id ? 'bg-indigo-50/50' : 'bg-white'}`}>
                    <td className="px-4 py-3 font-semibold text-[#111941]">{session.time ?? '-'}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => void handleQueueAction(session)} className="font-semibold text-[#111941] hover:text-indigo-700">{session.clientName}</button></td>
                    <td className="px-4 py-3 text-slate-600">{session.sessionType}</td>
                    <td className="px-4 py-3"><RiskPill level={session.riskLevel ?? 'low'}>{session.riskLevel ?? 'No active risk'}</RiskPill></td>
                    <td className="px-4 py-3"><StatusBadge status={session.workflowState} /></td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => void handleQueueAction(session)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">{session.actionLabel}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="px-4 py-6 text-sm text-slate-500">No sessions scheduled for today.</p>}
      </section>

      {focusMode && selectedSession ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f8fafc]">
          <SessionWorkspaceHeader
            session={workspace?.session ?? selectedSession}
            onBack={() => setFocusMode(false)}
            onFollowUp={() => workspace && void runWorkspaceAction('follow-up', () => followUpCounsellorSessionRequest(workspace.session.id), 'Follow-up marked.')}
          />
          <div className="border-b border-slate-200 bg-white px-5">
            <div className="mx-auto flex max-w-[1600px] gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-1 py-3 text-sm font-semibold ${activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-[#111941]'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1600px] px-5 py-5 pb-28">
            {loadingWorkspace ? <WorkspaceSkeleton /> : workspace ? (
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]">
                <ClientSnapshot workspace={workspace} />
                <main className="space-y-4">
                  <ActiveWorkspaceTab
                    activeTab={activeTab}
                    workspace={workspace}
                    draft={draft}
                    setDraft={setDraft}
                    summaryDraft={summaryDraft}
                    setSummaryDraft={setSummaryDraft}
                    onSaveSummary={handleSaveSummary}
                    onSaveNotes={() => workspace && void runWorkspaceAction('notes', () => saveCounsellorSessionNotesRequest(workspace.session.id, draft), 'SOAP notes saved.')}
                    onSaveStep={handleSaveStep}
                    onAssessment={handleAssessment}
                    savingAction={savingAction}
                  />
                </main>
                <RightRail
                  workspace={workspace}
                  homeworkTemplateId={homeworkTemplateId}
                  setHomeworkTemplateId={setHomeworkTemplateId}
                  onAssessment={handleAssessment}
                  onCreateCbtPlan={handleCreateCbtPlan}
                  creatingCbtPlan={creatingCbtPlan}
                  savingAction={savingAction}
                />
              </div>
            ) : null}
          </div>

          {workspace ? (
            <BottomActionBar
              saving={savingAction !== ''}
              onSaveNotes={() => void runWorkspaceAction('notes', () => saveCounsellorSessionNotesRequest(workspace.session.id, draft), 'SOAP notes saved.')}
              onComplete={() => void runWorkspaceAction('complete', () => completeCounsellorSessionRequest(workspace.session.id), 'Session completed and locked.')}
              onSummary={handleSaveSummary}
              onEscalate={() => void runWorkspaceAction('escalate', () => escalateCounsellorSessionRequest(workspace.session.id), 'Case escalated.')}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SessionWorkspaceHeader({ session, onBack, onFollowUp }: { session: CounsellorSessionQueueItem; onBack: () => void; onFollowUp: () => void }) {
  const user = getAuthState().user;
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 backdrop-blur">
      <div className="mx-auto flex min-h-[92px] max-w-[1600px] flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to Sessions</button>
          <span className="hidden h-10 border-l border-slate-200 md:block" />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <StatusBadge status={session.workflowState} />
              <p className="text-sm font-semibold text-slate-600">{session.time ?? '-'} | {session.sessionType}</p>
            </div>
            <h1 className="truncate text-2xl font-semibold text-[#111941]">{session.clientName}</h1>
            <p className="text-sm text-slate-500">{session.mode?.replace('_', ' ') || 'online'} session</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <HeaderButton icon={<Video size={16} />}>View / Join Meet</HeaderButton>
          <HeaderButton icon={<MessageCircle size={16} />}>Message Client</HeaderButton>
          <HeaderButton icon={<Share2 size={16} />}>Share Summary</HeaderButton>
          <button type="button" onClick={onFollowUp} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-100 hover:bg-indigo-700">
            <CalendarPlus size={16} /> Schedule Next Session <ChevronDown size={15} />
          </button>
          <span className="mx-2 hidden h-9 border-l border-slate-200 lg:block" />
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">{initials(user?.name ?? 'Dr')}</span>
            <span className="hidden text-sm lg:block"><strong className="block text-[#111941]">{user?.name ?? 'Counsellor'}</strong><span className="text-xs text-slate-500">Counsellor</span></span>
          </div>
        </div>
      </div>
    </header>
  );
}

function ClientSnapshot({ workspace }: { workspace: CounsellorSessionWorkspace }) {
  const riskFlags = workspace.client.riskFlags.length ? workspace.client.riskFlags : [{ id: 0, label: 'No active risk', level: 'low' }];
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelTitle icon={<UserRound size={17} />} title="Client Snapshot" />
      <div className="mt-5 border-b border-slate-100 pb-5">
        <h2 className="text-xl font-semibold text-[#111941]">{workspace.client.name}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Age: {workspace.client.age ?? 'Not recorded'}<br />{workspace.client.gender ?? 'Gender not recorded'} {workspace.client.occupation ? `- ${workspace.client.occupation}` : ''}</p>
      </div>
      <SnapshotSection title="Risk Status"><div className="flex flex-wrap gap-2">{riskFlags.map((risk) => <RiskPill key={risk.id} level={risk.level}>{risk.label}</RiskPill>)}</div></SnapshotSection>
      <SnapshotSection title="Primary Concerns"><TagList items={workspace.client.previousDiagnoses.length ? workspace.client.previousDiagnoses : ['Anxiety', 'Stress']} /></SnapshotSection>
      <SnapshotSection title="Working Diagnosis"><p className="text-sm text-slate-700">{workspace.client.previousDiagnoses[0] ?? 'Generalized Anxiety Disorder'}<br />F41.1</p></SnapshotSection>
      <SnapshotSection title="Therapy Approach"><p className="text-sm text-slate-700">CBT - Mindfulness - Psychoeducation</p></SnapshotSection>
      <SnapshotSection title="Last Session" last><p className="text-sm leading-6 text-slate-600">{workspace.client.previousSessionSummary ?? 'No previous session summary available.'}</p></SnapshotSection>
    </aside>
  );
}

function SessionSummaryPanel({ workspace, draft, setDraft, onSave, saving }: { workspace: CounsellorSessionWorkspace; draft: SummaryDraft; setDraft: (draft: SummaryDraft) => void; onSave: () => void; saving: boolean }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PanelTitle icon={<CheckCircle2 size={20} />} title="Session Summary" />
          <p className="mt-1 text-sm text-slate-500">Completion {workspace.guidedFlow?.completionPercent ?? 0}% - clinician-authored client and private summaries</p>
        </div>
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-60"><Save size={15} /> {saving ? 'Saving...' : 'Save Summary'}</button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextareaBlock label="Clinician summary" value={draft.clinicianSummary} onChange={(value) => setDraft({ ...draft, clinicianSummary: value })} />
        <TextareaBlock label="Client-safe summary" value={draft.clientSummary} onChange={(value) => setDraft({ ...draft, clientSummary: value })} />
        <TextareaBlock label="Private clinical summary" value={draft.privateSummary} onChange={(value) => setDraft({ ...draft, privateSummary: value })} />
        <TextareaBlock label="Next agenda" value={draft.nextAgenda} onChange={(value) => setDraft({ ...draft, nextAgenda: value })} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
        <TextareaBlock label="Client feedback" value={draft.clientFeedback} onChange={(value) => setDraft({ ...draft, clientFeedback: value })} rows={3} />
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Session Rating</p>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button key={rating} type="button" aria-label={`${rating} star`} onClick={() => setDraft({ ...draft, sessionRating: rating })} className={rating <= (draft.sessionRating ?? 0) ? 'text-amber-400' : 'text-slate-300'}>
                <Star size={24} fill="currentColor" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm font-semibold text-[#111941]">{draft.sessionRating ?? 0} / 5</p>
        </div>
      </div>
    </section>
  );
}

function ActiveWorkspaceTab({
  activeTab,
  workspace,
  draft,
  setDraft,
  summaryDraft,
  setSummaryDraft,
  onSaveSummary,
  onSaveNotes,
  onSaveStep,
  onAssessment,
  savingAction,
}: {
  activeTab: string;
  workspace: CounsellorSessionWorkspace;
  draft: SoapDraft;
  setDraft: (draft: SoapDraft) => void;
  summaryDraft: SummaryDraft;
  setSummaryDraft: (draft: SummaryDraft) => void;
  onSaveSummary: () => void;
  onSaveNotes: () => void;
  onSaveStep: (step: CounsellorSessionFlowStep, clinicalNote: string, response: Record<string, unknown>, status: CounsellorFlowStepStatus) => void;
  onAssessment: (type: CounsellorAssessmentType) => void;
  savingAction: string;
}) {
  if (activeTab === 'Session Summary') {
    return <SessionSummaryPanel workspace={workspace} draft={summaryDraft} setDraft={setSummaryDraft} onSave={onSaveSummary} saving={savingAction === 'summary'} />;
  }

  if (activeTab === 'Guided CBT Flow') {
    return <GuidedFlowPanel workspace={workspace} savingAction={savingAction} onSaveStep={onSaveStep} />;
  }

  if (['Opening', 'Assessment & Exploration', 'Core CBT Intervention', 'Planning', 'Closure'].includes(activeTab)) {
    return <GuidedFlowPanel workspace={workspace} savingAction={savingAction} onSaveStep={onSaveStep} phaseFilter={activeTab} />;
  }

  if (activeTab === 'Notes') {
    return <NotesPanel draft={draft} setDraft={setDraft} onSave={onSaveNotes} saving={savingAction === 'notes'} />;
  }

  if (activeTab === 'Assessments') {
    return <AssessmentsScreen workspace={workspace} onAssessment={onAssessment} savingAction={savingAction} />;
  }

  if (activeTab === 'CBT Care') {
    return <CbtCareScreen workspace={workspace} />;
  }

  if (activeTab === 'Treatment Plan') {
    return <TreatmentPlanScreen workspace={workspace} />;
  }

  if (activeTab === 'Homework') {
    return <HomeworkScreen workspace={workspace} />;
  }

  if (activeTab === 'Case Conceptualization') {
    return <GuidedFlowPanel workspace={workspace} savingAction={savingAction} onSaveStep={onSaveStep} phaseFilter="Planning" stepKeys={['case_conceptualization']} />;
  }

  return <PlaceholderScreen title={activeTab} />;
}

function GuidedFlowPanel({
  workspace,
  savingAction,
  onSaveStep,
  phaseFilter,
  stepKeys,
}: {
  workspace: CounsellorSessionWorkspace;
  savingAction: string;
  onSaveStep: (step: CounsellorSessionFlowStep, clinicalNote: string, response: Record<string, unknown>, status: CounsellorFlowStepStatus) => void;
  phaseFilter?: string;
  stepKeys?: string[];
}) {
  const phases = (workspace.guidedFlow?.phases ?? [])
    .filter((phase) => !phaseFilter || phase.phase === phaseFilter)
    .map((phase) => ({
      ...phase,
      steps: stepKeys ? phase.steps.filter((step) => stepKeys.includes(step.stepKey)) : phase.steps,
    }))
    .filter((phase) => phase.steps.length > 0);
  const title = phaseFilter ? phaseFilter : 'Guided CBT Flow';
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle icon={<Brain size={18} />} title={title} />
        <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${workspace.guidedFlow?.completionPercent ?? 0}%` }} /></div>
      </div>
      <div className="mt-4 space-y-4">
        {phases.map((phase) => (
          <div key={phase.phase} className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-[#111941]">{phase.phase}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {phase.steps.map((step) => <FlowStepCard key={step.stepKey} step={step} saving={savingAction === step.stepKey} required={workspace.guidedFlow?.requiredStepKeys.includes(step.stepKey) ?? false} onSave={onSaveStep} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FlowStepCard({ step, saving, required, onSave }: { step: CounsellorSessionFlowStep; saving: boolean; required: boolean; onSave: (step: CounsellorSessionFlowStep, clinicalNote: string, response: Record<string, unknown>, status: CounsellorFlowStepStatus) => void }) {
  const [open, setOpen] = useState(required || step.status !== 'not_started');
  const [clinicalNote, setClinicalNote] = useState(step.clinicalNote ?? '');
  const [response, setResponse] = useState<Record<string, unknown>>(step.response ?? {});
  const fields = responseFieldLabels[step.stepKey] ?? ['notes'];

  useEffect(() => {
    setClinicalNote(step.clinicalNote ?? '');
    setResponse(step.response ?? {});
  }, [step]);

  return (
    <article className="px-4 py-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left">
        <StepStatus status={step.status} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#111941]">{step.title}</strong>{required ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Required</span> : null}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{step.prompt}</span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field} className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">{labelFromValue(field)}</span>
                <input value={String(response[field] ?? '')} onChange={(event) => setResponse({ ...response, [field]: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" />
              </label>
            ))}
          </div>
          <TextareaBlock label="Clinical note" value={clinicalNote} onChange={setClinicalNote} rows={3} />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => onSave(step, clinicalNote, response, 'in_progress')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">Save Draft</button>
            <button type="button" disabled={saving} onClick={() => onSave(step, clinicalNote, response, 'skipped')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">Mark None</button>
            <button type="button" disabled={saving} onClick={() => onSave(step, clinicalNote, response, 'completed')} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Complete Step'}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function RightRail({ workspace, homeworkTemplateId, setHomeworkTemplateId, onAssessment, onCreateCbtPlan, creatingCbtPlan, savingAction }: {
  workspace: CounsellorSessionWorkspace;
  homeworkTemplateId: number | null;
  setHomeworkTemplateId: (id: number | null) => void;
  onAssessment: (type: CounsellorAssessmentType) => void;
  onCreateCbtPlan: (payload: { title: string; primaryGoal: string; description: string }) => Promise<void>;
  creatingCbtPlan: boolean;
  savingAction: string;
}) {
  return (
    <aside className="space-y-4">
      <Panel>
        <RailHeader icon={<ClipboardCheck size={16} />} title="Assessments" action="View all" />
        <div className="mt-3 divide-y divide-slate-100">
          {(workspace.assessments.length ? workspace.assessments : assessmentLabels.map((item, index) => ({ id: index, assessmentType: item.type, label: item.label, score: 0, severity: 'Not recorded', tone: 'neutral', administeredAt: null as string | null }))).slice(0, 4).map((assessment) => (
            <div key={`${assessment.assessmentType}-${assessment.id}`} className="flex items-center justify-between py-3 text-sm">
              <span><strong className="block text-[#111941]">{assessment.label ?? assessment.assessmentType.toUpperCase()}</strong><span className="text-xs text-slate-500">{assessment.administeredAt ? new Date(assessment.administeredAt).toLocaleDateString() : 'Start assessment'}</span></span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${assessmentToneClass(assessment.tone)}`}>{assessment.score || '-'} {assessment.severity}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {assessmentLabels.slice(0, 4).map((item) => <button key={item.type} type="button" disabled={savingAction !== ''} onClick={() => onAssessment(item.type)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{item.label}</button>)}
        </div>
      </Panel>
      <HomeworkPanel workspace={workspace} homeworkTemplateId={homeworkTemplateId} setHomeworkTemplateId={setHomeworkTemplateId} onCreateCbtPlan={onCreateCbtPlan} creatingCbtPlan={creatingCbtPlan} />
      <TreatmentPlanPanel workspace={workspace} />
      <Panel>
        <RailHeader icon={<CalendarClock size={16} />} title="Next Session" />
        <p className="mt-3 text-sm font-semibold text-[#111941]">{workspace.session.endsAt ? new Date(workspace.session.endsAt).toLocaleString() : 'Schedule after session'}</p>
        <p className="mt-1 text-sm text-slate-600">{workspace.session.sessionType}</p>
      </Panel>
    </aside>
  );
}

function AssessmentsScreen({ workspace, onAssessment, savingAction }: { workspace: CounsellorSessionWorkspace; onAssessment: (type: CounsellorAssessmentType) => void; savingAction: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle icon={<ClipboardCheck size={18} />} title="Assessments" />
        <div className="flex flex-wrap gap-2">
          {assessmentLabels.map((item) => (
            <button key={item.type} type="button" disabled={savingAction !== ''} onClick={() => onAssessment(item.type)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_120px_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
          <span>Assessment</span><span>Score</span><span>Severity</span>
        </div>
        {(workspace.assessments.length ? workspace.assessments : []).map((assessment) => (
          <div key={assessment.id} className="grid grid-cols-[1fr_120px_150px] border-t border-slate-100 px-4 py-3 text-sm">
            <span className="font-semibold text-[#111941]">{assessment.label ?? assessment.assessmentType.toUpperCase()}</span>
            <span>{assessment.score}</span>
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${assessmentToneClass(assessment.tone)}`}>{assessment.severity ?? 'Recorded'}</span>
          </div>
        ))}
        {!workspace.assessments.length ? <p className="border-t border-slate-100 px-4 py-6 text-sm text-slate-500">No assessments recorded yet.</p> : null}
      </div>
    </section>
  );
}

function CbtCareScreen({ workspace }: { workspace: CounsellorSessionWorkspace }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelTitle icon={<Brain size={18} />} title="CBT Care" />
      {workspace.cbt.activePlan ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MetricTile label="Active Plan" value={workspace.cbt.activePlan.title} />
          <MetricTile label="Exercises" value={String(workspace.cbt.activePlan.exerciseCount)} />
          <MetricTile label="Risk Level" value={labelFromValue(workspace.cbt.activePlan.riskLevel)} />
        </div>
      ) : <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">No active CBT care plan yet. Create one from the right-side Homework Review panel.</p>}
    </section>
  );
}

function TreatmentPlanScreen({ workspace }: { workspace: CounsellorSessionWorkspace }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelTitle icon={<FileText size={18} />} title="Treatment Plan" />
      <div className="mt-4"><TreatmentPlanPanel workspace={workspace} /></div>
    </section>
  );
}

function HomeworkScreen({ workspace }: { workspace: CounsellorSessionWorkspace }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelTitle icon={<ClipboardList size={18} />} title="Homework" />
      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {(workspace.homeworkReview ?? []).map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span><strong className="block text-[#111941]">{item.title}</strong><span className="text-xs text-slate-500">{item.dueLabel}</span></span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item.reviewState}</span>
          </div>
        ))}
        {!(workspace.homeworkReview ?? []).length ? <p className="px-4 py-6 text-sm text-slate-500">No homework assigned yet.</p> : null}
      </div>
    </section>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <PanelTitle icon={<FileText size={18} />} title={title} />
      <p className="mt-4 text-sm text-slate-500">No {title.toLowerCase()} items are available for this session yet.</p>
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-[#111941]">{value}</p></div>;
}

function HomeworkPanel({ workspace, homeworkTemplateId, setHomeworkTemplateId, onCreateCbtPlan, creatingCbtPlan }: { workspace: CounsellorSessionWorkspace; homeworkTemplateId: number | null; setHomeworkTemplateId: (id: number | null) => void; onCreateCbtPlan: (payload: { title: string; primaryGoal: string; description: string }) => Promise<void>; creatingCbtPlan: boolean }) {
  const [title, setTitle] = useState(`${workspace.client.name} CBT Plan`);
  const [goal, setGoal] = useState('Reduce symptoms and strengthen CBT coping skills.');
  const [description, setDescription] = useState('Structured CBT plan created from the session workspace.');

  return (
    <Panel>
      <RailHeader icon={<ClipboardList size={16} />} title="Homework Review" action="View all" />
      <div className="mt-3 divide-y divide-slate-100">
        {(workspace.homeworkReview ?? []).length ? workspace.homeworkReview?.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3 text-sm"><span><strong className="block text-[#111941]">{item.title}</strong><span className="text-xs text-slate-500">{item.dueLabel}</span></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item.reviewState}</span></div>
        )) : <p className="py-3 text-sm text-slate-500">No homework assigned yet.</p>}
      </div>
      {workspace.cbt.activePlan ? (
        <select value={homeworkTemplateId ?? ''} onChange={(event) => setHomeworkTemplateId(event.target.value ? Number(event.target.value) : null)} className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">
          {workspace.cbt.homeworkTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
        </select>
      ) : (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">Create an active CBT plan before assigning homework.</p>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-3 h-9 w-full rounded-lg border border-amber-200 px-3 text-sm" />
          <input value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-amber-200 px-3 text-sm" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-16 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm" />
          <button type="button" disabled={creatingCbtPlan || !title.trim()} onClick={() => void onCreateCbtPlan({ title, primaryGoal: goal, description })} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{creatingCbtPlan ? 'Creating...' : 'Create CBT Plan'}</button>
        </div>
      )}
    </Panel>
  );
}

function TreatmentPlanPanel({ workspace }: { workspace: CounsellorSessionWorkspace }) {
  const progress = workspace.treatmentProgress;
  return (
    <Panel>
      <RailHeader icon={<FileText size={16} />} title="Treatment Plan" action="View plan" />
      {progress ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-[#111941]">Active Plan: {progress.title}</p>
          <p className="mt-1 text-xs text-slate-500">Started: {progress.startedAt ?? 'Not set'}</p>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-600"><span>Goals Progress</span><span>{progress.goalProgressPercent}%</span></div>
          <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress.goalProgressPercent}%` }} /></div>
          <p className="mt-2 text-sm text-slate-600">{progress.goalSummary}</p>
        </div>
      ) : <p className="mt-3 text-sm text-slate-500">No active treatment plan yet.</p>}
    </Panel>
  );
}

function NotesPanel({ draft, setDraft, onSave, saving }: { draft: SoapDraft; setDraft: (draft: SoapDraft) => void; onSave: () => void; saving: boolean }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between"><PanelTitle icon={<FileText size={18} />} title="SOAP Notes" /><button type="button" disabled={saving} onClick={onSave} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-60"><Save size={15} /> {saving ? 'Saving...' : 'Save Notes'}</button></div>
      <div className="mt-4 grid gap-4"><TextareaBlock label="Subjective" value={draft.subjective} onChange={(value) => setDraft({ ...draft, subjective: value })} /><TextareaBlock label="Objective" value={draft.objective} onChange={(value) => setDraft({ ...draft, objective: value })} /><TextareaBlock label="Assessment" value={draft.assessment} onChange={(value) => setDraft({ ...draft, assessment: value })} /><TextareaBlock label="Plan" value={draft.plan} onChange={(value) => setDraft({ ...draft, plan: value })} /></div>
    </section>
  );
}

function BottomActionBar({ saving, onSaveNotes, onComplete, onSummary, onEscalate }: { saving: boolean; onSaveNotes: () => void; onComplete: () => void; onSummary: () => void; onEscalate: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap justify-center gap-3">
        <ActionButton icon={<Save size={16} />} disabled={saving} onClick={onSaveNotes} primary>Save Notes</ActionButton>
        <ActionButton icon={<CheckCircle2 size={16} />} disabled={saving} onClick={onComplete} primary>Complete & Lock Session</ActionButton>
        <ActionButton icon={<Share2 size={16} />} disabled={saving} onClick={onSummary}>Send Summary to Client</ActionButton>
        <ActionButton icon={<ShieldAlert size={16} />} disabled={saving} onClick={onEscalate} danger>Escalate Case</ActionButton>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{children}</section>;
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <h2 className="flex items-center gap-2 text-base font-semibold text-[#111941]"><span className="text-indigo-600">{icon}</span>{title}</h2>;
}

function RailHeader({ icon, title, action }: { icon: ReactNode; title: string; action?: string }) {
  return <div className="flex items-center justify-between"><PanelTitle icon={icon} title={title} />{action ? <button type="button" className="text-xs font-semibold text-indigo-600">{action}</button> : null}</div>;
}

function SnapshotSection({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return <section className={`py-4 ${last ? '' : 'border-b border-slate-100'}`}><p className="mb-3 text-xs font-semibold uppercase text-slate-500">{title}</p>{children}</section>;
}

function TagList({ items }: { items: string[] }) {
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{item}</span>)}</div>;
}

function TextareaBlock({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="block"><span className="text-xs font-semibold uppercase text-slate-500">{label}</span><textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50" /></label>;
}

function HeaderButton({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{icon}{children}</button>;
}

function ActionButton({ icon, children, disabled, onClick, primary, danger }: { icon: ReactNode; children: ReactNode; disabled?: boolean; onClick: () => void; primary?: boolean; danger?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 min-w-[160px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60 ${primary ? 'bg-indigo-600 text-white hover:bg-indigo-700' : danger ? 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{icon}{children}</button>;
}

function StepStatus({ status }: { status: CounsellorFlowStepStatus }) {
  const complete = status === 'completed';
  const skipped = status === 'skipped';
  return <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : skipped ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-indigo-200 bg-indigo-50 text-indigo-600'}`}>{complete ? <Check size={15} /> : skipped ? <X size={14} /> : <span className="size-2 rounded-full bg-current" />}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'escalated' ? 'bg-rose-50 text-rose-700' : status === 'in_progress' ? 'bg-blue-50 text-blue-700' : status.includes('pending') || status.includes('follow') ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{labelFromValue(status)}</span>;
}

function RiskPill({ level, children }: { level: string; children: ReactNode }) {
  const className = level === 'critical' || level === 'high' ? 'bg-rose-50 text-rose-700' : level === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{children}</span>;
}

function Snackbar({ tone, message, onClose }: { tone: 'success' | 'danger'; message: string; onClose: () => void }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return <div className="fixed right-5 top-5 z-[90] w-[min(calc(100vw-2rem),440px)] rounded-lg border bg-white p-4 text-sm font-semibold shadow-xl">{message}</div>;
}

function QueueSkeleton() {
  return <div className="grid gap-3 p-4">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>;
}

function WorkspaceSkeleton() {
  return <div className="grid animate-pulse gap-4 xl:grid-cols-[320px_minmax(0,1fr)_420px]"><div className="h-[680px] rounded-lg bg-slate-100" /><div className="h-[760px] rounded-lg bg-slate-100" /><div className="h-[680px] rounded-lg bg-slate-100" /></div>;
}

function emptySummaryDraft(): SummaryDraft {
  return { sessionRating: null, clientFeedback: '', clinicianSummary: '', clientSummary: '', privateSummary: '', nextAgenda: '' };
}

function summaryFromApi(summary?: CounsellorSessionSummary): SummaryDraft {
  return {
    sessionRating: summary?.sessionRating ?? null,
    clientFeedback: summary?.clientFeedback ?? '',
    clinicianSummary: summary?.clinicianSummary ?? '',
    clientSummary: summary?.clientSummary ?? '',
    privateSummary: summary?.privateSummary ?? '',
    nextAgenda: summary?.nextAgenda ?? '',
  };
}

function assessmentToneClass(tone?: string) {
  if (tone === 'danger') return 'bg-rose-50 text-rose-700';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function labelFromValue(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
