import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Globe2,
  Headphones,
  Heart,
  IndianRupee,
  Info,
  LockKeyhole,
  Monitor,
  Moon,
  Phone,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Sun,
  UserCheck,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  bookAppointmentRequest,
  createIntakeFlow,
  getIntakeConfirmation,
  getPractitionerSlots,
  getRecommendedPractitioners,
  saveIntakeAnswers,
  submitIntakeFlow,
  type PractitionerItem,
  type SlotItem,
} from '../../shared/services/api';
import { DSButton, DSCard, DSSecondaryButton } from '../../../../design/components/primitives';
import { MobileSectionTitle } from '../../../../design/patterns/intake';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { UserAvatar } from '../../../components/UserAvatar';
import { getClientMemberships, type ClientMembership } from '../../shared/services/membershipApi';
import { notifyError, toast } from '../../shared/lib/toast';

type ServiceType = 'psychology' | 'training' | 'combined' | 'package';
type Step = 1 | 2 | 3 | 4 | 5 | 6;
type ConcernOption = { value: string; label: string };
type PickerMode = 'single' | 'psychologist' | 'trainer';

type PractitionerDisplayProfile = {
  key: string;
  name: string;
  type: PractitionerItem['type'];
  role: string;
  description: string;
  specialties: string[];
  experience: string;
  languages: string[];
  modes: string[];
  price: string;
  reviews: number;
  rating: number;
  match: number;
  availability: string;
  avatar: string;
};

type PickerPractitionerCard = {
  displayKey: string;
  sourceId: number;
  practitioner: PractitionerItem;
  profile: PractitionerDisplayProfile;
};

interface State {
  step: Step;
  flowId: number | null;
  serviceType: ServiceType;
  concern: string;
  duration: string;
  symptoms: string[];
  outcome: string;
  selectedPractitionerId: number | null;
  selectedSlotId: number | null;
  selectedPsychologistId: number | null;
  selectedPsychologistSlotId: number | null;
  selectedTrainerId: number | null;
  selectedTrainerSlotId: number | null;
  status: 'draft' | 'under_review' | 'booked' | 'auto_bookable';
}

type Action =
  | { type: 'SET_SERVICE'; payload: ServiceType }
  | { type: 'SET_STEP'; payload: Step }
  | { type: 'SET_FLOW'; payload: number }
  | { type: 'SET_FIELD'; payload: Partial<State> };

const concernOptions: Record<ServiceType, ConcernOption[]> = {
  psychology: [
    { value: 'stress_management', label: 'Stress management' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'sleep', label: 'Sleep' },
    { value: 'relationship_support', label: 'Relationship support' },
  ],
  training: [
    { value: 'fitness_conditioning', label: 'Fitness conditioning' },
    { value: 'strength_mobility', label: 'Strength and mobility' },
    { value: 'weight_management', label: 'Weight management' },
    { value: 'healthy_routine', label: 'Healthy routine building' },
  ],
  combined: [
    { value: 'stress_and_fitness', label: 'Stress support with fitness routine' },
    { value: 'anxiety_and_movement', label: 'Anxiety support with movement plan' },
    { value: 'sleep_energy_fitness', label: 'Sleep, energy, and fitness reset' },
    { value: 'weight_and_confidence', label: 'Weight management and confidence' },
    { value: 'mind_body_balance', label: 'Mind-body wellness plan' },
  ],
  package: [
    { value: 'complete_wellness_package', label: 'Complete wellness package' },
    { value: 'counselling_package', label: 'Counselling package' },
    { value: 'fitness_package', label: 'Fitness package' },
    { value: 'lifestyle_package', label: 'Lifestyle package' },
  ],
};

function getConcernOptions(serviceType: ServiceType) {
  return concernOptions[serviceType];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SERVICE':
      return {
        ...state,
        serviceType: action.payload,
        concern: getConcernOptions(action.payload)[0].value,
        selectedPractitionerId: null,
        selectedSlotId: null,
        selectedPsychologistId: null,
        selectedPsychologistSlotId: null,
        selectedTrainerId: null,
        selectedTrainerSlotId: null,
      };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_FLOW':
      return { ...state, flowId: action.payload };
    case 'SET_FIELD':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  step: 1,
  flowId: null,
  serviceType: 'combined',
  concern: getConcernOptions('combined')[0].value,
  duration: '2_6_months',
  symptoms: ['worry', 'sleep_difficulty'],
  outcome: '',
  selectedPractitionerId: null,
  selectedSlotId: null,
  selectedPsychologistId: null,
  selectedPsychologistSlotId: null,
  selectedTrainerId: null,
  selectedTrainerSlotId: null,
  status: 'draft',
};

const avatarRoot = '/images/ui_faces/';

const expectedPractitionerProfiles: PractitionerDisplayProfile[] = [
  {
    key: 'aisha',
    name: 'Dr. Aisha Sharma',
    type: 'counsellor',
    role: 'Psychologist',
    description: 'Specializes in anxiety, burnout and stress management using evidence-based therapies.',
    specialties: ['anxiety', 'burnout', 'stress', 'mindfulness', 'sleep'],
    experience: '8+ years exp.',
    languages: ['English', 'Hindi'],
    modes: ['Online', 'In-person'],
    price: '\u20b91,500',
    reviews: 128,
    rating: 4.9,
    match: 96,
    availability: 'Today 6:00 PM',
    avatar: `${avatarRoot}uifaces-human-avatar (1).jpg`,
  },
  {
    key: 'rahul',
    name: 'Rahul Verma',
    type: 'coach',
    role: 'Wellness Coach',
    description: 'Helps you build sustainable habits and improve mental resilience.',
    specialties: ['stress', 'habits', 'mindfulness', 'self-esteem'],
    experience: '6+ years exp.',
    languages: ['English', 'Hindi'],
    modes: ['Online'],
    price: '\u20b91,200',
    reviews: 96,
    rating: 4.8,
    match: 94,
    availability: 'Tomorrow 10:30 AM',
    avatar: `${avatarRoot}uifaces-popular-avatar.jpg`,
  },
  {
    key: 'neha',
    name: 'Neha Kapoor',
    type: 'coach',
    role: 'Nutritionist',
    description: 'Personalized nutrition plans for weight management and better energy.',
    specialties: ['nutrition', 'weight loss', 'gut health', 'energy'],
    experience: '7+ years exp.',
    languages: ['English', 'Hindi', 'Punjabi'],
    modes: ['Online', 'In-person'],
    price: '\u20b91,300',
    reviews: 74,
    rating: 4.7,
    match: 92,
    availability: 'Tomorrow 9:00 AM',
    avatar: `${avatarRoot}uifaces-human-avatar.jpg`,
  },
  {
    key: 'karan',
    name: 'Dr. Karan Mehta',
    type: 'counsellor',
    role: 'Psychologist',
    description: 'Works with stress, relationships and emotional well-being.',
    specialties: ['relationships', 'stress', 'anxiety', 'depression'],
    experience: '10+ years exp.',
    languages: ['English', 'Hindi'],
    modes: ['Online', 'In-person'],
    price: '\u20b91,800',
    reviews: 142,
    rating: 4.9,
    match: 90,
    availability: 'Wed, 11:00 AM',
    avatar: `${avatarRoot}uifaces-popular-avatar (1).jpg`,
  },
];

function getDisplayProfileByKey(key: string | null) {
  return expectedPractitionerProfiles.find((profile) => profile.key === key);
}

function getDisplayProfileForPractitioner(practitioner: PractitionerItem | undefined, selectedKey: string | null) {
  const keyedProfile = getDisplayProfileByKey(selectedKey);
  if (keyedProfile) return keyedProfile;

  if (practitioner) {
    return expectedPractitionerProfiles.find((profile) => sourceMatchesProfile(practitioner, profile)) ?? {
      key: `source-${practitioner.id}`,
      name: practitioner.name ?? 'Wellness Practitioner',
      type: practitioner.type,
      role: practitionerLabel(practitioner.type),
      description: practitionerProfileMeta(practitioner).description,
      specialties: practitioner.specialties ?? [],
      experience: practitionerProfileMeta(practitioner).experience,
      languages: practitionerProfileMeta(practitioner).languages,
      modes: practitionerProfileMeta(practitioner).modes,
      price: practitionerProfileMeta(practitioner).price,
      reviews: practitionerProfileMeta(practitioner).reviews,
      rating: numericRating(practitioner.rating),
      match: 96,
      availability: 'Today 6:00 PM',
      avatar: `${avatarRoot}uifaces-human-avatar (1).jpg`,
    };
  }

  return expectedPractitionerProfiles[0];
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

function slotTimestamp(slot: SlotItem) {
  return new Date(slot.starts_at).getTime();
}

function availableUpcomingSlots(slotsForPractitioner: SlotItem[]) {
  const now = Date.now();

  return slotsForPractitioner
    .filter((slot) => slot.slot_status === 'open' && Number.isFinite(slotTimestamp(slot)) && slotTimestamp(slot) > now)
    .sort((a, b) => slotTimestamp(a) - slotTimestamp(b));
}

function formatSlotTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatSlotDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatDateParam(value: Date) {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function slotDateKey(slot: SlotItem) {
  return formatDateParam(new Date(slot.starts_at));
}

function buildSlotDateOptions(slotsForPractitioner: SlotItem[]) {
  const grouped = new Map<string, SlotItem[]>();

  slotsForPractitioner.forEach((slot) => {
    const key = slotDateKey(slot);
    grouped.set(key, [...(grouped.get(key) ?? []), slot]);
  });

  return Array.from(grouped.entries()).map(([key, dateSlots]) => {
    const sortedSlots = availableUpcomingSlots(dateSlots);
    const firstSlot = sortedSlots[0];
    const date = new Date(firstSlot.starts_at);
    const today = formatDateParam(new Date());

    return {
      key,
      eyebrow: key === today ? 'Today' : '',
      weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
      date: new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date),
      month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
      year: new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date),
      slots: sortedSlots.length,
      firstSlot,
    };
  });
}

function buildSlotTimeGroups(slotsForDate: SlotItem[]) {
  const groups = [
    { label: 'Morning', Icon: Sun, slots: slotsForDate.filter((slot) => new Date(slot.starts_at).getHours() < 12) },
    { label: 'Afternoon', Icon: CalendarDays, slots: slotsForDate.filter((slot) => {
      const hour = new Date(slot.starts_at).getHours();
      return hour >= 12 && hour < 17;
    }) },
    { label: 'Evening', Icon: Moon, slots: slotsForDate.filter((slot) => new Date(slot.starts_at).getHours() >= 17) },
  ];

  return groups.filter((group) => group.slots.length > 0);
}

function upcomingSlotWindow() {
  const from = new Date();
  const to = new Date();
  to.setDate(from.getDate() + 30);

  return {
    from: formatDateParam(from),
    to: formatDateParam(to),
  };
}

function practitionerLabel(type: PractitionerItem['type'] | string | undefined) {
  if (type === 'trainer') return 'Fitness trainer';
  if (type === 'counsellor') return 'Psychologist';
  return 'Coach';
}

function practitionerProfileMeta(practitioner: PractitionerItem | undefined) {
  if (!practitioner) {
    return {
      description: 'Supports your wellness goals with personalized care.',
      experience: '6+ years exp.',
      languages: ['English'],
      modes: ['Online'],
      price: '₹1,200',
      reviews: 80,
    };
  }

  if (practitioner.type === 'trainer') {
    return {
      description: 'Builds sustainable routines with strength, mobility, and habit coaching.',
      experience: '6+ years exp.',
      languages: ['English', 'Hindi'],
      modes: ['Online', 'In-person'],
      price: '₹1,200',
      reviews: 96,
    };
  }

  if (practitioner.type === 'coach') {
    return {
      description: 'Helps you build sustainable habits and improve everyday resilience.',
      experience: '6+ years exp.',
      languages: ['English', 'Hindi'],
      modes: ['Online'],
      price: '₹1,200',
      reviews: 96,
    };
  }

  return {
    description: 'Specializes in anxiety, burnout and stress management using evidence-based therapies.',
    experience: '8+ years exp.',
    languages: ['English', 'Hindi'],
    modes: ['Online', 'In-person'],
    price: '₹1,500',
    reviews: 128,
  };
}

function practitionerAvatarGradient(type: PractitionerItem['type'] | string | undefined, index: number) {
  const gradients = {
    counsellor: ['from-rose-100 via-slate-50 to-indigo-100', 'from-violet-100 via-white to-emerald-100'],
    trainer: ['from-amber-100 via-white to-sky-100', 'from-emerald-100 via-white to-indigo-100'],
    coach: ['from-sky-100 via-white to-purple-100', 'from-lime-100 via-white to-teal-100'],
  };
  const palette = type && type in gradients ? gradients[type as keyof typeof gradients] : gradients.coach;

  return palette[index % palette.length];
}

function formatNextAvailability(slot: SlotItem | undefined) {
  if (!slot) return 'No slots available';

  const date = new Date(slot.starts_at);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const dayLabel = sameDay(date, today) ? 'Today' : sameDay(date, tomorrow) ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'short' });

  return `${dayLabel} ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function compactSpecialtyLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function practitionerInitials(name: string | null | undefined) {
  const initials = String(name ?? 'WC Practitioner')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return initials || 'WC';
}

function numericRating(value: PractitionerItem['rating']) {
  const rating = Number(value);

  return Number.isFinite(rating) ? rating : 4.8;
}

function normalizePractitionerName(value: string | null | undefined) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function profileMatchesPickerMode(profile: PractitionerDisplayProfile, pickerMode: PickerMode | null) {
  if (pickerMode === 'psychologist') return profile.type === 'counsellor' || profile.type === 'coach';
  if (pickerMode === 'trainer') return profile.type === 'trainer' || profile.type === 'coach';
  return true;
}

function sourceMatchesProfile(source: PractitionerItem, profile: PractitionerDisplayProfile) {
  const sourceName = normalizePractitionerName(source.name);
  const profileName = normalizePractitionerName(profile.name);
  const profileNameParts = profile.name.split(' ');
  const profileLastName = normalizePractitionerName(profileNameParts[profileNameParts.length - 1]);

  return (
    source.type === profile.type &&
    Boolean(sourceName) &&
    (sourceName === profileName || sourceName.includes(profileLastName))
  );
}

function buildPickerPractitionerCards(sourcePractitioners: PractitionerItem[], pickerMode: PickerMode | null): PickerPractitionerCard[] {
  const visibleProfiles = expectedPractitionerProfiles.filter((profile) => profileMatchesPickerMode(profile, pickerMode));
  const usedSourceIds = new Set<number>();

  return visibleProfiles.map((profile, index) => {
    const exactSource = sourcePractitioners.find((source) => !usedSourceIds.has(source.id) && sourceMatchesProfile(source, profile));
    const sameTypeSource = sourcePractitioners.find((source) => !usedSourceIds.has(source.id) && source.type === profile.type);
    const availableSource = sourcePractitioners.find((source) => !usedSourceIds.has(source.id));
    const reusableSource = sourcePractitioners.find((source) => source.type === profile.type) ?? sourcePractitioners[0];
    const source = exactSource ?? sameTypeSource ?? availableSource ?? reusableSource;

    if (source) usedSourceIds.add(source.id);

    const practitioner: PractitionerItem = {
      id: source?.id ?? -(9100 + index),
      name: profile.name,
      type: profile.type,
      rating: profile.rating,
      specialties: profile.specialties,
    };

    return {
      displayKey: profile.key,
      sourceId: source?.id ?? practitioner.id,
      practitioner,
      profile,
    };
  });
}

export default function ClientIntakeFlowPage() {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [practitioners, setPractitioners] = useState<PractitionerItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [psychologistSlots, setPsychologistSlots] = useState<SlotItem[]>([]);
  const [trainerSlots, setTrainerSlots] = useState<SlotItem[]>([]);
  const [pickerSlots, setPickerSlots] = useState<Record<number, SlotItem[]>>({});
  const [practitionerSearch, setPractitionerSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [savedPractitionerIds, setSavedPractitionerIds] = useState<string[]>([]);
  const [selectedPickerProfileKey, setSelectedPickerProfileKey] = useState<string | null>(null);
  const [selectedBookingDateKey, setSelectedBookingDateKey] = useState('');
  const [confirmation, setConfirmation] = useState<{ state: string; message?: string } | null>(null);
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [useCredits, setUseCredits] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);

  const selectedPractitioner = useMemo(() => practitioners.find((p) => p.id === state.selectedPractitionerId), [practitioners, state.selectedPractitionerId]);
  const selectedPsychologist = useMemo(() => practitioners.find((p) => p.id === state.selectedPsychologistId), [practitioners, state.selectedPsychologistId]);
  const selectedTrainer = useMemo(() => practitioners.find((p) => p.id === state.selectedTrainerId), [practitioners, state.selectedTrainerId]);
  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === state.selectedSlotId), [slots, state.selectedSlotId]);
  const selectedPsychologistSlot = useMemo(() => psychologistSlots.find((slot) => slot.id === state.selectedPsychologistSlotId), [psychologistSlots, state.selectedPsychologistSlotId]);
  const selectedTrainerSlot = useMemo(() => trainerSlots.find((slot) => slot.id === state.selectedTrainerSlotId), [trainerSlots, state.selectedTrainerSlotId]);
  const concernChoices = getConcernOptions(state.serviceType);
  const isCombined = state.serviceType === 'combined';
  const totalSteps = isCombined ? 5 : 3;
  const currentStep = Math.min(state.step, totalSteps);
  const activeMemberships = memberships.filter((membership) => membership.status === 'active');

  useEffect(() => {
    getClientMemberships()
      .then((data) => {
        const active = data.filter((membership) => membership.status === 'active');
        setMemberships(data);
        setSelectedMembershipId(active[0]?.id ?? null);
      })
      .catch(() => setMemberships([]));
  }, []);

  const singlePractitioners = useMemo(() => {
    if (state.serviceType === 'training') return practitioners.filter((p) => ['trainer', 'coach'].includes(p.type));
    if (state.serviceType === 'psychology') return practitioners.filter((p) => ['counsellor', 'coach'].includes(p.type));
    return practitioners;
  }, [practitioners, state.serviceType]);

  const pickerPractitioners = useMemo(() => buildPickerPractitionerCards(singlePractitioners, pickerMode), [pickerMode, singlePractitioners]);

  const filteredPickerPractitioners = useMemo(() => {
    if (!pickerMode) return [];

    const query = practitionerSearch.trim().toLowerCase();

    return pickerPractitioners.filter((item) => {
      const { practitioner, profile } = item;
      const searchable = [
        profile.name,
        profile.role,
        profile.description,
        profile.languages.join(' '),
        profile.modes.join(' '),
        ...profile.specialties,
      ].join(' ').toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (specialtyFilter && !profile.specialties.includes(specialtyFilter)) return false;
      if (modeFilter && !profile.modes.includes(modeFilter)) return false;
      if (languageFilter && !profile.languages.includes(languageFilter)) return false;
      if (availabilityFilter === 'available' && !profile.availability) return false;

      return true;
    });
  }, [availabilityFilter, languageFilter, modeFilter, pickerMode, pickerPractitioners, practitionerSearch, specialtyFilter]);

  const availableSpecialties = useMemo(() => {
    if (!pickerMode) return [];

    return Array.from(new Set(pickerPractitioners.flatMap((item) => item.profile.specialties))).sort();
  }, [pickerMode, pickerPractitioners]);

  const availableLanguages = useMemo(() => {
    if (!pickerMode) return [];

    return Array.from(new Set(pickerPractitioners.flatMap((item) => item.profile.languages))).sort();
  }, [pickerMode, pickerPractitioners]);

  useEffect(() => {
    if (state.step < 3 || !state.flowId) return;
    getRecommendedPractitioners(state.flowId).then(setPractitioners).catch(() => {
      toast.error('Unable to load practitioners.');
    });
  }, [state.step, state.flowId]);

  useEffect(() => {
    if (!state.selectedPractitionerId) return;
    const window = upcomingSlotWindow();
    getPractitionerSlots(state.selectedPractitionerId, window.from, window.to).then((items) => {
      const available = availableUpcomingSlots(items);
      setSlots(available);
      if (!state.selectedSlotId && available[0]) {
        dispatch({ type: 'SET_FIELD', payload: { selectedSlotId: available[0].id } });
      }
      if (state.selectedSlotId && !available.some((slot) => slot.id === state.selectedSlotId)) {
        dispatch({ type: 'SET_FIELD', payload: { selectedSlotId: null } });
      }
    }).catch(() => {
      setSlots([]);
      dispatch({ type: 'SET_FIELD', payload: { selectedSlotId: null } });
    });
  }, [state.selectedPractitionerId, state.selectedSlotId]);

  useEffect(() => {
    if (!state.selectedPsychologistId) return;
    const window = upcomingSlotWindow();
    getPractitionerSlots(state.selectedPsychologistId, window.from, window.to).then((items) => {
      const available = availableUpcomingSlots(items);
      setPsychologistSlots(available);
      if (!state.selectedPsychologistSlotId && available[0]) {
        dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistSlotId: available[0].id } });
      }
      if (state.selectedPsychologistSlotId && !available.some((slot) => slot.id === state.selectedPsychologistSlotId)) {
        dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistSlotId: null } });
      }
    }).catch(() => {
      setPsychologistSlots([]);
      dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistSlotId: null } });
    });
  }, [state.selectedPsychologistId, state.selectedPsychologistSlotId]);

  useEffect(() => {
    if (!state.selectedTrainerId) return;
    const window = upcomingSlotWindow();
    getPractitionerSlots(state.selectedTrainerId, window.from, window.to).then((items) => {
      const available = availableUpcomingSlots(items);
      setTrainerSlots(available);
      if (!state.selectedTrainerSlotId && available[0]) {
        dispatch({ type: 'SET_FIELD', payload: { selectedTrainerSlotId: available[0].id } });
      }
      if (state.selectedTrainerSlotId && !available.some((slot) => slot.id === state.selectedTrainerSlotId)) {
        dispatch({ type: 'SET_FIELD', payload: { selectedTrainerSlotId: null } });
      }
    }).catch(() => {
      setTrainerSlots([]);
      dispatch({ type: 'SET_FIELD', payload: { selectedTrainerSlotId: null } });
    });
  }, [state.selectedTrainerId, state.selectedTrainerSlotId]);

  useEffect(() => {
    if (!pickerMode || !pickerPractitioners.length) return;

    let cancelled = false;
    const window = upcomingSlotWindow();
    const sourceIds = Array.from(new Set(pickerPractitioners.map((item) => item.sourceId).filter((id) => id > 0)));

    Promise.all(
      sourceIds.map((sourceId) => (
        getPractitionerSlots(sourceId, window.from, window.to)
          .then((items) => [sourceId, availableUpcomingSlots(items)] as const)
          .catch(() => [sourceId, []] as const)
      ))
    ).then((entries) => {
      if (!cancelled) {
        setPickerSlots(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pickerMode, pickerPractitioners]);

  async function onContinueFromService() {
    setLoading(true);
    try {
      const created = await createIntakeFlow(state.serviceType);
      dispatch({ type: 'SET_FLOW', payload: created.intake_flow_id });
      dispatch({ type: 'SET_STEP', payload: 2 });
    } catch (error) {
      notifyError(error, 'Unable to start intake.');
    } finally {
      setLoading(false);
    }
  }

  async function onContinueFromIntake() {
    if (!state.flowId) return;
    setLoading(true);
    try {
      await saveIntakeAnswers(state.flowId, [
        { section_key: state.serviceType, question_key: `${state.serviceType}.concern`, answer_type: 'single', answer_json: state.concern },
        { section_key: state.serviceType, question_key: `${state.serviceType}.duration`, answer_type: 'single', answer_json: state.duration },
        { section_key: state.serviceType, question_key: `${state.serviceType}.symptoms`, answer_type: 'multi', answer_json: state.symptoms },
        { section_key: state.serviceType, question_key: `${state.serviceType}.outcome`, answer_type: 'text', answer_json: state.outcome },
      ]);

      const decision = await submitIntakeFlow(state.flowId);

      if (decision.status === 'under_review') {
        dispatch({ type: 'SET_FIELD', payload: { status: 'under_review' } });
        const data = await getIntakeConfirmation(state.flowId);
        setConfirmation(data);
        dispatch({ type: 'SET_STEP', payload: 6 });
      } else {
        dispatch({ type: 'SET_FIELD', payload: { status: 'auto_bookable' } });
        dispatch({ type: 'SET_STEP', payload: 3 });
      }
    } catch (error) {
      notifyError(error, 'Unable to submit intake.');
    } finally {
      setLoading(false);
    }
  }

  async function onReserveSingleSlot() {
    if (!state.flowId || !state.selectedPractitionerId || !state.selectedSlotId) return;
    setLoading(true);

    try {
      await bookAppointmentRequest({
        intake_flow_id: state.flowId,
        practitioner_id: state.selectedPractitionerId,
        slot_id: state.selectedSlotId,
        service_type: state.serviceType,
        mode: 'online',
        use_membership_credits: useCredits,
        membership_subscription_id: useCredits ? selectedMembershipId ?? undefined : undefined,
      });
      dispatch({ type: 'SET_FIELD', payload: { status: 'booked' } });
      dispatch({ type: 'SET_STEP', payload: 6 });
    } catch (error) {
      notifyError(error, 'Unable to reserve slot.');
    } finally {
      setLoading(false);
    }
  }

  async function onReserveCombinedSlots() {
    if (!state.flowId || !state.selectedPsychologistId || !state.selectedPsychologistSlotId || !state.selectedTrainerId || !state.selectedTrainerSlotId) return;
    setLoading(true);

    try {
      await bookAppointmentRequest({
        intake_flow_id: state.flowId,
        practitioner_id: state.selectedPsychologistId,
        slot_id: state.selectedPsychologistSlotId,
        service_type: 'psychology',
        mode: 'online',
      });
      await bookAppointmentRequest({
        intake_flow_id: state.flowId,
        practitioner_id: state.selectedTrainerId,
        slot_id: state.selectedTrainerSlotId,
        service_type: 'training',
        mode: 'online',
      });
      dispatch({ type: 'SET_FIELD', payload: { status: 'booked' } });
      dispatch({ type: 'SET_STEP', payload: 6 });
    } catch (error) {
      notifyError(error, 'Unable to reserve both slots.');
    } finally {
      setLoading(false);
    }
  }

  function selectPractitioner(item: PickerPractitionerCard | PractitionerItem) {
    const practitionerId = 'sourceId' in item ? item.sourceId : item.id;

    if (pickerMode === 'psychologist') {
      dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistId: practitionerId, selectedPsychologistSlotId: null } });
      setPsychologistSlots([]);
    } else if (pickerMode === 'trainer') {
      dispatch({ type: 'SET_FIELD', payload: { selectedTrainerId: practitionerId, selectedTrainerSlotId: null } });
      setTrainerSlots([]);
    } else {
      dispatch({ type: 'SET_FIELD', payload: { selectedPractitionerId: practitionerId, selectedSlotId: null } });
      setSlots([]);
    }

    setSelectedPickerProfileKey('displayKey' in item ? item.displayKey : String(item.id));
    setPickerMode(null);
  }

  function clearPractitionerFilters() {
    setPractitionerSearch('');
    setSpecialtyFilter('');
    setModeFilter('');
    setLanguageFilter('');
    setAvailabilityFilter('');
  }

  function toggleSavedPractitioner(practitionerId: string | number) {
    const savedId = String(practitionerId);

    setSavedPractitionerIds((current) => (
      current.includes(savedId)
        ? current.filter((id) => id !== savedId)
        : [...current, savedId]
    ));
  }

  function renderFilterSelect(label: string, value: string, onChange: (value: string) => void, options: string[]) {
    return (
      <label className="relative min-w-[118px]">
        <span className="sr-only">{label}</span>
        <select
          className="h-11 w-full appearance-none rounded-lg border border-[#cfd6e8] bg-white px-4 pr-9 text-[0.8rem] font-bold text-slate-950 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{label}</option>
          {options.map((option) => <option key={option} value={option}>{compactSpecialtyLabel(option)}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" aria-hidden="true" />
      </label>
    );
  }

  function renderPractitionerPickerCard(practitioner: PractitionerItem, index: number) {
    const meta = practitionerProfileMeta(practitioner);
    const nextSlot = pickerSlots[practitioner.id]?.[0];
    const selected = practitioner.id === state.selectedPractitionerId || practitioner.id === state.selectedPsychologistId || practitioner.id === state.selectedTrainerId;
    const saved = savedPractitionerIds.includes(String(practitioner.id));
    const rating = numericRating(practitioner.rating);
    const match = Math.max(86, Math.round(rating * 20) - (index * 2));
    const name = practitioner.name ?? 'Wellness Practitioner';
    const specialties = practitioner.specialties ?? [];

    return (
      <article
        key={practitioner.id}
        className={`relative grid gap-5 rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg lg:grid-cols-[1fr_250px_210px] ${
          selected ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-200'
        }`}
      >
        {index === 0 ? (
          <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
            Recommended for you
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[132px_1fr]">
          <div className={`flex aspect-square h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${practitionerAvatarGradient(practitioner.type, index)} shadow-inner`}>
            <span className="grid h-24 w-24 place-items-center rounded-full bg-white/70 text-3xl font-bold text-indigo-700 shadow-sm">
              {practitionerInitials(name)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-slate-950">{name}</h3>
              <BadgeCheck className="h-5 w-5 fill-indigo-600 text-white" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600">{practitionerLabel(practitioner.type)}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">{meta.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.slice(0, 5).map((specialty) => (
                <span key={specialty} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
                  {compactSpecialtyLabel(specialty)}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />{meta.experience}</span>
              <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4" aria-hidden="true" />{meta.languages.join(', ')}</span>
              <span className="inline-flex items-center gap-2"><Monitor className="h-4 w-4" aria-hidden="true" />{meta.modes.join(' • ')}</span>
            </div>
          </div>
        </div>

        <div className="grid content-center gap-4 border-slate-200 lg:border-l lg:pl-6">
          <div className="w-fit justify-self-start rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 lg:justify-self-end">{match}% match</div>
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CalendarDays className="h-4 w-4" aria-hidden="true" />Next available</p>
            <p className="mt-1 text-sm font-bold text-emerald-800">{formatNextAvailability(nextSlot)}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />{rating.toFixed(1)} ({meta.reviews} reviews)</p>
          <p className="text-lg font-extrabold text-slate-950">{meta.price}<span className="text-sm font-semibold text-slate-600"> / session</span></p>
        </div>

        <div className="grid content-center gap-3 border-slate-200 lg:border-l lg:pl-6">
          <button
            type="button"
            onClick={() => selectPractitioner(practitioner)}
            className="h-12 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            {selected ? 'Selected' : 'Select Practitioner'}
          </button>
          <button
            type="button"
            className="h-12 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={() => toggleSavedPractitioner(practitioner.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            <Heart className={`h-4 w-4 ${saved ? 'fill-indigo-600' : ''}`} aria-hidden="true" />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </article>
    );
  }

  function renderExpectedPractitionerPickerCard(item: PickerPractitionerCard, index: number) {
    const { profile } = item;
    const selectedById = item.sourceId === state.selectedPractitionerId || item.sourceId === state.selectedPsychologistId || item.sourceId === state.selectedTrainerId;
    const selected = selectedPickerProfileKey === item.displayKey || (!selectedPickerProfileKey && selectedById);
    const saved = savedPractitionerIds.includes(item.displayKey);

    return (
      <article
        key={item.displayKey}
        className={`relative grid content-start gap-4 rounded-lg border bg-white px-5 py-4 shadow-[0_8px_24px_rgba(51,65,85,0.05)] transition hover:border-indigo-200 hover:shadow-[0_14px_34px_rgba(79,70,229,0.10)] lg:grid-cols-[minmax(460px,1fr)_220px_184px] lg:items-center ${
          selected ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-[#e1e5f2]'
        }`}
      >
        {index === 0 ? (
          <div className="absolute -top-3 left-9 inline-flex items-center gap-1 rounded-md bg-[#5b39f6] px-2.5 py-1 text-[0.72rem] font-bold text-white shadow-md shadow-indigo-200">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
            Recommended for you
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 sm:grid-cols-[116px_1fr] sm:items-center">
          <UserAvatar user={{ name: profile.name }} src={profile.avatar} size="xl" className="h-[116px] w-[116px] shadow-inner ring-1 ring-indigo-50" decorative />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 leading-tight">
              <h3 className="text-[1.18rem] font-extrabold text-[#101735]">{profile.name}</h3>
              <BadgeCheck className="h-4 w-4 fill-[#6849f5] text-white" aria-hidden="true" />
            </div>
            <p className="mt-1 text-[0.82rem] font-medium text-[#344160]">{profile.role}</p>
            <p className="mt-1 max-w-[600px] text-[0.82rem] leading-5 text-[#1f2a44]">{profile.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.specialties.slice(0, 5).map((specialty) => (
                <span key={specialty} className="rounded-full bg-[#f0edff] px-3 py-1 text-[0.72rem] font-bold capitalize text-[#553ec5]">
                  {compactSpecialtyLabel(specialty)}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[0.78rem] font-medium text-[#435175]">
              <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />{profile.experience}</span>
              <span className="inline-flex items-center gap-2"><Globe2 className="h-3.5 w-3.5" aria-hidden="true" />{profile.languages.join(', ')}</span>
              <span className="inline-flex items-center gap-2"><Monitor className="h-3.5 w-3.5" aria-hidden="true" />{profile.modes.join(' \u2022 ')}</span>
            </div>
          </div>
        </div>

        <div className="grid content-center gap-3 border-[#e4e8f2] lg:border-l lg:px-5">
          {index === 0 ? (
            <div className="w-fit justify-self-start rounded-full bg-[#dcf7ec] px-3 py-1 text-[0.72rem] font-extrabold text-[#00866d] lg:justify-self-end">{profile.match}% match</div>
          ) : null}
          <div className="rounded-lg border border-[#d6f0e5] bg-[linear-gradient(90deg,#eefcf6_0%,#fbfffd_100%)] px-3 py-2.5">
            <p className="flex items-center gap-2 text-[0.72rem] font-semibold text-[#18875e]"><CalendarDays className="h-4 w-4" aria-hidden="true" />Next available</p>
            <p className="mt-0.5 text-[0.82rem] font-extrabold text-[#007a51]">{profile.availability}</p>
          </div>
          <p className="flex items-center gap-2 text-[0.78rem] text-[#263352]"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />{profile.rating.toFixed(1)} ({profile.reviews} reviews)</p>
          <p className="text-[0.98rem] font-extrabold text-[#101735]">{profile.price}<span className="text-[0.8rem] font-semibold text-[#263352]"> / session</span></p>
        </div>

        <div className="grid content-center gap-2.5 border-[#e4e8f2] lg:border-l lg:pl-5">
          <button
            type="button"
            onClick={() => selectPractitioner(item)}
            className="h-9 rounded-lg bg-[linear-gradient(90deg,#5a38f5_0%,#7048ea_100%)] px-4 text-[0.78rem] font-extrabold text-white shadow-md shadow-indigo-200 transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            {selected ? 'Selected' : 'Select Practitioner'}
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-[#876df4] bg-white px-4 text-[0.78rem] font-extrabold text-[#5d3eda] transition hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={() => toggleSavedPractitioner(item.displayKey)}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-[0.78rem] font-bold text-[#5d3eda] transition hover:bg-indigo-50"
          >
            <Heart className={`h-4 w-4 ${saved ? 'fill-indigo-600' : ''}`} aria-hidden="true" />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </article>
    );
  }

  function renderPractitionerButton(mode: PickerMode, practitioner: PractitionerItem | undefined, title: string, hint: string) {
    return (
      <button
        type="button"
        onClick={() => setPickerMode(mode)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-800">{practitioner ? practitioner.name : title}</span>
          <span className="block text-xs capitalize text-slate-500">{practitioner ? practitionerLabel(practitioner.type) : hint}</span>
        </span>
        <UserRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </button>
    );
  }

  function renderSlotSelect(slotsForPractitioner: SlotItem[], selectedId: number | null, onSelect: (slotId: number | null) => void, practitionerSelected: boolean) {
    const hasSlots = slotsForPractitioner.length > 0;

    return (
      <div className="grid gap-2">
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
          value={selectedId ?? ''}
          onChange={(event) => onSelect(Number(event.target.value) || null)}
          disabled={!practitionerSelected || !hasSlots}
        >
          <option value="">{!practitionerSelected ? 'Select practitioner first' : hasSlots ? 'Select time slot' : 'No upcoming slots available'}</option>
          {slotsForPractitioner.map((slot) => <option key={slot.id} value={slot.id}>{formatDateTime(slot.starts_at)}</option>)}
        </select>
        {practitionerSelected && !hasSlots ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            No upcoming slots available for this practitioner.
          </p>
        ) : null}
      </div>
    );
  }

  function renderAppointmentSummary(title: string, practitioner: PractitionerItem | undefined, slot: SlotItem | undefined) {
    return (
      <DSCard className="space-y-1 bg-slate-50 shadow-none dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-sm font-semibold text-slate-900">{practitioner?.name ?? '-'}</p>
        <p className="text-sm capitalize text-slate-600">{practitioner ? practitionerLabel(practitioner.type) : '-'}</p>
        <p className="text-sm text-slate-700">{formatDateTime(slot?.starts_at)}</p>
        <p className="text-sm text-slate-600">Mode: Online</p>
      </DSCard>
    );
  }

  function renderDateTimeSelectionScreen({
    practitioner,
    slotsForPractitioner,
    selectedSlotId,
    onSelectSlot,
    onBack,
    onPrimary,
    primaryLabel,
    primaryDisabled,
  }: {
    practitioner: PractitionerItem | undefined;
    slotsForPractitioner: SlotItem[];
    selectedSlotId: number | null;
    onSelectSlot: (slotId: number | null) => void;
    onBack: () => void;
    onPrimary: () => void;
    primaryLabel: string;
    primaryDisabled: boolean;
  }) {
    const profile = getDisplayProfileForPractitioner(practitioner, selectedPickerProfileKey);
    const availableSlotsForPractitioner = availableUpcomingSlots(slotsForPractitioner);
    const selectedSlot = availableSlotsForPractitioner.find((slot) => slot.id === selectedSlotId) ?? availableSlotsForPractitioner[0];
    const dateOptions = buildSlotDateOptions(availableSlotsForPractitioner);
    const selectedDateKey = selectedSlot ? slotDateKey(selectedSlot) : selectedBookingDateKey;
    const selectedDateSlots = availableSlotsForPractitioner.filter((slot) => slotDateKey(slot) === selectedDateKey);
    const timeGroups = buildSlotTimeGroups(selectedDateSlots);
    const totalTimeSlots = availableSlotsForPractitioner.length;
    const selectedMonthLabel = selectedSlot
      ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(selectedSlot.starts_at))
      : dateOptions[0]
        ? `${dateOptions[0].month} ${dateOptions[0].year}`
        : 'Available slots';
    const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'your local time';

    return (
      <div className="min-h-[calc(100vh-150px)] rounded-lg bg-[linear-gradient(135deg,#ffffff_0%,#fbfaff_48%,#f8f7ff_100%)] px-3 py-4 text-[#101735] sm:px-5 lg:px-7">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#e3e7f2] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#435175] transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#5d6885]">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eeeaff] text-[#6746e8]"><Check className="h-4 w-4" /></span>
              Choose Practitioner
            </span>
            <span className="hidden h-px w-14 bg-[#d8dded] sm:block" />
            <span className="inline-flex items-center gap-2 text-[#101735]">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#6746e8] text-white">2</span>
              Choose Date & Time
            </span>
            <span className="hidden h-px w-14 bg-[#d8dded] sm:block" />
            <span className="inline-flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]">3</span>
              Confirm & Pay
            </span>
          </div>
          <button type="button" onClick={() => navigate('/client')} className="w-fit rounded-lg px-3 py-2 text-sm font-semibold text-[#435175] transition hover:bg-white">
            Close
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="grid gap-6">
            <header className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]">
                <CalendarCheck2 className="h-8 w-8" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-[1.9rem] font-extrabold leading-tight text-[#080d2d] sm:text-[2.2rem]">Choose date & time</h1>
                <p className="mt-1 text-sm font-medium text-[#52617d]">Select an available day and slot for your first session.</p>
              </div>
            </header>

            <section className="grid gap-5 rounded-lg border border-[#dfe4ef] bg-white p-5 shadow-[0_10px_28px_rgba(51,65,85,0.05)] lg:grid-cols-[360px_1fr_280px] lg:items-center">
              <div className="flex items-center gap-5">
                <div className="relative h-28 w-28 rounded-full bg-[#f0edff] ring-8 ring-[#f7f5ff]">
                  <UserAvatar user={{ name: profile.name }} src={profile.avatar} size="xl" className="h-full w-full" decorative />
                  <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-[#22c982] text-white ring-4 ring-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[#101735]">{profile.name}</h2>
                    <ShieldCheck className="h-5 w-5 text-[#6746e8]" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#435175]">{profile.role}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#101735]">
                    {profile.rating.toFixed(1)}
                    <span className="inline-flex text-[#ffb020]">
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                    </span>
                    <span className="font-medium text-[#52617d]">({profile.reviews} reviews)</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-5 border-[#e6eaf3] lg:border-l lg:px-7">
                <div>
                  <p className="text-xs font-extrabold text-[#52617d]">Specialties</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.specialties.slice(0, 3).map((specialty) => (
                      <span key={specialty} className="rounded-md bg-[#f0edff] px-3 py-1 text-xs font-bold text-[#6746e8]">{compactSpecialtyLabel(specialty)}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#52617d]">Languages</p>
                  <p className="mt-2 text-sm font-medium text-[#435175]">{profile.languages.join(', ')}</p>
                </div>
              </div>

              <div className="grid gap-5 border-[#e6eaf3] lg:border-l lg:pl-7">
                <div>
                  <p className="text-xs font-extrabold text-[#52617d]">Session Modes</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#435175]">
                    <span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4" />Video</span>
                    <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />In-Person</span>
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />Phone</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#52617d]">Consultation Fee</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-base font-extrabold text-[#101735]">{profile.price}<span className="text-sm font-semibold text-[#52617d]">/ session</span><Info className="h-4 w-4 text-[#71809c]" /></p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#dfe4ef] bg-white p-5 shadow-[0_10px_28px_rgba(51,65,85,0.05)]">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="inline-flex items-center gap-3 text-lg font-extrabold text-[#101735]">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-[#6746e8] text-sm text-[#6746e8]">1</span>
                  Select a date
                </h2>
                <div className="flex items-center gap-4 text-sm font-semibold text-[#101735]">
                  {selectedMonthLabel} <ChevronDown className="h-4 w-4" />
                </div>
              </div>

              {dateOptions.length ? (
                <div className="flex gap-4 overflow-x-auto pb-5">
                  {dateOptions.map((date) => {
                    const selected = date.key === selectedDateKey;
                    const nextSlot = date.firstSlot;

                    return (
                      <button
                        key={date.key}
                        type="button"
                        onClick={() => {
                          setSelectedBookingDateKey(date.key);
                          onSelectSlot(nextSlot.id);
                        }}
                        className={`grid h-[116px] min-w-[90px] place-items-center rounded-lg border px-4 py-3 text-center transition ${
                          selected
                            ? 'border-[#6746e8] bg-[linear-gradient(180deg,#7447f3_0%,#5f39df_100%)] text-white shadow-[0_14px_28px_rgba(103,70,232,0.28)]'
                            : 'border-[#e0e5ef] bg-white text-[#101735] hover:border-[#b9a8f6]'
                        }`}
                      >
                        <span className={`text-xs font-semibold ${selected ? 'text-white/80' : 'text-[#8a94aa]'}`}>{date.eyebrow || date.weekday}</span>
                        <span className={`text-sm font-bold ${date.eyebrow && !selected ? 'text-[#52617d]' : ''}`}>{date.eyebrow ? date.weekday : date.date}</span>
                        <span className="text-2xl font-extrabold">{date.eyebrow ? date.date : null}</span>
                        <span className={`text-xs font-semibold ${selected ? 'text-white/85' : 'text-[#52617d]'}`}>{date.month}</span>
                        <span className={`mt-1 text-xs font-bold ${selected ? 'text-white' : 'text-[#6746e8]'}`}>{date.slots} slots</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  No future available slots for this practitioner.
                </p>
              )}

              <div className="border-t border-[#edf0f6] pt-5">
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="inline-flex items-center gap-3 text-lg font-extrabold text-[#101735]">
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-[#6746e8] text-sm text-[#6746e8]">2</span>
                    Select a time
                  </h2>
                  <p className="text-xs font-semibold text-[#52617d]">Times are shown in {timezoneLabel}</p>
                </div>

                {timeGroups.length ? (
                  <div className="grid gap-4">
                    {timeGroups.map((group) => {
                      const Icon = group.Icon;
                      return (
                        <div key={group.label} className="grid gap-3 border-b border-[#edf0f6] pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[120px_1fr] sm:items-center">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f7fb] text-[#101735]"><Icon className="h-5 w-5" /></span>
                            <span className="text-sm font-extrabold text-[#101735]">{group.label}</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {group.slots.map((slot) => {
                              const selected = selectedSlot?.id === slot.id;
                              const time = formatSlotTime(slot.starts_at);

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBookingDateKey(slotDateKey(slot));
                                    onSelectSlot(slot.id);
                                  }}
                                  className={`relative h-10 rounded-lg border px-4 text-sm font-bold transition ${
                                    selected
                                      ? 'border-[#6746e8] bg-[linear-gradient(90deg,#7447f3_0%,#5f39df_100%)] text-white shadow-[0_10px_22px_rgba(103,70,232,0.22)]'
                                      : 'border-[#cdbff7] bg-white text-[#6746e8] hover:bg-[#f7f5ff]'
                                  }`}
                                >
                                  {time}
                                  {selected ? <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-white text-[#6746e8]" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#52617d]">
                    Select another date to see available times.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-[#dfe4ef] bg-white p-5 shadow-[0_10px_28px_rgba(51,65,85,0.05)] xl:sticky xl:top-6">
            <h2 className="mb-5 inline-flex items-center gap-2 text-lg font-extrabold text-[#101735]">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]"><IndianRupee className="h-4 w-4" /></span>
              Booking summary
            </h2>
            <div className="overflow-hidden rounded-lg border border-[#e1e6ef]">
              <div className="flex items-center gap-3 border-b border-[#e1e6ef] p-4">
                <UserAvatar user={{ name: profile.name }} src={profile.avatar} size="lg" className="h-14 w-14" decorative />
                <div>
                  <p className="inline-flex items-center gap-1.5 font-extrabold text-[#101735]">{profile.name}<ShieldCheck className="h-4 w-4 text-[#6746e8]" /></p>
                  <p className="mt-0.5 text-sm font-medium text-[#52617d]">{profile.role}</p>
                </div>
              </div>
              <div className="grid gap-4 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#52617d]"><CalendarDays className="h-4 w-4" />Date</span>
                  <span className="font-bold text-[#101735]">{formatSlotDate(selectedSlot?.starts_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#52617d]"><Clock3 className="h-4 w-4" />Time</span>
                  <span className="font-bold text-[#101735]">{formatSlotTime(selectedSlot?.starts_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#52617d]"><CalendarCheck2 className="h-4 w-4" />Session Type</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#101735]"><Video className="h-4 w-4" />Video Consultation</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#52617d]"><IndianRupee className="h-4 w-4" />Fee</span>
                  <span className="font-bold text-[#101735]">{profile.price}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#e1e6ef] pt-4 text-base">
                  <span className="font-extrabold text-[#101735]">Total</span>
                  <span className="font-extrabold text-[#6746e8]">{profile.price}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#e4ddf8] bg-[#f7f4ff] p-4">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#6746e8]" />
              <p className="text-sm font-medium leading-5 text-[#52617d]"><span className="font-extrabold text-[#6746e8]">Your session is secure and private.</span><br />You can reschedule later if needed.</p>
            </div>
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled || !selectedSlotId || !totalTimeSlots}
              className="mt-5 h-12 w-full rounded-lg bg-[linear-gradient(90deg,#7447f3_0%,#5f39df_100%)] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(103,70,232,0.26)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Reserving...' : primaryLabel}
            </button>
            <button type="button" onClick={onBack} className="mt-3 h-12 w-full rounded-lg border border-[#bdaef7] bg-white text-sm font-extrabold text-[#101735] transition hover:bg-[#f7f5ff]">
              Back
            </button>
            <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#9aa4b8]"><LockKeyhole className="h-4 w-4" />No payment needed to reserve</p>
          </aside>
        </div>
      </div>
    );
  }

  if (state.step === 6) {
    const underReview = confirmation?.state === 'under_review';

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white px-4 py-6 dark:bg-slate-950 sm:px-8">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-5">
          <div>
            <p className="text-sm font-semibold text-[var(--ds-brand)]">{underReview ? 'Review started' : 'Slots reserved'}</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{underReview ? 'Application under review' : 'Your appointments are confirmed'}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {underReview ? confirmation?.message ?? 'Our coordinator will review your intake and contact you with next steps.' : 'Here are the details for your first sessions.'}
            </p>
          </div>

          {!underReview && isCombined ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {renderAppointmentSummary('Psychologist appointment', selectedPsychologist, selectedPsychologistSlot)}
              {renderAppointmentSummary('Fitness trainer appointment', selectedTrainer, selectedTrainerSlot)}
            </div>
          ) : null}

          {!underReview && !isCombined ? renderAppointmentSummary('Appointment', selectedPractitioner, selectedSlot) : null}

          <div className="flex justify-end">
            <DSButton onClick={() => navigate('/client')}>Return to dashboard</DSButton>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === 3 && isCombined && state.selectedPsychologistId) {
    return renderDateTimeSelectionScreen({
      practitioner: selectedPsychologist,
      slotsForPractitioner: psychologistSlots,
      selectedSlotId: state.selectedPsychologistSlotId,
      onSelectSlot: (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistSlotId: slotId } }),
      onBack: () => dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistId: null, selectedPsychologistSlotId: null } }),
      onPrimary: () => dispatch({ type: 'SET_STEP', payload: 4 }),
      primaryLabel: 'Continue',
      primaryDisabled: !state.selectedPsychologistSlotId,
    });
  }

  if (state.step === 4 && isCombined && state.selectedTrainerId) {
    return renderDateTimeSelectionScreen({
      practitioner: selectedTrainer,
      slotsForPractitioner: trainerSlots,
      selectedSlotId: state.selectedTrainerSlotId,
      onSelectSlot: (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedTrainerSlotId: slotId } }),
      onBack: () => dispatch({ type: 'SET_FIELD', payload: { selectedTrainerId: null, selectedTrainerSlotId: null } }),
      onPrimary: () => dispatch({ type: 'SET_STEP', payload: 5 }),
      primaryLabel: 'Review',
      primaryDisabled: !state.selectedTrainerSlotId,
    });
  }

  if (state.step === 3 && !isCombined && state.selectedPractitionerId) {
    return renderDateTimeSelectionScreen({
      practitioner: selectedPractitioner,
      slotsForPractitioner: slots,
      selectedSlotId: state.selectedSlotId,
      onSelectSlot: (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedSlotId: slotId } }),
      onBack: () => dispatch({ type: 'SET_FIELD', payload: { selectedPractitionerId: null, selectedSlotId: null } }),
      onPrimary: onReserveSingleSlot,
      primaryLabel: 'Reserve Slot',
      primaryDisabled: loading || !state.selectedSlotId || !state.selectedPractitionerId,
    });
  }

  return (
    <div className="client-intake-flow mx-auto w-full max-w-lg pb-20">
      <div className="mb-7 flex items-center justify-between">
        {state.step > 1 ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_STEP', payload: (state.step - 1) as Step })}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/client')}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
        )}

        <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, index) => {
            const item = index + 1;
            return (
              <span
                key={item}
                className={`h-2 rounded-full transition-all duration-300 ${
                  item === currentStep ? 'w-6 bg-indigo-600' : item < currentStep ? 'w-2 bg-indigo-300' : 'w-2 bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate('/client')}
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          Close
        </button>
      </div>

      <div className="space-y-6">
        {state.step === 1 ? (
          <>
            <MobileSectionTitle title="Select the support you need" subtitle="Choose your main service type to continue." />
            <div className="grid gap-3 sm:grid-cols-2">
              {(['psychology', 'training', 'combined', 'package'] as ServiceType[]).map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_SERVICE', payload: service })}
                  className={`rounded-xl border-2 px-4 py-4 text-left text-sm capitalize transition ${
                    state.serviceType === service
                      ? 'border-[var(--ds-brand)] bg-indigo-50 text-[var(--ds-brand)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold">{service}</span>
                  <span className="mt-1 block text-xs normal-case text-slate-500">
                    {service === 'combined' ? 'Counselling and fitness together' : service === 'package' ? 'A guided wellness package' : service === 'psychology' ? 'Mental wellness support' : 'Fitness and habit support'}
                  </span>
                </button>
              ))}
            </div>
            <DSButton className="w-full gap-2" onClick={onContinueFromService} disabled={loading}>
              {loading ? 'Starting...' : <>Continue <ArrowRight size={16} /></>}
            </DSButton>
          </>
        ) : null}

        {state.step === 2 ? (
          <>
            <MobileSectionTitle title="Intake questions" subtitle="Answer briefly so we can match the right support." />
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">What brings you here today?
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={state.concern} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { concern: e.target.value } })}>
                {concernChoices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">How long?
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={state.duration} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { duration: e.target.value } })}>
                <option value="lt_2_weeks">Less than 2 weeks</option>
                <option value="2_8_weeks">2-8 weeks</option>
                <option value="2_6_months">2-6 months</option>
                <option value="gt_6_months">More than 6 months</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">What would success look like?
              <textarea
                className="min-h-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                value={state.outcome}
                onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { outcome: e.target.value } })}
                placeholder="Example: I want to feel calmer, sleep better, build a consistent fitness routine, and know which first steps to follow each week."
              />
            </label>
            <div className="flex gap-2">
              <DSSecondaryButton className="flex-1" onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}>Back</DSSecondaryButton>
              <DSButton className="flex-1 gap-2" onClick={onContinueFromIntake} disabled={loading}>{loading ? 'Submitting...' : <>Continue <ArrowRight size={16} /></>}</DSButton>
            </div>
          </>
        ) : null}

        {state.step === 3 && isCombined ? (
          <>
            <MobileSectionTitle title="Select Psychologist" subtitle="Choose a psychologist and select your session time." />
            {renderPractitionerButton('psychologist', selectedPsychologist, 'Select Psychologist', 'Open psychologist list')}
            {selectedPsychologist ? <p className="text-xs text-slate-600">Specialties: {selectedPsychologist.specialties.join(', ')}</p> : null}
            {renderSlotSelect(psychologistSlots, state.selectedPsychologistSlotId, (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedPsychologistSlotId: slotId } }), Boolean(state.selectedPsychologistId))}
            <div className="flex gap-2"><DSSecondaryButton className="flex-1" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>Back</DSSecondaryButton><DSButton className="flex-1 gap-2" onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })} disabled={!state.selectedPsychologistId || !state.selectedPsychologistSlotId}>Continue <ArrowRight size={16} /></DSButton></div>
          </>
        ) : null}

        {state.step === 4 && isCombined ? (
          <>
            <MobileSectionTitle title="Select Fitness Trainer" subtitle="Choose a trainer and select your session time." />
            {renderPractitionerButton('trainer', selectedTrainer, 'Select Fitness Trainer', 'Open trainer list')}
            {selectedTrainer ? <p className="text-xs text-slate-600">Specialties: {selectedTrainer.specialties.join(', ')}</p> : null}
            {renderSlotSelect(trainerSlots, state.selectedTrainerSlotId, (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedTrainerSlotId: slotId } }), Boolean(state.selectedTrainerId))}
            <div className="flex gap-2"><DSSecondaryButton className="flex-1" onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>Back</DSSecondaryButton><DSButton className="flex-1 gap-2" onClick={() => dispatch({ type: 'SET_STEP', payload: 5 })} disabled={!state.selectedTrainerId || !state.selectedTrainerSlotId}>Review <ArrowRight size={16} /></DSButton></div>
          </>
        ) : null}

        {state.step === 5 && isCombined ? (
          <>
            <MobileSectionTitle title="Review" subtitle="Confirm both appointment schedules before reserving slots." />
            <div className="grid gap-3 sm:grid-cols-2">
              {renderAppointmentSummary('Psychologist appointment', selectedPsychologist, selectedPsychologistSlot)}
              {renderAppointmentSummary('Fitness trainer appointment', selectedTrainer, selectedTrainerSlot)}
            </div>
            <div className="flex gap-2"><DSSecondaryButton className="flex-1" onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>Back</DSSecondaryButton><DSButton className="flex-1" onClick={onReserveCombinedSlots} disabled={loading}>{loading ? 'Reserving...' : 'Reserve Slots'}</DSButton></div>
          </>
        ) : null}

        {state.step === 3 && !isCombined ? (
          <>
            <MobileSectionTitle title="Schedule your first session" subtitle="Pick practitioner and time slot." />
            {renderPractitionerButton('single', selectedPractitioner, 'Select practitioner', 'Choose from recommended matches')}
            {selectedPractitioner ? <p className="text-xs text-slate-600">Specialties: {selectedPractitioner.specialties.join(', ')}</p> : null}
            {renderSlotSelect(slots, state.selectedSlotId, (slotId) => dispatch({ type: 'SET_FIELD', payload: { selectedSlotId: slotId } }), Boolean(state.selectedPractitionerId))}
            {state.serviceType !== 'package' && activeMemberships.length ? (
              <label className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-slate-700">
                <span className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={useCredits} onChange={(event) => setUseCredits(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  Use membership credits
                </span>
                {useCredits ? (
                  <select value={selectedMembershipId ?? ''} onChange={(event) => setSelectedMembershipId(Number(event.target.value))} className="mt-3 w-full rounded-lg border border-indigo-200 bg-white p-2 text-slate-900 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-slate-100">
                    {activeMemberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.planName} - counselling {membership.credits.counselling}, training {membership.credits.training}</option>)}
                  </select>
                ) : null}
              </label>
            ) : null}
            <div className="flex gap-2"><DSSecondaryButton className="flex-1" onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>Back</DSSecondaryButton><DSButton className="flex-1" onClick={onReserveSingleSlot} disabled={loading || !state.selectedSlotId || !state.selectedPractitionerId}>{loading ? 'Reserving...' : 'Reserve Slot'}</DSButton></div>
          </>
        ) : null}

        <Dialog open={pickerMode !== null} onOpenChange={(open) => setPickerMode(open ? pickerMode : null)}>
          <DialogContent className="left-0 top-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-[#fbfaff] p-0 text-slate-950 sm:max-w-none">
            <div className="relative min-h-dvh overflow-hidden px-4 py-6 sm:px-8 lg:px-14">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(247,243,255,0.86),rgba(255,255,255,0.18)_76%,rgba(255,255,255,0))]" />
              <div className="pointer-events-none absolute right-0 top-16 h-24 w-[45%] rounded-bl-[100%] bg-white/70" />

              <div className="relative mx-auto max-w-[1550px]">
                <DialogHeader className="mb-7 space-y-4 pr-16 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-[#6647f5] text-white shadow-sm shadow-indigo-100">
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-[1rem] font-extrabold tracking-tight text-slate-950">WellnessConnect</span>
                  </div>
                  <div>
                    <DialogTitle className="text-[2.05rem] font-extrabold leading-tight tracking-normal text-[#080d2d] sm:text-[2.35rem]">
                      Select practitioner
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-[1rem] font-medium text-[#485a78]">
                      Choose a practitioner from your recommended matches.
                    </DialogDescription>
                  </div>
                </DialogHeader>

                <button
                  type="button"
                  onClick={() => setPickerMode(null)}
                  className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-white text-slate-950 shadow-sm transition hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  aria-label="Close practitioner selector"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <label className="relative min-w-72 flex-1 lg:max-w-[420px]">
                    <span className="sr-only">Search practitioners</span>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input
                      value={practitionerSearch}
                      onChange={(event) => setPractitionerSearch(event.target.value)}
                      placeholder="Search by name, specialty, or keyword"
                      className="h-11 w-full rounded-lg border border-[#cfd6e8] bg-white pl-11 pr-4 text-[0.8rem] font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                  {renderFilterSelect('Specialty', specialtyFilter, setSpecialtyFilter, availableSpecialties)}
                  {renderFilterSelect('Session Mode', modeFilter, setModeFilter, ['Online', 'In-person'])}
                  {renderFilterSelect('Language', languageFilter, setLanguageFilter, availableLanguages)}
                  {renderFilterSelect('Availability', availabilityFilter, setAvailabilityFilter, ['available'])}
                  <button
                    type="button"
                    onClick={clearPractitionerFilters}
                    className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-[0.82rem] font-bold text-[#5b39f6] transition hover:bg-indigo-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Clear filters
                  </button>
                </div>

                <div className="grid min-h-0 items-start gap-7 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="grid max-h-[calc(100dvh-230px)] content-start gap-2.5 overflow-y-auto pr-1 pb-4">
                    {filteredPickerPractitioners.length ? filteredPickerPractitioners.map(renderExpectedPractitionerPickerCard) : (
                      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                        <p className="text-lg font-bold text-slate-950">No practitioners match these filters.</p>
                        <p className="mt-2 text-sm text-slate-600">Clear filters or try a broader search term.</p>
                      </div>
                    )}
                  </div>

                  <aside className="h-fit rounded-lg border border-[#e4ddf8] bg-white/76 p-5 shadow-[0_8px_26px_rgba(93,69,197,0.05)] backdrop-blur xl:sticky xl:top-6">
                    <div className="grid justify-items-center border-b border-[#ececf4] pb-6 text-center">
                      <div className="relative grid h-24 w-24 place-items-center">
                        <span className="absolute h-16 w-9 rounded-[999px_999px_10px_10px] bg-[#b9a7ff]/70 blur-[0.2px]" />
                        <span className="absolute h-16 w-9 rotate-[-42deg] rounded-[999px_999px_10px_10px] bg-[#d9ccff]/80" />
                        <span className="absolute h-16 w-9 rotate-[42deg] rounded-[999px_999px_10px_10px] bg-[#a48bf5]/80" />
                        <span className="absolute h-11 w-11 rounded-full bg-white/70" />
                        <Heart className="relative h-7 w-7 fill-[#c9b8ff] text-[#7c61ee]" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-[1rem] font-extrabold leading-6 text-[#101735]">Personalized recommendations</h3>
                      <p className="mt-3 text-[0.84rem] leading-6 text-[#435175]">
                        These recommendations are based on your intake responses, goals, and preferences.
                      </p>
                    </div>
                    <div className="mt-8 grid gap-6">
                      <div className="grid grid-cols-[44px_1fr] gap-4">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
                        <div>
                          <p className="text-[0.82rem] font-extrabold text-[#101735]">Verified professionals</p>
                          <p className="mt-1 text-[0.78rem] leading-5 text-[#435175]">All practitioners are background-checked and verified.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-4">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
                        <div>
                          <p className="text-[0.82rem] font-extrabold text-[#101735]">Your privacy matters</p>
                          <p className="mt-1 text-[0.78rem] leading-5 text-[#435175]">Your information is secure and confidential.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-[44px_1fr] gap-4">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]"><UserCheck className="h-5 w-5" aria-hidden="true" /></span>
                        <div>
                          <p className="text-[0.82rem] font-extrabold text-[#101735]">You're in control</p>
                          <p className="mt-1 text-[0.78rem] leading-5 text-[#435175]">You can change your selection anytime.</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 border-t border-[#ececf4] pt-6">
                      <div className="grid grid-cols-[36px_1fr] gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f0edff] text-[#6746e8]"><Headphones className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                        <div>
                          <p className="text-[0.78rem] font-extrabold text-[#101735]">Need help choosing?</p>
                          <button type="button" className="mt-1 text-[0.78rem] font-bold text-[#5b39f6]">Chat with our care team</button>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
