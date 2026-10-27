export interface PointAchievement {
  id: string;
  title: string;
  description: string;
  requiredPoints: number;
  icon: string;
}

export const POINT_ACHIEVEMENTS: PointAchievement[] = [
  { id: 'points-10', title: '初露鋒芒', description: '累積獲得 10 積分', requiredPoints: 10, icon: '🌱' },
  { id: 'points-30', title: '積分收藏家', description: '累積獲得 30 積分', requiredPoints: 30, icon: '💎' },
  { id: 'points-60', title: '任務達人', description: '累積獲得 60 積分', requiredPoints: 60, icon: '🏅' },
  { id: 'points-100', title: '校園傳奇', description: '累積獲得 100 積分', requiredPoints: 100, icon: '🏆' },
];

export const getPointAchievementProgress = (points: number) => {
  const totalPoints = Math.max(0, points);
  const achievements = POINT_ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: totalPoints >= achievement.requiredPoints,
  }));
  const nextAchievement = achievements.find(achievement => !achievement.unlocked) ?? null;

  return {
    achievements,
    nextAchievement,
    pointsToNext: nextAchievement ? nextAchievement.requiredPoints - totalPoints : 0,
  };
};
