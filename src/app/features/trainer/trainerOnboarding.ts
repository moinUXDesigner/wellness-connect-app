import type { DeepPartialSkipArrayKey, FieldPath } from 'react-hook-form';
import { z } from 'zod';

export const trainerOnboardingStorageKey = 'wc_trainer_onboarding_v3';
export const trainerOnboardingSchemaVersion = 3;
export const trainerApplicationsStorageKey = 'wc_trainer_applications_v1';

export const trainerAnimationMap = {
  personalInfo: 'trainer-introduction',
  certification: 'certificate-verification',
  expertise: 'fitness-specialization',
  experience: 'client-transformation',
  availability: 'calendar-management',
  mediaUpload: 'camera-upload',
  legal: 'document-verification',
  review: 'success-checklist',
} as const;

export type TrainerAnimationKey = keyof typeof trainerAnimationMap;
export type UploadKind = 'image' | 'video' | 'document';
export type TrainerApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'needs_resubmission' | 'approved' | 'rejected';

export interface UploadValue {
  id: string;
  kind: UploadKind;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

const uploadValueSchema = z.object({
  id: z.string(),
  kind: z.enum(['image', 'video', 'document']),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  previewUrl: z.string().optional(),
});

function hasAdultAge(dateString: string) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 18;
}

function isPositiveInteger(value: string) {
  return /^\d+$/.test(value) && Number(value) >= 0;
}

export const trainerOnboardingSchema = z
  .object({
    profile: z.object({
      fullName: z.string().trim().min(2, 'Enter your full name.'),
      gender: z.enum(['Woman', 'Man', 'Non-binary', 'Prefer not to say'], {
        error: () => 'Choose the gender you want shown on your profile.',
      }),
      dateOfBirth: z
        .string()
        .min(1, 'Add your date of birth.')
        .refine(hasAdultAge, 'Applicants must be at least 18 years old.'),
      email: z.string().trim().email('Enter a valid email address.'),
      mobile: z
        .string()
        .trim()
        .regex(/^(?:\+91[-\s]?)?[6-9]\d{9}$/, 'Enter a valid mobile number.'),
      city: z.string().trim().min(2, 'Tell us your city.'),
      state: z.string().trim().min(2, 'Tell us your state.'),
    }),
    photo: z.object({
      file: uploadValueSchema.nullable().refine(Boolean, 'Upload a profile photo.'),
      cropX: z.number(),
      cropY: z.number(),
      zoom: z.number(),
    }),
    certification: z.object({
      institute: z.string().trim().min(2, 'Add the certification institute.'),
      type: z.string().trim().min(2, 'Add the certification type.'),
      certificate: uploadValueSchema.nullable().refine(Boolean, 'Upload your certificate file.'),
    }),
    expertise: z.array(z.string()).min(1, 'Select at least one expertise area.'),
    experience: z.object({
      yearsExperience: z
        .string()
        .trim()
        .min(1, 'Add your years of experience.')
        .refine(isPositiveInteger, 'Use a valid whole number.'),
      clientsTrained: z
        .string()
        .trim()
        .min(1, 'Add how many clients you have trained.')
        .refine(isPositiveInteger, 'Use a valid whole number.'),
    }),
    clientPitch: z.string().trim().min(40, 'Tell clients why they should choose you in at least 40 characters.'),
    showcase: z.object({
      transformationPhotos: z.array(uploadValueSchema),
      videos: z.array(uploadValueSchema),
    }),
    training: z.object({
      philosophy: z.string().trim().min(40, 'Share a short training philosophy in at least 40 characters.'),
      introductionVideo: uploadValueSchema.nullable(),
    }),
    availability: z.object({
      modes: z.array(z.string()).min(1, 'Choose at least one training mode.'),
      days: z.array(z.string()).min(1, 'Choose at least one available day.'),
      perSessionRateInr: z.string().trim().regex(/^[1-9]\d*$/, 'Enter a valid per-session rate.'),
      monthlyRateInr: z.string().trim().regex(/^[1-9]\d*$/, 'Enter a valid monthly rate.'),
      pricingPlans: z.string().trim(),
    }),
    identity: z.object({
      aadhaar: uploadValueSchema.nullable(),
      pan: uploadValueSchema.nullable(),
      passport: uploadValueSchema.nullable(),
      drivingLicense: uploadValueSchema.nullable(),
    }),
    payout: z.object({
      bankName: z.string().trim().min(2, 'Enter your bank name.'),
      accountNumber: z
        .string()
        .trim()
        .regex(/^\d{9,18}$/, 'Enter a valid account number.'),
      ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code.'),
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.identity.pan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Upload your PAN card.',
        path: ['identity', 'pan'],
      });
    }

    if (!value.identity.aadhaar && !value.identity.passport && !value.identity.drivingLicense) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Upload Aadhaar, Passport, or Driving License.',
        path: ['identity', 'aadhaar'],
      });
    }
  });

export type TrainerOnboardingFormValues = z.infer<typeof trainerOnboardingSchema>;

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function withoutPreview(file: UploadValue | null | undefined): UploadValue | null {
  if (!file) return null;
  const { previewUrl: _previewUrl, ...metadata } = file;
  return metadata;
}

// Uploads are always written as a single complete object (see the upload handlers in
// TrainerOnboardingPage), never built up field-by-field, so a watched upload value is
// either fully populated or absent - it's safe to assert past react-hook-form's
// DeepPartialSkipArrayKey typing here.
function uploadValue(value: DeepPartialSkipArrayKey<UploadValue> | null | undefined): UploadValue | null {
  return (value as UploadValue | undefined) ?? null;
}

function uploadValueList(value: DeepPartialSkipArrayKey<UploadValue>[] | undefined): UploadValue[] {
  return (value as UploadValue[] | undefined) ?? [];
}

export const trainerOnboardingDefaultValues: TrainerOnboardingFormValues = {
  profile: {
    fullName: '',
    gender: 'Prefer not to say',
    dateOfBirth: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
  },
  photo: {
    file: null,
    cropX: 50,
    cropY: 45,
    zoom: 1,
  },
  certification: {
    institute: '',
    type: '',
    certificate: null,
  },
  expertise: [],
  experience: {
    yearsExperience: '',
    clientsTrained: '',
  },
  clientPitch: '',
  showcase: {
    transformationPhotos: [],
    videos: [],
  },
  training: {
    philosophy: '',
    introductionVideo: null,
  },
  availability: {
    modes: [],
    days: [],
    perSessionRateInr: '',
    monthlyRateInr: '',
    pricingPlans: '',
  },
  identity: {
    aadhaar: null,
    pan: null,
    passport: null,
    drivingLicense: null,
  },
  payout: {
    bankName: '',
    accountNumber: '',
    ifsc: '',
  },
};

export const trainerGenderOptions = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'] as const;

export const trainerExpertiseOptions = [
  'Weight Loss',
  'Muscle Gain',
  'Functional Training',
  'Strength Training',
  "Women's Fitness",
  'Senior Fitness',
  'Rehab Fitness',
  'Sports Performance',
  'Yoga',
  'Others',
] as const;

export const trainerModeOptions = ['Online Coaching', 'Studio Sessions', 'Home Visits', 'Corporate Wellness'] as const;

export const trainerDayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type TrainerOnboardingScreenId =
  | 'personalInfo'
  | 'dateOfBirth'
  | 'location'
  | 'photo'
  | 'certification'
  | 'expertise'
  | 'experience'
  | 'clientPitch'
  | 'showcase'
  | 'training'
  | 'availability'
  | 'pricing'
  | 'identity'
  | 'payout'
  | 'review'
  | 'success';

export type TrainerOnboardingScreen = {
  id: TrainerOnboardingScreenId;
  animationKey: TrainerAnimationKey;
  eyebrow: string;
  title: string;
  description: string;
  helper: string;
  buttonLabel: string;
  fields: readonly FieldPath<TrainerOnboardingFormValues>[];
};

export const trainerOnboardingScreens: TrainerOnboardingScreen[] = [
  {
    id: 'personalInfo',
    animationKey: 'personalInfo',
    eyebrow: 'Welcome',
    title: "Let's get started",
    description: 'We will shape a trainer profile that feels polished, trustworthy, and easy for clients to understand.',
    helper: 'Two quick details to begin.',
    buttonLabel: 'Continue',
    fields: ['profile.fullName', 'profile.gender'],
  },
  {
    id: 'dateOfBirth',
    animationKey: 'personalInfo',
    eyebrow: 'About You',
    title: 'When were you born?',
    description: 'This helps us verify eligibility and personalize your profile summary.',
    helper: 'You need to be at least 18 to apply.',
    buttonLabel: 'Next',
    fields: ['profile.dateOfBirth'],
  },
  {
    id: 'location',
    animationKey: 'personalInfo',
    eyebrow: 'Location',
    title: 'Where are you based?',
    description: 'Your city and state help us match you to nearby clients, studios, and launch zones.',
    helper: 'You can update this later if you relocate.',
    buttonLabel: 'Next',
    fields: ['profile.city', 'profile.state'],
  },
  {
    id: 'photo',
    animationKey: 'personalInfo',
    eyebrow: 'Profile Photo',
    title: 'Upload your photo',
    description: 'A confident, friendly image builds trust before a client ever books a session.',
    helper: 'You can crop the framing right here.',
    buttonLabel: 'Next',
    fields: ['photo.file'],
  },
  {
    id: 'certification',
    animationKey: 'certification',
    eyebrow: 'Credentials',
    title: 'Your certifications?',
    description: 'Show the qualification that best represents how you train and the standard you bring.',
    helper: 'PDF or image uploads work well.',
    buttonLabel: 'Next',
    fields: ['certification.institute', 'certification.type', 'certification.certificate'],
  },
  {
    id: 'expertise',
    animationKey: 'expertise',
    eyebrow: 'Specialty',
    title: 'Your expertise?',
    description: 'Choose the areas where you consistently deliver confident, safe, high-quality coaching.',
    helper: 'Pick every category that genuinely fits.',
    buttonLabel: 'Next',
    fields: ['expertise'],
  },
  {
    id: 'experience',
    animationKey: 'experience',
    eyebrow: 'Track Record',
    title: 'Your experience?',
    description: 'A short snapshot of experience helps us position you for the right client type and pricing tier.',
    helper: 'Whole numbers are perfect here.',
    buttonLabel: 'Next',
    fields: ['experience.yearsExperience', 'experience.clientsTrained'],
  },
  {
    id: 'clientPitch',
    animationKey: 'experience',
    eyebrow: 'Your Difference',
    title: 'Why should clients choose you?',
    description: 'Share what makes your coaching credible, supportive, and worth choosing.',
    helper: 'Write this as clients will see it.',
    buttonLabel: 'Next',
    fields: ['clientPitch'],
  },
  {
    id: 'showcase',
    animationKey: 'mediaUpload',
    eyebrow: 'Portfolio',
    title: 'Show your work',
    description: 'Share a little proof of outcomes and coaching style so the review team can understand your impact quickly.',
    helper: 'One strong example is better than many average ones.',
    buttonLabel: 'Next',
    fields: [],
  },
  {
    id: 'training',
    animationKey: 'experience',
    eyebrow: 'Coaching Style',
    title: 'How do you train?',
    description: 'Tell us how you think about progress, safety, motivation, and the kind of client experience you create.',
    helper: 'Keep it human and specific.',
    buttonLabel: 'Next',
    fields: ['training.philosophy'],
  },
  {
    id: 'availability',
    animationKey: 'availability',
    eyebrow: 'Schedule',
    title: 'When are you available?',
    description: 'Tell us how you deliver training and which days clients can typically book you.',
    helper: 'Choose every mode and day that you actively support.',
    buttonLabel: 'Next',
    fields: ['availability.modes', 'availability.days'],
  },
  {
    id: 'pricing',
    animationKey: 'availability',
    eyebrow: 'Pricing',
    title: 'Set your pricing',
    description: 'Add your standard offer structure so clients and reviewers can understand your pricing clearly.',
    helper: 'Standard rates are required; package notes are optional.',
    buttonLabel: 'Next',
    fields: ['availability.perSessionRateInr', 'availability.monthlyRateInr'],
  },
  {
    id: 'identity',
    animationKey: 'legal',
    eyebrow: 'Verification',
    title: 'Verify identity',
    description: 'A clean verification step keeps the platform secure and helps us move faster on approval.',
    helper: 'PAN plus one primary ID is required.',
    buttonLabel: 'Next',
    fields: ['identity.aadhaar', 'identity.pan', 'identity.passport', 'identity.drivingLicense'],
  },
  {
    id: 'payout',
    animationKey: 'availability',
    eyebrow: 'Payouts',
    title: 'Payout details',
    description: 'Once approved, these details help operations activate payouts without chasing you for paperwork later.',
    helper: 'Double-check this carefully.',
    buttonLabel: 'Next',
    fields: ['payout.bankName', 'payout.accountNumber', 'payout.ifsc'],
  },
  {
    id: 'review',
    animationKey: 'review',
    eyebrow: 'Review',
    title: 'Almost done',
    description: 'Take one last calm pass through everything before you send it to our team.',
    helper: 'Each section below can jump you back into editing.',
    buttonLabel: 'Submit Application',
    fields: [],
  },
  {
    id: 'success',
    animationKey: 'review',
    eyebrow: 'Submitted',
    title: 'Application submitted',
    description: 'Our team will review your profile and contact you shortly.',
    helper: 'You can return to your dashboard or revisit your profile summary.',
    buttonLabel: 'Go to Dashboard',
    fields: [],
  },
];

export const trainerReviewScreenCount = trainerOnboardingScreens.findIndex((screen) => screen.id === 'success');

export interface TrainerSubmissionIssue {
  path: string;
  message: string;
  screenId: TrainerOnboardingScreenId;
}

export function buildTrainerSubmissionIssue(path: string, message: string): TrainerSubmissionIssue {
  const screen = trainerOnboardingScreens.find((item) => item.fields.some((field) => path === field || path.startsWith(`${field}.`)));

  return {
    path,
    message,
    screenId: screen?.id ?? 'review',
  };
}

export type TrainerApplicationDecision = 'submitted' | 'under_review' | 'needs_resubmission' | 'approved' | 'rejected';

export interface TrainerApplicationHistoryItem {
  id: string;
  action: TrainerApplicationDecision;
  actor: 'trainer' | 'admin';
  note: string;
  at: string;
}

export interface TrainerApplicationRecord {
  applicationId: string;
  status: TrainerApplicationStatus;
  applicantName: string;
  applicantEmail: string;
  applicantMobile: string;
  city: string;
  state: string;
  expertise: string[];
  values: TrainerOnboardingFormValues;
  submittedAt: string;
  updatedAt: string;
  adminRemarks: string;
  reviewHistory: TrainerApplicationHistoryItem[];
  currentScreen?: TrainerOnboardingScreenId;
}

export interface PersistedTrainerOnboardingState {
  version: number;
  screenId: TrainerOnboardingScreenId;
  values: TrainerOnboardingFormValues;
  submitted: boolean;
  submittedAt: string | null;
  savedAt: string | null;
  applicationId: string | null;
}

export function mergeTrainerOnboardingValues(values?: DeepPartialSkipArrayKey<TrainerOnboardingFormValues>): TrainerOnboardingFormValues {
  return {
    profile: {
      fullName: textValue(values?.profile?.fullName),
      gender: values?.profile?.gender ?? trainerOnboardingDefaultValues.profile.gender,
      dateOfBirth: textValue(values?.profile?.dateOfBirth),
      email: textValue(values?.profile?.email),
      mobile: textValue(values?.profile?.mobile),
      city: textValue(values?.profile?.city),
      state: textValue(values?.profile?.state),
    },
    photo: {
      cropX: values?.photo?.cropX ?? trainerOnboardingDefaultValues.photo.cropX,
      cropY: values?.photo?.cropY ?? trainerOnboardingDefaultValues.photo.cropY,
      zoom: values?.photo?.zoom ?? trainerOnboardingDefaultValues.photo.zoom,
      file: uploadValue(values?.photo?.file),
    },
    certification: {
      institute: textValue(values?.certification?.institute),
      type: textValue(values?.certification?.type),
      certificate: uploadValue(values?.certification?.certificate),
    },
    expertise: values?.expertise ?? trainerOnboardingDefaultValues.expertise,
    experience: {
      yearsExperience: textValue(values?.experience?.yearsExperience),
      clientsTrained: textValue(values?.experience?.clientsTrained),
    },
    clientPitch: textValue(values?.clientPitch),
    showcase: {
      transformationPhotos: uploadValueList(values?.showcase?.transformationPhotos),
      videos: uploadValueList(values?.showcase?.videos),
    },
    training: {
      philosophy: textValue(values?.training?.philosophy),
      introductionVideo: uploadValue(values?.training?.introductionVideo),
    },
    availability: {
      modes: values?.availability?.modes ?? trainerOnboardingDefaultValues.availability.modes,
      days: values?.availability?.days ?? trainerOnboardingDefaultValues.availability.days,
      perSessionRateInr: textValue(values?.availability?.perSessionRateInr),
      monthlyRateInr: textValue(values?.availability?.monthlyRateInr),
      pricingPlans: textValue(values?.availability?.pricingPlans),
    },
    identity: {
      aadhaar: uploadValue(values?.identity?.aadhaar),
      pan: uploadValue(values?.identity?.pan),
      passport: uploadValue(values?.identity?.passport),
      drivingLicense: uploadValue(values?.identity?.drivingLicense),
    },
    payout: {
      bankName: textValue(values?.payout?.bankName),
      accountNumber: textValue(values?.payout?.accountNumber),
      ifsc: textValue(values?.payout?.ifsc),
    },
  };
}

export function withoutTrainerUploadPreviews(values: TrainerOnboardingFormValues): TrainerOnboardingFormValues {
  return {
    ...values,
    photo: { ...values.photo, file: withoutPreview(values.photo.file) },
    certification: { ...values.certification, certificate: withoutPreview(values.certification.certificate) },
    showcase: {
      transformationPhotos: values.showcase.transformationPhotos.map((file) => withoutPreview(file)!),
      videos: values.showcase.videos.map((file) => withoutPreview(file)!),
    },
    training: { ...values.training, introductionVideo: withoutPreview(values.training.introductionVideo) },
    identity: {
      aadhaar: withoutPreview(values.identity.aadhaar),
      pan: withoutPreview(values.identity.pan),
      passport: withoutPreview(values.identity.passport),
      drivingLicense: withoutPreview(values.identity.drivingLicense),
    },
  };
}

export function readTrainerApplications() {
  try {
    const raw = localStorage.getItem(trainerApplicationsStorageKey);
    if (!raw) return [] as TrainerApplicationRecord[];

    const parsed = JSON.parse(raw) as TrainerApplicationRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [] as TrainerApplicationRecord[];
  }
}

export function writeTrainerApplications(applications: TrainerApplicationRecord[]) {
  try {
    localStorage.setItem(trainerApplicationsStorageKey, JSON.stringify(applications));
  } catch {
    // Local cache is optional; API-backed application state remains authoritative.
  }
}

export function upsertTrainerApplication(record: TrainerApplicationRecord) {
  const applications = readTrainerApplications();
  const nextApplications = applications.some((item) => item.applicationId === record.applicationId)
    ? applications.map((item) => (item.applicationId === record.applicationId ? record : item))
    : [record, ...applications];

  writeTrainerApplications(nextApplications);
}

export function findTrainerApplication(applicationId: string | null | undefined) {
  if (!applicationId) return null;
  return readTrainerApplications().find((item) => item.applicationId === applicationId) ?? null;
}

export function buildTrainerApplicationRecord({
  applicationId,
  values,
  submittedAt,
  status,
  adminRemarks,
  previousHistory = [],
}: {
  applicationId: string;
  values: TrainerOnboardingFormValues;
  submittedAt: string;
  status: TrainerApplicationStatus;
  adminRemarks: string;
  previousHistory?: TrainerApplicationHistoryItem[];
}) {
  return {
    applicationId,
    status,
    applicantName: values.profile.fullName,
    applicantEmail: values.profile.email,
    applicantMobile: values.profile.mobile,
    city: values.profile.city,
    state: values.profile.state,
    expertise: values.expertise,
    values,
    submittedAt,
    updatedAt: submittedAt,
    adminRemarks,
    reviewHistory: previousHistory,
  } satisfies TrainerApplicationRecord;
}

export function createHistoryItem({
  action,
  actor,
  note,
  at,
}: {
  action: TrainerApplicationDecision;
  actor: 'trainer' | 'admin';
  note: string;
  at: string;
}) {
  return {
    id: `${actor}-${action}-${at}`,
    action,
    actor,
    note,
    at,
  } satisfies TrainerApplicationHistoryItem;
}

export function statusLabel(status: TrainerApplicationStatus) {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under Review';
    case 'needs_resubmission':
      return 'Needs Resubmission';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
  }
}

export function nextActionLabel(status: TrainerApplicationStatus) {
  switch (status) {
    case 'draft':
      return 'Awaiting submission';
    case 'submitted':
      return 'Open and review application';
    case 'under_review':
      return 'Approve, reject, or request resubmission';
    case 'needs_resubmission':
      return 'Wait for trainer to resubmit';
    case 'approved':
      return 'Activate trainer access';
    case 'rejected':
      return 'No further action';
  }
}
