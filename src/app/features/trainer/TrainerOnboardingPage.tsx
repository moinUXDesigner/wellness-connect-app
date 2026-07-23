import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  CircleUserRound,
  CreditCard,
  Download,
  Dumbbell,
  Eye,
  EyeOff,
  FileBadge2,
  FileCheck2,
  GraduationCap,
  Heart,
  Hourglass,
  ImagePlus,
  LockKeyhole,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  SquareCheck,
  TriangleAlert,
  Upload,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import trainerOnboardingIllustration from '../../../assets/pt-onboard/Step-1-Illustration.png';
import trainerWelcomeIllustration from '../../../assets/pt-onboard/Step-2-Illustration.png';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { UserAvatar } from '../../components/UserAvatar';
import {
  buildTrainerSubmissionIssue,
  findTrainerApplication,
  mergeTrainerOnboardingValues,
  nextActionLabel,
  statusLabel,
  trainerAnimationMap,
  trainerDayOptions,
  trainerExpertiseOptions,
  trainerGenderOptions,
  trainerModeOptions,
  trainerOnboardingDefaultValues,
  trainerOnboardingSchema,
  trainerOnboardingSchemaVersion,
  trainerOnboardingScreens,
  trainerOnboardingStorageKey,
  withoutTrainerUploadPreviews,
  type TrainerAnimationKey,
  type TrainerApplicationStatus,
  type PersistedTrainerOnboardingState,
  type TrainerApplicationHistoryItem,
  type TrainerOnboardingFormValues,
  type TrainerOnboardingScreen,
  type TrainerOnboardingScreenId,
  type TrainerSubmissionIssue,
  type UploadKind,
  type UploadValue,
} from './trainerOnboarding';
import { getAuthState } from '../auth/auth';
import { logoutRequest } from '../auth/apiAuth';
import {
  fetchCurrentTrainerApplicationFromApi,
  registerTrainerWithGoogle,
  requestTrainerEmailOtp,
  requestTrainerMobileOtp,
  resendTrainerEmailOtp,
  resendTrainerMobileOtp,
  saveTrainerDraftToApi,
  submitTrainerApplicationToApi,
  TrainerApplicationSubmissionError,
  verifyTrainerEmailOtp,
  verifyTrainerMobileOtp,
  type TrainerEmailOtpChallenge,
  type TrainerMobileOtpChallenge,
} from './trainerApplicationsApi';
import { setCachedTrainerAccessStateFromApplication } from './trainerAccess';
import { lookupStateForCity } from './data/indiaCityState';
import { notifyError } from '../shared/lib/toast';
import { useGoogleIdentity } from './useGoogleIdentity';

const reviewScreenIndex = trainerOnboardingScreens.findIndex((screen) => screen.id === 'review');
const successScreenIndex = trainerOnboardingScreens.findIndex((screen) => screen.id === 'success');

const trainerEntryShellBackground =
  'radial-gradient(circle at 16% 12%, rgba(255,255,255,0.98) 0%, rgba(250,247,255,0.96) 32%, rgba(244,240,255,0.98) 100%)';

const trainerEntryHeroBackground =
  'radial-gradient(circle at 22% 18%, rgba(255,255,255,0.95) 0%, rgba(240,235,255,0.9) 38%, rgba(235,230,255,0.86) 100%)';

const trainerEntryPanelBackground =
  'radial-gradient(circle at 50% 8%, rgba(255,255,255,0.94) 0%, rgba(252,251,255,0.98) 100%)';

const trainerEntryHighlights = [
  {
    title: 'Professional tools',
    description: 'Everything you need to coach with confidence.',
    icon: Sparkles,
  },
  {
    title: 'Secure & private',
    description: 'Your data and clients are always protected.',
    icon: ShieldCheck,
  },
  {
    title: 'Grow your impact',
    description: 'Help more people and build your brand.',
    icon: Users,
  },
] as const;

const trainerWelcomeHighlights = [
  {
    title: 'Professional profile',
    description: 'Showcase your expertise with confidence.',
    icon: CircleUserRound,
  },
  {
    title: 'Client trust',
    description: 'Build credibility and stronger relationships.',
    icon: ShieldCheck,
  },
  {
    title: 'Guided setup',
    description: 'A simple step-by-step onboarding experience.',
    icon: Sparkles,
  },
] as const;

const trainerWelcomeGenderOptions = [
  { label: 'Woman', value: 'Woman', icon: UserRound, tone: 'text-[#7c5cff]' },
  { label: 'Man', value: 'Man', icon: UserRound, tone: 'text-[#7c5cff]' },
  { label: 'Non-binary', value: 'Non-binary', icon: Sparkles, tone: 'text-[#2fc2bc]' },
  { label: 'Prefer not to say', value: 'Prefer not to say', icon: LockKeyhole, tone: 'text-[#7c5cff]' },
] as const;

type TrainerResponsiveSegment =
  | 'all'
  | 'showcasePhotos'
  | 'showcaseVideos'
  | 'trainingPhilosophy'
  | 'trainingVideo'
  | 'identityRequired'
  | 'identityOptional'
  | 'reviewProfile'
  | 'reviewCredentials'
  | 'reviewOperations'
  | 'reviewSubmit';

type TrainerProfileStep = 'name' | 'email' | 'password';

// Compact profile screens walk through one required field at a time on phones/tablets.
const trainerProfileSteps: TrainerProfileStep[] = ['name', 'email', 'password'];

function useMatchMedia(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function useTrainerViewportMode() {
  const isNarrow = useMatchMedia('(max-width: 767px)');
  const isTablet = useMatchMedia('(min-width: 768px) and (max-width: 1023px)');
  const isCompactAccount = useMatchMedia('(max-width: 1023px)');
  const isShort = useMatchMedia('(max-height: 759px)');

  return { isNarrow, isTablet, isCompactAccount, isShort };
}

function getResponsiveSegments(screenId: TrainerOnboardingScreenId, isSegmented: boolean): TrainerResponsiveSegment[] {
  // Dense onboarding screens are split into smaller chunks only on constrained screens.
  if (!isSegmented) return ['all'];

  switch (screenId) {
    case 'showcase':
      return ['showcasePhotos', 'showcaseVideos'];
    case 'training':
      return ['trainingPhilosophy', 'trainingVideo'];
    case 'identity':
      return ['identityRequired', 'identityOptional'];
    case 'review':
      return ['reviewProfile', 'reviewCredentials', 'reviewOperations', 'reviewSubmit'];
    default:
      return ['all'];
  }
}

function getSegmentFields(segment: TrainerResponsiveSegment): FieldPath<TrainerOnboardingFormValues>[] {
  // Only segments with required form values need validation before moving forward.
  switch (segment) {
    case 'showcasePhotos':
      return [];
    case 'showcaseVideos':
      return [];
    case 'trainingPhilosophy':
      return ['training.philosophy'];
    case 'trainingVideo':
      return [];
    case 'identityRequired':
      return ['identity.aadhaar', 'identity.pan'];
    case 'identityOptional':
      return ['identity.passport', 'identity.drivingLicense'];
    default:
      return [];
  }
}

const animationIcons: Record<TrainerAnimationKey, typeof Sparkles> = {
  personalInfo: UserRound,
  certification: GraduationCap,
  expertise: Dumbbell,
  experience: Sparkles,
  availability: CalendarDays,
  mediaUpload: Camera,
  legal: ShieldCheck,
  review: FileCheck2,
}

function readStoredState() {
  const fallback = {
    values: trainerOnboardingDefaultValues,
    screenIndex: 0,
    submitted: false,
    submittedAt: null as string | null,
    savedAt: null as string | null,
    applicationId: null as string | null,
    applicationStatus: 'draft' as const,
    adminRemarks: '',
    reviewHistory: [] as TrainerApplicationHistoryItem[],
  };

  try {
    const raw = localStorage.getItem(trainerOnboardingStorageKey);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PersistedTrainerOnboardingState>;
    if (parsed.version !== trainerOnboardingSchemaVersion) return fallback;

    const storedScreenIndex = trainerOnboardingScreens.findIndex((screen) => screen.id === parsed.screenId);
    const existingApplication = findTrainerApplication(parsed.applicationId);
    const existingStatus = existingApplication?.status ?? 'draft';
    const nextScreenIndex = existingStatus === 'needs_resubmission'
      ? reviewScreenIndex
      : storedScreenIndex >= 0
        ? storedScreenIndex
        : 0;

    return {
      values: withPreservedPhotoPreview(
        mergeTrainerOnboardingValues(existingApplication?.values ?? parsed.values),
        parsed.values,
      ),
      screenIndex: nextScreenIndex,
      submitted: Boolean(existingApplication ?? parsed.submitted),
      submittedAt: existingApplication?.submittedAt ?? parsed.submittedAt ?? null,
      savedAt: parsed.savedAt ?? null,
      applicationId: existingApplication?.applicationId ?? parsed.applicationId ?? null,
      applicationStatus: existingStatus,
      adminRemarks: existingApplication?.adminRemarks ?? '',
      reviewHistory: existingApplication?.reviewHistory ?? [],
    };
  } catch {
    return fallback;
  }
}

function findErrorMessage(errors: FieldErrors<TrainerOnboardingFormValues>, path: FieldPath<TrainerOnboardingFormValues>) {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, errors);

  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
    return value.message;
  }

  return undefined;
}

function collectSubmissionIssues(errors: FieldErrors<TrainerOnboardingFormValues>) {
  const issues: TrainerSubmissionIssue[] = [];

  function visit(value: unknown, path: string) {
    if (!value || typeof value !== 'object') return;
    if ('message' in value && typeof value.message === 'string') {
      issues.push(buildTrainerSubmissionIssue(path, value.message));
      return;
    }

    Object.entries(value).forEach(([key, child]) => {
      if (key === 'ref' || key === 'type' || key === 'types') return;
      visit(child, path ? `${path}.${key}` : key);
    });
  }

  visit(errors, '');
  return issues;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (!value) return 'Not added yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSavedTime(value: string | null) {
  if (!value) return 'Draft autosaves on this device';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Draft autosaved';
  return `Draft autosaved at ${parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function withPreservedPhotoPreview(
  nextValues: TrainerOnboardingFormValues,
  fallbackValues?: Partial<TrainerOnboardingFormValues> | null,
) {
  const previewUrl = fallbackValues?.photo?.file?.previewUrl;
  if (!previewUrl || !nextValues.photo.file || nextValues.photo.file.previewUrl) {
    return nextValues;
  }

  return {
    ...nextValues,
    photo: {
      ...nextValues.photo,
      file: {
        ...nextValues.photo.file,
        previewUrl,
      },
    },
  };
}

function toLocalPersistedValues(values: TrainerOnboardingFormValues) {
  return withPreservedPhotoPreview(withoutTrainerUploadPreviews(values), values);
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'PT';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('').slice(0, 2);
}

function formatCommaList(items: string[], fallback = 'Not added yet') {
  return items.length ? items.join(', ') : fallback;
}

function formatAccountEnding(accountNumber: string) {
  if (!accountNumber) return 'Not added yet';
  return `**** ${accountNumber.slice(-4)}`;
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function toUploadValue(file: File, kind: UploadKind, withPreview = false) {
  const shouldGeneratePreview = withPreview || kind === 'image';
  const previewUrl = shouldGeneratePreview
    ? kind === 'video'
      ? URL.createObjectURL(file)
      : await readFileAsDataUrl(file)
    : undefined;

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    kind,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl,
  } satisfies UploadValue;
}

function revokeUploadPreview(file: UploadValue | null | undefined) {
  if (file?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(file.previewUrl);
  }
}

export default function TrainerOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = getAuthState();
  const isTrainerApplicant = auth.isAuthenticated && auth.user?.role === 'trainer';
  const editMode = searchParams.get('mode') === 'edit';
  const prefersReducedMotion = useReducedMotion();
  const viewportMode = useTrainerViewportMode();
  const isSegmented = viewportMode.isNarrow || (viewportMode.isTablet && viewportMode.isShort);
  const restoredState = useMemo(readStoredState, []);
  const [screenIndex, setScreenIndex] = useState(restoredState.screenIndex);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(restoredState.submitted);
  const [submittedAt, setSubmittedAt] = useState<string | null>(restoredState.submittedAt);
  const [savedAt, setSavedAt] = useState<string | null>(restoredState.savedAt);
  const [applicationId, setApplicationId] = useState<string | null>(restoredState.applicationId);
  const [applicationStatus, setApplicationStatus] = useState(restoredState.applicationStatus);
  const [adminRemarks, setAdminRemarks] = useState(restoredState.adminRemarks);
  const [reviewHistory, setReviewHistory] = useState<TrainerApplicationHistoryItem[]>(restoredState.reviewHistory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [submissionIssues, setSubmissionIssues] = useState<TrainerSubmissionIssue[]>([]);

  const form = useForm<TrainerOnboardingFormValues>({
    defaultValues: restoredState.values,
    resolver: zodResolver(trainerOnboardingSchema),
    mode: 'onTouched',
  });

  const watchedValues = useWatch({ control: form.control });
  const values = useMemo(() => mergeTrainerOnboardingValues(watchedValues), [watchedValues]);
  const currentScreen = trainerOnboardingScreens[screenIndex];
  const responsiveSegments = getResponsiveSegments(currentScreen.id, isSegmented);
  const activeSegment = responsiveSegments[Math.min(segmentIndex, responsiveSegments.length - 1)] ?? 'all';
  const hasSegmentBack = segmentIndex > 0;
  const hasSegmentNext = segmentIndex < responsiveSegments.length - 1;

  // Reset the micro-step whenever the user reaches a new major onboarding screen.
  useEffect(() => {
    setSegmentIndex(0);
  }, [currentScreen.id, isSegmented]);

  useEffect(() => {
    if (!isTrainerApplicant) return;

    let active = true;
    void fetchCurrentTrainerApplicationFromApi()
      .then((application) => {
        if (!active) return;
        const canOpenPendingReviewForEdit = editMode && ['submitted', 'under_review'].includes(application.status);
        if (['approved', 'rejected'].includes(application.status) || (['submitted', 'under_review'].includes(application.status) && !canOpenPendingReviewForEdit)) {
          navigate('/trainer', { replace: true });
          return;
        }

        const nextIndex = trainerOnboardingScreens.findIndex((screen) => screen.id === application.currentScreen);
        form.reset(withPreservedPhotoPreview(application.values, restoredState.values));
        setApplicationId(application.applicationId);
        setApplicationStatus(application.status);
        setAdminRemarks(application.adminRemarks);
        setReviewHistory(application.reviewHistory);
        setSubmitted(false);
        setSubmittedAt(application.submittedAt || null);
        setScreenIndex(nextIndex >= 0 ? nextIndex : 0);
        setSegmentIndex(0);
        setSavedAt(application.updatedAt);
        setIsDraftReady(true);
      })
      .catch(() => setIsDraftReady(true));

    return () => {
      active = false;
    };
  }, [auth.token, editMode]);

  useEffect(() => {
    const payload: PersistedTrainerOnboardingState = {
      version: trainerOnboardingSchemaVersion,
      screenId: trainerOnboardingScreens[screenIndex].id,
      values: toLocalPersistedValues(values),
      submitted,
      submittedAt,
      savedAt: new Date().toISOString(),
      applicationId,
    };

    try {
      localStorage.setItem(trainerOnboardingStorageKey, JSON.stringify(payload));
    } catch {
      // The server draft is authoritative when browser storage is unavailable.
    }
  }, [applicationId, screenIndex, submitted, submittedAt, values]);

  useEffect(() => {
    const canEditSubmittedProfile = editMode && ['submitted', 'under_review'].includes(applicationStatus);
    if (!isTrainerApplicant || !isDraftReady || (!canEditSubmittedProfile && submitted) || !applicationId) return;

    const timeout = window.setTimeout(() => {
      void saveTrainerDraftToApi({
        values,
        currentScreen: currentScreen.id === 'success' ? 'review' : currentScreen.id,
      })
        .then((application) => {
          setSavedAt(application.updatedAt);
          setDraftError('');
        })
        .catch((error) => setDraftError(error instanceof Error ? error.message : 'Unable to autosave your trainer application.'));
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [applicationId, applicationStatus, currentScreen.id, editMode, isDraftReady, isTrainerApplicant, submitted, values]);

  async function moveNext() {
    if (currentScreen.id === 'review' && applicationStatus === 'rejected') return;

    // The review screen submits only after the final responsive review segment.
    if (currentScreen.id === 'review' && !hasSegmentNext) {
      void form.handleSubmit(submitApplication, showSubmissionValidationErrors)();
      return;
    }

    // On segmented screens, validate only the fields that are visible in the active chunk.
    const fieldsToValidate = activeSegment === 'all' ? [...currentScreen.fields] : getSegmentFields(activeSegment);
    const isValid = fieldsToValidate.length
      ? await form.trigger(fieldsToValidate, { shouldFocus: true })
      : true;

    if (!isValid) return;

    setDirection(1);
    // Move within the current responsive screen before advancing the main workflow.
    if (hasSegmentNext) {
      setSegmentIndex((index) => Math.min(index + 1, responsiveSegments.length - 1));
      return;
    }

    setSegmentIndex(0);
    setScreenIndex((index) => Math.min(index + 1, successScreenIndex));
  }

  function moveBack() {
    // Back navigation mirrors moveNext: micro-step first, then major screen.
    if (hasSegmentBack) {
      setDirection(-1);
      setSegmentIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (currentScreen.id === 'success') {
      setDirection(-1);
      setScreenIndex(reviewScreenIndex);
      return;
    }

    if (screenIndex === 0) {
      navigate(editMode ? '/trainer/submitted-profile' : '/');
      return;
    }

    setDirection(-1);
    setSegmentIndex(0);
    setScreenIndex((index) => Math.max(index - 1, 0));
  }

  function showSubmissionValidationErrors(errors: FieldErrors<TrainerOnboardingFormValues>) {
    setSubmissionError('');
    setSubmissionIssues(collectSubmissionIssues(errors));
  }

  async function submitApplication(allValues: TrainerOnboardingFormValues) {
    setIsSubmitting(true);
    setSubmissionError('');
    setSubmissionIssues([]);
    const compactValues = withoutTrainerUploadPreviews(allValues);
    const persistedValues = withPreservedPhotoPreview(compactValues, allValues);
    try {
      const application = await submitTrainerApplicationToApi({
        values: compactValues,
      });

      const payload: PersistedTrainerOnboardingState = {
        version: trainerOnboardingSchemaVersion,
        screenId: 'success',
        values: persistedValues,
        submitted: true,
        submittedAt: application.submittedAt,
        savedAt: application.updatedAt,
        applicationId: application.applicationId,
      };

      setApplicationId(application.applicationId);
      setApplicationStatus(application.status);
      setAdminRemarks(application.adminRemarks);
      setReviewHistory(application.reviewHistory);
      setSubmitted(true);
      setSubmittedAt(application.submittedAt);
      setSavedAt(application.updatedAt);
      setCachedTrainerAccessStateFromApplication(application);
      try {
        localStorage.setItem(trainerOnboardingStorageKey, JSON.stringify(payload));
      } catch {
        // Submission has already succeeded on the server; local cache is optional.
      }
      navigate('/trainer', { replace: true });
    } catch (error) {
      if (error instanceof TrainerApplicationSubmissionError && error.issues.length) {
        error.issues.forEach((issue) => {
          form.setError(issue.path as FieldPath<TrainerOnboardingFormValues>, { type: 'server', message: issue.message });
        });
        setSubmissionIssues(error.issues.map((issue) => buildTrainerSubmissionIssue(issue.path, issue.message)));
      } else {
        setSubmissionError(error instanceof Error ? error.message : 'Unable to submit your trainer application.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const reviewSections = useMemo<Array<{ title: string; screenId: TrainerOnboardingScreenId; rows: [string, string][] }>>(
    () => [
      {
        title: 'Personal details',
        screenId: 'personalInfo' as const,
        rows: [
          ['Full name', values.profile.fullName || 'Not added yet'],
          ['Gender', values.profile.gender || 'Not added yet'],
          ['Date of birth', formatDate(values.profile.dateOfBirth || '')],
          ['Email', values.profile.email || 'Not added yet'],
          ['Mobile', values.profile.mobile || 'Not added yet'],
          ['Location', values.profile.city && values.profile.state ? `${values.profile.city}, ${values.profile.state}` : 'Not added yet'],
        ],
      },
      {
        title: 'Profile photo and certification',
        screenId: 'photo' as const,
        rows: [
          ['Profile photo', values.photo.file?.name || 'Not uploaded yet'],
          ['Certification institute', values.certification.institute || 'Not added yet'],
          ['Certification type', values.certification.type || 'Not added yet'],
          ['Certificate file', values.certification.certificate?.name || 'Not uploaded yet'],
        ],
      },
      {
        title: 'Expertise and experience',
        screenId: 'expertise' as const,
        rows: [
          ['Expertise', values.expertise.length ? values.expertise.join(', ') : 'Not added yet'],
          ['Years experience', values.experience.yearsExperience || 'Not added yet'],
          ['Clients trained', values.experience.clientsTrained || 'Not added yet'],
          ['Why clients should choose you', values.clientPitch || 'Not added yet'],
        ],
      },
      {
        title: 'Showcase and coaching style',
        screenId: 'showcase' as const,
        rows: [
          ['Transformation photos', values.showcase.transformationPhotos.length ? values.showcase.transformationPhotos.map((item) => item.name).join(', ') : 'Skipped for now'],
          ['Videos', values.showcase.videos.length ? values.showcase.videos.map((item) => item.name).join(', ') : 'Skipped for now'],
          ['Training philosophy', values.training.philosophy || 'Not added yet'],
          ['Introduction video', values.training.introductionVideo?.name || 'Skipped for now'],
        ],
      },
      {
        title: 'Availability and verification',
        screenId: 'availability' as const,
        rows: [
          ['Training modes', values.availability.modes.length ? values.availability.modes.join(', ') : 'Not added yet'],
          ['Available days', values.availability.days.length ? values.availability.days.join(', ') : 'Not added yet'],
          ['Per session rate', values.availability.perSessionRateInr ? `INR ${values.availability.perSessionRateInr}` : 'Not added yet'],
          ['Monthly rate', values.availability.monthlyRateInr ? `INR ${values.availability.monthlyRateInr}` : 'Not added yet'],
          ['Pricing notes', values.availability.pricingPlans || 'Not added yet'],
          ['PAN', values.identity.pan?.name || 'Not uploaded yet'],
          ['Primary ID', values.identity.aadhaar?.name || values.identity.passport?.name || values.identity.drivingLicense?.name || 'Not uploaded yet'],
          ['Bank name', values.payout.bankName || 'Not added yet'],
          ['Account number', values.payout.accountNumber ? `•••• ${values.payout.accountNumber.slice(-4)}` : 'Not added yet'],
          ['IFSC', values.payout.ifsc || 'Not added yet'],
        ],
      },
    ],
    [values],
  );

  const footerLabel = currentScreen.id === 'review'
    ? hasSegmentNext
      ? 'Review Next Section'
      : applicationStatus === 'needs_resubmission'
      ? 'Resubmit Application'
      : applicationStatus === 'rejected'
        ? 'Application Rejected'
        : currentScreen.buttonLabel
    : hasSegmentNext
      ? 'Continue'
      : currentScreen.buttonLabel;

  async function saveAndLogout() {
    setIsSavingAndLeaving(true);
    setDraftError('');
    try {
      if (applicationId) {
        await saveTrainerDraftToApi({
          values,
          currentScreen: currentScreen.id === 'success' ? 'review' : currentScreen.id,
        });
      }
      await logoutRequest();
      navigate('/login', { replace: true, state: { authNotice: 'Your trainer application has been saved. Sign in to continue.' } });
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Unable to save your trainer application.');
    } finally {
      setIsSavingAndLeaving(false);
    }
  }

  if (!isTrainerApplicant) {
    return <TrainerApplicantAccessPage onCreated={() => window.location.reload()} />;
  }

  if (!isDraftReady) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-sm font-medium text-slate-500">Loading your application...</div>;
  }

  if (currentScreen.id === 'personalInfo') {
    return (
      <TrainerWelcomeScreen
        form={form}
        savedLabel={formatSavedTime(savedAt)}
        draftError={draftError}
        loading={isSubmitting || isSavingAndLeaving}
        onBack={moveBack}
        onClose={() => navigate(editMode ? '/trainer/submitted-profile' : submitted ? '/trainer' : '/')}
        onPrimaryAction={moveNext}
        onSaveAndLogout={() => void saveAndLogout()}
      />
    );
  }

  if (currentScreen.id === 'review') {
    return (
      <TrainerFinalReviewScreen
        values={values}
        applicationId={applicationId}
        submittedAt={submittedAt}
        savedLabel={formatSavedTime(savedAt)}
        applicationStatus={applicationStatus}
        adminRemarks={adminRemarks}
        submissionError={submissionError}
        submissionIssues={submissionIssues}
        footerLabel={footerLabel}
        loading={isSubmitting || isSavingAndLeaving}
        disabled={applicationStatus === 'rejected'}
        activeSegment={activeSegment}
        isSegmented={isSegmented}
        onBack={moveBack}
        onClose={() => navigate(editMode ? '/trainer/submitted-profile' : submitted ? '/trainer' : '/')}
        onPrimaryAction={moveNext}
        onSaveAndLogout={() => void saveAndLogout()}
      />
    );
  }

  return (
    <TrainerApplicationScreenShell
      screen={currentScreen}
      prefersReducedMotion={prefersReducedMotion ?? undefined}
      direction={direction}
      savedLabel={formatSavedTime(savedAt)}
      draftError={draftError}
      footerLabel={footerLabel}
      loading={isSubmitting || isSavingAndLeaving}
      footerDisabled={false}
      viewportMode={viewportMode}
      onBack={moveBack}
      onClose={() => navigate(editMode ? '/trainer/submitted-profile' : submitted ? '/trainer' : '/')}
      onPrimaryAction={moveNext}
      onSaveAndLogout={() => void saveAndLogout()}
    >
      {renderCurrentScreen({
        screen: currentScreen,
        form,
        values,
        reviewSections,
        applicationStatus,
        adminRemarks,
        reviewHistory,
        submitted,
        submittedAt,
        submissionError,
        submissionIssues,
        activeSegment,
        isSegmented,
        onSkipShowcase: () => {
          setDirection(1);
          setSegmentIndex(0);
          setScreenIndex((index) => Math.min(index + 1, successScreenIndex));
        },
        onJumpToScreen: (screenId) => {
          const nextIndex = trainerOnboardingScreens.findIndex((screen) => screen.id === screenId);
          if (nextIndex < 0) return;
          setDirection(-1);
          setSegmentIndex(0);
          setScreenIndex(nextIndex);
        },
      })}
    </TrainerApplicationScreenShell>
  );
}

function TrainerFinalReviewScreen({
  values,
  applicationId,
  submittedAt,
  savedLabel,
  applicationStatus,
  adminRemarks,
  submissionError,
  submissionIssues,
  footerLabel,
  loading,
  disabled,
  activeSegment,
  isSegmented,
  onBack,
  onClose,
  onPrimaryAction,
  onSaveAndLogout,
}: {
  values: TrainerOnboardingFormValues;
  applicationId: string | null;
  submittedAt: string | null;
  savedLabel: string;
  applicationStatus: TrainerApplicationStatus;
  adminRemarks: string;
  submissionError: string;
  submissionIssues: TrainerSubmissionIssue[];
  footerLabel: string;
  loading: boolean;
  disabled?: boolean;
  activeSegment: TrainerResponsiveSegment;
  isSegmented: boolean;
  onBack: () => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  onSaveAndLogout: () => void;
}) {
  const avatarSrc = values.photo.file?.previewUrl;
  const fullName = values.profile.fullName || 'Personal Trainer';
  const hasSubmitted = Boolean(submittedAt);
  const showReviewProfile = !isSegmented || activeSegment === 'reviewProfile';
  const showReviewCredentials = !isSegmented || activeSegment === 'reviewCredentials';
  const showReviewOperations = !isSegmented || activeSegment === 'reviewOperations';
  const showReviewSubmit = !isSegmented || activeSegment === 'reviewSubmit';

  const statusConfig =
    applicationStatus === 'needs_resubmission'
      ? {
          title: 'Needs updates',
          description: 'Address the highlighted details, then resubmit your profile for review.',
          Icon: TriangleAlert,
          tone: 'text-amber-600',
          surface: 'bg-amber-50',
          border: 'border-amber-100',
        }
      : applicationStatus === 'rejected'
        ? {
            title: 'Application closed',
            description: adminRemarks || 'This application is no longer eligible for approval.',
            Icon: TriangleAlert,
            tone: 'text-rose-600',
            surface: 'bg-rose-50',
            border: 'border-rose-100',
          }
        : hasSubmitted
          ? {
              title: 'Under review',
              description: 'Our team is reviewing your profile. You’ll be notified once it’s approved.',
              Icon: Hourglass,
              tone: 'text-[#6d48ff]',
              surface: 'bg-[#f5f1ff]',
              border: 'border-[#e6dcff]',
            }
          : {
              title: 'Ready to submit',
              description: 'Everything looks polished. Submit this profile to send it to our review team.',
              Icon: CheckCircle2,
              tone: 'text-[#6d48ff]',
              surface: 'bg-[#f5f1ff]',
              border: 'border-[#e6dcff]',
            };

  const personalRows = [
    { label: 'Full Name', value: fullName, icon: UserRound },
    { label: 'Gender', value: values.profile.gender || 'Not added yet', icon: CircleUserRound },
    { label: 'Date of Birth', value: formatDate(values.profile.dateOfBirth || ''), icon: CalendarDays },
    { label: 'Email', value: values.profile.email || 'Not added yet', icon: Mail },
    { label: 'Mobile', value: values.profile.mobile || 'Not added yet', icon: Phone },
    {
      label: 'Location',
      value: values.profile.city && values.profile.state ? `${values.profile.city}, ${values.profile.state}` : 'Not added yet',
      icon: MapPin,
    },
  ] as const;

  const qualificationRows: { label: string; value: string; icon: typeof Sparkles; downloadable?: boolean }[] = [
    { label: 'Certification Institute', value: values.certification.institute || 'Not added yet', icon: GraduationCap },
    { label: 'Certification Type', value: values.certification.type || 'Not added yet', icon: ShieldCheck },
    { label: 'Certificate', value: values.certification.certificate?.name || 'Not uploaded yet', icon: FileBadge2, downloadable: Boolean(values.certification.certificate) },
    { label: 'Experience', value: values.experience.yearsExperience ? `${values.experience.yearsExperience} years` : 'Not added yet', icon: Hourglass },
    { label: 'Expertise', value: formatCommaList(values.expertise), icon: Dumbbell },
    { label: 'Clients Trained', value: values.experience.clientsTrained || 'Not added yet', icon: Users },
  ];

  const coachingRows: { label: string; value: string; icon: typeof Sparkles; multiline?: boolean; downloadable?: boolean; quiet?: boolean }[] = [
    { label: 'Training Philosophy', value: values.training.philosophy || 'Not added yet', icon: Sparkles, multiline: true },
    { label: 'Training Modes', value: formatCommaList(values.availability.modes), icon: Dumbbell },
    { label: 'Available Days', value: formatCommaList(values.availability.days), icon: CalendarDays, multiline: true },
    { label: 'Per Session Rate', value: values.availability.perSessionRateInr ? `INR ${values.availability.perSessionRateInr}` : 'Not added yet', icon: CreditCard },
    { label: 'Monthly Rate', value: values.availability.monthlyRateInr ? `INR ${values.availability.monthlyRateInr}` : 'Not added yet', icon: CreditCard },
    {
      label: 'Introduction Video',
      value: values.training.introductionVideo?.name || 'Skipped for now',
      icon: Video,
      downloadable: Boolean(values.training.introductionVideo),
      quiet: !values.training.introductionVideo,
    },
  ];

  const verificationRows: { label: string; value: string; icon: typeof Sparkles; downloadable?: boolean; quiet?: boolean }[] = [
    { label: 'PAN Card', value: values.identity.pan?.name || 'Not uploaded', icon: CreditCard, downloadable: Boolean(values.identity.pan), quiet: !values.identity.pan },
    { label: 'Aadhaar', value: values.identity.aadhaar?.name || 'Not uploaded', icon: ShieldCheck, downloadable: Boolean(values.identity.aadhaar), quiet: !values.identity.aadhaar },
    { label: 'Passport', value: values.identity.passport?.name || 'Not uploaded', icon: FileCheck2, downloadable: Boolean(values.identity.passport), quiet: !values.identity.passport },
    { label: 'Driving Licence', value: values.identity.drivingLicense?.name || 'Not uploaded', icon: CreditCard, downloadable: Boolean(values.identity.drivingLicense), quiet: !values.identity.drivingLicense },
    {
      label: 'Transformation Photos',
      value: values.showcase.transformationPhotos.length ? `${values.showcase.transformationPhotos.length} uploaded` : 'Skipped for now',
      icon: ImagePlus,
      quiet: !values.showcase.transformationPhotos.length,
    },
    {
      label: 'Showcase Videos',
      value: values.showcase.videos.length ? `${values.showcase.videos.length} uploaded` : 'Skipped for now',
      icon: Video,
      quiet: !values.showcase.videos.length,
    },
    { label: 'Bank Name', value: values.payout.bankName || 'Not added yet', icon: FileBadge2 },
    { label: 'Account Number', value: formatAccountEnding(values.payout.accountNumber), icon: CreditCard },
  ];

  return (
    <div className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f8f4ff_42%,_#f1ecff_100%)] text-[#090B3F] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col bg-[#fcfbff] lg:h-screen lg:overflow-hidden">
        <header className="shrink-0 border-b border-[#ece7fb] bg-white/82 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-7 lg:py-3 short:lg:py-2">
          <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3 sm:grid-cols-[46px_1fr_46px]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#5d49de] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <p className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#20277c] sm:text-[1.12rem]">Trainer onboarding</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#7a69cf] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Close onboarding"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 lg:overflow-hidden lg:px-5 lg:py-4 short:lg:py-3">
          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <section className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] short:lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[20px] border border-[#e8e2fb] bg-white px-4 py-4 shadow-[0_18px_46px_rgba(102,75,212,0.08)] short:lg:py-3">
              <div className="flex items-center gap-5">
                <UserAvatar user={{ name: fullName }} src={avatarSrc} size="xl" className="h-24 w-24 shrink-0 border-[3px] border-[#e5dbff] text-[1.7rem] tracking-[0.08em] shadow-[0_12px_30px_rgba(123,92,255,0.16)] sm:h-28 sm:w-28 short:lg:h-20 short:lg:w-20" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#6345ff]">
                    {hasSubmitted ? 'Submitted Profile' : 'Profile Review'}
                  </p>
                  <h1 className="mt-1 text-[1.65rem] font-bold uppercase leading-none tracking-[-0.045em] text-[#182062] sm:text-[1.9rem] short:lg:text-[1.45rem]">
                    {fullName}
                  </h1>
                  <p className="mt-2 text-[0.95rem] font-medium text-[#586695]">
                    {applicationId ? `Application ${applicationId}` : 'Draft application'}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 text-[0.9rem] font-medium text-[#59679a]">
                    <CalendarDays className="h-4 w-4 text-[#7b5cff]" strokeWidth={2.1} />
                    <span>{hasSubmitted && submittedAt ? `submitted on ${formatDate(submittedAt)}` : savedLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn('rounded-[20px] border px-4 py-4 shadow-[0_18px_46px_rgba(102,75,212,0.08)] short:lg:py-3', statusConfig.border, statusConfig.surface)}>
              <div className="flex items-start gap-4">
                <div className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80', statusConfig.tone)}>
                  <statusConfig.Icon size={24} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h2 className={cn('text-[1.35rem] font-semibold leading-tight tracking-[-0.03em]', statusConfig.tone)}>{statusConfig.title}</h2>
                  <p className="mt-2 text-[0.92rem] leading-6 text-[#5b6697] short:lg:line-clamp-2">{statusConfig.description}</p>
                </div>
              </div>
            </div>
            </section>

            {adminRemarks ? (
              <div className={cn(
                'mt-3 rounded-[18px] border px-4 py-3 text-sm font-medium',
                applicationStatus === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700',
              )}>
                {adminRemarks}
              </div>
            ) : null}

            {submissionError || submissionIssues.length ? (
              <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Review these items before submitting</p>
                <p className="mt-1">{submissionError || submissionIssues[0]?.message}</p>
              </div>
            ) : null}

            <section className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_0.95fr_1.65fr]">
              {showReviewProfile ? <ReviewSummaryCard title="Personal Details" icon={UserRound}>
                <div className="space-y-2">
                  {personalRows.map((row) => (
                    <ReviewInfoRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
                  ))}
                </div>
              </ReviewSummaryCard> : null}

              {showReviewCredentials ? <ReviewSummaryCard title="Qualifications & Expertise" icon={GraduationCap}>
                <div className="space-y-2">
                  {qualificationRows.map((row) => (
                    <ReviewInfoRow
                      key={row.label}
                      icon={row.icon}
                      label={row.label}
                      value={row.value}
                      downloadable={row.downloadable}
                    />
                  ))}
                </div>

                <div className="mt-4 border-t border-[#ede9fb] pt-4">
                  <div className="flex items-center gap-2 text-[#6d48ff]">
                    <Sparkles size={18} strokeWidth={2.1} />
                    <p className="text-[1rem] font-semibold text-[#1d256c]">Why clients should choose you</p>
                  </div>
                  <p className="mt-3 text-[0.98rem] leading-7 text-[#5d6898] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                    {values.clientPitch || 'Not added yet'}
                  </p>
                </div>
              </ReviewSummaryCard> : null}

              {showReviewOperations || showReviewSubmit ? <div className="grid content-start gap-3">
                {showReviewOperations ? (
                <ReviewSummaryCard title="Coaching & Rates" icon={Dumbbell}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {coachingRows.map((row) => (
                      <ReviewStatTile
                        key={row.label}
                        icon={row.icon}
                        label={row.label}
                        value={row.value}
                        multiline={row.multiline}
                        downloadable={row.downloadable}
                        quiet={row.quiet}
                      />
                    ))}
                  </div>
                </ReviewSummaryCard>
                ) : null}

                {showReviewSubmit ? (
                <ReviewSummaryCard title="Portfolio & Verification" icon={ShieldCheck}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {verificationRows.map((row) => (
                      <ReviewFileTile
                        key={row.label}
                        icon={row.icon}
                        label={row.label}
                        value={row.value}
                        downloadable={row.downloadable}
                        quiet={row.quiet}
                      />
                    ))}
                  </div>
                </ReviewSummaryCard>
                ) : null}
              </div> : null}
            </section>
          </div>

          <footer className="mt-3 shrink-0 border-t border-[#ece7fb] pt-3 short:lg:pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.96rem] font-medium text-[#6975a6]">Review the details once more, then submit your trainer profile.</p>
                <button
                  type="button"
                  onClick={onSaveAndLogout}
                  disabled={loading}
                  className="mt-2 text-[1rem] font-semibold text-[#5a32ff] transition hover:text-[#4018e0] disabled:opacity-50"
                >
                  Save application &amp; Log out
                </button>
              </div>

              <Button
                type="button"
                onClick={onPrimaryAction}
                disabled={loading || disabled}
                className="h-14 w-full rounded-[18px] bg-[linear-gradient(90deg,#5b2dff_0%,#7a43ff_100%)] px-8 text-[1.02rem] font-semibold text-white shadow-[0_20px_40px_rgba(91,45,255,0.28)] transition hover:brightness-[1.03] sm:w-auto sm:min-w-[240px] short:lg:h-12"
              >
                {loading ? (
                  'Please wait...'
                ) : (
                  <span className="inline-flex items-center gap-3">
                    {footerLabel}
                    <ArrowRight size={19} />
                  </span>
                )}
              </Button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ReviewSummaryCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-0 rounded-[20px] border border-[#e8e2fb] bg-white px-4 py-3 shadow-[0_18px_46px_rgba(102,75,212,0.08)]">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f5f1ff] text-[#6d48ff]">
          <Icon size={18} strokeWidth={2} />
        </div>
        <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-[#1d256c]">{title}</h3>
      </div>
      <div className="mt-3 min-h-0">{children}</div>
    </section>
  );
}

function ReviewInfoRow({
  icon: Icon,
  label,
  value,
  downloadable,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  downloadable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0ecfb] py-1.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f3ff] text-[#7654ff]">
          <Icon size={15} strokeWidth={2} />
        </div>
        <p className="text-[0.86rem] font-medium text-[#6a749f]">{label}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-right text-[0.88rem] font-semibold text-[#182062]">{value}</p>
        {downloadable ? <Download className="h-4 w-4 shrink-0 text-[#7352ff]" strokeWidth={2} /> : null}
      </div>
    </div>
  );
}

function ReviewStatTile({
  icon: Icon,
  label,
  value,
  multiline,
  downloadable,
  quiet,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  multiline?: boolean;
  downloadable?: boolean;
  quiet?: boolean;
}) {
  return (
    <div className="flex min-h-[68px] gap-2 rounded-[16px] border border-[#f0ecfb] bg-[#fcfbff] px-3 py-2.5">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f3ff] text-[#7654ff]">
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.82rem] font-medium text-[#7480ad]">{label}</p>
        <div className="mt-1 flex min-w-0 items-start gap-2">
          <p className={cn(
            'min-w-0 text-[0.88rem] font-semibold leading-5 text-[#1b246b]',
            multiline && '[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden',
            quiet && 'text-[#7f86aa]',
          )}>
            {value}
          </p>
          {downloadable ? <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#7352ff]" strokeWidth={2} /> : null}
        </div>
      </div>
    </div>
  );
}

function ReviewFileTile({
  icon: Icon,
  label,
  value,
  downloadable,
  quiet,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  downloadable?: boolean;
  quiet?: boolean;
}) {
  return (
    <div className="flex min-h-[62px] items-start gap-2 rounded-[16px] border border-[#f0ecfb] bg-[#fcfbff] px-3 py-2.5">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f3ff] text-[#7654ff]">
        <Icon size={15} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.82rem] font-medium text-[#7480ad]">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={cn(
            'inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[0.82rem] font-semibold',
            quiet ? 'bg-[#efedf8] text-[#7f86aa]' : 'bg-[#f1ebff] text-[#5f3dff]',
          )}>
            <span className="truncate">{value}</span>
          </span>
          {downloadable ? <Download className="h-4 w-4 shrink-0 text-[#7352ff]" strokeWidth={2} /> : null}
        </div>
      </div>
    </div>
  );
}

function renderCurrentScreen({
  screen,
  form,
  values,
  reviewSections,
  applicationStatus,
  adminRemarks,
  reviewHistory,
  submitted,
  submittedAt,
  submissionError,
  submissionIssues,
  activeSegment,
  isSegmented,
  onSkipShowcase,
  onJumpToScreen,
}: {
  screen: TrainerOnboardingScreen;
  form: ReturnType<typeof useForm<TrainerOnboardingFormValues>>;
  values: TrainerOnboardingFormValues;
  reviewSections: Array<{ title: string; screenId: TrainerOnboardingScreenId; rows: [string, string][] }>;
  applicationStatus: TrainerApplicationStatus;
  adminRemarks: string;
  reviewHistory: TrainerApplicationHistoryItem[];
  submitted: boolean;
  submittedAt: string | null;
  submissionError: string;
  submissionIssues: TrainerSubmissionIssue[];
  activeSegment: TrainerResponsiveSegment;
  isSegmented: boolean;
  onSkipShowcase: () => void;
  onJumpToScreen: (screenId: TrainerOnboardingScreenId) => void;
}) {
  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = form;

  switch (screen.id) {
    case 'personalInfo':
      return (
        <div className="space-y-4 short:lg:space-y-3">
          <FormInput
            label="Full name"
            placeholder="Enter your full name"
            inputProps={register('profile.fullName')}
            error={findErrorMessage(errors, 'profile.fullName')}
          />

          <Controller
            control={control}
            name="profile.gender"
            render={({ field }) => (
              <ChoiceCardGroup
                label="Gender"
                value={field.value}
                options={trainerGenderOptions.map((option) => ({ label: option, value: option }))}
                onChange={field.onChange}
                error={findErrorMessage(errors, 'profile.gender')}
              />
            )}
          />
        </div>
      );

    case 'dateOfBirth':
      return (
        <FormInput
          label="Date of birth"
          type="date"
          inputProps={register('profile.dateOfBirth')}
          error={findErrorMessage(errors, 'profile.dateOfBirth')}
        />
      );

    case 'location':
      return <LocationAutoDetectFields register={register} control={control} setValue={setValue} errors={errors} />;

    case 'photo':
      return (
        <PhotoCropEditor
          file={values.photo.file}
          error={findErrorMessage(errors, 'photo.file')}
          onApply={(upload) => {
            setValue('photo.file', upload, { shouldDirty: true, shouldValidate: true });
            clearErrors('photo.file');
          }}
          onClear={() => setValue('photo.file', null, { shouldDirty: true, shouldValidate: true })}
        />
      );

    case 'certification':
      return (
        <div className="space-y-4 short:lg:space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Certification institute"
              placeholder="K11 Academy of Fitness Sciences"
              inputProps={register('certification.institute')}
              error={findErrorMessage(errors, 'certification.institute')}
            />

            <FormInput
              label="Certification type"
              placeholder="Personal Trainer Certification"
              inputProps={register('certification.type')}
              error={findErrorMessage(errors, 'certification.type')}
            />
          </div>

          <SingleUploadField
            label="Certificate file"
            hint="PDF, JPG, or PNG"
            icon={GraduationCap}
            file={values.certification.certificate}
            accept=".pdf,image/*"
            error={findErrorMessage(errors, 'certification.certificate')}
            onSelect={async (file) => {
              const upload = await toUploadValue(file, 'document');
              setValue('certification.certificate', upload, { shouldDirty: true, shouldValidate: true });
              clearErrors('certification.certificate');
            }}
            onClear={() => setValue('certification.certificate', null, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
      );

    case 'expertise':
      return (
        <Controller
          control={control}
          name="expertise"
          render={({ field }) => (
            <ChipSelector
              label="Select expertise"
              options={trainerExpertiseOptions}
              value={field.value}
              onChange={field.onChange}
              error={findErrorMessage(errors, 'expertise')}
            />
          )}
        />
      );

    case 'experience':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Years experience"
            type="number"
            placeholder="4"
            inputProps={register('experience.yearsExperience')}
            error={findErrorMessage(errors, 'experience.yearsExperience')}
          />

          <FormInput
            label="Clients trained"
            type="number"
            placeholder="120"
            inputProps={register('experience.clientsTrained')}
            error={findErrorMessage(errors, 'experience.clientsTrained')}
          />
        </div>
      );

    case 'clientPitch':
      return (
        <FormTextArea
          label="Why should clients choose you?"
          placeholder="Share your coaching approach, the outcomes you help clients reach, and what working with you feels like."
          textAreaProps={register('clientPitch')}
          error={findErrorMessage(errors, 'clientPitch')}
        />
      );

    case 'showcase':
      return (
        <div className="space-y-4">
          {(!isSegmented || activeSegment === 'showcasePhotos') ? (
            <MultiUploadField
              label="Transformation photos"
              hint="Upload before and after images or progress snapshots"
              icon={ImagePlus}
              files={values.showcase.transformationPhotos}
              previewKind="image"
              accept="image/*"
              error={findErrorMessage(errors, 'showcase.transformationPhotos')}
              onSelect={async (files) => {
                const nextItems = await Promise.all(files.map((file) => toUploadValue(file, 'image', true)));
                setValue('showcase.transformationPhotos', [...values.showcase.transformationPhotos, ...nextItems], {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors('showcase.transformationPhotos');
              }}
              onRemove={(id) =>
                setValue(
                  'showcase.transformationPhotos',
                  values.showcase.transformationPhotos.filter((item) => item.id !== id),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            />
          ) : null}

          {(!isSegmented || activeSegment === 'showcaseVideos') ? (
            <MultiUploadField
              label="Videos"
              hint="Upload a coaching reel, demo set, or client story"
              icon={Video}
              files={values.showcase.videos}
              previewKind="video"
              accept="video/*"
              error={findErrorMessage(errors, 'showcase.videos')}
              onSelect={async (files) => {
                const nextItems = await Promise.all(files.map((file) => toUploadValue(file, 'video', true)));
                setValue('showcase.videos', [...values.showcase.videos, ...nextItems], {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors('showcase.videos');
              }}
              onRemove={(id) => {
                const item = values.showcase.videos.find((entry) => entry.id === id);
                revokeUploadPreview(item);
                setValue(
                  'showcase.videos',
                  values.showcase.videos.filter((entry) => entry.id !== id),
                  { shouldDirty: true, shouldValidate: true },
                );
              }}
            />
          ) : null}

          <Button type="button" variant="outline" onClick={onSkipShowcase} className="h-12 w-full rounded-xl border-slate-300">
            Skip for now
          </Button>
        </div>
      );

    case 'training':
      return (
        <div className="space-y-4">
          {(!isSegmented || activeSegment === 'trainingPhilosophy') ? (
            <FormTextArea
              label="Training philosophy"
              placeholder="Example: I focus on sustainable progress, strong movement fundamentals, and coaching clients in a way that fits their real life."
              textAreaProps={register('training.philosophy')}
              error={findErrorMessage(errors, 'training.philosophy')}
            />
          ) : null}

          {(!isSegmented || activeSegment === 'trainingVideo') ? (
            <SingleUploadField
              label="Introduction video (optional)"
              hint="A short self-introduction helps the review team understand your energy and clarity"
              icon={Video}
              file={values.training.introductionVideo}
              previewKind="video"
              accept="video/*"
              error={findErrorMessage(errors, 'training.introductionVideo')}
              onSelect={async (file) => {
                revokeUploadPreview(values.training.introductionVideo);
                const upload = await toUploadValue(file, 'video', true);
                setValue('training.introductionVideo', upload, { shouldDirty: true, shouldValidate: true });
                clearErrors('training.introductionVideo');
              }}
              onClear={() => {
                revokeUploadPreview(values.training.introductionVideo);
                setValue('training.introductionVideo', null, { shouldDirty: true, shouldValidate: true });
              }}
            />
          ) : null}
        </div>
      );

    case 'availability':
      return (
        <div className="space-y-5">
          <Controller
            control={control}
            name="availability.modes"
            render={({ field }) => (
              <ChipSelector
                label="Training modes"
                options={trainerModeOptions}
                value={field.value}
                onChange={field.onChange}
                error={findErrorMessage(errors, 'availability.modes')}
              />
            )}
          />

          <Controller
            control={control}
            name="availability.days"
            render={({ field }) => (
              <ChipSelector
                label="Available days"
                options={trainerDayOptions}
                value={field.value}
                onChange={field.onChange}
                error={findErrorMessage(errors, 'availability.days')}
              />
            )}
          />
        </div>
      );

    case 'pricing':
      return (
        <div className="space-y-4">
          <FormTextArea
            label="Pricing notes (optional)"
            placeholder="Add package details, online coaching options, or other pricing notes."
            textAreaProps={register('availability.pricingPlans')}
            error={findErrorMessage(errors, 'availability.pricingPlans')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Per session rate (INR)"
              type="number"
              inputMode="numeric"
              placeholder="1500"
              inputProps={register('availability.perSessionRateInr')}
              error={findErrorMessage(errors, 'availability.perSessionRateInr')}
            />
            <FormInput
              label="Per month rate (INR)"
              type="number"
              inputMode="numeric"
              placeholder="8000"
              inputProps={register('availability.monthlyRateInr')}
              error={findErrorMessage(errors, 'availability.monthlyRateInr')}
            />
          </div>
        </div>
      );

    case 'identity':
      return (
        <div className="space-y-4">
          <p className="border-l-2 border-slate-300 pl-4 text-sm text-slate-600">
            PAN plus one primary ID is required. You can add the others now if you have them handy.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {(!isSegmented || activeSegment === 'identityRequired') ? <>
              <SingleUploadField
              label="Aadhaar"
              hint="Front image or PDF"
              icon={ShieldCheck}
              file={values.identity.aadhaar}
              accept=".pdf,image/*"
              error={findErrorMessage(errors, 'identity.aadhaar')}
              onSelect={async (file) => {
                const upload = await toUploadValue(file, 'document');
                setValue('identity.aadhaar', upload, { shouldDirty: true, shouldValidate: true });
                clearErrors('identity.aadhaar');
              }}
              onClear={() => setValue('identity.aadhaar', null, { shouldDirty: true, shouldValidate: true })}
            />

            <SingleUploadField
              label="PAN"
              hint="Required for payout activation"
              icon={FileBadge2}
              file={values.identity.pan}
              accept=".pdf,image/*"
              error={findErrorMessage(errors, 'identity.pan')}
              onSelect={async (file) => {
                const upload = await toUploadValue(file, 'document');
                setValue('identity.pan', upload, { shouldDirty: true, shouldValidate: true });
                clearErrors('identity.pan');
              }}
              onClear={() => setValue('identity.pan', null, { shouldDirty: true, shouldValidate: true })}
            />
            </> : null}

            {(!isSegmented || activeSegment === 'identityOptional') ? <>
              <SingleUploadField
              label="Passport"
              hint="Optional alternate primary ID"
              icon={MapPin}
              file={values.identity.passport}
              accept=".pdf,image/*"
              error={undefined}
              onSelect={async (file) => {
                const upload = await toUploadValue(file, 'document');
                setValue('identity.passport', upload, { shouldDirty: true, shouldValidate: true });
              }}
              onClear={() => setValue('identity.passport', null, { shouldDirty: true, shouldValidate: true })}
            />

            <SingleUploadField
              label="Driving License"
              hint="Optional alternate primary ID"
              icon={CreditCard}
              file={values.identity.drivingLicense}
              accept=".pdf,image/*"
              error={undefined}
              onSelect={async (file) => {
                const upload = await toUploadValue(file, 'document');
                setValue('identity.drivingLicense', upload, { shouldDirty: true, shouldValidate: true });
              }}
              onClear={() => setValue('identity.drivingLicense', null, { shouldDirty: true, shouldValidate: true })}
            />
            </> : null}
          </div>
        </div>
      );

    case 'payout':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Bank name"
            placeholder="HDFC Bank"
            inputProps={register('payout.bankName')}
            error={findErrorMessage(errors, 'payout.bankName')}
          />

          <FormInput
            label="Account number"
            inputMode="numeric"
            placeholder="012345678901"
            inputProps={register('payout.accountNumber')}
            error={findErrorMessage(errors, 'payout.accountNumber')}
          />

          <FormInput
            label="IFSC"
            placeholder="HDFC0001234"
            value={values.payout.ifsc}
            onChange={(event) => setValue('payout.ifsc', event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
            error={findErrorMessage(errors, 'payout.ifsc')}
          />
        </div>
      );

    case 'review':
      const issueGroups = submissionIssues.reduce<Array<{ screen: TrainerOnboardingScreen; issues: TrainerSubmissionIssue[] }>>((groups, issue) => {
        const screenForIssue = trainerOnboardingScreens.find((item) => item.id === issue.screenId) ?? trainerOnboardingScreens[reviewScreenIndex];
        const existingGroup = groups.find((group) => group.screen.id === screenForIssue.id);
        if (existingGroup) {
          existingGroup.issues.push(issue);
        } else {
          groups.push({ screen: screenForIssue, issues: [issue] });
        }
        return groups;
      }, []);

      return (
        <div className="space-y-4">
          {submissionIssues.length ? (
            <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <h3 className="font-semibold">Complete these items before submitting</h3>
              <p className="mt-1 text-amber-800">Your application is saved as a draft. Update the highlighted information, then submit again.</p>
              <div className="mt-4 space-y-3">
                {issueGroups.map((group) => (
                  <div key={group.screen.id} className="rounded-lg border border-amber-100 bg-white/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{group.screen.title}</p>
                      {group.screen.id !== 'review' ? (
                        <button type="button" onClick={() => onJumpToScreen(group.screen.id)} className="font-semibold text-[var(--ds-brand)] hover:underline">
                          Edit
                        </button>
                      ) : null}
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                      {group.issues.map((issue) => <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {submissionError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{submissionError}</p>
          ) : null}

          {adminRemarks ? (
            <div className={cn(
              'border-l-2 pl-4 text-sm',
              applicationStatus === 'rejected' ? 'border-rose-500 text-rose-700' : 'border-amber-500 text-amber-700',
            )}>
              <p className="font-semibold">{applicationStatus === 'rejected' ? 'Admin rejection note' : 'Admin remarks for resubmission'}</p>
              <p className="mt-1">{adminRemarks}</p>
            </div>
          ) : null}

          {submitted && submittedAt ? (
            <div className="border-l-2 border-emerald-500 pl-4 text-sm text-emerald-800">
              {statusLabel(applicationStatus)} on {formatDate(submittedAt)}. {nextActionLabel(applicationStatus)}.
            </div>
          ) : null}

          {reviewSections.map((section) => (
            <ReviewSectionCard
              key={section.title}
              title={section.title}
              rows={section.rows}
              onEdit={() => onJumpToScreen(section.screenId)}
            />
          ))}

          {reviewHistory.length ? (
            <section className="border-t border-slate-200 pt-4">
              <h3 className="text-base font-semibold text-slate-950">Review history</h3>
              <div className="mt-3 space-y-3">
                {[...reviewHistory].slice().reverse().map((item) => (
                  <div key={item.id} className="border-l-2 border-slate-200 pl-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{statusLabel(item.action)}</p>
                    <p className="mt-1">{item.note}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.actor} • {formatDate(item.at)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      );

    case 'success':
      return (
        <div className="space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={28} />
          </div>

          <div className="space-y-3">
            <p className={cn(
              'text-sm font-semibold uppercase tracking-[0.24em]',
              applicationStatus === 'approved' ? 'text-emerald-600' : applicationStatus === 'rejected' ? 'text-rose-600' : applicationStatus === 'needs_resubmission' ? 'text-amber-600' : 'text-emerald-600',
            )}>
              {statusLabel(applicationStatus)}
            </p>
            <h2 className="text-[2rem] font-semibold leading-tight text-slate-950">
              {applicationStatus === 'approved'
                ? 'Your trainer profile has been approved.'
                : applicationStatus === 'needs_resubmission'
                  ? 'Changes are needed before approval.'
                  : applicationStatus === 'rejected'
                    ? 'This application has been rejected.'
                    : 'Your trainer profile is in review.'}
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              {applicationStatus === 'approved'
                ? 'The admin team has approved your submission. You can continue to your trainer dashboard.'
                : applicationStatus === 'needs_resubmission'
                  ? adminRemarks || 'Please review the remarks from admin, update your submission, and send it back for review.'
                  : applicationStatus === 'rejected'
                    ? adminRemarks || 'The admin team closed this application and it is no longer eligible for approval.'
                    : 'Our team will review your profile, documents, and coaching proof, then reach out with the next step shortly.'}
            </p>
          </div>

          <div className="grid gap-3">
            <Button
              className="h-14 rounded-full bg-[var(--ds-brand)] text-base font-semibold hover:bg-[var(--ds-brand-strong)]"
              onClick={() => {
                if (applicationStatus === 'needs_resubmission') {
                  onJumpToScreen('review');
                  return;
                }
                window.location.assign('/trainer');
              }}
            >
              {applicationStatus === 'approved' ? 'Go to Dashboard' : applicationStatus === 'needs_resubmission' ? 'Open Review' : 'Go to Dashboard'}
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-full border-slate-300 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => onJumpToScreen('review')}
            >
              {applicationStatus === 'needs_resubmission' ? 'Fix and Resubmit' : 'View Profile'}
            </Button>
          </div>
        </div>
      );
  }
}

type TrainerRegistrationScreen = 'mobile' | 'mobileOtp' | 'profile' | 'emailOtp';

const trainerRegistrationHeroCopy: Record<TrainerRegistrationScreen, { title: string; body: string }> = {
  mobile: {
    title: 'Start your trainer journey',
    body: 'Empower lives, build lasting habits, and grow your impact with tools designed for your success.',
  },
  mobileOtp: {
    title: 'Secure your trainer journey',
    body: 'Confirm your mobile number to unlock the full trainer application and continue building your profile.',
  },
  profile: {
    title: 'Create your trainer account',
    body: 'Add your name and email, or continue with Google, to set up your secure account.',
  },
  emailOtp: {
    title: 'Verify your email',
    body: 'Confirm your email address to finish creating your trainer account.',
  },
};

function TrainerApplicantAccessPage({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const viewportMode = useTrainerViewportMode();
  const [screen, setScreen] = useState<TrainerRegistrationScreen>('mobile');
  const [profileStep, setProfileStep] = useState<TrainerProfileStep>('name');

  const [mobile, setMobile] = useState('');
  const [consent, setConsent] = useState(true);
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileChallenge, setMobileChallenge] = useState<TrainerMobileOtpChallenge | null>(null);
  const [verifiedChallengeToken, setVerifiedChallengeToken] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailOtp, setEmailOtp] = useState('');
  const [emailChallenge, setEmailChallenge] = useState<TrainerEmailOtpChallenge | null>(null);

  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (screen !== 'mobileOtp' && screen !== 'emailOtp') return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [screen]);

  async function handleGoogleCredential(idToken: string) {
    if (!verifiedChallengeToken) return;
    setLoading(true);
    try {
      await registerTrainerWithGoogle({ challengeToken: verifiedChallengeToken, idToken });
      onCreated();
    } catch (error) {
      notifyError(error, 'Unable to continue with Google.');
    } finally {
      setLoading(false);
    }
  }

  const google = useGoogleIdentity(handleGoogleCredential);

  const activeChallenge = screen === 'emailOtp' ? emailChallenge : mobileChallenge;
  const canResend = activeChallenge ? new Date(activeChallenge.resendAvailableAt).getTime() <= clock : false;
  const resendSeconds = activeChallenge ? Math.max(0, Math.ceil((new Date(activeChallenge.resendAvailableAt).getTime() - clock) / 1000)) : 0;
  const expired = activeChallenge ? new Date(activeChallenge.expiresAt).getTime() <= clock : false;

  const isMobileStepDisabled = !consent || !mobile.trim();
  const isProfileDisabled = !name.trim() || !email.trim() || password.length < 8;
  const profileStepIndex = Math.max(0, trainerProfileSteps.indexOf(profileStep));
  const hasProfileStepBack = viewportMode.isCompactAccount && screen === 'profile' && profileStepIndex > 0;
  const hasProfileStepNext = viewportMode.isCompactAccount && screen === 'profile' && profileStepIndex < trainerProfileSteps.length - 1;
  // Desktop validates the whole profile form; compact screens validate the currently visible field.
  const isCurrentProfileStepDisabled =
    profileStep === 'name'
      ? !name.trim()
      : profileStep === 'email'
        ? !email.trim()
        : password.length < 8;

  const primaryLabel =
    screen === 'mobile'
      ? 'Send verification code'
      : screen === 'mobileOtp'
        ? 'Verify mobile number'
        : screen === 'profile'
          ? hasProfileStepNext ? 'Continue' : 'Send verification code'
          : 'Verify & start application';

  const isPrimaryDisabled =
    screen === 'mobile'
      ? isMobileStepDisabled
      : screen === 'mobileOtp'
        ? mobileOtp.length !== 6 || expired
        : screen === 'profile'
          ? (viewportMode.isCompactAccount ? isCurrentProfileStepDisabled : isProfileDisabled)
          : emailOtp.length !== 6 || expired;

  function goBack() {
    if (screen === 'emailOtp') {
      setScreen('profile');
      return;
    }
    if (screen === 'profile') {
      if (hasProfileStepBack) {
        setProfileStep(trainerProfileSteps[profileStepIndex - 1]);
        return;
      }
      setScreen('mobile');
      return;
    }
    if (screen === 'mobileOtp') {
      setScreen('mobile');
      return;
    }
    navigate('/');
  }

  function handlePrimaryAction() {
    if (screen === 'mobile') {
      void sendMobileOtp();
      return;
    }
    if (screen === 'mobileOtp') {
      void verifyMobileOtpAndContinue();
      return;
    }
    if (screen === 'profile') {
      if (hasProfileStepNext) {
        setProfileStep(trainerProfileSteps[profileStepIndex + 1]);
        return;
      }
      void submitProfile();
      return;
    }
    void verifyEmailOtpAndFinish();
  }

  async function sendMobileOtp() {
    setLoading(true);
    try {
      const nextChallenge = await requestTrainerMobileOtp({ mobile, consent_to_terms: consent });
      setMobileChallenge(nextChallenge);
      setMobileOtp('');
      setScreen('mobileOtp');
    } catch (error) {
      notifyError(error, 'Unable to send a verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyMobileOtpAndContinue() {
    if (!mobileChallenge) return;
    setLoading(true);
    try {
      const result = await verifyTrainerMobileOtp({ challengeToken: mobileChallenge.challengeToken, otp: mobileOtp });
      setVerifiedChallengeToken(result.challengeToken);
      setProfileStep('name');
      setScreen('profile');
    } catch (error) {
      notifyError(error, 'Unable to verify your mobile number.');
    } finally {
      setLoading(false);
    }
  }

  async function resendMobileOtp() {
    if (!mobileChallenge) return;
    setLoading(true);
    try {
      const nextChallenge = await resendTrainerMobileOtp(mobileChallenge.challengeToken);
      setMobileChallenge(nextChallenge);
      setMobileOtp('');
      setClock(Date.now());
    } catch (error) {
      notifyError(error, 'Unable to resend a verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function submitProfile() {
    if (!verifiedChallengeToken) return;
    setLoading(true);
    try {
      const nextChallenge = await requestTrainerEmailOtp({ challengeToken: verifiedChallengeToken, name, email, password });
      setEmailChallenge(nextChallenge);
      setEmailOtp('');
      setScreen('emailOtp');
    } catch (error) {
      notifyError(error, 'Unable to send a verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailOtpAndFinish() {
    if (!verifiedChallengeToken) return;
    setLoading(true);
    try {
      await verifyTrainerEmailOtp({ challengeToken: verifiedChallengeToken, otp: emailOtp });
      onCreated();
    } catch (error) {
      notifyError(error, 'Unable to verify your email address.');
    } finally {
      setLoading(false);
    }
  }

  async function resendEmailOtp() {
    if (!verifiedChallengeToken) return;
    setLoading(true);
    try {
      const nextChallenge = await resendTrainerEmailOtp(verifiedChallengeToken);
      setEmailChallenge(nextChallenge);
      setEmailOtp('');
      setClock(Date.now());
    } catch (error) {
      notifyError(error, 'Unable to resend a verification code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f8f4ff_42%,_#f1ecff_100%)] px-0 py-0 text-[#090B3F] lg:h-screen lg:overflow-hidden">
      <div
        className="flex min-h-dvh flex-col bg-white lg:h-screen lg:overflow-hidden"
        style={{ background: trainerEntryShellBackground }}
      >
        <header className="shrink-0 border-b border-[#ece7fb] bg-white/72 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-7 lg:py-3 short:lg:py-2 z-10">
          <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3 sm:grid-cols-[46px_1fr_46px]">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#5d49de] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <p className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#20277c] sm:text-[1.12rem]">Trainer onboarding</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#7a69cf] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Close onboarding"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:auto-rows-fr lg:grid-cols-2">
          {/* Keep the desktop illustration in a fixed-height band so it cannot clip under the header. */}
          <section
            className='mt-1 lg:mt-20'
            style={{ background: trainerEntryHeroBackground }}
          >
            <div className="relative mx-auto flex h-full w-full max-w-[720px] flex-col justify-center" style={{ zIndex: 0 }}>
              <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center lg:h-[300px] xl:h-[360px] short:lg:h-[250px]">
                <div className="pointer-events-none absolute left-[10%] top-[20%] hidden h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(182,161,255,0.25)_0%,_rgba(182,161,255,0)_72%)] blur-xl lg:block" />
                <div className="pointer-events-none absolute right-[8%] top-[10%] hidden h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.95)_0%,_rgba(255,255,255,0)_72%)] blur-xl lg:block" />

                <div className="relative flex h-full w-full items-center justify-center overflow-visible">
                  <img
                    src={trainerOnboardingIllustration}
                    alt="Personal trainer onboarding illustration"
                  />

                 
                </div>
              </div>

              <div className="mx-auto mt-0.5 max-w-[580px] text-center sm:mt-1 lg:mt-2 short:lg:mt-1">
                <h2 className="text-[1.12rem] font-bold leading-[1.04] tracking-[-0.02em] text-[#12186d] sm:text-[1.55rem] sm:tracking-[-0.035em] lg:text-[1.65rem] xl:text-[2.2rem] short:lg:text-[1.55rem]">
                  {trainerRegistrationHeroCopy[screen].title}
                </h2>
                <p className="mx-auto mt-1 max-w-[520px] text-[0.74rem] font-medium leading-4 text-[#5b6697] sm:mt-1.5 sm:text-[0.9rem] sm:leading-5 lg:text-[0.9rem] xl:text-[0.98rem] short:lg:line-clamp-2">
                  {trainerRegistrationHeroCopy[screen].body}
                </p>
              </div>

              <div className="mx-auto mt-3 hidden w-full max-w-[720px] gap-2 lg:grid lg:grid-cols-3 xl:mt-4 short:lg:mt-5">
                {trainerEntryHighlights.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-[18px] border border-white/70 bg-white/55 px-3 py-2 shadow-[0_14px_28px_rgba(114,90,220,0.08)] backdrop-blur-[10px] xl:block xl:py-3"
                  >
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f4eeff_100%)] text-[#7b5cff] shadow-[0_10px_22px_rgba(123,92,255,0.14)] xl:h-10 xl:w-10">
                      <Icon size={18} strokeWidth={2.1} />
                    </div>
                    <div>
                      <p className="text-[0.86rem] font-semibold leading-tight text-[#182062] xl:mt-3 xl:text-[0.94rem]">{title}</p>
                      <p className="mt-1 hidden text-xs leading-5 text-[#6674a7] xl:block">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 items-start px-4 py-4 sm:px-6 lg:items-center lg:overflow-hidden lg:px-8 lg:py-4 xl:px-12 short:lg:py-3">
            <div
              className="mx-auto flex w-full max-w-[680px] flex-col justify-center lg:h-full"
              
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.section
                  key={screen}
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.25 }}
                >
                  {screen === 'mobile' ? (
                    <>
                      <div className="space-y-2 sm:space-y-3 hidden lg:block">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6345ff] sm:text-xs sm:tracking-[0.22em]">Personal trainer application</p>
                        <h1 className="text-[1.45rem] font-bold leading-[1.03] tracking-[-0.03em] text-[#12186d] sm:text-[2.25rem] sm:tracking-[-0.045em] xl:text-[2.55rem] short:lg:text-[2.15rem]">
                          What&apos;s your mobile number?
                        </h1>
                        <p className="max-w-[540px] text-[0.82rem] font-medium leading-5 text-[#5b6697] sm:text-[1rem] sm:leading-6 short:lg:line-clamp-2">
                          We&apos;ll text you a verification code to confirm it&apos;s really you.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5 short:lg:mt-4 short:lg:space-y-3">
                        <FormInput
                          label="Mobile number"
                          type="tel"
                          inputMode="tel"
                          placeholder="+91 98765 43210"
                          value={mobile}
                          onChange={(event) => setMobile(event.target.value)}
                          icon={<Phone className="h-5 w-5" strokeWidth={2.05} />}
                          inputProps={{ autoComplete: 'tel' }}
                        />

                        <button
                          type="button"
                          onClick={() => setConsent((value) => !value)}
                          className="inline-flex items-start gap-3 text-left text-[0.95rem] text-[#566497]"
                        >
                          <span className="pt-0.5 text-[#7b5cff]">
                            {consent ? <SquareCheck className="h-5 w-5" strokeWidth={2} /> : <Square className="h-5 w-5" strokeWidth={2} />}
                          </span>
                          <span>
                            I agree to the{' '}
                            <Link to="/terms-of-service" className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0]">
                              terms
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy-policy" className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0]">
                              privacy policy
                            </Link>
                            .
                          </span>
                        </button>

                        <p className="text-[0.88rem] text-[#566497] sm:text-[0.98rem]">
                          Already started?{' '}
                          <Link to="/login" className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0]">
                            Sign in to continue
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : screen === 'mobileOtp' ? (
                    <>
                      <div className="space-y-3 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6345ff]">Mobile verification</p>
                        <h1 className="text-[1.9rem] font-bold leading-[1.03] tracking-[-0.04em] text-[#12186d] sm:text-[2.35rem] xl:text-[2.55rem]">
                          Enter verification code
                        </h1>
                        <p className="mx-auto max-w-[460px] text-[1rem] font-medium leading-7 text-[#5b6697] sm:text-[1.06rem]">
                          We sent a 6-digit code to <span className="font-semibold text-[#182062]">{mobileChallenge?.maskedMobile}</span>.
                        </p>
                      </div>

                      <div className="mt-8 space-y-6">
                        <InputOTP
                          maxLength={6}
                          value={mobileOtp}
                          onChange={(value) => setMobileOtp(value.replace(/\D/g, ''))}
                          inputMode="numeric"
                          containerClassName="justify-center"
                        >
                          <InputOTPGroup className="gap-2 sm:gap-3">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-14 w-11 rounded-2xl border border-[#d8d9ee] bg-white text-xl text-[#151a5f] shadow-[0_10px_22px_rgba(123,92,255,0.08)] sm:h-16 sm:w-12"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>

                        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setScreen('mobile');
                            }}
                            className="font-semibold text-[#6b7298] transition hover:text-[#182062]"
                          >
                            Change mobile number
                          </button>
                          <button
                            type="button"
                            onClick={() => void resendMobileOtp()}
                            disabled={!canResend || loading || expired}
                            className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0] disabled:text-slate-400"
                          >
                            {canResend ? 'Resend code' : `Resend in ${resendSeconds}s`}
                          </button>
                        </div>

                        {expired ? <p className="text-center text-sm text-rose-600">This code has expired. Return and request a new code.</p> : null}
                      </div>
                    </>
                  ) : screen === 'profile' ? (
                    <>
                      <div className="space-y-2 sm:space-y-3 hidden lg:block">
                        <p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6345ff] sm:text-xs sm:tracking-[0.22em]">Personal trainer application</p>
                        <h1 className="text-[1.45rem] font-bold leading-[1.03] tracking-[-0.03em] text-[#12186d] sm:text-[2.25rem] sm:tracking-[-0.045em] xl:text-[2.55rem] short:lg:text-[2.15rem]">
                          Create your trainer account
                        </h1>
                        <p className="max-w-[540px] text-[0.82rem] font-medium leading-5 text-[#5b6697] sm:text-[1rem] sm:leading-6 short:lg:line-clamp-2">
                          Set up your secure account before building your professional profile.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-3.5 short:lg:mt-4 short:lg:space-y-3">
                        {viewportMode.isCompactAccount ? (
                          // Progress bars map to name, email, and password micro-steps.
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7d6bd4]">
                            {trainerProfileSteps.map((step) => (
                              <span
                                key={step}
                                className={cn(
                                  'h-1.5 flex-1 rounded-full bg-[#e5ddff]',
                                  step === profileStep && 'bg-[#7654ff]',
                                  trainerProfileSteps.indexOf(step) < profileStepIndex && 'bg-[#a58cff]',
                                )}
                              />
                            ))}
                          </div>
                        ) : null}

                        {(!viewportMode.isCompactAccount || profileStep === 'name') ? (
                          <FormInput
                            label="Full name"
                            placeholder="Your full name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            icon={<UserRound className="h-5 w-5" strokeWidth={2.05} />}
                            inputProps={{ autoComplete: 'name' }}
                          />
                        ) : null}

                        {(!viewportMode.isCompactAccount || profileStep === 'email') ? (
                          <FormInput
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            icon={<Mail className="h-5 w-5" strokeWidth={2.05} />}
                            inputProps={{ autoComplete: 'email' }}
                          />
                        ) : null}

                        {(!viewportMode.isCompactAccount || profileStep === 'password') ? (
                          <FormInput
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            icon={<LockKeyhole className="h-5 w-5" strokeWidth={2.05} />}
                            inputProps={{ autoComplete: 'new-password' }}
                            trailing={
                              <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#6f63b7] transition hover:bg-[#f3efff] hover:text-[#4c2cff]"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                              </button>
                            }
                          />
                        ) : null}

                        <div className="flex items-center gap-4 pt-0.5">
                          <span className="h-px flex-1 bg-[#e4ddf8]" />
                          <span className="text-xs font-semibold tracking-[0.12em] text-[#6675aa]">OR</span>
                          <span className="h-px flex-1 bg-[#e4ddf8]" />
                        </div>

                        {google.isConfigured ? (
                          <div ref={google.buttonRef} className="flex justify-center" />
                        ) : (
                          <p className="text-center text-xs font-medium text-[#9aa3c2]">Google sign-in isn&apos;t configured yet.</p>
                        )}

                        <p className="text-[0.88rem] text-[#566497] sm:text-[0.98rem]">
                          Already started?{' '}
                          <Link to="/login" className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0]">
                            Sign in to continue
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6345ff]">Email verification</p>
                        <h1 className="text-[1.9rem] font-bold leading-[1.03] tracking-[-0.04em] text-[#12186d] sm:text-[2.35rem] xl:text-[2.55rem]">
                          Enter verification code
                        </h1>
                        <p className="mx-auto max-w-[460px] text-[1rem] font-medium leading-7 text-[#5b6697] sm:text-[1.06rem]">
                          We sent a 6-digit code to <span className="font-semibold text-[#182062]">{emailChallenge?.maskedEmail}</span>.
                        </p>
                      </div>

                      <div className="mt-8 space-y-6">
                        <InputOTP
                          maxLength={6}
                          value={emailOtp}
                          onChange={(value) => setEmailOtp(value.replace(/\D/g, ''))}
                          inputMode="numeric"
                          containerClassName="justify-center"
                        >
                          <InputOTPGroup className="gap-2 sm:gap-3">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-14 w-11 rounded-2xl border border-[#d8d9ee] bg-white text-xl text-[#151a5f] shadow-[0_10px_22px_rgba(123,92,255,0.08)] sm:h-16 sm:w-12"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>

                        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setScreen('profile');
                            }}
                            className="font-semibold text-[#6b7298] transition hover:text-[#182062]"
                          >
                            Change email
                          </button>
                          <button
                            type="button"
                            onClick={() => void resendEmailOtp()}
                            disabled={!canResend || loading || expired}
                            className="font-semibold text-[#5a32ff] transition hover:text-[#4018e0] disabled:text-slate-400"
                          >
                            {canResend ? 'Resend code' : `Resend in ${resendSeconds}s`}
                          </button>
                        </div>

                        {expired ? <p className="text-center text-sm text-rose-600">This code has expired. Return and request a new code.</p> : null}
                      </div>
                    </>
                  )}


                  <div className="mt-4 sm:mt-5 short:lg:mt-4">
                    <Button
                      type="button"
                      onClick={handlePrimaryAction}
                      disabled={loading || isPrimaryDisabled}
                      className="h-12 w-full rounded-[18px] bg-[linear-gradient(90deg,#5b2dff_0%,#7a43ff_100%)] text-[0.98rem] font-semibold text-white shadow-[0_20px_40px_rgba(91,45,255,0.28)] transition hover:brightness-[1.03] sm:h-14 sm:text-[1.02rem] short:lg:h-12"
                    >
                      {loading ? (
                        'Please wait...'
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          {primaryLabel}
                          <ArrowRight size={19} />
                        </span>
                      )}
                    </Button>
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TrainerWelcomeScreen({
  form,
  savedLabel,
  draftError,
  loading,
  onBack,
  onClose,
  onPrimaryAction,
  onSaveAndLogout,
}: {
  form: ReturnType<typeof useForm<TrainerOnboardingFormValues>>;
  savedLabel: string;
  draftError: string;
  loading: boolean;
  onBack: () => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  onSaveAndLogout: () => void;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <div className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f8f4ff_42%,_#f1ecff_100%)] text-[#090B3F] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col bg-white lg:h-screen lg:overflow-hidden" style={{ background: trainerEntryShellBackground }}>
        <header className="shrink-0 border-b border-[#ece7fb] bg-white/72 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-7 lg:py-3 short:lg:py-2">
          <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3 sm:grid-cols-[46px_1fr_46px]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#5d49de] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <p className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[#20277c] sm:text-[1.12rem]">Trainer onboarding</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#7a69cf] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Close onboarding"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:auto-rows-fr lg:grid-cols-2">
          {/* Same hero sizing contract as the public account screen: image first, compact copy below. */}
          <section
            className="relative flex h-[30dvh] min-h-[205px] max-h-[250px] shrink-0 overflow-hidden border-b border-[#ebe6fb] px-4 py-2.5 sm:h-[44dvh] sm:min-h-[320px] sm:max-h-[430px] sm:py-3 lg:h-auto lg:min-h-0 lg:max-h-none lg:border-b-0 lg:border-r lg:px-5 lg:py-4 xl:px-8 max-lg:shorter:h-[28dvh] max-lg:shorter:min-h-[185px] short:lg:py-3"
            style={{ background: trainerEntryHeroBackground }}
          >
            <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-col justify-center">
              <div className="relative mx-auto flex w-full min-h-0 max-w-[680px] items-center justify-center lg:h-[min(360px,36dvh)] xl:h-[min(420px,40dvh)] short:lg:h-[min(230px,26dvh)] shorter:lg:h-[min(190px,22dvh)] shortest:lg:h-[min(150px,18dvh)]">
                <img
                  src={trainerWelcomeIllustration}
                  alt="Trainer onboarding welcome illustration"
                  className="mx-auto h-auto max-h-[14dvh] w-full max-w-[420px] object-contain sm:max-h-[25dvh] sm:max-w-[520px] lg:h-full lg:max-h-full lg:w-auto lg:max-w-full max-lg:shorter:max-h-[13dvh]"
                />
              </div>

              <div className="mx-auto mt-0.5 max-w-[580px] shrink-0 text-center sm:mt-2">
                <h2 className="text-[1.12rem] font-bold leading-[1.04] tracking-[-0.02em] text-[#12186d] sm:text-[1.55rem] sm:tracking-[-0.035em] lg:text-[1.65rem] xl:text-[2.2rem] short:lg:text-[1.55rem] shorter:lg:text-[1.3rem]">
                  Let&apos;s begin your trainer journey
                </h2>
                <p className="mx-auto mt-1 max-w-[520px] text-[0.74rem] font-medium leading-4 text-[#5b6697] sm:mt-1.5 sm:text-[0.9rem] sm:leading-5 lg:text-[0.9rem] xl:text-[0.98rem] short:lg:line-clamp-2">
                  Create a polished and trustworthy profile that helps clients know who you are and how you can help.
                </p>
              </div>

              <div className="mx-auto mt-3 hidden w-full max-w-[720px] shrink-0 gap-2 lg:grid lg:grid-cols-3 xl:mt-4 short:lg:mt-2 shortest:lg:hidden">
                {trainerWelcomeHighlights.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-[18px] border border-white/70 bg-white/55 px-3 py-2 shadow-[0_14px_28px_rgba(114,90,220,0.08)] backdrop-blur-[10px] xl:block xl:py-3"
                  >
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f4eeff_100%)] text-[#7b5cff] shadow-[0_10px_22px_rgba(123,92,255,0.14)] xl:h-10 xl:w-10">
                      <Icon size={18} strokeWidth={2.1} />
                    </div>
                    <div>
                      <p className="text-[0.86rem] font-semibold leading-tight text-[#182062] xl:mt-3 xl:text-[0.94rem]">{title}</p>
                      <p className="mt-1 hidden text-xs leading-5 text-[#6674a7] xl:block">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 items-start px-4 py-4 sm:px-6 lg:items-center lg:overflow-hidden lg:px-8 lg:py-4 xl:px-12 short:lg:py-3">
            <div className="mx-auto flex w-full max-w-[680px] flex-col justify-center lg:h-full">
              <AnimatePresence mode="wait" initial={false}>
                <motion.section
                  key="trainer-welcome-step"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6345ff]">Welcome</p>
                    <h1 className="text-[1.85rem] font-bold leading-[1.03] tracking-[-0.045em] text-[#12186d] sm:text-[2.25rem] xl:text-[2.55rem] short:lg:text-[2.15rem]">
                      Let&apos;s get started
                    </h1>
                    <p className="max-w-[560px] text-[0.94rem] font-medium leading-6 text-[#5b6697] sm:text-[1rem] short:lg:line-clamp-2">
                      We&apos;ll help you create a trainer profile that feels polished, trustworthy, and easy for clients to understand.
                    </p>
                    <p className="text-[0.98rem] font-medium text-[#5b6697]">Two quick details to begin.</p>
                  </div>

                  <div className="mt-5 space-y-4 short:lg:mt-4 short:lg:space-y-3">
                    <FormInput
                      label="Full name"
                      placeholder="Enter your full name"
                      inputProps={register('profile.fullName')}
                      error={findErrorMessage(errors, 'profile.fullName')}
                      icon={<UserRound className="h-5 w-5" strokeWidth={2.05} />}
                    />

                    <Controller
                      control={control}
                      name="profile.gender"
                      render={({ field }) => (
                        <WelcomeChoiceGrid
                          label="Gender"
                          value={field.value}
                          options={trainerWelcomeGenderOptions}
                          onChange={field.onChange}
                          error={findErrorMessage(errors, 'profile.gender')}
                        />
                      )}
                    />
                  </div>

                  <div className="mt-7 flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#ddd5f6]" />
                    <div className="inline-flex items-center gap-2 text-[0.92rem] font-medium text-[#7582b3]">
                      <ShieldCheck className="h-4 w-4 text-[#7b5cff]" strokeWidth={2.1} />
                      <span>{savedLabel}</span>
                    </div>
                    <div className="h-px flex-1 bg-[#ddd5f6]" />
                  </div>

                  {draftError ? (
                    <p className="mt-4 rounded-[18px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {draftError}
                    </p>
                  ) : null}

                  <div className="mt-5 short:lg:mt-4">
                    <Button
                      type="button"
                      onClick={onPrimaryAction}
                      disabled={loading}
                      className="h-14 w-full rounded-[18px] bg-[linear-gradient(90deg,#5b2dff_0%,#7a43ff_100%)] text-[1.02rem] font-semibold text-white shadow-[0_20px_40px_rgba(91,45,255,0.28)] transition hover:brightness-[1.03] short:lg:h-12"
                    >
                      {loading ? (
                        'Please wait...'
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          Continue
                          <ArrowRight size={19} />
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={onSaveAndLogout}
                      disabled={loading}
                      className="text-[1rem] font-semibold text-[#5a32ff] transition hover:text-[#4018e0] disabled:opacity-50"
                    >
                      Save application &amp; Log out
                    </button>
                  </div>
                </motion.section>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TrainerApplicationScreenShell({
  screen,
  prefersReducedMotion,
  direction,
  savedLabel,
  draftError,
  footerLabel,
  loading,
  footerDisabled,
  viewportMode,
  onBack,
  onClose,
  onPrimaryAction,
  onSaveAndLogout,
  children,
}: {
  screen: TrainerOnboardingScreen;
  prefersReducedMotion: boolean | undefined;
  direction: number;
  savedLabel: string;
  draftError: string;
  footerLabel: string;
  loading: boolean;
  footerDisabled?: boolean;
  viewportMode: ReturnType<typeof useTrainerViewportMode>;
  onBack: () => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  onSaveAndLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f8f4ff_42%,_#f1ecff_100%)] text-[#090B3F] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col bg-white lg:h-screen lg:overflow-hidden" style={{ background: trainerEntryShellBackground }}>
        <header className="shrink-0 border-b border-[#ece7fb] bg-white/72 px-3 py-2.5 backdrop-blur-xl sm:px-5 lg:px-7 lg:py-3 short:lg:py-2">
          <div className="grid grid-cols-[42px_1fr_42px] items-center gap-3 sm:grid-cols-[46px_1fr_46px]">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#5d49de] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0 text-center">
              <p className={cn('text-[1.02rem] font-semibold tracking-[-0.02em] text-[#20277c] sm:text-[1.12rem]', screen.id === 'success' && 'text-emerald-600')}>
                {screen.id === 'success' ? 'Application complete' : 'Trainer onboarding'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ede8ff] bg-white text-[#7a69cf] shadow-[0_10px_24px_rgba(123,92,255,0.12)] transition hover:-translate-y-0.5 hover:text-[#4526d9] sm:h-11 sm:w-11"
              aria-label="Close onboarding"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:auto-rows-fr lg:grid-cols-2">
          {/* Authenticated steps reuse the visual rail, but the right side owns all form progression. */}
          <section
           
          >
            <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-col justify-center">
              <div className="relative mx-auto flex w-full min-h-0 max-w-[680px] items-center justify-center lg:h-[min(360px,36dvh)] xl:h-[min(420px,40dvh)] short:lg:h-[min(230px,26dvh)] shorter:lg:h-[min(190px,22dvh)] shortest:lg:h-[min(150px,18dvh)]">
                <img
                  src={trainerWelcomeIllustration}
                  alt="Trainer onboarding illustration"
                  className="mx-auto h-auto max-h-[14dvh] w-full max-w-[420px] object-contain sm:max-h-[25dvh] sm:max-w-[520px] lg:h-full lg:max-h-full lg:w-auto lg:max-w-full max-lg:shorter:max-h-[13dvh]"
                />
              </div>

              <div className="mx-auto mt-0.5 max-w-[580px] text-center sm:mt-2">
                <h2 className="text-[1.12rem] font-bold leading-[1.04] tracking-[-0.02em] text-[#12186d] sm:text-[1.55rem] sm:tracking-[-0.035em] lg:text-[1.65rem] xl:text-[2.2rem] short:lg:text-[1.55rem] shorter:lg:text-[1.3rem]">
                  {screen.id === 'success' ? 'Your trainer application is in' : "Let's build your trainer profile"}
                </h2>
                <p className="mx-auto mt-1 max-w-[520px] text-[0.74rem] font-medium leading-4 text-[#5b6697] sm:mt-1.5 sm:text-[0.9rem] sm:leading-5 lg:text-[0.9rem] xl:text-[0.98rem] short:lg:line-clamp-2">
                  {screen.id === 'success'
                    ? 'You&apos;re all set. Our team will review your details and guide you through the next step shortly.'
                    : 'Complete each step to create a polished and trustworthy profile clients can understand quickly.'}
                </p>
              </div>

              <div className="mx-auto mt-3 hidden w-full max-w-[720px] gap-2 lg:grid lg:grid-cols-3 xl:mt-4 short:lg:mt-2 shortest:lg:hidden">
                {trainerWelcomeHighlights.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-[18px] border border-white/70 bg-white/55 px-3 py-2 shadow-[0_14px_28px_rgba(114,90,220,0.08)] backdrop-blur-[10px] xl:block xl:py-3"
                  >
                    <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ffffff_0%,#f4eeff_100%)] text-[#7b5cff] shadow-[0_10px_22px_rgba(123,92,255,0.14)] xl:h-10 xl:w-10">
                      <Icon size={18} strokeWidth={2.1} />
                    </div>
                    <div>
                      <p className="text-[0.86rem] font-semibold leading-tight text-[#182062] xl:mt-3 xl:text-[0.94rem]">{title}</p>
                      <p className="mt-1 hidden text-xs leading-5 text-[#6674a7] xl:block">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 px-4 py-4 sm:px-6 lg:overflow-hidden lg:px-7 lg:py-4 xl:px-10 short:lg:py-3">
            <div className="mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col">
              <div className="min-h-0 flex-1 pr-0 lg:overflow-y-auto lg:pr-1 [scrollbar-gutter:stable] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <AnimatePresence custom={direction} initial={false} mode="wait">
                  <motion.section
                    key={screen.id}
                    custom={direction}
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 28 : -28 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -20 : 20 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto w-full max-w-[760px] pb-4 lg:h-full lg:pb-0"
                  >
                    <QuestionScreen screen={screen}>{children}</QuestionScreen>
                  </motion.section>
                </AnimatePresence>
              </div>

              {screen.id !== 'success' ? (
                <div className="shrink-0 pt-3 short:lg:pt-2">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-[#ddd5f6]" />
                    <div className="inline-flex items-center gap-2 text-[0.92rem] font-medium text-[#7582b3]">
                      <ShieldCheck className="h-4 w-4 text-[#7b5cff]" strokeWidth={2.1} />
                      <span>{savedLabel}</span>
                    </div>
                    <div className="h-px flex-1 bg-[#ddd5f6]" />
                  </div>

                  {draftError ? (
                    <p className="mt-4 rounded-[18px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {draftError}
                    </p>
                  ) : null}

                  <div className="mt-3 short:lg:mt-2">
                    <Button
                      type="button"
                      onClick={onPrimaryAction}
                      disabled={loading || footerDisabled}
                      className="h-14 w-full rounded-[18px] bg-[linear-gradient(90deg,#5b2dff_0%,#7a43ff_100%)] text-[1.02rem] font-semibold text-white shadow-[0_20px_40px_rgba(91,45,255,0.28)] transition hover:brightness-[1.03] short:lg:h-12"
                    >
                      {loading ? (
                        'Please wait...'
                      ) : (
                        <span className="inline-flex items-center gap-3">
                          {footerLabel}
                          <ArrowRight size={19} />
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className="mt-3 text-center short:lg:mt-2">
                    <button
                      type="button"
                      onClick={onSaveAndLogout}
                      disabled={loading}
                      className="text-[1rem] font-semibold text-[#5a32ff] transition hover:text-[#4018e0] disabled:opacity-50"
                    >
                      Save application &amp; Log out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TrainerEntryHeroBadge({
  className,
  icon: Icon,
  label,
}: {
  className?: string;
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <div
      className={cn(
        'absolute z-20 h-16 w-16 items-center justify-center rounded-[22px] border border-white/70 bg-white/86 text-[#7b5cff] shadow-[0_18px_36px_rgba(123,92,255,0.16)] backdrop-blur-md',
        className,
      )}
      aria-hidden="true"
      title={label}
    >
      <Icon size={28} strokeWidth={1.9} />
    </div>
  );
}

function OnboardingLayout({ animation, content }: { animation: React.ReactNode; content: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-x-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-12">
      <div className="pb-2 lg:flex lg:min-h-0 lg:items-center lg:pb-0">
        {animation}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{content}</div>
    </div>
  );
}

function OnboardingHeader({
  isSuccess,
  onBack,
  onClose,
}: {
  isSuccess: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <header className="mb-3 px-0 py-1 lg:mb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className={cn('text-sm font-medium text-slate-500', isSuccess && 'text-emerald-600')}>
            {isSuccess ? 'Application complete' : 'Trainer onboarding'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close onboarding"
        >
          <X size={18} />
        </button>
      </div>
    </header>
  );
}

function OnboardingAnimationPlaceholder({
  animationKey,
  title,
  description,
}: {
  animationKey: TrainerAnimationKey;
  title: string;
  description: string;
}) {
  const Icon = animationIcons[animationKey];

  return (
    <div className="relative w-full overflow-hidden bg-[linear-gradient(180deg,rgba(47,79,136,0.08),rgba(255,255,255,0))] px-0 pb-4 pt-2 lg:min-h-[640px] lg:px-6 lg:pt-8">
      <div className="flex h-[28vh] min-h-[200px] max-h-[300px] flex-col justify-between lg:h-full lg:min-h-[540px] lg:max-h-none">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ds-brand)]">
          <Sparkles size={14} />
          Future Lottie slot
        </div>

        <div className="flex flex-col items-center justify-center gap-5 text-center lg:flex-1">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-50 text-[var(--ds-brand)] sm:h-36 sm:w-36 lg:h-40 lg:w-40"
          >
            <span className="absolute inset-3 rounded-full border border-[var(--ds-border)] border-dashed" />
            <Icon size={44} className="relative z-10 sm:size-12" />
          </motion.div>

          <div className="hidden max-w-md space-y-3 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{description}</p>
            <h2 className="text-2xl font-semibold text-slate-950 sm:text-[2rem]">{title}</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Animation space is reserved here so we can drop in the future <code className="px-1 text-xs text-slate-700">{trainerAnimationMap[animationKey]}</code> scene without changing layout.
            </p>
          </div>
        </div>

        <div className="hidden grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-left text-xs text-slate-600 lg:grid">
          <MetricTile label="Format" value="Full screen" />
          <MetricTile label="Motion" value="Ready" />
          <MetricTile label="Density" value="Low friction" />
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-1 py-1">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuestionScreen({ screen, children }: { screen: TrainerOnboardingScreen; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col px-0 py-2 sm:py-3 lg:h-full short:lg:py-1">
      <div className="space-y-2 short:lg:space-y-1.5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--ds-brand)]">{screen.eyebrow}</p>
        <h1 className="text-[1.7rem] font-semibold leading-tight text-slate-950 sm:text-[1.95rem] xl:text-[2.1rem] short:lg:text-[1.65rem]">{screen.title}</h1>
        <p className="text-sm leading-6 text-slate-600 short:lg:line-clamp-2">{screen.description}</p>
        <p className="text-xs font-medium text-slate-500">{screen.helper}</p>
      </div>

      <div className="mt-4 min-h-0 flex-1 short:lg:mt-3">{children}</div>
    </div>
  );
}

function OnboardingFooter({
  label,
  savedLabel,
  error,
  loading,
  disabled,
  onPrimaryAction,
  onSaveAndLogout,
}: {
  label: string;
  savedLabel: string;
  error?: string;
  loading: boolean;
  disabled?: boolean;
  onPrimaryAction: () => void;
  onSaveAndLogout: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 lg:static lg:mt-6 lg:px-0 lg:py-4">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-3">
        <p className="text-xs font-medium text-slate-500">{savedLabel}</p>
        {error ? <p role="alert" className="text-center text-sm font-medium text-rose-600">{error}</p> : null}
        <Button
          type="button"
          onClick={onPrimaryAction}
          disabled={loading || disabled}
          className="h-14 w-full rounded-full bg-[var(--ds-brand)] text-base font-semibold text-white hover:bg-[var(--ds-brand-strong)]"
        >
          {loading ? 'Submitting...' : <span className="inline-flex items-center gap-2">{label} <ArrowRight size={18} /></span>}
        </Button>
        <button type="button" onClick={onSaveAndLogout} disabled={loading} className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50">
          Save application & Log out
        </button>
      </div>
    </div>
  );
}

function LocationAutoDetectFields({
  register,
  control,
  setValue,
  errors,
}: {
  register: ReturnType<typeof useForm<TrainerOnboardingFormValues>>['register'];
  control: ReturnType<typeof useForm<TrainerOnboardingFormValues>>['control'];
  setValue: ReturnType<typeof useForm<TrainerOnboardingFormValues>>['setValue'];
  errors: FieldErrors<TrainerOnboardingFormValues>;
}) {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const lastDetectedCityRef = useRef('');
  const stateManuallyEditedRef = useRef(false);
  const cityValue = useWatch({ control, name: 'profile.city' });
  const stateField = register('profile.state');

  useEffect(() => {
    if (!cityValue || cityValue === lastDetectedCityRef.current || stateManuallyEditedRef.current) return;

    const timer = window.setTimeout(() => {
      const state = lookupStateForCity(cityValue);
      if (state) {
        setValue('profile.state', state, { shouldDirty: true, shouldValidate: true });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [cityValue, setValue]);

  function detectLocation() {
    setDetectError('');

    if (!navigator.geolocation) {
      setDetectError('Location detection is not supported on this device. Enter your city manually.');
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          .then((response) => {
            if (!response.ok) throw new Error('Reverse geocode request failed.');
            return response.json();
          })
          .then((data: { city?: string; locality?: string; principalSubdivision?: string }) => {
            const city = (data.city || data.locality || '').trim();
            if (!city) {
              setDetectError('Could not detect your location automatically. Enter your city and state manually.');
              return;
            }

            const state = (data.principalSubdivision || '').trim() || lookupStateForCity(city);
            lastDetectedCityRef.current = city;
            stateManuallyEditedRef.current = false;
            setValue('profile.city', city, { shouldDirty: true, shouldValidate: true });
            if (state) {
              setValue('profile.state', state, { shouldDirty: true, shouldValidate: true });
            }
          })
          .catch(() => {
            setDetectError('Could not detect your location automatically. Enter your city and state manually.');
          })
          .finally(() => setDetecting(false));
      },
      (error) => {
        setDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setDetectError('Location access was denied. You can enter your city manually.');
        } else if (error.code === error.TIMEOUT) {
          setDetectError('Location detection timed out. You can enter your city manually.');
        } else {
          setDetectError('Could not detect your location. You can enter your city manually.');
        }
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="inline-flex items-center gap-2 rounded-full border border-[#e5ddff] bg-[#f7f3ff] px-4 py-2 text-sm font-semibold text-[#5f3dff] transition hover:bg-[#efe8ff] disabled:opacity-60"
      >
        <MapPin className="h-4 w-4" strokeWidth={2} />
        {detecting ? 'Detecting your location...' : 'Detect my location'}
      </button>

      {detectError ? <p className="text-xs text-rose-600">{detectError}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="City"
          placeholder="Hyderabad"
          inputProps={register('profile.city')}
          error={findErrorMessage(errors, 'profile.city')}
        />

        <FormInput
          label="State"
          placeholder="Telangana"
          inputProps={{
            ...stateField,
            onChange: (event) => {
              stateManuallyEditedRef.current = true;
              void stateField.onChange(event);
            },
          }}
          error={findErrorMessage(errors, 'profile.state')}
        />
      </div>
    </div>
  );
}

function FormInput({
  label,
  error,
  type = 'text',
  inputMode,
  placeholder,
  inputProps,
  value,
  onChange,
  icon,
  trailing,
}: {
  label: string;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <div
        className={cn(
          'group flex min-h-12 items-center gap-3 rounded-[16px] border border-slate-300 bg-white px-4 shadow-[0_10px_24px_rgba(86,74,164,0.06)] transition focus-within:border-[#8d6bff] focus-within:ring-4 focus-within:ring-[#7c5cff1a] sm:min-h-[52px] short:lg:min-h-11',
          error && 'border-rose-300 focus-within:ring-[rgba(244,63,94,0.12)]',
        )}
      >
        {icon ? <span className="shrink-0 text-[#7b5cff]">{icon}</span> : null}
        <Input
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          className={cn(
            'h-auto flex-1 border-0 bg-transparent px-0 py-0 text-[0.98rem] font-medium text-[#151a5f] shadow-none placeholder:text-[#9aa3c2] focus-visible:ring-0',
            trailing ? 'pr-0' : '',
          )}
          value={onChange || value !== undefined ? (value ?? '') : undefined}
          onChange={onChange}
          {...inputProps}
        />
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

function FormTextArea({
  label,
  error,
  placeholder,
  textAreaProps,
}: {
  label: string;
  error?: string;
  placeholder?: string;
  textAreaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <Textarea
        placeholder={placeholder}
        className={cn(
          'min-h-28 rounded-xl border-slate-300 bg-white px-4 py-3 text-[0.98rem] leading-6 transition focus-visible:ring-[3px] focus-visible:ring-[rgba(47,79,136,0.12)] short:lg:min-h-24',
          error && 'border-rose-300 focus-visible:ring-[rgba(244,63,94,0.12)]',
        )}
        {...textAreaProps}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

function ChoiceCardGroup({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left transition',
                active ? 'border-[var(--ds-brand)] bg-transparent text-[var(--ds-brand)]' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
              )}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              {active ? <Check size={18} /> : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function WelcomeChoiceGrid({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly {
    label: string;
    value: TrainerOnboardingFormValues['profile']['gender'];
    icon: typeof Sparkles;
    tone: string;
  }[];
  value?: TrainerOnboardingFormValues['profile']['gender'];
  onChange: (value: TrainerOnboardingFormValues['profile']['gender']) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = option.value === value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-[60px] items-center justify-between rounded-[16px] border bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(86,74,164,0.06)] transition',
                active ? 'border-[#b297ff] bg-[#fcfaff]' : 'border-slate-200 hover:border-[#d6cbff]',
              )}
            >
              <span className="flex items-center gap-3">
                <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f3ff]', option.tone)}>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span className="text-[0.95rem] font-semibold text-[#182062]">{option.label}</span>
              </span>
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full border text-transparent transition',
                  active ? 'border-[#7b5cff] bg-[#7b5cff] text-white' : 'border-[#d8d9ee] bg-white',
                )}
              >
                <Check size={15} strokeWidth={2.5} />
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function ChipSelector({
  label,
  options,
  value,
  onChange,
  error,
}: {
            label: string;
            options: readonly string[];
            value: string[];
            onChange: (value: string[]) => void;
            error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? value.filter((item) => item !== option) : [...value, option])}
              className={cn(
                'rounded-full border px-3.5 py-2.5 text-sm font-semibold transition short:lg:py-2',
                active
                  ? 'border-[#6b3dff] bg-[linear-gradient(135deg,#6b3dff_0%,#7f52ff_100%)] text-white shadow-[0_10px_22px_rgba(107,61,255,0.24)]'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-[#c7bbff] hover:bg-[#faf8ff]',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function SingleUploadField({
  label,
  hint,
  file,
  previewKind,
  accept,
  error,
  icon: Icon,
  onSelect,
  onClear,
}: {
  label: string;
  hint: string;
  file: UploadValue | null;
  previewKind?: 'image' | 'video';
  accept: string;
  error?: string;
  icon: typeof Upload;
  onSelect: (file: File) => void | Promise<void>;
  onClear: () => void;
}) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) void onSelect(selected);
          event.currentTarget.value = '';
        }}
      />

      <label
        htmlFor={inputId}
        className={cn(
          'block cursor-pointer rounded-xl border border-dashed px-4 py-3 transition',
          error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-transparent hover:border-slate-400',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[var(--ds-brand)]">
            <Icon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
            {file ? (
              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span className="font-medium">{file.name}</span>
                <span className="text-slate-400">{formatBytes(file.size)}</span>
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ds-brand)]">
                <Upload size={16} />
                Choose file
              </span>
            )}
          </span>
        </div>
      </label>

      {file?.previewUrl && previewKind ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {previewKind === 'image' ? (
            <img src={file.previewUrl} alt={`${label} preview`} className="h-36 w-full object-cover sm:h-44 short:lg:h-32" />
          ) : (
            <video src={file.previewUrl} controls preload="metadata" className="h-36 w-full bg-slate-950 object-cover sm:h-44 short:lg:h-32" />
          )}
        </div>
      ) : null}

      {file ? (
        <button type="button" onClick={onClear} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Remove file
        </button>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function MultiUploadField({
  label,
  hint,
  files,
  previewKind,
  accept,
  error,
  icon: Icon,
  onSelect,
  onRemove,
}: {
  label: string;
  hint: string;
  files: UploadValue[];
  previewKind?: 'image' | 'video';
  accept: string;
  error?: string;
  icon: typeof Upload;
  onSelect: (files: File[]) => void | Promise<void>;
  onRemove: (id: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="space-y-2.5">
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files ? Array.from(event.target.files) : [];
          if (selected.length) void onSelect(selected);
          event.currentTarget.value = '';
        }}
      />

      <label
        htmlFor={inputId}
        className={cn(
          'block cursor-pointer rounded-xl border border-dashed px-4 py-3 transition',
          error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-transparent hover:border-slate-400',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[var(--ds-brand)]">
            <Icon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
            <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ds-brand)]">
              <Upload size={16} />
              Add files
            </span>
          </span>
        </div>
      </label>

      {files.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => (
            <div key={file.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {file.previewUrl && previewKind === 'image' ? (
                <img src={file.previewUrl} alt={`${file.name} preview`} className="h-24 w-full object-cover sm:h-28 short:lg:h-20" />
              ) : null}
              {file.previewUrl && previewKind === 'video' ? (
                <video src={file.previewUrl} controls preload="metadata" className="h-24 w-full bg-slate-950 object-cover sm:h-28 short:lg:h-20" />
              ) : null}
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <button type="button" onClick={() => onRemove(file.id)} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function PhotoCropEditor({
  file,
  error,
  onApply,
  onClear,
}: {
  file: UploadValue | null;
  error?: string;
  onApply: (file: UploadValue) => void;
  onClear: () => void;
}) {
  const inputId = useId();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [source, setSource] = useState<{ name: string; previewUrl: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => () => { cropperRef.current?.destroy(); }, []);

  function closeEditor() {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    setIsReady(false);
    setSource(null);
  }

  async function openSelectedImage(selected: File) {
    closeEditor();
    setSource({
      name: selected.name,
      previewUrl: await readFileAsDataUrl(selected),
    });
  }

  function initialiseCropper() {
    if (!imageRef.current) return;

    cropperRef.current?.destroy();
    cropperRef.current = new Cropper(imageRef.current, {
      aspectRatio: 4 / 5,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.94,
      background: false,
      center: true,
      cropBoxMovable: false,
      cropBoxResizable: false,
      guides: true,
      highlight: false,
      preview: '.trainer-photo-crop-preview',
      responsive: true,
      restore: false,
      toggleDragModeOnDblclick: false,
      ready: () => setIsReady(true),
    });
  }

  async function applyCrop() {
    const canvas = cropperRef.current?.getCroppedCanvas({
      width: 640,
      height: 800,
      fillColor: '#ffffff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas || !source) return;

    setIsApplying(true);

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) return;

      const baseName = source.name.replace(/\.[^.]+$/, '') || 'trainer-photo';
      const name = `${baseName}-profile.jpg`;

      onApply({
        id: `${name}-${blob.size}-${Date.now()}`,
        kind: 'image',
        name,
        size: blob.size,
        type: 'image/jpeg',
        previewUrl: canvas.toDataURL('image/jpeg', 0.92),
      });
      closeEditor();
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) void openSelectedImage(selected);
          event.currentTarget.value = '';
        }}
      />

      {source ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Frame your profile photo</h3>
              <p className="mt-0.5 text-sm text-slate-500">Professional 4:5 portrait</p>
            </div>
            <button type="button" onClick={closeEditor} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          </header>

          <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_160px]">
            <div className="h-[280px] overflow-hidden rounded-lg bg-slate-950 sm:h-[340px] lg:h-[320px] short:lg:h-[240px] shortest:lg:h-[200px]">
              <img
                ref={imageRef}
                src={source.previewUrl}
                alt="Crop profile photo"
                className="block max-w-full"
                onLoad={initialiseCropper}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Profile preview</p>
                <div className="trainer-photo-crop-preview mt-2 aspect-[4/5] max-h-44 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 short:lg:max-h-32" />
              </div>

              <div className="grid grid-cols-3 gap-2" aria-label="Crop controls">
                <button type="button" title="Zoom out" onClick={() => cropperRef.current?.zoom(-0.1)} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Minus size={16} />
                </button>
                <button type="button" title="Reset crop" onClick={() => cropperRef.current?.reset()} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <RotateCcw size={16} />
                </button>
                <button type="button" title="Zoom in" onClick={() => cropperRef.current?.zoom(0.1)} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Plus size={16} />
                </button>
              </div>

              <Button type="button" onClick={() => void applyCrop()} disabled={!isReady || isApplying} className="w-full">
                <Check size={16} />
                {isApplying ? 'Applying...' : 'Apply crop'}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-xl bg-slate-50 p-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[linear-gradient(145deg,#eef2ff,#dbeafe)]">
              {file?.previewUrl ? (
                <div className="flex h-full w-full items-center justify-center">
                  <UserAvatar user={{ name: 'Trainer profile' }} src={file.previewUrl} alt="Trainer profile preview" size="xl" className="h-24 w-24 sm:h-28 sm:w-28" />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
                  <CircleUserRound size={40} />
                  <p className="max-w-[12rem] text-sm">Your portrait preview appears here once you upload it.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor={inputId}
              className={cn(
                'block cursor-pointer rounded-xl border border-dashed px-4 py-3 transition',
                error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-transparent hover:border-slate-400',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[var(--ds-brand)]">
                  <Camera size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Upload a clear portrait</span>
                  <span className="mt-0.5 block text-xs text-slate-500">Clear, front-facing JPG or PNG portrait.</span>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ds-brand)]">
                    <Upload size={16} />
                    {file ? 'Replace photo' : 'Choose photo'}
                  </span>
                </span>
              </div>
            </label>

            {file ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{formatBytes(file.size)} - 4:5 portrait crop applied</p>
                </div>
                <button type="button" onClick={onClear} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function ReviewSectionCard({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <section className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">Tap edit to jump back into that part of the flow.</p>
        </div>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-[var(--ds-brand)] hover:text-[var(--ds-brand-strong)]">
          Edit
        </button>
      </div>

      <dl className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="border-b border-slate-100 pb-3 last:border-b-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
