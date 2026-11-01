import { authenticatedFetch as fetch, BACKEND_URL } from '../utils/api';

export interface ObservationData {
  id: string;
  title: string;
  description: string;
  confidence: number;
  observedCount: number;
  totalRelevantEntries: number;
  correlationId: string;
  dateRange: string;
  totalDreams?: number;
}

export interface RhythmDay {
  date: string;
  dayOfWeek: string;
  dayOfMonth: number;
  value: 'high' | 'moderate' | 'low' | 'none';
  count?: number;
  hasEntry?: boolean;
}

export interface RhythmData {
  days: RhythmDay[];
}

export interface ExperimentData {
  id: string;
  title: string;
  experimentTitle: string;
  description: string;
  durationDays: number;
  currentDay: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  protocol: string[];
}

export interface TimelineEntry {
  id: string;
  date: string;
  fullDate: string;
  evening: {
    score: string;
    numeric: number;
    level: 'high' | 'moderate' | 'low';
  };
  dream: {
    title: string;
    distress: string;
    numeric: number;
    level: 'high' | 'moderate' | 'low' | 'calm';
  };
  morning: {
    score: string;
    numeric: number;
    level: 'high' | 'moderate' | 'low';
  };
  journalEntryId?: string;
}

export interface PatternsData {
  summary: {
    title: string;
    description: string;
    observedCount: number;
    totalRelevantEntries: number;
    dateRange: string;
    disclaimer: string;
  };
  timeline: TimelineEntry[];
  recordedStats: {
    highEveningWorry: { count: number; total: number };
    distressingDream: { count: number; total: number };
    lowMorningEnergy: { count: number; total: number };
  };
  connectedFactors: Array<{ factor: string; nights: number }>;
  afterDreams: {
    lowEnergy: number;
    moderate: number;
    higherEnergy: number;
    description: string;
  };
  experiment: {
    id: string;
    title: string;
    instructions: string;
    protocol: string[];
    durationDays: number;
  };
}

export interface ThemeTrigger {
  trigger: string;
  count: number;
  percentage: number;
}

export interface ThemeItem {
  id: string;
  name: string;
  frequency: number;
  percentage: number;
  description: string;
  isRepeated?: boolean;
  moods?: string[];
  primaryEmotionalTone?: string;
  environmentalSettings?: string[];
  relationalPresence?: string[];
  correlativeTriggers?: ThemeTrigger[];
}

export interface EmotionalToneItem {
  id: string;
  name: string;
  percentage: number;
  count: number;
  icon: string;
}

export interface EnvironmentalSettingItem {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  icon: string;
}

export interface RelationalPresenceItem {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

export interface ThemesData {
  dateRange: string;
  totalLogs: number;
  themes: ThemeItem[];
  emotionalTones: EmotionalToneItem[];
  environmentalSettings: EnvironmentalSettingItem[];
  relationalPresence: RelationalPresenceItem[];
  observedCorrelation: {
    text: string;
    themeName: string;
    status?: string;
  };
}

export interface TimelineDot {
  date: string;
  fullDate: string;
  occurred: boolean;
  distress: number;
  intensity: 'high' | 'moderate';
  label: string;
}

export interface SomaticContextItem {
  title: string;
  subtext: string;
  match: number;
  icon: string;
}

export interface DreamInstanceItem {
  id: string;
  title: string;
  date: string;
  badge: string;
  badgeType: string;
  excerpt: string;
  readTime: string;
}

export interface ThemeDetailData {
  themeId: string;
  name: string;
  totalInstances: number;
  dateRange: string;
  description: string;
  isRepeated: boolean;
  rhythmTimeline: TimelineDot[];
  somaticContext: SomaticContextItem[];
  userConnection: {
    title: string;
    subtitle: string;
  };
  dreamInstances: DreamInstanceItem[];
}

export interface InterventionItem {
  id: string;
  name: string;
  description: string;
  categoryTag?: string;
  tags?: string[];
  totalAttempts?: number;
  successCount?: number;
  neutralCount?: number;
  unsuccessCount?: number;
  sessionsCount: number;
  helpfulCount: number;
  percentage: number;
  avgShift?: number;
  recentOutcomes?: Array<{ outcome: string; date: string }>;
}

export interface TopIntervention {
  id: string;
  name: string;
  rankLabel: string;
  reliability: string;
  statement: string;
  detail: string;
  primaryAction: string;
  effectivenessPercentage: number;
  totalAttempts: number;
  successCount: number;
  avgShift: number;
}

export interface PracticeComparisonItem {
  id: string;
  rank: number;
  name: string;
  total: number;
  calmer: number;
  same: number;
  tense: number;
  moreActivated?: number;
  calmerPct: number;
  samePct: number;
  tensePct: number;
  moreActivatedPct?: number;
  label: string;
}

export interface SessionShiftItem {
  id: string;
  dateLabel: string;
  beforeScore: number;
  afterScore: number;
  ptsDrop: number;
  badge: string;
}

export interface SomaticRecommendation {
  badge: string;
  text: string;
  actionText: string;
  practiceId?: string;
  practiceName: string;
}

export interface HistoryRatioItem {
  id: string;
  name: string;
  icon: 'moon' | 'wind' | 'hand' | string;
  ratioText: string;
  effectivenessPercentage: number;
}

export interface InterventionDetailData {
  id: string;
  name: string;
  categoryTag: string;
  totalAttempts: number;
  successCount: number;
  effectivenessPercentage: number;
  bannerText: string;
  beforeMetrics: {
    score: string;
    scale: string;
    label: string;
  };
  afterMetrics: {
    score: string;
    scale: string;
    label: string;
  };
  dropSummary: string;
  efficacyByState: {
    title: string;
    items: Array<{
      state: string;
      ratioText: string;
      percentage: number;
    }>;
    callout: string;
  };
  somaticShifts: {
    dominantReleaseZone: {
      title: string;
      description: string;
    };
    dataReflection: {
      title: string;
      description: string;
    };
  };
  trackingMethodology: {
    subtitle: string;
    steps: Array<{
      stage: string;
      desc: string;
    }>;
  };
  sessionLog?: any[];
}

export interface ResetSessionInput {
  practice?: string;
  selectedState?: string;
  durationSeconds?: number;
  completed?: boolean;
  afterResponse?: 'more_settled' | 'same' | 'more_activated' | 'not_sure';
  perceivedChange?: string[];
  notes?: string;
}

export interface ContextBreakdownItem {
  state: string;
  stateKey: string;
  ratioText: string;
  calmer: number;
  total: number;
  percentage: number;
}

export interface AllPracticeItem {
  id: string;
  name: string;
  ratioText: string;
  calmer: number;
  total: number;
  effectivenessPercentage: number;
  icon: string;
}

export interface WhatHelpsData {
  hasEnoughData?: boolean;
  totalCompletedSessions?: number;
  emptyStateMessage?: string;
  recentHighlight: string;
  topIntervention?: TopIntervention & {
    practiceKey?: string;
    sessionsSummary?: string;
    mostCommonChange?: string;
    isActivatedWarning?: boolean;
  };
  practiceComparison?: PracticeComparisonItem[];
  contextBreakdown?: ContextBreakdownItem[];
  sessionShifts?: SessionShiftItem[];
  somaticRecommendation?: SomaticRecommendation;
  historyRatios?: HistoryRatioItem[];
  allPractices?: AllPracticeItem[];
  interventions: InterventionItem[];
  activeExperiment?: {
    id: string;
    title: string;
    durationDays: number;
    currentDay: number;
    startedAt?: string;
  } | null;
}

export const insightsAPI = {
  getObservations: async (userId: string): Promise<ObservationData> => {
    const res = await fetch(`${BACKEND_URL}/insights/observations/${userId}`);
    if (!res.ok) throw new Error('Failed to load observation');
    return res.json();
  },

  getRhythm: async (userId: string): Promise<RhythmData> => {
    const res = await fetch(`${BACKEND_URL}/insights/rhythm/${userId}`);
    if (!res.ok) throw new Error('Failed to load rhythm');
    return res.json();
  },

  getNextExperiment: async (userId: string): Promise<ExperimentData> => {
    const res = await fetch(`${BACKEND_URL}/insights/experiment/next/${userId}`);
    if (!res.ok) throw new Error('Failed to load experiment');
    return res.json();
  },

  getPatterns: async (userId: string, range: '7days' | '30days' | '90days' = '30days'): Promise<PatternsData> => {
    const res = await fetch(`${BACKEND_URL}/insights/patterns/${userId}?range=${range}`);
    if (!res.ok) throw new Error('Failed to load patterns');
    return res.json();
  },

  getThemes: async (userId: string, range: '7days' | '30days' | '90days' = '30days'): Promise<ThemesData> => {
    const res = await fetch(`${BACKEND_URL}/insights/themes/${userId}?range=${range}`);
    if (!res.ok) throw new Error('Failed to load themes');
    return res.json();
  },

  getThemeDetail: async (userId: string, themeId: string, range: '7days' | '30days' | '90days' = '30days'): Promise<ThemeDetailData> => {
    const res = await fetch(`${BACKEND_URL}/insights/themes/${userId}/${encodeURIComponent(themeId)}/detail?range=${range}`);
    if (!res.ok) throw new Error('Failed to load theme detail');
    return res.json();
  },

  sendThemeCorrelationFeedback: async (userId: string, themeId: string, feedback: 'accurate' | 'adjust' | 'unsure'): Promise<{ success: boolean }> => {
    const res = await fetch(`${BACKEND_URL}/insights/themes/${userId}/correlation-feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback, themeId }),
    });
    if (!res.ok) throw new Error('Failed to submit theme feedback');
    return res.json();
  },

  getWhatHelps: async (userId: string, range: '7days' | '30days' | '90days' = '30days'): Promise<WhatHelpsData> => {
    const res = await fetch(`${BACKEND_URL}/insights/what-helps/${userId}?range=${range}`);
    if (!res.ok) throw new Error('Failed to load what helps');
    return res.json();
  },

  getInterventionDetail: async (userId: string, interventionId: string, range: '7days' | '30days' | '90days' = '30days'): Promise<InterventionDetailData> => {
    const res = await fetch(`${BACKEND_URL}/insights/what-helps/${userId}/${encodeURIComponent(interventionId)}/detail?range=${range}`);
    if (!res.ok) throw new Error('Failed to load intervention detail');
    return res.json();
  },

  startExperiment: async (experimentId: string): Promise<{ success: boolean; experiment?: any }> => {
    const res = await fetch(`${BACKEND_URL}/insights/experiment/${experimentId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to start experiment');
    return res.json();
  },

  stopExperiment: async (experimentId: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BACKEND_URL}/insights/experiment/${experimentId}/stop`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to stop experiment');
    return res.json();
  },

  logInterventionOutcome: async (
    interventionId: string,
    outcome: 'helpful' | 'neutral' | 'unhelpful',
    notes?: string
  ): Promise<{ success: boolean; intervention: any }> => {
    const res = await fetch(`${BACKEND_URL}/insights/intervention/${encodeURIComponent(interventionId)}/outcome`, {
      method: 'POST',
      body: JSON.stringify({ outcome, notes }),
    });
    if (!res.ok) throw new Error('Failed to record outcome');
    return res.json();
  },

  sendObservationFeedback: async (observationId: string, comment?: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BACKEND_URL}/insights/observation/${encodeURIComponent(observationId)}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    if (!res.ok) throw new Error('Failed to send feedback');
    return res.json();
  },

  saveResetSession: async (session: ResetSessionInput): Promise<{ success: boolean; session: any }> => {
    const res = await fetch(`${BACKEND_URL}/insights/reset-session`, {
      method: 'POST',
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Failed to save reset session');
    return res.json();
  },
};

export default insightsAPI;
