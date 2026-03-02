// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Application State
//  Single source of truth for all mutable application state
// ═══════════════════════════════════════════════════════════════════════

export const state = {
  days: [],
  tasks: [],
  sessions: [],
  personalTasks: [],
  questionAnalytics: [],
  sessionNotes: [],
  questionNotes: [],
  rescheduledTopics: [],
  settings: {
    dayEndTime: '23:00',
    dayStartTime: '06:00',
    userName: '',
    notifications: {
      study: false,
      brainFog: false,
      evening: false,
      personal: false,
    },
    sound: true,
    theme: 'focus',
  },
  currentDayId: null,
  reassignTaskId: null,
  selectedSubject: null,
  pushSubscription: null,
};

export const session = {
  active: false,
  paused: false,
  taskId: null,
  subject: '',
  topic: '',
  startTime: null,
  pausedAt: null,
  elapsed: 0,
  timerRef: null,
  mode: 'full',
  questions: [],
  questionIndex: 0,
  currentQuestionStart: null,
  questionElapsed: 0,
};

export const appLocals = {
  backlogSortBy: 'date',
  planSearchQuery: '',
  deferredInstallPrompt: null,
  clockRef: null,
  csvParsedData: null,
  csvSelection: {},
  lastSessionRecord: null,
  savingNotes: false,
  planSearchTimer: null,
};
