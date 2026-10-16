import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Users, CheckCircle2, Circle, Award, BarChart3, StopCircle, Copy, Gift, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useActivities } from '@/hooks/useActivities';
import { useAppContext } from '@/contexts/AppContext';

const ManageActivity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activities, verifyTask, endActivity, deleteActivity, distributeRewards } = useActivities();
  const { user } = useAppContext();
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const activity = activities.find(a => a.id === Number(id));

  if (!activity) {
    return (
      <div className="pb-24">
        <PageHeader title="活動不存在" showBack />
        <div className="p-8 text-center text-muted-foreground text-lg">找不到此活動。</div>
      </div>
    );
  }

  if (activity.organizerId !== user.id) {
    return (
      <div className="pb-24">
        <PageHeader title="無管理權限" showBack />
        <div className="p-8 text-center text-muted-foreground text-lg">只有此活動的建立者可以進入管理頁面。</div>
      </div>
    );
  }

  const completedCount = activity.participantList.filter(p => p.completed).length;
  const avgProgress = activity.participantList.length > 0
    ? Math.round(activity.participantList.reduce((s, p) => s + p.progress, 0) / activity.participantList.length)
    : 0;
  const completionRate = activity.participantList.length > 0
    ? Math.round((completedCount / activity.participantList.length) * 100)
    : 0;
  const totalPointsAvailable = activity.tasks.reduce((sum, task) => sum + task.points, 0)
    + activity.quiz.reduce((sum, question) => sum + question.points, 0);

  return (
    <div className="pb-24">
      <PageHeader title={`管理：${activity.title}`} showBack />
      <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
        {/* 狀態與代碼 */}
        <div className="card-accessible space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">📣 活動狀態</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              activity.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
            }`}>
              {activity.status === 'active' ? '進行中' : '已結束'}
            </span>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-3">
            <p className="font-bold text-foreground">建立者專屬代碼</p>
            <p className="text-xl font-bold tracking-widest text-primary">{activity.organizerQrCode}</p>
            <p className="text-sm font-bold text-destructive">此代碼僅用於「活動發起者驗證」類型的實體任務，其他任務不使用此代碼。</p>
          </div>
          <p className="text-sm text-muted-foreground">
            活動時間：{activity.date}{activity.endDate !== activity.date ? `–${activity.endDate}` : ''} {activity.startTime}–{activity.endTime}
            {' · '}人數上限：{activity.maxParticipants > 0 ? activity.maxParticipants : '不限'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const input = document.createElement('textarea');
                input.value = activity.roomCode;
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand('copy');
                input.remove();
                if (copied) toast.success('已複製代碼！');
                else toast.error('複製失敗，請手動記下代碼');
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-xl px-3 py-3 active:scale-95"
            >
              <span className="text-sm text-muted-foreground">代碼</span>
              <span className="font-bold tracking-widest">{activity.roomCode}</span>
              <Copy size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* 成果統計 */}
        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={20} /> 活動成果統計
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">參與人數</p>
              <p className="text-2xl font-bold text-primary">{activity.participants}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">任務完成率</p>
              <p className="text-2xl font-bold text-primary">{completionRate}%</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">平均進度</p>
              <p className="text-2xl font-bold text-primary">{avgProgress}%</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-xs text-muted-foreground">任務獎勵積分合計</p>
              <p className="text-2xl font-bold text-primary">{totalPointsAvailable}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">這是此活動內各任務設定的積分合計；活動本身沒有另外的積分，參與者完成個別任務後依任務獎勵取得積分。</p>
        </div>

        {/* 參與者列表 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users size={20} /> 參與者（{activity.participantList.length}）
          </h2>
          {activity.participantList.length === 0 ? (
            <div className="card-accessible text-center text-muted-foreground py-6">尚無參與者</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
            {activity.participantList.map(p => (
              <div key={p.id} onClick={() => setSelectedParticipantId(selectedParticipantId === p.id ? null : p.id)} className="card-accessible space-y-2 w-full text-left cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">加入時間：{p.joinedAt}</p>
                  </div>
                  {p.completed ? (
                    <span className="bg-success/20 text-success px-2 py-0.5 rounded-full text-xs font-bold">已完成</span>
                  ) : (
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-bold">進行中</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">任務進度</span>
                    <span className="font-bold text-primary">{p.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground">各任務進度</p>
                  {activity.tasks.map(task => (
                    <div key={task.id} className="flex justify-between text-xs">
                      <span>{task.title}</span>
                      <span className="font-bold">{p.taskProgress?.[task.id] || 0}/{task.targetCount}</span>
                    </div>
                  ))}
                </div>
                {p.rewardClaimed && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Award size={12} /> 已發放 {p.rewardPoints || 0} 分
                  </p>
                )}
                {selectedParticipantId === p.id && p.completed && !p.rewardClaimed && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      distributeRewards(activity.id, p.id);
                      toast.success(`已發放 ${p.name} 的獎勵點數`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.stopPropagation();
                        distributeRewards(activity.id, p.id);
                        toast.success(`已發放 ${p.name} 的獎勵點數`);
                      }
                    }}
                    className="block rounded-xl bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground"
                  >
                    發放此參與者獎勵點數
                  </span>
                )}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* 任務驗證 */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">✅ 驗證任務進度</h2>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
            參與者需在任務房間依各任務設定的驗證方式完成任務；驗證成功並達到指定次數後，才會取得該任務的積分。此處的勾選僅供主辦人核對任務設定，不會增加參與者進度或發放積分。
          </div>
          {activity.tasks.map(t => (
            <div key={t.id} className="card-accessible flex items-start gap-3">
              <button
                onClick={() => { verifyTask(activity.id, t.id); toast.success('已驗證此任務'); }}
                disabled={t.verified}
                aria-label="驗證任務"
              >
                {t.verified ? <CheckCircle2 size={28} className="text-primary" /> : <Circle size={28} className="text-muted-foreground" />}
              </button>
              <div className="flex-1">
                <p className="font-bold text-foreground">{t.title}</p>
                {t.desc && <p className="text-sm text-muted-foreground">{t.desc}</p>}
                <p className="text-xs text-muted-foreground">完成 {t.completedCount}/{t.targetCount} 次 · {t.points} 分</p>
              </div>
            </div>
          ))}
        </div>

        {/* 動作區 */}
        <div className="space-y-3">
          <Button
            onClick={() => { distributeRewards(activity.id); toast.success('已依每位參與者的任務進度與答題結果智能發放獎勵'); }}
            className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
          >
            <Gift size={22} /> 依進度一鍵發放獎勵
          </Button>
          <p className="text-xs text-muted-foreground">完成的任務依比例計算任務積分，答對的問答題發放題目積分；未完成或答錯的部分不會發放。</p>
          {activity.status === 'active' ? (
            <Button
              variant="destructive"
              onClick={() => {
                endActivity(activity.id);
                toast.success('活動已結束');
                navigate('/activities');
              }}
              className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
            >
              <StopCircle size={22} /> 結束活動
            </Button>
          ) : (
            <div className="bg-muted rounded-2xl p-4 text-center text-muted-foreground font-bold">活動已結束</div>
          )}
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm('確定要刪除此活動嗎？刪除後無法復原。')) {
                deleteActivity(activity.id);
                toast.success('活動已刪除');
                navigate('/activities');
              }
            }}
            className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
          >
            <Trash2 size={22} /> 刪除活動
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManageActivity;
