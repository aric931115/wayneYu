import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseConfigurationMessage } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import SystemSettings from '@/pages/SystemSettings';
import { getCosmetic, type CosmeticSlot, type OwnedCosmetic } from '@/lib/cosmetics';

type Profile = { display_name: string; role: string; avatar_url: string | null };
const resizeAvatar = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('無法讀取圖片檔案'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('無法解析圖片檔案'));
    image.onload = () => {
      const scale = Math.min(1, 256 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) { reject(new Error('目前瀏覽器無法處理圖片')); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const userId = user?.id;
  const { user: localUser, appMode, setAppMode, isDemoUser, loginWithId, logout: logoutDemo } = useAppContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [cosmetics, setCosmetics] = useState<OwnedCosmetic[]>([]);
  const [cosmeticError, setCosmeticError] = useState('');
  const [error, setError] = useState('');
  const [demoId, setDemoId] = useState('');
  useEffect(() => {
    if (!userId || !supabase) { setProfile(null); return; }
    let alive = true;
    const load = async () => {
      const { data, error: profileError } = await supabase.from('profiles')
        .select('display_name,role,avatar_url').eq('id', userId).maybeSingle();
      if (!alive) return;
      if (profileError) setError(`讀取個人資料失敗：${profileError.message}`);
      else if (!data) setError('找不到 profiles 紀錄，請檢查註冊觸發器是否建立成功。');
      else { setError(''); setProfile(data); setName(data.display_name); }
    };
    void load();
    return () => { alive = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId || !supabase) { setCosmetics([]); setCosmeticError(''); return; }
    let active = true;
    const load = async () => {
      const { data, error: loadError } = await supabase.from('cosmetic_purchases')
        .select('item_id,slot,purchased_at,equipped').eq('user_id', userId);
      if (!active) return;
      if (loadError) {
        setCosmetics([]);
        setCosmeticError(loadError.message);
      } else {
        setCosmetics((data ?? []) as OwnedCosmetic[]);
        setCosmeticError('');
      }
    };
    void load();
    return () => { active = false; };
  }, [userId]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('請選擇圖片檔案。'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('圖片大小需小於 5 MB。'); return; }
    if (!user || !profile || !supabase) return;
    setAvatarBusy(true);
    try {
      const avatarUrl = await resizeAvatar(file);
      const { data, error: saveError } = await supabase.from('profiles')
        .update({ avatar_url: avatarUrl }).eq('id', user.id)
        .select('display_name,role,avatar_url').maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error('找不到可更新的個人資料');
      setProfile(data);
      toast.success('個人照片已更新。');
    } catch (uploadError) {
      toast.error(`照片更新失敗：${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
    } finally {
      setAvatarBusy(false);
    }
  };

  const equipCosmetic = async (slot: CosmeticSlot, itemId: string | null) => {
    if (!supabase) { toast.error(supabaseConfigurationMessage); return; }
    const { error: equipError } = await supabase.rpc('equip_cosmetic', { p_slot: slot, p_item_id: itemId });
    if (equipError) { toast.error(`裝備變更失敗：${equipError.message}`); return; }
    setCosmetics(current => current.map(item => item.slot === slot ? { ...item, equipped: item.item_id === itemId } : item));
    window.dispatchEvent(new Event('cosmetics-changed'));
    toast.success(itemId ? '裝飾已更換。' : '已移除此類裝飾。');
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !supabase) {
      toast.error(supabaseConfigurationMessage);
      return;
    }
    const next = name.trim();
    if (!next || next.length > 50) { toast.error('暱稱必須為 1～50 個字元'); return; }
    setBusy(true);
    const { data, error: saveError } = await supabase.from('profiles')
      .update({ display_name: next }).eq('id', user.id)
      .select('display_name,role,avatar_url').maybeSingle();
    setBusy(false);
    if (saveError) toast.error(`儲存失敗：${saveError.message}`);
    else if (!data) toast.error('找不到可更新的個人資料，請先執行壓縮檔中的 profiles 修復 SQL。');
    else { setProfile(data); toast.success('個人資料已儲存至 Supabase'); }
  };
  const signInDemo = (e: FormEvent) => {
    e.preventDefault();
    if (!loginWithId(demoId)) {
      toast.error('展示帳號 ID 格式不正確。');
      return;
    }
    toast.success(demoId.trim().toUpperCase() === 'ADMIN1' ? '已登入本機官方展示帳號' : '已登入本機展示帳號');
    navigate(demoId.trim().toUpperCase() === 'ADMIN1' ? '/admin' : '/activities');
  };
  return <div className="pb-28"><PageHeader title="帳戶管理" />
    <div className="p-6 space-y-5">
      {loading ? <p>正在確認登入狀態...</p> : !user ? <div className="card-accessible space-y-4">
        <p>{isDemoUser ? `目前使用本機展示帳號：${localUser.name || localUser.id}（${localUser.id}），積分 ${localUser.points}。` : '尚未登入 Supabase。可使用本機展示帳號測試流程。'}</p>
        {!supabase && <p role="status" className="text-sm text-muted-foreground">{supabaseConfigurationMessage}</p>}
        <Link className="accessible-btn bg-primary text-primary-foreground flex items-center justify-center" to="/auth">登入／註冊</Link>
        {import.meta.env.DEV && (
          <form onSubmit={signInDemo} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">本機流程測試（不是真正帳號認證）</p>
            {isDemoUser && (
              <button type="button" onClick={logoutDemo} className="accessible-btn w-full border-2 border-border">
                登出本機展示帳號
              </button>
            )}
            {localUser.role === 'admin' && (
              <Link to="/admin" className="accessible-btn w-full bg-secondary text-secondary-foreground flex items-center justify-center">
                開啟官方管理審查
              </Link>
            )}
            <label htmlFor="demo-user-id" className="block font-bold">展示使用者 ID</label>
            <input id="demo-user-id" value={demoId} onChange={event => setDemoId(event.target.value)} maxLength={7} className="w-full min-h-[52px] rounded-xl border-2 border-input bg-background px-4" placeholder="一般使用者或 ADMIN1" />
            <button type="submit" className="accessible-btn w-full border-2 border-border">登入本機展示帳號</button>
          </form>
        )}
      </div> : <>
        <div className="card-accessible space-y-2">
          <p className="font-bold">已登入 Supabase</p>
          <p className="break-all">Email：{user.email}</p>
          <p className="text-xs text-muted-foreground break-all">使用者 UUID：{user.id}</p>
        </div>
        {error && <div role="alert" className="card-accessible text-destructive">{error}</div>}
        <section className="card-accessible space-y-4">
          <div className="flex items-center gap-4">
            <div className={`profile-avatar ${cosmetics.find(item => item.slot === 'avatar_frame' && item.equipped)?.item_id ?? ''}`}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="個人頭像" /> : <span aria-hidden="true">👤</span>}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">個人照片與裝飾</h2>
              <p className="text-sm text-muted-foreground">照片縮小後儲存在個人資料中。</p>
            </div>
          </div>
          <label className="accessible-btn flex cursor-pointer items-center justify-center bg-secondary text-secondary-foreground">
            {avatarBusy ? '照片處理中...' : '上傳／更換照片'}
            <input type="file" accept="image/*" className="sr-only" disabled={avatarBusy} onChange={event => void uploadAvatar(event)} />
          </label>
          {(['avatar_frame', 'app_theme'] as const).map(slot => {
            const label = slot === 'avatar_frame' ? '頭像框' : '介面主題';
            const owned = cosmetics.filter(item => item.slot === slot);
            return <div key={slot} className="space-y-2">
              <h3 className="font-bold">{label}</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void equipCosmetic(slot, null)} className={`rounded-xl border px-3 py-2 text-sm font-medium ${owned.every(item => !item.equipped) ? 'border-primary text-primary' : 'border-border'}`}>
                  不使用
                </button>
                {owned.map(item => (
                  <button key={item.item_id} type="button" onClick={() => void equipCosmetic(slot, item.item_id)} className={`rounded-xl border px-3 py-2 text-sm font-medium ${item.equipped ? 'border-primary text-primary' : 'border-border'}`}>
                    {getCosmetic(item.item_id)?.name ?? item.item_id}{item.equipped ? '（使用中）' : ''}
                  </button>
                ))}
              </div>
              {owned.length === 0 && <p className="text-xs text-muted-foreground">尚無已擁有的{label}，可至社交頁「成就商店」購買。</p>}
            </div>;
          })}
          {cosmeticError && <p role="alert" className="text-sm text-destructive">讀取已購裝飾失敗：{cosmeticError}。請先套用 supabase/migrations/20261109000000_cosmetics_shop.sql。</p>}
        </section>
        <form onSubmit={save} className="card-accessible space-y-3">
          <label htmlFor="display-name" className="font-bold">顯示暱稱</label>
          <input id="display-name" className="w-full min-h-[60px] rounded-xl border-2 border-input bg-background px-4" value={name} maxLength={50} onChange={e => setName(e.target.value)} />
          <button disabled={busy || !profile} className="accessible-btn w-full bg-primary text-primary-foreground disabled:opacity-50">{busy ? '儲存中...' : '儲存至 Supabase'}</button>
        </form>
        <div className="card-accessible text-sm text-muted-foreground">正式積分與成就進度請至社交頁面的「成就」查看；商店購買後的可用積分會即時更新。</div>
        <button className="accessible-btn w-full border-2 border-border" onClick={async () => { try { await signOut(); toast.success('已登出'); } catch (e) { toast.error(e instanceof Error ? e.message : '登出失敗'); } }}>登出</button>
      </>}
      <details className="card-accessible group">
        <summary className="cursor-pointer list-none font-bold">系統設定 <span className="float-right text-muted-foreground" aria-hidden="true">⌄</span></summary>
        <div className="pt-5"><SystemSettings embedded /></div>
      </details>
      <section className="card-accessible space-y-3">
        <p className="font-bold">目前模式：{appMode === 'organizer' ? '活動發起者' : '活動參與者'}</p>
        <button type="button" className="accessible-btn w-full bg-secondary text-secondary-foreground" onClick={() => setAppMode(appMode === 'organizer' ? 'participant' : 'organizer')}>
          切換為{appMode === 'organizer' ? '參與者' : '發起者'}
        </button>
      </section>
    </div></div>;
}
