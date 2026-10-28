import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Volume2, CheckCircle2, Circle, LogIn, Gamepad2, Copy, Settings2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useActivities } from '@/hooks/useActivities';
import { useAppContext } from '@/contexts/AppContext';

const ActivityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activities, joinActivity } = useActivities();
  const { user, addHistoryEntry } = useAppContext();
  const foundActivity = activities.find(a => a.id === Number(id));
  const activity = foundActivity
    && ((foundActivity.reviewStatus || 'approved') === 'approved'
      || foundActivity.organizerId === user.id
      || user.role === 'admin')
    ? foundActivity
    : undefined;
  const participant = activity?.participantList.find(p => p.id === user.id);
  const alreadyJoined = Boolean(participant || (activity && user.history.some(history => history.activityId === activity.id)));

  if (!activity) {
    return (
      <div className="pb-24">
        <PageHeader title="活動不存在" showBack />
        <div className="p-8 text-center text-muted-foreground text-lg">找不到此活動，請返回活動列表。</div>
      </div>
    );
  }

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-TW';
      u.rate = 0.9;
      speechSynthesis.speak(u);
      toast.success('正在朗讀中...');
    }
  };

  const handleJoin = () => {
    const joined = joinActivity(activity.id, { id: user.id, name: user.name || user.id });
    if (!joined) {
      toast.info('您已參加過此活動，不能重複加入。');
      return;
    }
    addHistoryEntry({
      activityId: activity.id,
      title: activity.title,
      date: activity.date,
      pointsEarned: 0,
      joinedAt: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      completed: false,
    });
    toast.success('已成功加入活動！');
  };

  return (
    <div className="pb-24">
      <PageHeader title={activity.title} showBack />

      <div className="mx-auto w-full max-w-4xl p-4 space-y-4">
        {activity.reviewStatus === 'pending' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            此活動尚待官方審查，核准後才會公開並開放參加。
          </div>
        )}
        {activity.reviewStatus === 'rejected' && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            此活動已由官方退回：{activity.reviewNote || '請修改活動資料後重新送審。'}
          </div>
        )}
        {/* Info card */}
        <div className="card-accessible space-y-3">
          <button
            onClick={() => toast.info(`發布者：${activity.organizerProfile?.name || activity.organizerName || '活動建立者'}；科系：${activity.organizerProfile?.department || '未提供'}`)}
            className="flex items-center gap-3 w-full text-left border-b border-border pb-3"
          >
            {activity.organizerAnonymous || !activity.organizerProfile?.avatar ? (
              <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-3xl">👤</span>
            ) : activity.organizerProfile.avatar.startsWith('data:image/') || activity.organizerProfile.avatar.startsWith('http') ? (
              <img src={activity.organizerProfile.avatar} alt="發起者頭像" className="h-14 w-14 rounded-full object-cover bg-muted" />
            ) : (
              <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-3xl">{activity.organizerProfile.avatar}</span>
            )}
            <span>
              <span className="block text-xs text-muted-foreground">活動發起者</span>
              <span className="block font-bold">{activity.organizerAnonymous ? '匿名' : activity.organizerProfile?.name || activity.organizerName || '活動建立者'}</span>
              <span className="block text-sm text-muted-foreground">點擊查看發起者資訊</span>
            </span>
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{activity.title}</h2>
              {activity.quiz.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 mt-1">
                  <Gamepad2 size={12} /> 含 {activity.quiz.length} 題問答挑戰
                </span>
              )}
            </div>
            <button
              onClick={() => speak(`${activity.title}。${activity.content}。時間：${activity.date}。${activity.noPhysicalLocation ? '無實體地點' : `地點：${activity.location}`}`)}
              className="w-12 h-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
              aria-label="朗讀活動內容"
            >
              <Volume2 size={24} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={16} />{activity.date}{activity.endDate !== activity.date ? `–${activity.endDate}` : ''} {activity.startTime}–{activity.endTime}</span>
            {!activity.noPhysicalLocation && <span className="flex items-center gap-1"><MapPin size={16} />{activity.location}</span>}
            <span className="flex items-center gap-1"><Users size={16} />{activity.maxParticipants > 0 ? `${activity.participants}/${activity.maxParticipants} 人` : `${activity.participants} 人`}已加入</span>
          </div>

          {/* Room code */}
          {alreadyJoined && activity.roomCode && (
            <button
              onClick={() => {
                const input = document.createElement('textarea');
                input.value = activity.roomCode;
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand('copy');
                input.remove();
                if (copied) toast.success(`房間代碼 ${activity.roomCode} 已複製！`);
                else toast.error('複製失敗，請手動記下房間代碼');
              }}
              className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2 active:scale-95 transition-transform"
            >
              <span className="text-xs text-muted-foreground">房間代碼</span>
              <span className="font-bold text-foreground tracking-widest">{activity.roomCode}</span>
              <Copy size={14} className="text-muted-foreground" />
            </button>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-foreground leading-relaxed">{activity.content}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              發布者：{activity.organizerAnonymous ? '匿名' : activity.organizerProfile?.name || activity.organizerName || '活動建立者'}
            </p>
          </div>
        </div>

        {/* Organizer manage entry */}
        {activity.organizerId === user.id && (
          <Button onClick={() => navigate(`/activities/${activity.id}/manage`)} variant="secondary" className="w-full h-14 text-lg font-bold rounded-2xl gap-2">
            <Settings2 size={22} /> 管理此活動
          </Button>
        )}

        {/* Join button */}
        {!alreadyJoined && activity.reviewStatus !== 'rejected' && (activity.reviewStatus || 'approved') === 'approved' ? (
          <Button onClick={handleJoin} disabled={activity.status === 'ended' || (activity.maxParticipants > 0 && activity.participants >= activity.maxParticipants)} className="w-full h-14 text-lg font-bold rounded-2xl gap-2" size="lg">
            <LogIn size={22} /> 加入活動
          </Button>
        ) : (
          <div className="bg-primary/10 text-primary rounded-2xl p-4 text-center font-bold text-lg">
            ✅ 您已加入此活動
          </div>
        )}

        {/* Tasks preview */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">📋 活動任務</h3>
          {!alreadyJoined && (
            <p className="text-sm text-muted-foreground">加入活動後即可進入任務房間</p>
          )}

          {activity.tasks.map(task => (
            <div key={task.id} className={`card-accessible flex items-start gap-3 ${!alreadyJoined ? 'opacity-60' : ''}`}>
              <div className="mt-0.5 flex-shrink-0">
                {(participant?.taskProgress?.[task.id] || 0) >= task.targetCount ? <CheckCircle2 size={28} className="text-primary" /> : <Circle size={28} className="text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-foreground ${(participant?.taskProgress?.[task.id] || 0) >= task.targetCount ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                <p className="text-sm text-muted-foreground">{task.desc}</p>
                <p className="text-xs text-muted-foreground mt-1">完成進度：{participant?.taskProgress?.[task.id] || 0}/{task.targetCount}</p>
                <p className="text-sm font-bold text-primary mt-1">任務完成獎勵：{task.points} 分</p>
              </div>
            </div>
          ))}

          {alreadyJoined && (
            <Link to={`/activities/${activity.id}/room`} className="block">
              <Button variant="secondary" className="w-full h-14 text-lg font-bold rounded-2xl gap-2">
                🚪 進入任務房間
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
