import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trophy, Users, Check, X, Clock, ShoppingBag, Sparkles } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useAppContext } from '@/contexts/AppContext';
import { getPointAchievementProgress } from '@/lib/achievements';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { COSMETICS, type OwnedCosmetic } from '@/lib/cosmetics';

type View = 'list' | 'add' | 'achievements' | 'shop';

const Social = () => {
  const [view, setView] = useState<View>('list');
  const [searchId, setSearchId] = useState('');
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [ownedCosmetics, setOwnedCosmetics] = useState<OwnedCosmetic[]>([]);
  const [shopError, setShopError] = useState('');
  const [purchaseBusy, setPurchaseBusy] = useState('');
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const authUserId = authUser?.id;
  const { user, isAuthenticated, friendRequests, sendFriendRequest, respondFriendRequest } = useAppContext();
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

  const refreshShop = useCallback(async () => {
    if (!authUserId || !supabase) {
      setAvailablePoints(null);
      setOwnedCosmetics([]);
      setShopError('');
      return;
    }
    const [pointsResult, ownedResult] = await Promise.all([
      supabase.rpc('get_my_available_points'),
      supabase.from('cosmetic_purchases').select('item_id,slot,purchased_at,equipped').eq('user_id', authUserId),
    ]);
    const errors = [pointsResult.error?.message, ownedResult.error?.message].filter(Boolean);
    if (errors.length) setShopError(errors.join('；'));
    else setShopError('');
    setAvailablePoints(pointsResult.error ? null : Number(pointsResult.data ?? 0));
    setOwnedCosmetics(ownedResult.error ? [] : ownedResult.data as OwnedCosmetic[]);
  }, [authUserId]);

  useEffect(() => {
    if (view === 'shop') void refreshShop();
  }, [view, refreshShop]);

  useEffect(() => {
    if (view !== 'shop') return;
    const refresh = () => { if (document.visibilityState === 'visible') void refreshShop(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('cosmetics-changed', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('cosmetics-changed', refresh);
      window.clearInterval(timer);
    };
  }, [view, refreshShop]);

  useVoiceAssistant(view === 'list' ? `社交頁面。你目前有${acceptedFriends.length}位已確認好友。` : view === 'add' ? '加入好友頁面。' : view === 'shop' ? '成就商店。' : '成就頁面。');

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

  const purchaseCosmetic = async (itemId: string) => {
    if (!authUser || !supabase) {
      toast.error('請使用 Supabase 正式帳號登入後再購買。');
      return;
    }
    setPurchaseBusy(itemId);
    try {
      const { data, error } = await supabase.rpc('purchase_cosmetic', { p_item_id: itemId });
      if (error) {
        toast.error(`購買失敗：${error.message}`);
        return;
      }
      setAvailablePoints(Number(data));
      await refreshShop();
      window.dispatchEvent(new Event('cosmetics-changed'));
      toast.success('購買成功，商品已自動裝備！');
    } catch (error) {
      toast.error(`購買失敗：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPurchaseBusy('');
    }
  };

  const equipCosmetic = async (item: OwnedCosmetic) => {
    if (!supabase) return;
    const { error } = await supabase.rpc('equip_cosmetic', { p_slot: item.slot, p_item_id: item.item_id });
    if (error) {
      toast.error(`裝備失敗：${error.message}`);
      return;
    }
    await refreshShop();
    window.dispatchEvent(new Event('cosmetics-changed'));
    toast.success('已裝備此商品。');
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
    const { achievements, nextAchievement, pointsToNext } = getPointAchievementProgress(user.points);
    return (
      <div className="pb-24">
        <PageHeader title="成就" showBack />
        <div className="mx-auto w-full max-w-3xl p-4 space-y-5">
          <div className="card-accessible space-y-2">
            <p className="text-sm text-muted-foreground">完成任務取得積分，累積積分即可解鎖成就。</p>
            <p className="text-2xl font-bold">目前累積：{user.points} 積分</p>
            {nextAchievement ? (
              <>
                <p className="text-sm">再獲得 {pointsToNext} 分即可解鎖「{nextAchievement.title}」</p>
                <div
                  className="h-3 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`距離${nextAchievement.title}的積分進度`}
                  aria-valuemin={0}
                  aria-valuemax={nextAchievement.requiredPoints}
                  aria-valuenow={Math.min(user.points, nextAchievement.requiredPoints)}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (user.points / nextAchievement.requiredPoints) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="font-bold text-primary">太棒了！已解鎖所有積分成就。</p>
            )}
          </div>
          <button onClick={() => setView('shop')} className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            <ShoppingBag size={21} />前往成就商店
          </button>
          <div className="space-y-3">
            {achievements.map(achievement => (
              <div
                key={achievement.id}
                className={`card-accessible flex items-center gap-4 ${achievement.unlocked ? '' : 'opacity-60'}`}
              >
                <div className="text-3xl" aria-hidden="true">{achievement.unlocked ? achievement.icon : '🔒'}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{achievement.title}</div>
                  <div className="text-sm text-muted-foreground">{achievement.description}</div>
                </div>
                <span className={`shrink-0 text-sm font-bold ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                  {achievement.unlocked ? '已解鎖' : `${achievement.requiredPoints} 分`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'shop') {
    return (
      <div className="pb-24">
        <PageHeader title="成就商店" showBack />
        <div className="mx-auto w-full max-w-3xl space-y-5 p-4">
          <section className="card-accessible flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">剩餘可用積分</p>
              <p className="text-2xl font-bold">💎 {availablePoints === null ? '讀取中...' : availablePoints}</p>
            </div>
            <button type="button" onClick={() => void refreshShop()} className="accessible-btn bg-secondary px-4 text-secondary-foreground">更新積分</button>
          </section>
          {!authUser && <p role="status" className="card-accessible text-sm">請先登入 Supabase 正式帳號才能購買及裝備商品。</p>}
          {shopError && <p role="alert" className="card-accessible text-sm text-destructive">商店資料讀取失敗：{shopError}。請先套用 supabase/migrations/20261109000000_cosmetics_shop.sql。</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {COSMETICS.map(item => {
              const owned = ownedCosmetics.find(cosmetic => cosmetic.item_id === item.id);
              return (
                <article key={item.id} className="card-accessible flex flex-col gap-3">
                  <div className={`cosmetic-product-preview ${item.previewClass}`} aria-hidden="true">
                    {item.slot === 'avatar_frame'
                      ? <div className={`profile-avatar-preview ${item.id}`}><span>🙂</span></div>
                      : <Sparkles size={32} />}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <p className="font-bold">💎 {item.price} 積分</p>
                  {owned ? (
                    <button type="button" disabled={owned.equipped} onClick={() => void equipCosmetic(owned)} className="accessible-btn w-full bg-secondary text-secondary-foreground disabled:opacity-60">
                      {owned.equipped ? '已裝備' : '裝備商品'}
                    </button>
                  ) : (
                    <button type="button" disabled={!authUser || !!shopError || availablePoints === null || availablePoints < item.price || purchaseBusy === item.id} onClick={() => void purchaseCosmetic(item.id)} className="accessible-btn w-full bg-primary text-primary-foreground disabled:opacity-50">
                      {purchaseBusy === item.id ? '購買中...' : availablePoints !== null && availablePoints < item.price ? '積分不足' : <><ShoppingBag className="mr-2 inline" size={18} />購買</>}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
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
