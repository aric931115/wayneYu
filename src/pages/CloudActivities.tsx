import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';

type Json = Record<string, unknown>;
type CloudActivity = { id:string; title:string; description:string|null; organizer_id:string; category:string|null; location:string|null; start_time:string; end_time:string; max_participants:number|null; reward_points:number|null; status:string };
type CloudTask = { id:string; activity_id:string; title:string; description:string|null; task_type:string; verification_type:string; game_type:string|null; config:Json|null; sort_order:number };
type Participant = { user_id:string; status:string; joined_at:string };
type Progress = { task_id:string; user_id:string; status:string; submission:Json|null; verified_at:string|null };
type Request = { id:string; task_id:string; sender_id:string; receiver_id:string; status:string };
type OrganizerSubmission = { progress_id:string; task_id:string; task_title:string; participant_id:string; participant_name:string; progress_status:string; submission:Json|null; submitted_at:string };
type Achievement = { achievement_id:string; unlocked_at:string; achievements:{name:string; description:string|null}|null };
const msg = (e:unknown) => e instanceof Error ? e.message : String(e);
const dateText = (s:string) => new Date(s).toLocaleString('zh-TW');

export default function CloudActivities() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { user: appUser } = useAppContext();
  const [activities, setActivities] = useState<CloudActivity[]>([]);
  const [tasks, setTasks] = useState<CloudTask[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [organizerSubmissions, setOrganizerSubmissions] = useState<OrganizerSubmission[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [points, setPoints] = useState<number|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const activity = activities.find(a=>a.id===id);
  const isOrganizer = Boolean(activity && user && activity.organizer_id===user.id);
  const joined = Boolean(user && participants.some(p=>p.user_id===user.id && p.status==='registered'));
  const myProgress = progress.filter(p=>p.user_id===user?.id);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const a = await supabase.from('activities').select('id,title,description,organizer_id,category,location,start_time,end_time,max_participants,reward_points,status').in('status',['published','ongoing','completed']);
      if (a.error) throw a.error;
      setActivities((a.data||[]) as CloudActivity[]);
      if (id) {
        const [t,p,pr] = await Promise.all([
          supabase.from('tasks').select('id,activity_id,title,description,task_type,verification_type,game_type,config,sort_order').eq('activity_id',id).order('sort_order'),
          supabase.from('activity_participants').select('user_id,status,joined_at').eq('activity_id',id),
          supabase.from('task_progress').select('task_id,user_id,status,submission,verified_at').in('task_id', (await supabase.from('tasks').select('id').eq('activity_id',id)).data?.map(x=>x.id) || ['00000000-0000-0000-0000-000000000000'])
        ]);
        if(t.error) throw t.error;
        if(p.error) throw p.error;
        if(pr.error) throw pr.error;
        setTasks((t.data||[]) as CloudTask[]); setParticipants((p.data||[]) as Participant[]); setProgress((pr.data||[]) as Progress[]);
      }
      const selectedActivity = (a.data || []).find(x => x.id === id);
      if (user && id && selectedActivity?.organizer_id === user.id) {
        const reviewResult = await supabase.rpc('get_organizer_task_submissions', { p_activity_id: id });
        if (reviewResult.error) throw reviewResult.error;
        setOrganizerSubmissions((reviewResult.data || []) as OrganizerSubmission[]);
      } else {
        setOrganizerSubmissions([]);
      }
      if(user) {
        const [r,ach,score] = await Promise.all([
          supabase.from('social_requests').select('id,task_id,sender_id,receiver_id,status').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
          supabase.from('user_achievements').select('achievement_id,unlocked_at,achievements(name,description)').eq('user_id',user.id),
          supabase.rpc('get_my_total_points')
        ]);
        if(r.error) throw r.error;
        setRequests((r.data||[]) as Request[]);
        if(!ach.error) setAchievements((ach.data||[]) as unknown as Achievement[]);
        if(!score.error) setPoints(Number(score.data||0));
      }
    } catch(e) { setError(msg(e)); }
    finally { setLoading(false); }
  },[id,user]);
  useEffect(()=>{ void refresh(); },[refresh]);

  const act = async (action:()=>Promise<void>)=>{
    if(!user){toast.error('請先登入 Supabase 帳號');return;}
    setBusy(true);
    try {await action(); await refresh();toast.success('已同步至 Supabase');}
    catch(e){toast.error(`雲端操作失敗：${msg(e)}`);}
    finally{setBusy(false);}
  };
  const join = ()=>act(async()=>{
    if(!activity || !user) return;
    const {error:e}=await supabase.from('activity_participants').insert({activity_id:activity.id,user_id:user.id,status:'registered'});
    if(e) throw e;
  });
  return <div className="pb-28"><PageHeader title={id?'雲端活動與任務':'Supabase 雲端活動'} showBack />
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="card-accessible space-y-2"><p className="font-bold">Supabase 雲端資料</p><p className="text-sm text-muted-foreground">此頁直接讀取 Supabase，不使用瀏覽器假資料。任務驗證、任務審核及獎勵領取目前暫停，待官方審查與積分核發流程完成資料庫端串接後再開放。</p>
      <div className="flex gap-2 flex-wrap"><Button variant="outline" onClick={()=>void refresh()} disabled={loading||busy}>重新同步</Button>{appUser.role === 'organizer' && <Link className="underline text-primary" to="/activities/create">建立活動</Link>}<Link className="underline text-primary" to="/auth">登入／註冊</Link><Link className="underline text-primary" to="/account">我的帳戶</Link></div>
      {authLoading?<p>確認登入狀態中…</p>:<p className="text-sm">{user?`目前會員：${user.email}（${user.id}）`:'尚未登入：可瀏覽公開活動；參與、驗證、積分需要登入。'}</p>}
      </div>
      {error&&<div role="alert" className="card-accessible text-destructive">讀取失敗：{error}</div>}
      {loading&&<p>正在讀取雲端資料…</p>}
      {!id ? <div className="space-y-3">{activities.map(a=><Link key={a.id} to={`/cloud-activities/${a.id}`} className="card-accessible block space-y-1"><h2 className="text-lg font-bold">{a.title}</h2><p>{a.description}</p><p className="text-sm">{dateText(a.start_time)} · {a.location||'線上活動'} · {a.status}</p></Link>)}{!loading&&activities.length===0&&<p>目前沒有可顯示的公開活動。</p>}</div>
      : !activity ? (!loading&&<div className="card-accessible">找不到活動，或目前帳號沒有讀取權限。<Link to="/cloud-activities" className="underline">返回列表</Link></div>)
      : <>
        <div className="card-accessible space-y-2"><h2 className="text-xl font-bold">{activity.title}</h2><p>{activity.description}</p><p>時間：{dateText(activity.start_time)} 至 {dateText(activity.end_time)}</p><p>地點：{activity.location||'線上活動'}</p><p>主辦人 UUID：{activity.organizer_id}</p><p>報名名單可見人數：{participants.length}（依 RLS 可能只顯示自己）</p>
        {!isOrganizer&&!joined&&<Button disabled={busy||!user} onClick={join}>加入活動（寫入 Supabase）</Button>}
        {joined&&<p className="text-primary font-bold">✓ 已加入活動</p>}{isOrganizer && (
        <div className="space-y-2">
          <p className="text-primary font-bold">
            你是此活動的主辦人
          </p>

          <Link
            to={`/cloud-activities/${activity.id}/manage`}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground"
          >
            管理這場活動
          </Link>
                </div>
      )}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-lg">活動任務（唯讀）</h3>{tasks.map(task=>{
          const mine=myProgress.find(p=>p.task_id===task.id);
          const isQuiz = task.game_type === 'quiz';
          const quizOptions: string[] = isQuiz && Array.isArray(task.config?.options)
            ? task.config.options.filter((option): option is string => typeof option === 'string')
            : [];
          return <div key={task.id} className="card-accessible space-y-3"><h4 className="font-bold">{task.title}</h4><p>{task.description}</p><p className="text-sm">驗證方式：{task.verification_type==='auto'?'自動':task.verification_type==='social'?'社交':'主辦人'} · 積分：{Number(task.config?.points||0)}</p><p className="text-sm">我的進度：{mine?.status||'尚未提交'}{mine?.verified_at?`（${dateText(mine.verified_at)}）`:''}</p>
          {isQuiz && <ul className="list-disc pl-5 text-sm">{quizOptions.map((option,index)=><li key={index}>{String.fromCharCode(65+index)}. {option}</li>)}</ul>}
          {isOrganizer&&task.verification_type==='organizer'&&<div className="space-y-2"><p className="text-sm font-bold">待審任務資料（唯讀，審核暫停）</p>{organizerSubmissions.filter(p=>p.task_id===task.id).map(p=><div key={p.progress_id} className="border rounded-lg p-3 space-y-2"><p className="text-sm">提交者：{p.participant_name}</p><p className="text-xs break-all">{p.participant_id}</p><p className="text-sm">狀態：{p.progress_status==='submitted'?'待審核':p.progress_status==='verified'?'已通過':'已退回'}</p><p className="text-xs break-all whitespace-pre-wrap">提交內容：{JSON.stringify(p.submission)}</p></div>)}{!organizerSubmissions.some(p=>p.task_id===task.id)&&<p className="text-sm text-muted-foreground">目前沒有待審核或已審核紀錄。</p>}</div>}
          </div>;
        })}{tasks.length===0&&<p>這場活動尚無任務，或任務 SELECT 政策尚未允許讀取。</p>}</div>
        <div className="card-accessible space-y-3"><h3 className="font-bold">社交驗證請求（唯讀）</h3>{requests.filter(r=>tasks.some(t=>t.id===r.task_id)).map(r=><div key={r.id} className="border rounded-lg p-3 space-y-2"><p className="text-xs break-all">任務 {r.task_id} · {r.sender_id} → {r.receiver_id} · {r.status}</p></div>)}{!requests.some(r=>tasks.some(t=>t.id===r.task_id))&&<p className="text-sm">目前沒有相關請求。</p>}</div>
        {joined&&<div className="card-accessible space-y-2"><h3 className="font-bold">活動完成獎勵（暫停）</h3><p>獎勵：{activity.reward_points||0} 分。待官方資料庫審查與核發流程完成後開放。</p></div>}
      </>}
      {user&&<div className="card-accessible space-y-2"><h3 className="font-bold">我的雲端積分與成就</h3><p>積分：{points===null?'尚未取得（可能尚未部署 RPC）':points}</p>{achievements.map(a=><p key={a.achievement_id}>🏆 {a.achievements?.name||a.achievement_id} · {dateText(a.unlocked_at)}</p>)}{achievements.length===0&&<p className="text-sm">目前沒有已解鎖成就，或資料庫尚未更新。</p>}</div>}
    </div></div>;
}
