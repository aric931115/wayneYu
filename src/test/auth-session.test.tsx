import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProvider, UserProfile, useAppContext } from '@/contexts/AppContext';

describe('demo authentication session', () => {
  beforeEach(() => localStorage.clear());

  it('starts logged out and retains demo users when switching and logging out', () => {
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AppProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);

    act(() => result.current.loginWithId('AB12345'));
    const firstUserId = result.current.user.id;
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.name).toBe('');
    expect(firstUserId).toBe('AB12345');
    act(() => result.current.updateProfile({
      id: firstUserId,
      name: 'NewUser',
      mbti: 'INTJ',
      department: 'Engineering',
      avatar: '👤',
    }));

    act(() => result.current.logout());
    expect(result.current.isAuthenticated).toBe(false);
    act(() => result.current.loginWithId(firstUserId));
    expect(result.current.user.name).toBe('NewUser');
    expect(result.current.user.mbti).toBe('INTJ');
    act(() => result.current.logout());

    act(() => result.current.switchDemoUser('USRA', 'XiaoM'));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.id).toBe('USRA');
    expect(result.current.user.name).toBe('XiaoM');

    act(() => {
      result.current.logout();
      result.current.switchDemoUser('USRB', 'XiaoH');
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.id).toBe('USRB');

    act(() => result.current.loginWithId('ZZ12345'));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.id).not.toBe(firstUserId);
    expect(result.current.user.name).toBe('');
  });

  it('supports friend requests without requiring a shared activity', () => {
    const recipient: UserProfile = {
      id: 'USRB',
      name: 'Friend1',
      mbti: '',
      department: '',
      avatar: '👤',
      role: 'participant',
      points: 0,
      achievements: [],
      history: [],
      pointHistory: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('campus-users-v2', JSON.stringify({ [recipient.id]: recipient }));
    const { result } = renderHook(() => useAppContext(), { wrapper: AppProvider });

    act(() => result.current.loginWithId('Sender1'));
    const senderId = result.current.user.id;

    let response: ReturnType<typeof result.current.sendFriendRequest>;
    act(() => {
      response = result.current.sendFriendRequest(recipient.id);
    });
    expect(response!.success).toBe(true);

    const requestId = result.current.friendRequests[0].id;
    act(() => {
      result.current.switchDemoUser(recipient.id, recipient.name);
    });
    act(() => result.current.respondFriendRequest(requestId, true));

    expect(result.current.friendRequests[0].status).toBe('accepted');
    act(() => result.current.switchDemoUser(senderId, 'Sender1'));
    expect(result.current.friendRequests[0].status).toBe('accepted');
  });

  it('rejects IDs with symbols and migrates legacy demo IDs to alphanumeric IDs', () => {
    const legacyProfile: UserProfile = {
      id: 'USR-A',
      name: 'XiaoM',
      mbti: '',
      department: '',
      avatar: '👤',
      role: 'participant',
      points: 9,
      achievements: [],
      history: [],
      pointHistory: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('campus-users-v2', JSON.stringify({ 'USR-A': legacyProfile }));
    localStorage.setItem('campus-activities-v2', JSON.stringify([{
      id: 1,
      participantList: [{ id: 'USR-A', socialPartners: { 2: ['USR-B'] } }],
    }]));

    const { result } = renderHook(() => useAppContext(), { wrapper: AppProvider });
    act(() => result.current.switchDemoUser('USRA', 'XiaoM'));

    expect(result.current.user.id).toBe('USRA');
    expect(result.current.user.id).toMatch(/^[A-Za-z0-9]{1,7}$/);
    expect(result.current.user.points).toBe(9);
    const migratedActivity = JSON.parse(localStorage.getItem('campus-activities-v2') || '[]');
    expect(migratedActivity[0].participantList[0].id).toBe('USRA');
    expect(migratedActivity[0].participantList[0].socialPartners[2]).toEqual(['USRB']);

    act(() => result.current.switchDemoUser('BAD-ID', 'Invalid'));
    expect(result.current.user.id).toBe('USRA');
  });
});
