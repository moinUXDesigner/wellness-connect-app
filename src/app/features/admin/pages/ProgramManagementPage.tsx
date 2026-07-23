import { type ReactNode, useEffect, useState } from 'react';
import { PageTitle } from '../AdminLayout';
import { Panel, StatCard, ToneBadge } from '../../shared/components/Ui';
import {
  archiveAdminProgram,
  getAdminPrograms,
  getAdminProgramVersions,
  publishAdminProgram,
  saveAdminProgram,
  type AdminProgram,
  type ProgramDraft,
  type ProgramVersion,
} from '../../shared/services/programManagementApi';
import { notifyError, notifySuccess } from '../../shared/lib/toast';

const EMPTY_DRAFT: ProgramDraft = {
  name: '',
  description: '',
  duration_weeks: 6,
  credits: {
    counselling: 0,
    training: 1,
  },
};

function statusTone(status: AdminProgram['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'published') return 'success';
  if (status === 'archived') return 'danger';
  return 'warning';
}

function versionTone(status: ProgramVersion['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'published') return 'success';
  if (status === 'archived') return 'danger';
  return 'warning';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not published';
}

function summaryStats(programs: AdminProgram[]) {
  return {
    total: programs.length,
    published: programs.filter((program) => program.status === 'published').length,
    draft: programs.filter((program) => program.status === 'draft').length,
    archived: programs.filter((program) => program.status === 'archived').length,
  };
}

function totalCredits(program: AdminProgram) {
  return (program.credits.counselling ?? 0) + (program.credits.training ?? 0);
}

export default function ProgramManagementPage() {
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<AdminProgram | null>(null);
  const [draft, setDraft] = useState<ProgramDraft>(EMPTY_DRAFT);
  const [versions, setVersions] = useState<ProgramVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getAdminPrograms()
      .then((items) => {
        if (!active) return;
        setPrograms(items);
      })
      .catch((nextError) => {
        if (!active) return;
        notifyError(nextError, 'Unable to load programs.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function upsertProgram(program: AdminProgram) {
    setPrograms((current) => {
      const exists = current.some((item) => item.id === program.id);
      if (!exists) return [program, ...current];
      return current.map((item) => (item.id === program.id ? program : item));
    });
  }

  function openCreateEditor() {
    setSelectedProgram(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEditEditor(program: AdminProgram) {
    setSelectedProgram(program);
    setDraft({
      name: program.latestVersion?.name ?? program.name,
      description: program.latestVersion?.description ?? program.description ?? '',
      duration_weeks: program.latestVersion?.durationWeeks ?? program.durationWeeks,
      credits: {
        counselling: program.latestVersion?.credits.counselling ?? program.credits.counselling,
        training: program.latestVersion?.credits.training ?? program.credits.training,
      },
    });
    setEditorOpen(true);
  }

  async function submitDraft() {
    setSaving(true);

    try {
      const response = await saveAdminProgram(draft, selectedProgram?.id);
      upsertProgram(response.program);
      notifySuccess(response.message);
      setEditorOpen(false);
      setSelectedProgram(null);
      setDraft(EMPTY_DRAFT);
    } catch (nextError) {
      notifyError(nextError, 'Unable to save program draft.');
    } finally {
      setSaving(false);
    }
  }

  async function publishProgram(program: AdminProgram) {
    setPublishingId(program.id);

    try {
      const response = await publishAdminProgram(program.id);
      upsertProgram(response.program);
      notifySuccess(response.message);
    } catch (nextError) {
      notifyError(nextError, 'Unable to publish program.');
    } finally {
      setPublishingId(null);
    }
  }

  async function archiveProgram(program: AdminProgram) {
    setArchivingId(program.id);

    try {
      const response = await archiveAdminProgram(program.id);
      upsertProgram(response.program);
      notifySuccess(response.message);
    } catch (nextError) {
      notifyError(nextError, 'Unable to archive program.');
    } finally {
      setArchivingId(null);
    }
  }

  async function viewVersions(program: AdminProgram) {
    setSelectedProgram(program);
    setVersionsOpen(true);
    setVersionsLoading(true);

    try {
      setVersions(await getAdminProgramVersions(program.id));
    } catch (nextError) {
      notifyError(nextError, 'Unable to load version history.');
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  const stats = summaryStats(programs);

  return (
    <div className="space-y-6">
      <PageTitle title="Program Management" subtitle="Manage wellness programs and lifecycle status." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Programs" value={String(stats.total)} hint="All catalog entries across every lifecycle state." />
        <StatCard title="Published" value={String(stats.published)} hint="Available for future program usage." />
        <StatCard title="Draft" value={String(stats.draft)} hint="In-progress program versions not yet live." />
        <StatCard title="Archived" value={String(stats.archived)} hint="Retained for history without new use." />
      </div>

      <Panel title="Catalog">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">Create, edit, publish, and archive versioned wellness programs without touching membership pricing.</p>
          <button
            type="button"
            onClick={openCreateEditor}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            New Program
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : null}

        {!loading && !programs.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No programs exist yet.</p>
            <p className="mt-2 text-sm text-slate-500">Create the first draft to start building the program catalog.</p>
          </div>
        ) : null}

        {!loading && programs.length ? (
          <>
            <div className="space-y-3 lg:hidden">
              {programs.map((program) => (
                <article key={program.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{program.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{program.description || 'No description yet.'}</p>
                    </div>
                    <ToneBadge tone={statusTone(program.status)}>{program.status}</ToneBadge>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p>Duration: {program.durationWeeks} weeks</p>
                    <p>Credits: {program.credits.counselling} counselling, {program.credits.training} training</p>
                    <p>Versions: {program.versionCount}</p>
                    <p>Linked intakes: {program.intakeFlowCount}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton label="Edit Draft" onClick={() => openEditEditor(program)} />
                    <ActionButton
                      label={publishingId === program.id ? 'Publishing...' : 'Publish'}
                      onClick={() => void publishProgram(program)}
                      disabled={publishingId === program.id || totalCredits(program) < 1}
                    />
                    <ActionButton
                      label={archivingId === program.id ? 'Archiving...' : 'Archive'}
                      onClick={() => void archiveProgram(program)}
                      disabled={archivingId === program.id || program.status === 'archived'}
                    />
                    <ActionButton label="Versions" onClick={() => void viewVersions(program)} />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Duration</th>
                    <th className="pb-3 font-medium">Credits</th>
                    <th className="pb-3 font-medium">Versions</th>
                    <th className="pb-3 font-medium">Linked Intakes</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {programs.map((program) => (
                    <tr key={program.id}>
                      <td className="py-4 pr-4 align-top">
                        <p className="font-semibold text-slate-900">{program.name}</p>
                        <p className="mt-1 max-w-md text-slate-500">{program.description || 'No description yet.'}</p>
                      </td>
                      <td className="py-4 pr-4 align-top"><ToneBadge tone={statusTone(program.status)}>{program.status}</ToneBadge></td>
                      <td className="py-4 pr-4 align-top">{program.durationWeeks} weeks</td>
                      <td className="py-4 pr-4 align-top">{program.credits.counselling} counselling / {program.credits.training} training</td>
                      <td className="py-4 pr-4 align-top">{program.versionCount}</td>
                      <td className="py-4 pr-4 align-top">{program.intakeFlowCount}</td>
                      <td className="py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <ActionButton label="Edit Draft" onClick={() => openEditEditor(program)} />
                          <ActionButton
                            label={publishingId === program.id ? 'Publishing...' : 'Publish'}
                            onClick={() => void publishProgram(program)}
                            disabled={publishingId === program.id || totalCredits(program) < 1}
                          />
                          <ActionButton
                            label={archivingId === program.id ? 'Archiving...' : 'Archive'}
                            onClick={() => void archiveProgram(program)}
                            disabled={archivingId === program.id || program.status === 'archived'}
                          />
                          <ActionButton label="Versions" onClick={() => void viewVersions(program)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Panel>

      {editorOpen ? (
        <ModalShell
          title={selectedProgram ? `Edit Draft: ${selectedProgram.name}` : 'Create Program'}
          subtitle="Draft changes stay editable until you publish a version for future use."
          onClose={() => {
            setEditorOpen(false);
            setSelectedProgram(null);
            setDraft(EMPTY_DRAFT);
          }}
        >
          <div className="grid gap-4">
            <Field label="Program Name">
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Duration (weeks)">
                <input
                  type="number"
                  min={1}
                  value={draft.duration_weeks}
                  onChange={(event) => setDraft((current) => ({ ...current, duration_weeks: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Counselling Credits">
                <input
                  type="number"
                  min={0}
                  value={draft.credits.counselling}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    credits: { ...current.credits, counselling: Number(event.target.value) },
                  }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </Field>

              <Field label="Training Credits">
                <input
                  type="number"
                  min={0}
                  value={draft.credits.training}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    credits: { ...current.credits, training: Number(event.target.value) },
                  }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitDraft()}
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : selectedProgram ? 'Save Draft' : 'Create Draft'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {versionsOpen ? (
        <ModalShell
          title={selectedProgram ? `${selectedProgram.name} Versions` : 'Program Versions'}
          subtitle="Read-only version history for audit and release review."
          onClose={() => {
            setVersionsOpen(false);
            setVersions([]);
            setSelectedProgram(null);
          }}
        >
          {versionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <article key={version.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Version {version.versionNumber}</h3>
                      <p className="mt-1 text-sm text-slate-500">{version.description || 'No description for this version.'}</p>
                    </div>
                    <ToneBadge tone={versionTone(version.status)}>{version.status}</ToneBadge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <p>Duration: {version.durationWeeks} weeks</p>
                    <p>Credits: {version.credits.counselling} counselling / {version.credits.training} training</p>
                    <p>Published: {formatDate(version.publishedAt)}</p>
                  </div>
                </article>
              ))}

              {!versions.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  No versions recorded for this program yet.
                </div>
              ) : null}
            </div>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
