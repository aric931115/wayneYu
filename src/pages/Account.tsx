import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseConfigurationMessage } from '@/lib/supabase';

type Profile = { display_name: string; role: string; avatar_url: string | null };
export default function Account() {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [points, setPoints] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user || !supabase) { setProfile(null); setPoints(null); return; }
    let alive = true;
    const load = async () => {
      const [p, score] = await Promise.all([
        supabase.from('profiles').select('display_name,role,avatar_url').eq('id', user.id).maybeSingle(),
        supabase.rpc('get_my_total_points'),
      ]);
      if (!alive) return;
      if (p.error) setError(`讀取個人資料失敗：${p.error.message}`);
      else if (!p.data) setError('找不到 profiles 紀錄，請檢查註冊觸發器是否建立成功。');
      else { setError(''); setProfile(p.data); setName(p.data.display_name); }
      if (score.error) setError(old => `${old} 積分讀取失敗：${score.error.message}`.trim());
      else setPoints(typeof score.data === 'number' ? score.data : Number(score.data || 0));
    };
    void load();
    return () => { alive = false; };
  }, [user]);
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
  return <div className="pb-28"><PageHeader title="帳戶管理" />
    <div className="p-6 space-y-5">
      {loading ? <p>正在確認登入狀態...</p> : !user ? <div className="card-accessible space-y-4">
        <p>尚未登入。請使用 Email 與密碼登入。</p>
        {!supabase && <p role="status" className="text-sm text-muted-foreground">{supabaseConfigurationMessage}</p>}
        <Link className="accessible-btn bg-primary text-primary-foreground flex items-center justify-center" to="/auth">登入／註冊</Link>
      </div> : <>
        <div className="card-accessible space-y-2">
          <p className="font-bold">已登入 Supabase</p>
          <p className="break-all">Email：{user.email}</p>
          <p className="text-xs text-muted-foreground break-all">使用者 UUID：{user.id}</p>
          <p>活動身分：依每場活動而定（可同時發起與參與）</p>
          <p className="text-xl font-bold">💎 積分：{points === null ? '讀取中' : points}</p>
        </div>
        {error && <div role="alert" className="card-accessible text-destructive">{error}</div>}
        <form onSubmit={save} className="card-accessible space-y-3">
          <label htmlFor="display-name" className="font-bold">顯示暱稱</label>
          <input id="display-name" className="w-full min-h-[60px] rounded-xl border-2 border-input bg-background px-4" value={name} maxLength={50} onChange={e => setName(e.target.value)} />
          <button disabled={busy || !profile} className="accessible-btn w-full bg-primary text-primary-foreground disabled:opacity-50">{busy ? '儲存中...' : '儲存至 Supabase'}</button>
        </form>
        <div className="card-accessible text-sm text-muted-foreground">活動與任務目前為本機展示資料，與 Supabase 積分分開。訪客積分轉移至正式帳號尚未實作，請勿將展示積分當作正式資料。</div>
        <button className="accessible-btn w-full border-2 border-border" onClick={async () => { try { await signOut(); toast.success('已登出'); } catch (e) { toast.error(e instanceof Error ? e.message : '登出失敗'); } }}>登出</button>
      </>}
    </div></div>;
}
