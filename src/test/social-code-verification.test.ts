import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useActivities } from '@/hooks/useActivities';

describe('social task code verification', () => {
  it('credits the code entrant and prevents self, cross-task, and duplicate verification', () => {
    const { result } = renderHook(() => useActivities());
    let activityId = 0;
    act(() => {
      const activity = result.current.addActivity({
        title: `Social verification ${Date.now()}`,
        date: '2026-10-20',
        endDate: '2026-10-20',
        startTime: '10:00',
        endTime: '12:00',
        location: 'Campus',
        desc: 'Test activity',
        content: 'Test activity',
        category: 'campus',
        tags: [],
        maxParticipants: 10,
        tasks: [
          { id: 1, title: 'Meet participants', desc: '', type: 'general', targetCount: 2, completedCount: 0, points: 3, completed: false, verificationType: 'social' },
          { id: 2, title: 'Second social task', desc: '', type: 'general', targetCount: 1, completedCount: 0, points: 2, completed: false, verificationType: 'social' },
        ],
        quiz: [],
        roomCode: '',
        roomGamePoints: 0,
        organizerId: 'organizer',
      });
      activityId = activity.id;
      result.current.reviewActivity(activityId, 'ADMIN1', true);
    });

    act(() => {
      result.current.joinActivity(activityId, { id: 'USRA', name: 'A' });
      result.current.joinActivity(activityId, { id: 'USRB', name: 'B' });
      result.current.joinActivity(activityId, { id: 'USRC', name: 'C' });
    });

    let codeA = '';
    let codeB = '';
    let codeC = '';
    let codeBForOtherTask = '';
    act(() => {
      codeA = result.current.ensureSocialCode(activityId, 1, 'USRA');
      codeB = result.current.ensureSocialCode(activityId, 1, 'USRB');
      codeC = result.current.ensureSocialCode(activityId, 1, 'USRC');
      codeBForOtherTask = result.current.ensureSocialCode(activityId, 2, 'USRB');
    });

    let selfResult: ReturnType<typeof result.current.verifySocialCode>;
    let wrongTaskResult: ReturnType<typeof result.current.verifySocialCode>;
    let firstUse: ReturnType<typeof result.current.verifySocialCode>;
    let duplicateUse: ReturnType<typeof result.current.verifySocialCode>;
    let completion: ReturnType<typeof result.current.verifySocialCode>;
    let reciprocalUse: ReturnType<typeof result.current.verifySocialCode>;
    act(() => {
      selfResult = result.current.verifySocialCode(activityId, 1, 'USRA', codeA);
      wrongTaskResult = result.current.verifySocialCode(activityId, 1, 'USRA', codeBForOtherTask);
      firstUse = result.current.verifySocialCode(activityId, 1, 'USRA', codeB);
      duplicateUse = result.current.verifySocialCode(activityId, 1, 'USRA', codeB);
      completion = result.current.verifySocialCode(activityId, 1, 'USRA', codeC);
      reciprocalUse = result.current.verifySocialCode(activityId, 1, 'USRB', codeA);
    });

    expect(selfResult!.reason).toBe('self');
    expect(wrongTaskResult!.reason).toBe('invalid');
    expect(firstUse!.valid).toBe(true);
    expect(duplicateUse!.reason).toBe('duplicate');
    expect(completion).toMatchObject({ valid: true, completed: true, points: 3 });
    expect(reciprocalUse!.valid).toBe(true);
    expect(result.current.activities.find(item => item.id === activityId)?.participantList.find(p => p.id === 'USRA')?.taskProgress?.[1]).toBe(2);
    expect(result.current.activities.find(item => item.id === activityId)?.participantList.find(p => p.id === 'USRB')?.taskProgress?.[1]).toBe(1);

    act(() => result.current.deleteActivity(activityId));
  });
});
