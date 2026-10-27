import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

const GUEST_KEY = 'campus-guest-profile-v1';
const guestId = (): string => {
  try {
    let id = localStorage.getItem('campus-guest-id-v1');
    if (!id) {
      id = `G${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      localStorage.setItem('campus-guest-id-v1', id);
    }
    return id;
  } catch { return 'GUEST'; }
};
const defaultUser: UserProfile = {
  id: guestId(),
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
  const { user: authUser, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    textSize: 'medium',
    highContrast: false,
    voiceAssistant: false,
  });
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
      return saved && saved.id === defaultUser.id ? { ...defaultUser, ...saved } : defaultUser;
    } catch { return defaultUser; }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 訪客可參與互動；非 Supabase 會員認證
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(loadFriendRequests);

  // Supabase is the only source of authenticated identity and role.
  React.useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setIsAuthenticated(true);
      try {
        const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
        setUser(saved && saved.id === defaultUser.id ? { ...defaultUser, ...saved } : defaultUser);
      } catch { setUser(defaultUser); }
      return;
    }
    if (!supabase) return;
    let alive = true;
    setIsAuthenticated(true);
    setUser({ ...defaultUser, id: authUser.id, name: authUser.email?.split('@')[0] || '', createdAt: authUser.created_at });
    const load = async () => {
      const { data, error } = await supabase.from('profiles').select('display_name,role,avatar_url').eq('id', authUser.id).maybeSingle();
      if (!alive) return;
      if (error) console.error('無法讀取 Supabase profiles:', error.message);
      if (data) setUser(current => current.id === authUser.id ? {
        ...current,
        name: data.display_name || current.name,
        role: data.role === 'organizer' || data.role === 'admin' ? 'organizer' : 'participant',
        avatar: data.avatar_url || '👤',
      } : current);
      const { data: points, error: pointsError } = await supabase.rpc('get_my_total_points');
      if (!alive) return;
      if (pointsError) console.error('無法取得積分:', pointsError.message);
      else {
        const totalPoints = Number(points);
        if (Number.isFinite(totalPoints)) {
          setUser(current => current.id === authUser.id ? { ...current, points: totalPoints } : current);
        }
      }
    };
    void load();
    return () => { alive = false; };
  }, [authUser, authLoading]);

  const updateSettings = (s: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...s }));

  React.useEffect(() => {
    if (authUser) return;
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(user));
      localStorage.setItem('campus-user-v2', JSON.stringify(user));
      const registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}');
      registry[user.id] = user;
      localStorage.setItem('campus-users-v2', JSON.stringify(registry));
    } catch (error) {
      console.error('Failed to save the signed-in user profile.', error);
    }
  }, [authUser, isAuthenticated, user]);

  React.useEffect(() => {
    try {
      localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(friendRequests));
    } catch (error) {
      console.error('Failed to save friend requests.', error);
    }
  }, [friendRequests]);

  const loginWithId = (id: string) => {
    if (authUser || !import.meta.env.DEV) return false;
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
    if (authUser && supabase) { void supabase.auth.signOut(); return; }
    setIsAuthenticated(true);
    setUser(defaultUser);
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

  const setRole = (role: UserRole) => { if (!authUser) setUser(u => ({ ...u, role })); };
  const addPoints = (amount: number, reason = '任務獎勵', activityId?: number, taskId?: number) => {
    if (authUser) return; // 真實積分只能由 Supabase RPC 發放
    setUser(u => ({
    ...u,
    points: u.points + amount,
    pointHistory: amount === 0 ? u.pointHistory : [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      points: amount, reason, activityId, taskId, createdAt: new Date().toLocaleString('zh-TW'),
    }, ...u.pointHistory],
  }));
  };
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
    if (authUser || !import.meta.env.DEV) return;
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
