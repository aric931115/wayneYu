import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trophy, Users, Check, X, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useActivities } from '@/hooks/useActivities';
import { useAppContext } from '@/contexts/AppContext';

type View = 'list' | 'add' | 'achievements';

const Social = () => {
  const [view, setView] = useState<View>('list');
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, friendRequests, sendFriendRequest, respondFriendRequest } = useAppContext();
  const { activities } = useActivities();
  const requests = friendRequests.filter(request => request.fromUserId === user.id || request.toUserId === user.id);

  const acceptedFriends = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    requests.filter(request => request.status === 'accepted').forEach(request => {
      const otherId = request.fromUserId === user.id ? request.toUserId : request.fromUserId;
      const otherName = (request.fromUserId === user.id ? request.toUserName : request.fromUserName) || otherId;
      map.set(otherId, { id: otherId, name: otherName });
    });
    return [...map.values()];
  }, [requests, user.id]);

  const incoming = requests.filter(request => request.toUserId === user.id && request.status === 'pending');
  const outgoing = requests.filter(request => request.fromUserId === user.id && request.status === 'pending');

  useVoiceAssistant(view === 'list' ? `社交頁面。你目前有${acceptedFriends.length}位已確認好友。` : view === 'add' ? '加入好友頁面。' : '成就頁面。');

  const sendById = () => {
    const id = searchId.trim();
    if (!id) return toast.error('請輸入使用者 ID。');
    const result = sendFriendRequest(id);
    if (result.success) {
      toast.success('好友邀請已送出，等待對方確認。');
      setSearchId('');
    } else if (result.reason === 'self') toast.error('不能輸入自己的 ID。');
    else if (result.reason === 'unknown') toast.error('找不到此使用者 ID，請確認對方已建立帳戶。');
    else if (result.reason === 'pending') toast.info('你們已有一筆待確認的好友邀請。');
    else if (result.reason === 'friends') toast.info('你們已經是好友了。');
    else if (result.reason === 'unauthenticated') toast.error('請先登入再加入好友。');
  };

  if (!isAuthenticated) {
    return (
      <div className="pb-24"><PageHeader title="社交" />
        <div className="mx-auto w-full max-w-xl p-4">
          <div className="card-accessible space-y-3 text-center">
            <p>登入後即可加入好友及查看好友邀請。</p>
            <button onClick={() => navigate('/account')} className="accessible-btn w-full bg-primary text-primary-foreground">前往登入</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'add') return (
    <div className="pb-24"><PageHeader title="加入好友" showBack />
      <div className="mx-auto w-full max-w-xl min-w-0 p-4 space-y-5">
        <p className="text-sm text-muted-foreground">輸入使用者 ID 即可送出好友邀請，不需要參加相同活動。好友關係獨立於社交任務驗證。</p>
        <div className="flex min-w-0 gap-2 sm:gap-3">
          <input value={searchId} onChange={event => setSearchId(event.target.value)} placeholder="輸入使用者 ID" aria-label="輸入使用者 ID" className="min-w-0 w-full flex-1 h-[60px] rounded-2xl border-2 border-input bg-background px-3 sm:px-4 text-base sm:text-lg font-bold" />
          <button onClick={sendById} aria-label="搜尋使用者並送出好友邀請" className="accessible-btn h-[60px] min-h-[60px] w-14 shrink-0 rounded-2xl bg-primary px-0 text-primary-foreground sm:w-16"><Search size={24} /></button>
        </div>
        {outgoing.length > 0 && <div className="space-y-2"><h2 className="font-bold">等待對方確認</h2>{outgoing.map(request => <div key={request.id} className="card-accessible flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 truncate">{request.toUserName}（{request.toUserId}）</span><span className="shrink-0 text-sm text-muted-foreground flex gap-1"><Clock size={16}/>等待確認</span></div>)}</div>}
      </div>
    </div>
  );

  if (view === 'achievements') {
    const achievements = [
      { title: '社交蝴蝶', desc: '加入 5 位好友', done: acceptedFriends.length >= 5 },
      { title: '初次連結', desc: '完成第一位好友確認', done: acceptedFriends.length >= 1 },
      { title: '活動達人', desc: '參加 3 場活動', done: activities.filter(activity => activity.participantList.some(participant => participant.id === user.id)).length >= 3 },
    ];
    return <div className="pb-24"><PageHeader title="成就功能" showBack /><div className="p-6 space-y-4">{achievements.map(achievement => <div key={achievement.title} className={`card-accessible flex items-center gap-4 ${achievement.done ? '' : 'opacity-50'}`}><div className="text-2xl">{achievement.done ? '🏆' : '🔒'}</div><div><div className="font-bold">{achievement.title}</div><div className="text-muted-foreground">{achievement.desc}</div></div></div>)}</div></div>;
  }

  return (
    <div className="pb-24"><PageHeader title="社交" />
      <div className="mx-auto w-full max-w-3xl p-4 space-y-4">
        <div className="flex gap-3">
          <button onClick={() => setView('add')} className="accessible-btn flex-1 bg-primary text-primary-foreground flex items-center justify-center gap-2"><UserPlus size={24}/>加好友</button>
          <button onClick={() => setView('achievements')} className="accessible-btn flex-1 bg-secondary text-secondary-foreground flex items-center justify-center gap-2"><Trophy size={24}/>成就</button>
        </div>
        {incoming.length > 0 && <div className="space-y-2"><h2 className="font-bold">待確認好友邀請</h2>{incoming.map(request => <div key={request.id} className="card-accessible space-y-2"><div><p className="font-bold">{request.fromUserName}</p><p className="text-xs text-muted-foreground">使用者 ID：{request.fromUserId}</p></div><div className="flex gap-2"><button onClick={() => { respondFriendRequest(request.id, false); toast.info('已拒絕好友邀請'); }} className="accessible-btn flex-1 bg-muted flex justify-center gap-1"><X size={18}/>拒絕</button><button onClick={() => { respondFriendRequest(request.id, true); toast.success('已接受好友邀請'); }} className="accessible-btn flex-1 bg-primary text-primary-foreground flex justify-center gap-1"><Check size={18}/>接受</button></div></div>)}</div>}
        <h2 className="font-bold text-lg pt-2 flex items-center gap-2"><Users size={20}/>好友列表（{acceptedFriends.length}）</h2>
        {acceptedFriends.length === 0 ? <div className="card-accessible text-center text-muted-foreground">目前尚無已確認好友。送出好友邀請並經對方接受後，會顯示在這裡。</div> : acceptedFriends.map(friend => <div key={friend.id} className="card-accessible flex min-w-0 items-center gap-4"><div className="w-14 h-14 shrink-0 rounded-full bg-muted flex items-center justify-center text-3xl">👤</div><div className="min-w-0"><div className="font-bold text-lg">{friend.name}</div><div className="break-all text-xs text-muted-foreground">{friend.id}</div></div></div>)}
      </div>
    </div>
  );
};
export default Social;
