import { describe, expect, it } from 'vitest';
import { getPointAchievementProgress } from '@/lib/achievements';

describe('point-based achievements', () => {
  it('unlocks milestones when cumulative points reach their thresholds', () => {
    const { achievements, nextAchievement, pointsToNext } = getPointAchievementProgress(30);

    expect(achievements.map(achievement => achievement.unlocked)).toEqual([true, true, false, false]);
    expect(nextAchievement?.title).toBe('任務達人');
    expect(pointsToNext).toBe(30);
  });

  it('reports all achievements unlocked at the final milestone', () => {
    const { achievements, nextAchievement, pointsToNext } = getPointAchievementProgress(100);

    expect(achievements.every(achievement => achievement.unlocked)).toBe(true);
    expect(nextAchievement).toBeNull();
    expect(pointsToNext).toBe(0);
  });

  it('does not count negative points toward achievement progress', () => {
    const { achievements, pointsToNext } = getPointAchievementProgress(-5);

    expect(achievements.every(achievement => !achievement.unlocked)).toBe(true);
    expect(pointsToNext).toBe(10);
  });
});
