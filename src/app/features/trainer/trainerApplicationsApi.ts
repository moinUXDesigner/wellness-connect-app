import { getAuthState, setAuthState, type AuthUser } from '../auth/auth';
import {
  findTrainerApplication,
  mergeTrainerOnboardingValues,
  readTrainerApplications,
  upsertTrainerApplication,
  withoutTrainerUploadPreviews,
  type TrainerApplicationRecord,
  type TrainerApplicationStatus,
  type TrainerOnboardingFormValues,
} from './trainerOnboarding';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

type TrainerApplicationResponse = {
  application: {
    applicationId: string;
    status: TrainerApplicationStatus;
    applicantName: string;
    applicantEmail: string;
    applicantMobile: string;
    city: string;
    state: string;
    expertise: string[];
    values: Partial<TrainerOnboardingFormValues>;
    submittedAt: string;
    updatedAt: string;
    adminRemarks: string;
    reviewHistory: TrainerApplicationRecord['reviewHistory'];
    currentScreen?: TrainerApplicationRecord['currentScreen'];
  };
  account?: {
    userId: string;
    email: string;
    created: boolean;
    temporaryPassword: string | null;
  } | null;
};

export type TrainerApplicationReviewResult = {
  application: TrainerApplicationRecord;
  account?: NonNullable<TrainerApplicationResponse['account']>;
};

export type TrainerMobileOtpChallenge = {
  challengeToken: string;
  maskedMobile: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
};

export type TrainerEmailOtpChallenge = {
  challengeToken: string;
  maskedEmail: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type TrainerApplicationApiIssue = {
  path: string;
  message: string;
};

export class TrainerApplicationSubmissionError extends Error {
  issues: TrainerApplicationApiIssue[];

  constructor(message: string, issues: TrainerApplicationApiIssue[] = []) {
    super(message);
    this.name = 'TrainerApplicationSubmissionError';
    this.issues = issues;
  }
}

function readJson(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : Promise.resolve(null);
}

function authHeaders(withJson = false): HeadersInit {
  const token = getAuthState().token;
  return {
    Accept: 'application/json',
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeTrainerApplicationRecord(application: TrainerApplicationResponse['application']): TrainerApplicationRecord {
  return {
    applicationId: application.applicationId,
    status: application.status,
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantMobile: application.applicantMobile,
    city: application.city,
    state: application.state,
    expertise: application.expertise ?? [],
    values: withoutTrainerUploadPreviews(mergeTrainerOnboardingValues(application.values)),
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    adminRemarks: application.adminRemarks ?? '',
    reviewHistory: application.reviewHistory ?? [],
    currentScreen: application.currentScreen,
  };
}

export async function requestTrainerMobileOtp(input: { mobile: string; consent_to_terms: boolean }) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/mobile-otp/request`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response) as TrainerMobileOtpChallenge | { message?: string } | null;
  if (!response.ok || !data || !('challengeToken' in data)) {
    throw new Error(String(data?.message ?? 'Unable to send a verification code.'));
  }

  return data;
}

export async function verifyTrainerMobileOtp(input: { challengeToken: string; otp: string }) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/mobile-otp/verify`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response) as { challengeToken?: string; mobileVerified?: boolean; maskedMobile?: string; message?: string } | null;
  if (!response.ok || !data?.challengeToken || !data.mobileVerified) {
    throw new Error(String(data?.message ?? 'Unable to verify your mobile number.'));
  }

  return data as { challengeToken: string; mobileVerified: true; maskedMobile: string; message: string };
}

export async function resendTrainerMobileOtp(challengeToken: string) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/mobile-otp/resend`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken }),
  });
  const data = await readJson(response) as TrainerMobileOtpChallenge | { message?: string } | null;
  if (!response.ok || !data || !('challengeToken' in data)) {
    throw new Error(String(data?.message ?? 'Unable to resend a verification code.'));
  }

  return data;
}

export async function requestTrainerEmailOtp(input: { challengeToken: string; name: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/email-otp/request`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response) as TrainerEmailOtpChallenge | { message?: string } | null;
  if (!response.ok || !data || !('challengeToken' in data)) {
    throw new Error(String(data?.message ?? 'Unable to send a verification code.'));
  }

  return data;
}

export async function verifyTrainerEmailOtp(input: { challengeToken: string; otp: string }) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/email-otp/verify`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response) as (TrainerApplicationResponse & { token?: string; user?: AuthUser; message?: string }) | null;
  if (!response.ok || !data?.token || !data.user || !data.application) {
    throw new Error(String(data?.message ?? 'Unable to verify your email address.'));
  }

  setAuthState(data.token, data.user);
  const application = normalizeTrainerApplicationRecord(data.application);
  upsertTrainerApplication(application);
  return application;
}

export async function resendTrainerEmailOtp(challengeToken: string) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/email-otp/resend`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken }),
  });
  const data = await readJson(response) as TrainerEmailOtpChallenge | { message?: string } | null;
  if (!response.ok || !data || !('challengeToken' in data)) {
    throw new Error(String(data?.message ?? 'Unable to resend a verification code.'));
  }

  return data;
}

export async function registerTrainerWithGoogle(input: { challengeToken: string; idToken: string }) {
  const response = await fetch(`${API_BASE}/auth/trainer-register/google`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await readJson(response) as (TrainerApplicationResponse & { token?: string; user?: AuthUser; message?: string }) | null;
  if (!response.ok || !data?.token || !data.user || !data.application) {
    throw new Error(String(data?.message ?? 'Unable to continue with Google.'));
  }

  setAuthState(data.token, data.user);
  const application = normalizeTrainerApplicationRecord(data.application);
  upsertTrainerApplication(application);
  return application;
}

export async function fetchCurrentTrainerApplicationFromApi() {
  const response = await fetch(`${API_BASE}/trainer/application`, { headers: authHeaders() });
  const data = (await readJson(response)) as TrainerApplicationResponse | { message?: string } | null;
  if (!response.ok || !data || !('application' in data)) {
    throw new Error(String(data && 'message' in data ? data.message : 'Unable to load your trainer application.'));
  }
  const application = normalizeTrainerApplicationRecord(data.application);
  upsertTrainerApplication(application);
  return application;
}

export async function saveTrainerDraftToApi(input: { values: TrainerOnboardingFormValues; currentScreen: TrainerApplicationRecord['currentScreen'] }) {
  const compactInput = { ...input, values: withoutTrainerUploadPreviews(input.values) };
  const response = await fetch(`${API_BASE}/trainer/application/draft`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify(compactInput),
  });
  const data = (await readJson(response)) as TrainerApplicationResponse | { message?: string } | null;
  if (!response.ok || !data || !('application' in data)) {
    throw new Error(String(data && 'message' in data ? data.message : 'Unable to save your trainer application.'));
  }
  const application = normalizeTrainerApplicationRecord(data.application);
  upsertTrainerApplication(application);
  return application;
}

export async function submitTrainerApplicationToApi(input: { values: TrainerOnboardingFormValues }) {
  const compactValues = withoutTrainerUploadPreviews(input.values);
  const response = await fetch(`${API_BASE}/trainer/application/submit`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ values: compactValues }),
  });
  const data = (await readJson(response)) as TrainerApplicationResponse | ApiErrorResponse | null;
  if (!response.ok || !data || !('application' in data)) {
    const issues = data && 'errors' in data && data.errors
      ? Object.entries(data.errors).flatMap(([path, messages]) => messages.map((message) => ({ path, message })))
      : [];
    throw new TrainerApplicationSubmissionError(
      String(data && 'message' in data && data.message ? data.message : 'Unable to submit your trainer application.'),
      issues,
    );
  }
  const application = normalizeTrainerApplicationRecord(data.application);
  upsertTrainerApplication(application);
  return application;
}

export async function fetchTrainerApplicationFromApi(applicationId: string | null | undefined) {
  if (!applicationId) return null;

  try {
    const response = await fetch(`${API_BASE}/trainer-applications/${applicationId}`, {
      method: 'GET',
      headers: authHeaders(),
    });

    if (response.status === 404) {
      return findTrainerApplication(applicationId);
    }

    const data = (await readJson(response)) as TrainerApplicationResponse | { message?: string } | null;
    if (!response.ok || !data || !('application' in data)) {
      throw new Error(String(data && 'message' in data ? data.message : 'Unable to load trainer application.'));
    }

    const application = normalizeTrainerApplicationRecord(data.application);
    upsertTrainerApplication(application);
    return application;
  } catch {
    return findTrainerApplication(applicationId);
  }
}

export async function fetchAdminTrainerApplicationsFromApi(options: { allowLocalFallback?: boolean } = {}) {
  try {
    const response = await fetch(`${API_BASE}/admin/trainer-applications`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const data = (await readJson(response)) as { applications?: TrainerApplicationResponse['application'][]; message?: string } | null;
    if (!response.ok) {
      throw new Error(String(data?.message ?? 'Unable to load trainer applications.'));
    }

    const applications = (data?.applications ?? []).map(normalizeTrainerApplicationRecord);
    applications.forEach((application) => upsertTrainerApplication(application));
    return applications;
  } catch (error) {
    if (options.allowLocalFallback === false) {
      throw error instanceof Error ? error : new Error('Unable to load trainer applications.');
    }

    return readTrainerApplications();
  }
}

export async function updateTrainerApplicationReviewInApi(input: {
  applicationId: string;
  status: Extract<TrainerApplicationStatus, 'under_review' | 'needs_resubmission' | 'approved' | 'rejected'>;
  adminRemarks: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/admin/trainer-applications/${input.applicationId}`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify({
        status: input.status,
        adminRemarks: input.adminRemarks,
      }),
    });

    const data = (await readJson(response)) as TrainerApplicationResponse | { message?: string } | null;
    if (!response.ok || !data || !('application' in data)) {
      throw new Error(String(data && 'message' in data ? data.message : 'Unable to update trainer application.'));
    }

    const application = normalizeTrainerApplicationRecord(data.application);
    upsertTrainerApplication(application);
    return {
      application,
      account: 'account' in data && data.account ? data.account : undefined,
    } satisfies TrainerApplicationReviewResult;
  } catch (error) {
    const localApplication = findTrainerApplication(input.applicationId);
    if (!localApplication) {
      throw error instanceof Error ? error : new Error('Unable to update trainer application.');
    }

    const timestamp = new Date().toISOString();
    const fallback: TrainerApplicationRecord = {
      ...localApplication,
      status: input.status,
      adminRemarks: input.adminRemarks,
      updatedAt: timestamp,
      reviewHistory: [
        ...localApplication.reviewHistory,
        createHistoryItem({
          action: input.status,
          actor: 'admin',
          note: input.adminRemarks || 'Admin updated the trainer application status.',
          at: timestamp,
        }),
      ],
    };

    upsertTrainerApplication(fallback);
    return { application: fallback } satisfies TrainerApplicationReviewResult;
  }
}
