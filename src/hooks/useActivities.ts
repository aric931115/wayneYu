import { useState, useCallback } from 'react';

export type ActivityCategory = 'campus' | 'private';
export interface ActivityTag {
  label: string;
  color: string;
}
export type VerificationType = 'auto' | 'social' | 'organizer';

export type TaskType =
  | 'image-match'    // 圖像配對
  | 'quick-quiz'     // 快速問答
  | 'gesture'        // 手勢/點擊
  | 'count'          // 次數型
  | 'pair'           // 配對任務（多人）
  | 'coop'           // 合作任務（多人）
  | 'multi-quiz'     // 多人問答
  | 'stage'          // 闖關任務
  | 'general';       // 一般任務

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'image-match': '圖像配對遊戲',
  'quick-quiz': '快速問答',
  'gesture': '手勢 / 點擊任務',
  'count': '次數型任務',
  'pair': '配對任務（多人）',
  'coop': '合作任務（多人）',
  'multi-quiz': '多人問答',
  'stage': '闖關任務',
  'general': '一般任務',
};

export const MULTI_TASK_TYPES: TaskType[] = ['pair', 'coop', 'multi-quiz', 'stage'];

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndexes: number[];
  points: number;
  answered?: boolean;
  correct?: boolean;
}

export interface ActivityTask {
  id: number;
  title: string;
  desc: string;
  type: TaskType;
  targetCount: number;
  completedCount: number;
  points: number;
  completed: boolean;
  verified?: boolean; // 發起者驗證
  verificationType?: VerificationType;
}

export interface SocialInteractionRequest {
  id: string;
  activityId: number;
  taskId: number;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt?: string;
}

export interface ActivityParticipant {
  id: string;
  name: string;
  joinedAt: string;
  progress: number; // 0-100
  completed: boolean;
  rewardClaimed: boolean;
  taskProgress?: Record<number, number>;
  socialCodes?: Record<number, string>;
  socialPartners?: Record<number, string[]>;
  quizCorrect?: Record<number, boolean>;
  pointsEarned?: number;
  rewardPoints?: number;
}

export interface Activity {
  id: number;
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  noPhysicalLocation?: boolean;
  desc: string;
  content: string;
  category: ActivityCategory;
  tags: ActivityTag[];
  maxParticipants: number;
  participants: number;
  participantList: ActivityParticipant[];
  joined: boolean;
  tasks: ActivityTask[];
  quiz: QuizQuestion[];
  roomCode: string;
  roomGames?: string[];
  roomGamePoints: number;
  organizerQrCode: string;
  organizerName?: string;
  organizerAnonymous?: boolean; // legacy field; new activities are never anonymous
  organizerProfile?: {
    name: string;
    department: string;
    avatar: string;
  };
  rewardClaimed: boolean;
  status: 'active' | 'ended';
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  organizerId: string;
  createdAt: string;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateUniqueRoomCode(): string {
  let code = generateRoomCode();
  while (globalActivities.some(activity => activity.roomCode === code)) {
    code = generateRoomCode();
  }
  return code;
}

function generateOrganizerQrCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const pick = (length: number) => Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(3)}-${pick(4)}`;
}

function generateSocialCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
    return Array.from(values, value => chars[value % chars.length]).join('');
  }
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const sampleParticipants: ActivityParticipant[] = [
  { id: 'U101', name: '小明', joinedAt: '3月14日', progress: 100, completed: true, rewardClaimed: true },
  { id: 'U102', name: '小華', joinedAt: '3月14日', progress: 66, completed: false, rewardClaimed: false },
  { id: 'U103', name: '阿德', joinedAt: '3月15日', progress: 33, completed: false, rewardClaimed: false },
];

const defaultActivities: Activity[] = [
  {
    id: 1,
    title: '校園愛心園遊會',
    date: '3月15日（六）',
    endDate: '3月15日（六）',
    startTime: '09:00',
    endTime: '12:00',
    location: '活動中心廣場',
    desc: '一起來參加愛心園遊會，有各種攤位和表演！',
    content: '本次園遊會將有超過 30 個攤位，包含美食、手作、二手物品義賣等。所有收入將捐贈給公益團體。歡迎同學邀請家人朋友一起參加！',
    category: 'campus',
    tags: [{ label: '園遊會', color: '#2563eb' }],
    maxParticipants: 100,
    participants: 10,
    participantList: sampleParticipants,
    joined: false,
    roomCode: 'LOVE01',
    roomGames: ['image-match'],
    roomGamePoints: 3,
    organizerQrCode: 'K7M-4Q2A',
    rewardClaimed: false,
    status: 'active',
    organizerId: 'ORG001',
    organizerName: '校園活動中心',
    organizerAnonymous: false,
    createdAt: '3月1日',
    tasks: [
      { id: 1, title: '活動簽到', desc: '到現場向活動建立者取得專屬代碼並完成簽到', type: 'general', targetCount: 1, completedCount: 0, points: 5, completed: false },
    ],
    quiz: [
      { id: 1, question: '本次園遊會的收入將捐贈給？', options: ['學校基金', '公益團體', '班級經費', '學生會'], correctIndexes: [1], points: 5 },
      { id: 2, question: '園遊會共有多少個攤位？', options: ['10 個', '20 個', '超過 30 個', '50 個'], correctIndexes: [2], points: 5 },
    ],
  },
  {
    id: 2,
    title: '環保小尖兵',
    date: '3月20日（四）',
    endDate: '3月20日（四）',
    startTime: '09:00',
    endTime: '12:00',
    location: '操場',
    desc: '認識環境保護，一起守護地球！',
    content: '透過闖關活動學習垃圾分類、節能減碳等環保知識。現場完成問答挑戰即可獲得環保小尖兵證書，憑證書可至主辦方換取精美獎品！',
    category: 'campus',
    tags: [{ label: '環保', color: '#16a34a' }],
    maxParticipants: 50,
    participants: 28,
    participantList: sampleParticipants.slice(0, 2),
    joined: false,
    roomCode: 'ECO202',
    roomGamePoints: 0,
    organizerQrCode: 'P3X-8N6B',
    rewardClaimed: false,
    status: 'active',
    organizerId: 'ORG001',
    organizerName: '環境教育社',
    organizerAnonymous: false,
    createdAt: '3月5日',
    tasks: [
      { id: 1, title: '活動簽到', desc: '到現場向活動建立者取得專屬代碼並完成簽到', type: 'general', targetCount: 1, completedCount: 0, points: 0, completed: false },
    ],
    quiz: [
      { id: 1, question: '以下哪一項屬於可回收垃圾？', options: ['廚餘', '寶特瓶', '衛生紙', '口香糖'], correctIndexes: [1], points: 0 },
      { id: 2, question: '節能減碳最簡單的方式是？', options: ['開冷氣睡覺', '隨手關燈關電器', '多開車出門', '使用免洗餐具'], correctIndexes: [1], points: 0 },
      { id: 3, question: '地球日是每年的哪一天？', options: ['3月12日', '4月22日', '6月5日', '9月16日'], correctIndexes: [1], points: 0 },
    ],
  },
  {
    id: 3,
    title: '手語工作坊',
    date: '3月25日（二）',
    endDate: '3月25日（二）',
    startTime: '13:00',
    endTime: '15:00',
    location: '圖書館 B1',
    desc: '學習基本手語，認識聽障朋友的世界。',
    content: '由專業手語老師授課，學習日常打招呼、自我介紹等基本手語。',
    category: 'campus',
    tags: [{ label: '手語', color: '#9333ea' }],
    maxParticipants: 30,
    participants: 15,
    participantList: [],
    joined: false,
    roomCode: 'SIGN03',
    roomGamePoints: 0,
    organizerQrCode: 'R8C-1V5D',
    rewardClaimed: false,
    status: 'active',
    organizerId: 'ORG002',
    organizerName: '手語社',
    organizerAnonymous: false,
    createdAt: '3月8日',
    tasks: [
      { id: 1, title: '活動簽到', desc: '到現場向活動建立者取得專屬代碼並完成簽到', type: 'general', targetCount: 1, completedCount: 0, points: 5, completed: false },
    ],
    quiz: [
      { id: 1, question: '手語中「謝謝」的手勢是？', options: ['雙手合十', '右手從下巴往前推', '揮手', '比讚'], correctIndexes: [1], points: 5 },
    ],
  },
  {
    id: 4,
    title: '繪畫比賽',
    date: '4月1日（二）',
    endDate: '4月1日（二）',
    startTime: '14:00',
    endTime: '16:00',
    location: '美術教室',
    desc: '以「友誼」為題，畫出你心中的溫暖。',
    content: '參賽者將在兩小時內完成一幅以「友誼」為主題的作品。',
    category: 'private',
    tags: [{ label: '比賽', color: '#ea580c' }],
    maxParticipants: 20,
    participants: 20,
    participantList: [],
    joined: false,
    roomCode: 'ART004',
    roomGamePoints: 0,
    organizerQrCode: 'T2H-9L4W',
    rewardClaimed: false,
    status: 'active',
    organizerId: 'ORG003',
    organizerName: '美術社',
    organizerAnonymous: false,
    createdAt: '3月12日',
    tasks: [
      { id: 1, title: '活動簽到', desc: '到現場向活動建立者取得專屬代碼並完成簽到', type: 'general', targetCount: 1, completedCount: 0, points: 0, completed: false },
    ],
    quiz: [],
  },
];

const initialActivities = defaultActivities.slice(0, 1).map(activity => ({
  ...activity,
  organizerAnonymous: false,
  tasks: activity.tasks.map(task => ({ ...task, verificationType: task.verificationType || 'organizer' as VerificationType })),
}));

const STORAGE_KEY = 'campus-activities-v2';
const loadActivities = (): Activity[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load saved activities.', error);
  }
  return [...initialActivities];
};
let globalActivities = loadActivities();
const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalActivities));
  } catch (error) {
    console.error('Failed to save activities.', error);
  }
};
let listeners: (() => void)[] = [];

const notify = () => { persist(); listeners.forEach(l => l()); };

const SOCIAL_REQUESTS_KEY = 'campus-social-requests-v2';
const loadSocialRequests = (): SocialInteractionRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(SOCIAL_REQUESTS_KEY) || '[]');
  } catch (error) {
    console.error('Failed to load social verification requests.', error);
    return [];
  }
};
let globalSocialRequests: SocialInteractionRequest[] = loadSocialRequests();
const persistSocialRequests = () => {
  try {
    localStorage.setItem(SOCIAL_REQUESTS_KEY, JSON.stringify(globalSocialRequests));
  } catch (error) {
    console.error('Failed to save social verification requests.', error);
  }
};

export function useActivities() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  useState(() => {
    listeners.push(rerender);
    return () => {
      listeners = listeners.filter(l => l !== rerender);
    };
  });

  const addActivity = (activity: Omit<Activity, 'id' | 'participants' | 'participantList' | 'joined' | 'roomCode' | 'organizerQrCode' | 'rewardClaimed' | 'status' | 'createdAt'> & { roomCode?: string }) => {
    const roomCode = activity.roomCode === ''
      ? ''
      : activity.roomCode || generateUniqueRoomCode();

    const newActivity: Activity = {
      ...activity,
      id: Date.now(),
      participants: 0,
      participantList: [],
      joined: false,
      roomCode,
      organizerQrCode: generateOrganizerQrCode(),
      rewardClaimed: false,
      status: 'active',
      reviewStatus: 'pending',
      organizerId: activity.organizerId,
      organizerName: activity.organizerProfile?.name || activity.organizerName || '活動建立者',
      organizerAnonymous: false,
      createdAt: new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' }),
    };
    globalActivities = [newActivity, ...globalActivities];
    notify();
    return newActivity;
  };

  const joinActivity = (id: number, participant?: Pick<ActivityParticipant, 'id' | 'name'>) => {
    let joined = false;
    globalActivities = globalActivities.map(a =>
      a.id === id && (a.reviewStatus || 'approved') === 'approved' && !a.participantList.some(p => p.id === participant?.id) && (a.maxParticipants === 0 || a.participants < a.maxParticipants)
        ? (joined = true, {
            ...a,
            joined: true,
            participants: a.participants + 1,
            participantList: participant
              ? [...a.participantList, {
                  id: participant.id,
                  name: participant.name,
                  joinedAt: new Date().toLocaleString('zh-TW'),
                  progress: 0,
                  completed: false,
                  rewardClaimed: false,
                  taskProgress: {},
                  quizCorrect: {},
                  pointsEarned: 0,
                  rewardPoints: 0,
                }]
              : a.participantList,
          })
        : a
    );
    notify();
    return joined;
  };

  const joinByCode = (code: string): Activity | null => {
    const normalizedCode = code.trim().toUpperCase();
    const activity = globalActivities.find(a => a.roomCode && a.roomCode === normalizedCode && (a.reviewStatus || 'approved') === 'approved');
    if (activity && activity.maxParticipants > 0 && activity.participants >= activity.maxParticipants) {
      return null;
    }
    if (activity && !activity.joined) {
      return joinActivity(activity.id) ? activity : null;
    }
    return null;
  };

  const toggleTask = (activityId: number, taskId: number) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId
        ? {
            ...a,
            tasks: a.tasks.map(t => t.id === taskId
              ? { ...t, completedCount: t.completed ? 0 : t.targetCount, completed: !t.completed }
              : t),
          }
        : a
    );
    notify();
  };

  const updateParticipantTaskProgress = (activityId: number, taskId: number, participantId: string, increment = 1) => {
    let justCompleted = false;
    let points = 0;
    globalActivities = globalActivities.map(a => {
      if (a.id !== activityId) return a;
      const task = a.tasks.find(t => t.id === taskId);
      if (!task) return a;
      return { ...a, participantList: a.participantList.map(p => {
        if (p.id !== participantId) return p;
        const before = p.taskProgress?.[taskId] || 0;
        const after = Math.min(before + increment, task.targetCount);
        justCompleted = before < task.targetCount && after >= task.targetCount;
        if (justCompleted) points = task.points;
        const taskProgress = { ...(p.taskProgress || {}), [taskId]: after };
        const total = a.tasks.reduce((sum, item) => sum + item.targetCount, 0);
        const done = a.tasks.reduce((sum, item) => sum + Math.min(taskProgress[item.id] || 0, item.targetCount), 0);
        return { ...p, taskProgress, progress: total ? Math.round(done / total * 100) : 0, completed: total > 0 && done >= total, pointsEarned: (p.pointsEarned || 0) + (justCompleted ? task.points : 0) };
      }) };
    });
    notify();
    return { justCompleted, points };
  };

  const completeAutoTask = (activityId: number, taskId: number, participantId: string) => {
    const activity = globalActivities.find(a => a.id === activityId);
    const task = activity?.tasks.find(t => t.id === taskId);
    if (!task || (task.verificationType || 'organizer') !== 'auto') return { valid: false, completed: false, points: 0 };
    const result = updateParticipantTaskProgress(activityId, taskId, participantId, 1);
    return { valid: true, completed: result.justCompleted, points: result.points };
  };

  const ensureSocialCode = (activityId: number, taskId: number, participantId: string) => {
    const activity = globalActivities.find(a => a.id === activityId);
    const task = activity?.tasks.find(t => t.id === taskId);
    const participant = activity?.participantList.find(p => p.id === participantId);
    if (!activity || !task || !participant || task.verificationType !== 'social') return '';

    const existingCode = participant.socialCodes?.[taskId];
    if (existingCode) return existingCode;

    const existingCodes = new Set(activity.participantList.map(p => p.socialCodes?.[taskId]).filter(Boolean));
    let code = generateSocialCode();
    while (existingCodes.has(code)) code = generateSocialCode();

    globalActivities = globalActivities.map(a => a.id !== activityId ? a : {
      ...a,
      participantList: a.participantList.map(p => p.id !== participantId ? p : {
        ...p,
        socialCodes: { ...(p.socialCodes || {}), [taskId]: code },
      }),
    });
    notify();
    return code;
  };

  const verifySocialCode = (activityId: number, taskId: number, participantId: string, enteredCode: string) => {
    const activity = globalActivities.find(a => a.id === activityId);
    const task = activity?.tasks.find(t => t.id === taskId);
    const participant = activity?.participantList.find(p => p.id === participantId);
    if (!activity || !task || !participant || task.verificationType !== 'social') {
      return { valid: false, reason: 'unavailable' as const, completed: false, points: 0 };
    }

    const normalizedCode = enteredCode.trim().toUpperCase();
    const owner = activity.participantList.find(p => p.socialCodes?.[taskId] === normalizedCode);
    if (!owner) return { valid: false, reason: 'invalid' as const, completed: false, points: 0 };
    if (owner.id === participantId) return { valid: false, reason: 'self' as const, completed: false, points: 0 };
    if ((participant.socialPartners?.[taskId] || []).includes(owner.id)) {
      return { valid: false, reason: 'duplicate' as const, completed: false, points: 0 };
    }
    if ((participant.taskProgress?.[taskId] || 0) >= task.targetCount) {
      return { valid: false, reason: 'complete' as const, completed: true, points: 0 };
    }

    const result = updateParticipantTaskProgress(activityId, taskId, participantId, 1);
    globalActivities = globalActivities.map(a => a.id !== activityId ? a : {
      ...a,
      participantList: a.participantList.map(p => p.id !== participantId ? p : {
        ...p,
        socialPartners: {
          ...(p.socialPartners || {}),
          [taskId]: [...(p.socialPartners?.[taskId] || []), owner.id],
        },
      }),
    });
    notify();
    return { valid: true, reason: 'accepted' as const, completed: result.justCompleted, points: result.points };
  };

  const scanOrganizerQr = (activityId: number, taskId: number, qrCode: string, participantId?: string) => {
    const activity = globalActivities.find(a => a.id === activityId);
    const task = activity?.tasks.find(t => t.id === taskId);
    if (!activity || !task || !participantId || (task.verificationType || 'organizer') !== 'organizer' || activity.organizerQrCode !== qrCode.trim().toUpperCase()) {
      return { valid: false, completed: false, points: 0 };
    }
    const current = activity.participantList.find(p => p.id === participantId)?.taskProgress?.[taskId] || 0;
    if (current >= task.targetCount) return { valid: true, completed: true, points: 0 };
    // 人工驗證一次即確認該實體任務，避免同一驗證碼反覆累積。
    const result = updateParticipantTaskProgress(activityId, taskId, participantId, task.targetCount - current);
    return { valid: true, completed: result.justCompleted, points: result.points };
  };

  const sendSocialRequest = (activityId: number, taskId: number, participantId: string, friendId: string) => {
    const activity = globalActivities.find(a => a.id === activityId);
    const task = activity?.tasks.find(t => t.id === taskId);
    const sender = activity?.participantList.find(p => p.id === participantId);
    const receiver = activity?.participantList.find(p => p.id === friendId);
    if (!activity || !task || !sender || !receiver || (task.verificationType || 'organizer') !== 'social' || friendId === participantId) {
      return { valid: false, duplicate: false, pending: false };
    }
    const proofKey = `campus-social-proof-${activityId}-${taskId}-${participantId}`;
    const used: string[] = JSON.parse(localStorage.getItem(proofKey) || '[]');
    if (used.includes(friendId)) return { valid: true, duplicate: true, pending: false };
    const existing = globalSocialRequests.find(r => r.activityId === activityId && r.taskId === taskId && r.fromUserId === participantId && r.toUserId === friendId && r.status === 'pending');
    if (existing) return { valid: true, duplicate: false, pending: true };
    globalSocialRequests = [{
      id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      activityId, taskId, fromUserId: participantId, fromUserName: sender.name,
      toUserId: friendId, toUserName: receiver.name, status: 'pending', createdAt: new Date().toLocaleString('zh-TW'),
    }, ...globalSocialRequests];
    persistSocialRequests();
    listeners.forEach(l => l());
    return { valid: true, duplicate: false, pending: false };
  };

  const respondSocialRequest = (requestId: string, responderId: string, accept: boolean) => {
    const request = globalSocialRequests.find(r => r.id === requestId);
    if (!request || request.toUserId !== responderId || request.status !== 'pending') return { valid: false, accepted: false, completed: false, points: 0 };
    let completed = false;
    let points = 0;
    if (accept) {
      const activity = globalActivities.find(a => a.id === request.activityId);
      const task = activity?.tasks.find(t => t.id === request.taskId);
      const proofKey = `campus-social-proof-${request.activityId}-${request.taskId}-${request.fromUserId}`;
      const used: string[] = JSON.parse(localStorage.getItem(proofKey) || '[]');
      if (activity && task && !used.includes(request.toUserId)) {
        localStorage.setItem(proofKey, JSON.stringify([...used, request.toUserId]));
        const result = updateParticipantTaskProgress(request.activityId, request.taskId, request.fromUserId, 1);
        completed = result.justCompleted;
        points = result.points;
      }
    }
    globalSocialRequests = globalSocialRequests.map(r => r.id === requestId ? { ...r, status: accept ? 'accepted' : 'rejected', respondedAt: new Date().toLocaleString('zh-TW') } : r);
    persistSocialRequests();
    listeners.forEach(l => l());
    return { valid: true, accepted: accept, completed, points, request };
  };

  const getSocialRequests = (userId: string, activityId?: number) => globalSocialRequests.filter(r =>
    (r.fromUserId === userId || r.toUserId === userId) && (activityId === undefined || r.activityId === activityId)
  );

  // 相容舊呼叫：改為送出雙向確認邀請，不再直接增加進度。
  const completeSocialTask = (activityId: number, taskId: number, participantId: string, friendId: string) => {
    const result = sendSocialRequest(activityId, taskId, participantId, friendId);
    return { ...result, completed: false, points: 0 };
  };

  const verifyTask = (activityId: number, taskId: number) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId
        ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, verified: true } : t) }
        : a
    );
    notify();
  };

  const answerQuiz = (activityId: number, quizId: number, selectedIndexes: number[], participantId?: string) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId
        ? { ...a,
          quiz: a.quiz.map(q => {
            if (q.id !== quizId) return q;
            const expected = [...q.correctIndexes].sort((x, y) => x - y);
            const selected = [...selectedIndexes].sort((x, y) => x - y);
            return { ...q, answered: true, correct: expected.length === selected.length && expected.every((value, index) => value === selected[index]) };
          }),
          participantList: participantId
            ? a.participantList.map(p => {
                if (p.id !== participantId) return p;
                const question = a.quiz.find(q => q.id === quizId);
                const expected = [...(question?.correctIndexes || [])].sort((x, y) => x - y);
                const selected = [...selectedIndexes].sort((x, y) => x - y);
                const correct = expected.length === selected.length && expected.every((value, index) => value === selected[index]);
                return { ...p, quizCorrect: { ...(p.quizCorrect || {}), [quizId]: correct } };
              })
            : a.participantList,
        }
        : a
    );
    notify();
  };

  const claimReward = (activityId: number) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId ? { ...a, rewardClaimed: true } : a
    );
    notify();
  };

  const endActivity = (activityId: number) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId ? { ...a, status: 'ended' } : a
    );
    notify();
  };

  const deleteActivity = (activityId: number) => {
    globalActivities = globalActivities.filter(activity => activity.id !== activityId);
    notify();
  };

  const reviewActivity = (activityId: number, reviewerId: string, approve: boolean) => {
    let updated = false;
    globalActivities = globalActivities.map(activity => {
      if (activity.id !== activityId || activity.reviewStatus !== 'pending') return activity;
      updated = true;
      return {
        ...activity,
        reviewStatus: approve ? 'approved' : 'rejected',
        reviewNote: approve ? undefined : '請修改活動資料後重新送審。',
        reviewedBy: reviewerId,
      };
    });
    if (updated) notify();
    return updated;
  };

  const distributeRewards = (activityId: number, participantId?: string) => {
    globalActivities = globalActivities.map(a =>
      a.id === activityId
        ? {
            ...a,
            tasks: a.tasks.map(task => ({ ...task, verified: true })),
            participantList: a.participantList.map(p =>
              (participantId ? p.id === participantId : !p.rewardClaimed)
                ? {
                    ...p,
                    rewardClaimed: true,
                    pointsEarned: a.tasks.reduce((sum, task) => {
                      const count = Math.min(p.taskProgress?.[task.id] || 0, task.targetCount);
                      return sum + Math.floor((task.points * count) / task.targetCount);
                    }, 0) + a.quiz.reduce((sum, question) =>
                      sum + (p.quizCorrect?.[question.id] ? question.points : 0), 0),
                    rewardPoints: a.tasks.reduce((sum, task) => {
                      const count = Math.min(p.taskProgress?.[task.id] || 0, task.targetCount);
                      return sum + Math.floor((task.points * count) / task.targetCount);
                    }, 0) + a.quiz.reduce((sum, question) =>
                      sum + (p.quizCorrect?.[question.id] ? question.points : 0), 0),
                  }
                : p
            ),
          }
        : a
    );
    notify();
  };

  return {
    activities: globalActivities,
    addActivity,
    joinActivity,
    joinByCode,
    toggleTask,
    scanOrganizerQr,
    completeAutoTask,
    ensureSocialCode,
    verifySocialCode,
    completeSocialTask,
    sendSocialRequest,
    respondSocialRequest,
    getSocialRequests,
    verifyTask,
    answerQuiz,
    claimReward,
    endActivity,
    deleteActivity,
    reviewActivity,
    distributeRewards,
  };
}
