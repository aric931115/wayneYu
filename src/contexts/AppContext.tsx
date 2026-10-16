import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppSettings {
  textSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  voiceAssistant: boolean;
}

export type UserRole = 'organizer' | 'participant';

export interface UserAchievement {
  id: string;
  title: string;
  desc: string;
  unlockedAt: string;
}

export interface UserHistoryEntry {
  activityId: number;
  title: string;
  date: string;
  pointsEarned: number;
  joinedAt: string;
  completed: boolean;
}

export interface PointHistoryEntry {
  id: string;
  points: number;
  reason: string;
  activityId?: number;
  taskId?: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mbti: string;
  department: string;
  avatar: string;
  role: UserRole;
  points: number;
  achievements: UserAchievement[];
  history: UserHistoryEntry[];
  pointHistory: PointHistoryEntry[];
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  user: UserProfile;
  isAuthenticated: boolean;
  loginWithId: (id: string) => boolean;
  logout: () => void;
  friendRequests: FriendRequest[];
  sendFriendRequest: (toUserId: string) => { success: boolean; reason?: 'self' | 'unknown' | 'pending' | 'friends' | 'unauthenticated' };
  respondFriendRequest: (requestId: string, accept: boolean) => void;
  setRole: (role: UserRole) => void;
  addPoints: (amount: number, reason?: string, activityId?: number, taskId?: number) => void;
  addHistoryEntry: (entry: UserHistoryEntry) => void;
  unlockAchievement: (a: UserAchievement) => void;
  updateProfile: (profile: Pick<UserProfile, 'id' | 'name' | 'mbti' | 'department' | 'avatar'>) => void;
  switchDemoUser: (id: string, name?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const FRIEND_REQUESTS_KEY = 'campus-friend-requests-v1';

const loadFriendRequests = (): FriendRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(FRIEND_REQUESTS_KEY) || '[]') as FriendRequest[];
  } catch {
    return [];
  }
};

const defaultUser: UserProfile = {
  id: 'USR0001',
  name: '',
  mbti: '',
  department: '尚未填寫科系',
  avatar: '👤',
  role: 'participant',
  points: 0,
  achievements: [],
  history: [],
  pointHistory: [],
  createdAt: new Date().toISOString(),
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>({
    textSize: 'medium',
    highContrast: false,
    voiceAssistant: false,
  });
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(loadFriendRequests);

  const updateSettings = (s: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...s }));

  React.useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem('campus-user-v2', JSON.stringify(user));
      const registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}');
      registry[user.id] = user;
      localStorage.setItem('campus-users-v2', JSON.stringify(registry));
    } catch (error) {
      console.error('Failed to save the signed-in user profile.', error);
    }
  }, [isAuthenticated, user]);

  React.useEffect(() => {
    try {
      localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(friendRequests));
    } catch (error) {
      console.error('Failed to save friend requests.', error);
    }
  }, [friendRequests]);

  const loginWithId = (id: string) => {
    const normalizedId = id.trim();
    if (!/^[A-Za-z0-9]{1,7}$/.test(normalizedId)) return false;
    let registry: Record<string, UserProfile> = {};
    try {
      registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}') as Record<string, UserProfile>;
    } catch {
      registry = {};
    }
    const existing = registry[normalizedId];
    setUser(existing
      ? { ...defaultUser, ...existing, name: /^[A-Za-z0-9]{1,7}$/.test(existing.name) ? existing.name : '', mbti: existing.mbti || '' }
      : { ...defaultUser, id: normalizedId, name: '', createdAt: new Date().toISOString() });
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser({ ...defaultUser, createdAt: new Date().toISOString() });
  };

  const sendFriendRequest = (toUserId: string) => {
    if (!isAuthenticated) return { success: false, reason: 'unauthenticated' as const };
    const normalizedId = toUserId.trim();
    if (normalizedId === user.id) return { success: false, reason: 'self' as const };
    let registry: Record<string, UserProfile>;
    try {
      registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}') as Record<string, UserProfile>;
    } catch {
      registry = {};
    }
    const recipient = registry[normalizedId];
    if (!recipient) return { success: false, reason: 'unknown' as const };

    const existing = friendRequests.find(request =>
      (request.fromUserId === user.id && request.toUserId === normalizedId)
      || (request.fromUserId === normalizedId && request.toUserId === user.id)
    );
    if (existing?.status === 'accepted') return { success: false, reason: 'friends' as const };
    if (existing?.status === 'pending') return { success: false, reason: 'pending' as const };

    setFriendRequests(current => [{
      id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromUserId: user.id,
      fromUserName: user.name || user.id,
      toUserId: recipient.id,
      toUserName: recipient.name || recipient.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, ...current]);
    return { success: true };
  };

  const respondFriendRequest = (requestId: string, accept: boolean) => {
    if (!isAuthenticated) return;
    setFriendRequests(current => current.map(request =>
      request.id === requestId && request.toUserId === user.id && request.status === 'pending'
        ? { ...request, status: accept ? 'accepted' : 'rejected' }
        : request
    ));
  };

  const setRole = (role: UserRole) => setUser(u => ({ ...u, role }));
  const addPoints = (amount: number, reason = '任務獎勵', activityId?: number, taskId?: number) => setUser(u => ({
    ...u,
    points: u.points + amount,
    pointHistory: amount === 0 ? u.pointHistory : [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      points: amount, reason, activityId, taskId, createdAt: new Date().toLocaleString('zh-TW'),
    }, ...u.pointHistory],
  }));
  const addHistoryEntry = (entry: UserHistoryEntry) =>
    setUser(u => u.history.some(historyEntry => historyEntry.activityId === entry.activityId)
      ? u
      : { ...u, history: [entry, ...u.history] });
  const unlockAchievement = (a: UserAchievement) =>
    setUser(u => u.achievements.some(x => x.id === a.id) ? u : { ...u, achievements: [a, ...u.achievements] });
  const updateProfile = (profile: Pick<UserProfile, 'id' | 'name' | 'mbti' | 'department' | 'avatar'>) =>
    setUser(u => {
      const updated = { ...u, ...profile };
      if (u.id !== updated.id) {
        try {
          const registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}') as Record<string, UserProfile>;
          if (registry[u.id]) delete registry[u.id];
          registry[updated.id] = updated;
          localStorage.setItem('campus-users-v2', JSON.stringify(registry));
        } catch (error) {
          console.error('Failed to update the user ID in the profile registry.', error);
        }
      }
      return updated;
    });

  const switchDemoUser = (id: string, name?: string) => {
    if (!/^[A-Za-z0-9]{1,7}$/.test(id)) {
      console.error('Refused to switch to an invalid user ID.');
      return;
    }
    const legacyIds: Record<string, string> = { 'USR-A': 'USRA', 'USR-B': 'USRB' };
    const demoIds: Record<string, string> = { USRA: 'USR-A', USRB: 'USR-B' };
    let migratedName = name && /^[A-Za-z0-9]{1,7}$/.test(name) ? name : id;
    const migratedNames: Record<string, string> = {};
    try {
      const registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}') as Record<string, UserProfile>;
      Object.entries(demoIds).forEach(([validId, legacyId]) => {
        if (!registry[validId] && registry[legacyId]) {
          registry[validId] = { ...registry[legacyId], id: validId };
        }
        if (registry[legacyId]) delete registry[legacyId];
        const profileName = registry[validId]?.name;
        migratedNames[legacyId] = profileName && /^[A-Za-z0-9]{1,7}$/.test(profileName) ? profileName : validId;
      });
      if (demoIds[id]) {
        const selectedLegacyId = demoIds[id];
        if (!registry[id] && registry[selectedLegacyId]) {
          registry[id] = { ...registry[selectedLegacyId], id };
        }
        if (registry[selectedLegacyId]) delete registry[selectedLegacyId];
      }
      const existing = registry[id] as UserProfile | undefined;
      const safeName = name && /^[A-Za-z0-9]{1,7}$/.test(name) ? name : id;
      migratedName = existing?.name && /^[A-Za-z0-9]{1,7}$/.test(existing.name) ? existing.name : safeName;
      setUser(existing && /^[A-Za-z0-9]{1,7}$/.test(existing.name)
        ? existing
        : { ...defaultUser, ...existing, id, name: safeName, mbti: existing?.mbti || '', createdAt: existing?.createdAt || new Date().toISOString() });
      localStorage.setItem('campus-users-v2', JSON.stringify(registry));
    } catch {
      console.error('Failed to load the demo user registry; using a new demo profile.');
      setUser({ ...defaultUser, id, name: name && /^[A-Za-z0-9]{1,7}$/.test(name) ? name : id, createdAt: new Date().toISOString() });
    }
    if (demoIds[id]) {
      try {
        const activities = JSON.parse(localStorage.getItem('campus-activities-v2') || '[]') as Array<{
          participantList?: Array<{ id: string; socialPartners?: Record<number, string[]> }>;
        }>;
        const hasLegacyParticipant = activities.some(activity => activity.participantList?.some(participant => legacyIds[participant.id]));
        if (hasLegacyParticipant) {
          const migratedActivities = activities.map(activity => ({
            ...activity,
            participantList: activity.participantList?.map(participant => ({
              ...participant,
              id: legacyIds[participant.id] || participant.id,
              socialPartners: participant.socialPartners
                ? Object.fromEntries(Object.entries(participant.socialPartners).map(([taskId, partnerIds]) => [
                    taskId,
                    partnerIds.map(partnerId => legacyIds[partnerId] || partnerId),
                  ]))
                : undefined,
            })),
          }));
          localStorage.setItem('campus-activities-v2', JSON.stringify(migratedActivities));
        }
      } catch (error) {
        console.error('Failed to migrate demo user activity records.', error);
      }
      setFriendRequests(current => current.map(request => ({
        ...request,
        fromUserId: legacyIds[request.fromUserId] || request.fromUserId,
        toUserId: legacyIds[request.toUserId] || request.toUserId,
        fromUserName: legacyIds[request.fromUserId] ? migratedNames[request.fromUserId] : request.fromUserName,
        toUserName: legacyIds[request.toUserId] ? migratedNames[request.toUserId] : request.toUserName,
      })));
    }
    setIsAuthenticated(true);
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, user, isAuthenticated, loginWithId, logout, friendRequests, sendFriendRequest, respondFriendRequest, setRole, addPoints, addHistoryEntry, unlockAchievement, updateProfile, switchDemoUser }}>
      <div className={`${settings.highContrast ? 'high-contrast' : ''} text-size-${settings.textSize}`}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be within AppProvider');
  return ctx;
};
