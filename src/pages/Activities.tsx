import { Volume2, MapPin, Clock, Users, Gamepad2, School, Lock, Plus, Settings2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { Link, useNavigate } from 'react-router-dom';
import { useActivities, ActivityCategory } from '@/hooks/useActivities';
import { useAppContext } from '@/contexts/AppContext';
import { useState } from 'react';

const CATEGORY_META: Record<ActivityCategory, { label: string; icon: typeof School; color: string }> = {
  campus: { label: '校園', icon: School, color: 'text-primary bg-primary/10' },
  private: { label: '私人', icon: Lock, color: 'text-muted-foreground bg-muted' },
};

const Activities = () => {
  const { activities } = useActivities();
  const { user, isAuthenticated } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | ActivityCategory | 'joined' | 'mine'>('all');

  const filtered = filter === 'all'
    ? activities
    : filter === 'joined'
      ? activities.filter(a => a.joined || user.history.some(history => history.activityId === a.id))
      : filter === 'mine'
        ? activities.filter(a => isAuthenticated && a.organizerId === user.id)
      : activities.filter(a => a.category === filter);

  useVoiceAssistant(`校園活動頁面。共有${activities.length}個活動。每個人都可以建立與參加活動。`);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-TW';
      u.rate = 0.9;
      speechSynthesis.speak(u);
      toast.success('正在朗讀中...');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title="校園活動" />
      <div className="mx-auto w-full max-w-6xl p-4 space-y-4">
        <div className="bg-secondary text-secondary-foreground rounded-2xl p-3 font-bold overflow-hidden">
          <div className="flex w-max gap-10 animate-marquee whitespace-nowrap">
            {[...activities, ...activities].map((activity, index) => (
              <button key={`${activity.id}-${index}`} onClick={() => navigate(`/activities/${activity.id}`)} className="hover:underline">
                📢 最新公告：{activity.title}
              </button>
            ))}
          </div>
        </div>

        {/* 角色提示與發起者快捷 */}
        {isAuthenticated && (
          <button
            onClick={() => navigate('/activities/create')}
            className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2"
          >
            <Plus size={24} /> 建立新活動
          </button>
        )}

        {/* 類別篩選 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'campus', 'private', 'joined', 'mine'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap border-2 transition-colors ${
                filter === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {k === 'all' ? '全部' : k === 'joined' ? '已加入' : k === 'mine' ? '我的活動' : CATEGORY_META[k].label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(e => {
            const meta = CATEGORY_META[e.category];
            const Icon = meta.icon;
            return (
              <Link key={e.id} to={`/activities/${e.id}`} className="card-accessible space-y-3 block min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${meta.color}`}>
                      <Icon size={12} /> {meta.label}
                    </span>
                    {e.tags.map((tag, index) => (
                      <span
                        key={`${tag.label}-${index}`}
                        className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        #{tag.label}
                      </span>
                    ))}
                    {e.quiz.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        <Gamepad2 size={12} /> 含問答
                      </span>
                    )}
                    {e.status === 'ended' && (
                      <span className="text-xs font-bold bg-muted text-muted-foreground rounded-full px-2 py-0.5">已結束</span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{e.title}</h2>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {isAuthenticated && e.organizerId === user.id && (
                    <button
                      onClick={(ev) => { ev.preventDefault(); navigate(`/activities/${e.id}/manage`); }}
                      className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-90"
                      aria-label="管理活動"
                    >
                      <Settings2 size={22} />
                    </button>
                  )}
                  <button
                    onClick={(ev) => { ev.preventDefault(); speak(`${e.title}。${e.desc}。時間：${e.date}。${e.noPhysicalLocation ? '無實體地點' : `地點：${e.location}`}`); }}
                    className="w-12 h-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center active:scale-90"
                    aria-label={`朗讀 ${e.title}`}
                  >
                    <Volume2 size={22} />
                  </button>
                </div>
              </div>
              <p className="text-muted-foreground">{e.desc}</p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={16} />{e.date}{e.endDate !== e.date ? `–${e.endDate}` : ''} {e.startTime}–{e.endTime}</span>
                {!e.noPhysicalLocation && <span className="flex items-center gap-1"><MapPin size={16} />{e.location}</span>}
                <span className="flex items-center gap-1"><Users size={16} />{e.maxParticipants > 0 ? `${e.participants}/${e.maxParticipants} 人` : `${e.participants} 人`}</span>
              </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Activities;
