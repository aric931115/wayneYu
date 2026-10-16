import { FormEvent, useState } from 'react';
import { LogIn, LogOut, UserPlus, KeyRound, Mail, ArrowRight, Trophy, Coins, History, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useAppContext } from '@/contexts/AppContext';
import { useActivities } from '@/hooks/useActivities';

type View = 'main' | 'login' | 'signup' | 'forgot' | 'changePw' | 'career' | 'profile';

const Account = () => {
  const [view, setView] = useState<View>('main');
  const { user, isAuthenticated, loginWithId, logout, updateProfile, switchDemoUser } = useAppContext();
  const { activities } = useActivities();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [loginId, setLoginId] = useState('');

  useVoiceAssistant(
    view === 'main' ? `帳戶管理。目前身份：${user.role === 'organizer' ? '活動發起者' : '參與者'}，累積${user.points}積分。`
    : view === 'login' ? '登入頁面。請輸入使用者 ID。'
    : view === 'signup' ? '註冊頁面。請輸入學校信箱和密碼。'
    : view === 'forgot' ? '找回密碼頁面。'
    : view === 'career' ? '個人生涯頁面，查看歷史參與與成就。'
    : view === 'profile' ? '編輯個人資料。'
    : '更改密碼頁面。'
  );

  if (view === 'career') {
    const sortedHistory = [...user.history].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    const selectedHistory = sortedHistory.find((entry, index) => `${entry.activityId}-${index}` === selectedHistoryId);
    const selectedActivity = selectedHistory ? activities.find(activity => activity.id === selectedHistory.activityId) : undefined;
    return (
      <div className="pb-24">
        <PageHeader title="我的生涯" showBack />
        <div className="p-4 space-y-5">
          <div className="card-accessible bg-secondary text-foreground flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center">
              <Coins size={32} />
            </div>
            <div>
              <p className="text-sm opacity-80">總積分</p>
              <p className="text-3xl font-bold">{user.points}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Coins size={20} /> 最近積分紀錄</h2>
            {user.pointHistory.length === 0 ? (
              <div className="card-accessible text-sm text-muted-foreground">尚無積分紀錄，完成活動任務後會顯示在這裡。</div>
            ) : user.pointHistory.slice(0, 8).map(item => (
              <div key={item.id} className="card-accessible flex items-center justify-between gap-3">
                <div><p className="font-bold">{item.reason}</p><p className="text-xs text-muted-foreground">{item.createdAt}</p></div>
                <span className="font-bold text-primary">{item.points > 0 ? '+' : ''}{item.points}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Trophy size={20} /> 歷史成就</h2>
            {user.achievements.map(a => (
              <div key={a.id} className="card-accessible flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">🏆</div>
                <div className="flex-1">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.desc}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.unlockedAt}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><History size={20} /> 歷史參與紀錄</h2>
            {sortedHistory.length === 0 ? (
              <div className="card-accessible text-center space-y-3">
                <p className="font-bold">還沒參加活動嗎？快去參加吧！</p>
                <button onClick={() => window.history.back()} className="text-primary font-bold">返回</button>
              </div>
            ) : sortedHistory.map((h, index) => (
              <div key={`${h.activityId}-${index}`} className={`rounded-2xl ${h.completed ? '' : 'bg-slate-300/80 dark:bg-slate-700/80 p-1'}`}>
                <button
                  onClick={() => setSelectedHistoryId(selectedHistoryId === `${h.activityId}-${index}` ? null : `${h.activityId}-${index}`)}
                  className={`card-accessible w-full flex items-center justify-between text-left ${h.completed ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div>
                    <p className="font-bold">{h.title}</p>
                    <p className="text-sm text-muted-foreground">參加日期：{h.joinedAt}</p>
                    {h.completed && <p className="text-xs font-bold text-primary">已完成</p>}
                    {!h.completed && <p className="text-xs font-bold text-slate-600 dark:text-slate-300">尚未完成</p>}
                  </div>
                  <span className="text-primary font-bold">+{h.pointsEarned}</span>
                </button>
                {selectedHistoryId === `${h.activityId}-${index}` && selectedActivity && (
                  <div className="px-4 pb-4 pt-2 space-y-1">
                    <p className="text-sm text-muted-foreground">活動時間：{selectedActivity.date}{selectedActivity.endDate !== selectedActivity.date ? `–${selectedActivity.endDate}` : ''} {selectedActivity.startTime}–{selectedActivity.endTime}</p>
                    <p className="text-sm text-muted-foreground">活動地點：{selectedActivity.location}</p>
                    <p className="text-xs text-muted-foreground">僅供查看歷史活動資訊，不能重新進入任務房間。</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    const submitLogin = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const id = loginId.trim();
      if (!/^[A-Za-z0-9]{1,7}$/.test(id)) {
        toast.error('使用者 ID 限 1 至 7 碼英文字母或數字。');
        return;
      }
      if (!loginWithId(id)) return;
      setView('main');
      setLoginId('');
      toast.success(`已登入使用者 ${id}。暱稱可於個人管理設定。`);
    };
    return (
      <div className="pb-24">
        <PageHeader title="登入" showBack />
        <form onSubmit={submitLogin} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="demo-login-id" className="font-bold">使用者 ID</label>
            <input id="demo-login-id" autoComplete="username" maxLength={7} pattern="[A-Za-z0-9]{1,7}" value={loginId} onChange={event => setLoginId(event.target.value)} placeholder="輸入 1 至 7 碼使用者 ID" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          </div>
          <p className="text-sm text-muted-foreground">展示模式不需要密碼。第一次輸入的 ID 會建立新使用者；再次輸入相同 ID 會載入已保存的帳戶資料。</p>
          <button type="submit" className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            <LogIn size={24} /> 登入
          </button>
        </form>
      </div>
    );
  }

  if (view === 'signup') {
    return (
      <div className="pb-24">
        <PageHeader title="註冊" showBack />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="font-bold">學校信箱</label>
            <input placeholder="student@school.edu.tw" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          </div>
          <div className="space-y-2">
            <label className="font-bold">密碼</label>
            <input type="password" placeholder="設定密碼" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          </div>
          <button onClick={() => toast.success('已發送驗證信至您的信箱！')} className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            <Mail size={24} /> 發送驗證信
          </button>
        </div>
      </div>
    );
  }

  if (view === 'forgot') {
    return (
      <div className="pb-24">
        <PageHeader title="找回密碼" showBack />
        <div className="p-6 space-y-5">
          <p className="text-muted-foreground text-lg">輸入您的學校信箱，我們將發送驗證碼給您。</p>
          <input placeholder="student@school.edu.tw" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          <button onClick={() => toast.success('驗證碼已發送！')} className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            <Mail size={24} /> 發送驗證碼
          </button>
        </div>
      </div>
    );
  }

  if (view === 'changePw') {
    return (
      <div className="pb-24">
        <PageHeader title="更改密碼" showBack />
        <div className="p-6 space-y-5">
          <input type="password" placeholder="目前密碼" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          <div className="flex items-center justify-center text-muted-foreground"><ArrowRight size={28} /></div>
          <input type="password" placeholder="新密碼" className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring" />
          <button onClick={() => toast.success('密碼已更新！')} className="accessible-btn w-full bg-primary text-primary-foreground">
            確認更改
          </button>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    const validateProfileField = (field: string, value: string) => {
      if (field === 'name') {
        if (value && !/^[A-Za-z0-9]{1,7}$/.test(value)) return '暱稱限 1 至 7 碼英文字母或數字。';
      }
      if (field === 'id') {
        if (!/^[A-Za-z0-9]{1,7}$/.test(value)) return 'ID 必須是 1 至 7 個英文或數字。';
        if (value !== user.id) {
          try {
            const registry = JSON.parse(localStorage.getItem('campus-users-v2') || '{}') as Record<string, unknown>;
            if (registry[value]) return '此 ID 已被使用，請選擇其他 ID。';
          } catch (error) {
            console.error('Failed to check the user ID registry.', error);
          }
        }
      }
      return '';
    };
    const saveProfile = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get('name') || '').trim();
      const id = String(form.get('id') || '').trim();
      const department = String(form.get('department') || '').trim();
      const mbti = String(form.get('mbti') || '');
      const nextErrors = {
        name: validateProfileField('name', name),
        id: validateProfileField('id', id),
      };
      setProfileErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) {
        toast.error('請先修正紅框欄位後再儲存。');
        return;
      }
      updateProfile({ name, id, mbti, department, avatar: avatarPreview });
      toast.success('個人資料已更新');
      setView('main');
    };
    return (
      <div className="pb-24">
        <PageHeader title="編輯個人資料" showBack />
        <form onSubmit={saveProfile} className="p-6 space-y-5">
          {[
            ['name', '暱稱', user.name, '選填；限 1 至 7 碼英文字母或數字'],
            ['id', 'ID', user.id, '最多 7 個字，只能使用英文與數字'],
            ['department', '科系', user.department, '例如：資訊工程學系'],
          ].map(([field, label, value, hint]) => (
            <div key={field} className="space-y-2">
              <label className="font-bold">{label}</label>
              <input
                name={field}
                defaultValue={value}
                onBlur={event => setProfileErrors(errors => ({ ...errors, [field]: validateProfileField(field, event.target.value.trim()) }))}
                onChange={event => setProfileErrors(errors => ({ ...errors, [field]: validateProfileField(field, event.target.value.trim()) }))}
                className={`w-full min-h-[52px] rounded-2xl border-2 bg-background px-4 text-lg focus:outline-none focus:ring-4 focus:ring-ring ${profileErrors[field] ? 'border-destructive ring-2 ring-destructive/20' : 'border-input'}`}
              />
              {profileErrors[field] && <p className="text-sm font-bold text-destructive">{profileErrors[field]}</p>}
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
          <div className="space-y-2">
            <label htmlFor="mbti" className="font-bold">MBTI</label>
            <select id="mbti" name="mbti" defaultValue={user.mbti || ''} className="w-full min-h-[52px] rounded-2xl border-2 border-input bg-background px-4 text-lg">
              <option value="">尚未選擇</option>
              {['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="font-bold">頭像圖片</label>
            <div className="flex items-center gap-4">
              {avatarPreview.startsWith('data:image/') || avatarPreview.startsWith('http')
                ? <img src={avatarPreview} alt="目前頭像" className="h-20 w-20 rounded-full object-cover bg-muted" />
                : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-3xl">{avatarPreview}</span>}
              <input
                type="file"
                accept="image/*"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    toast.error('請選擇圖片檔。');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setAvatarPreview(String(reader.result));
                  reader.readAsDataURL(file);
                }}
                className="min-w-0 flex-1 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">可上傳 JPG、PNG、GIF 等圖片格式。</p>
          </div>
          <button type="submit" className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2">
            <Save size={22} /> 儲存個人資料
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title="帳戶管理" />
      <div className="p-6 space-y-5">
        {isAuthenticated ? (
          <button onClick={() => setView('profile')} className="card-accessible flex items-center gap-4 w-full text-left">
            {user.avatar.startsWith('data:image/') || user.avatar.startsWith('http')
              ? <img src={user.avatar} alt="個人頭像" className="h-16 w-16 rounded-full object-cover bg-muted" />
              : <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">{user.avatar}</div>}
            <div className="flex-1">
              <p className="text-lg font-bold">{user.name || '尚未設定暱稱'}</p>
              <p className="text-sm text-muted-foreground">ID：{user.id}</p>
              <p className="text-sm text-muted-foreground">{user.mbti || 'MBTI 未設定'} · {user.department || '科系未設定'}</p>
              <p className="text-sm font-bold text-primary">💎 {user.points} 積分</p>
              <span className="text-primary text-sm font-bold">編輯</span>
            </div>
          </button>
        ) : (
          <div className="card-accessible text-center text-muted-foreground">
            目前尚未登入。登入後即可查看個人資料、積分與活動紀錄。
          </div>
        )}

        {isAuthenticated ? (
          <>
            <button onClick={() => setView('career')} className="accessible-btn w-full bg-secondary text-secondary-foreground flex items-center justify-center gap-3">
              <Trophy size={24} /> 我的生涯
            </button>
            <div className="card-accessible space-y-2">
              <p className="font-bold">🧪 展示測試：切換使用者</p>
              <p className="text-xs text-muted-foreground">每位測試使用者的積分與紀錄分開保存；登出後仍可再次切換登入。</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { switchDemoUser('USRA', 'XiaoM'); toast.success('已切換為小明（ID：USRA）'); }} className="rounded-xl border-2 border-border p-3 font-bold">小明（USRA）</button>
                <button onClick={() => { switchDemoUser('USRB', 'XiaoH'); toast.success('已切換為小華（ID：USRB）'); }} className="rounded-xl border-2 border-border p-3 font-bold">小華（USRB）</button>
              </div>
            </div>
            <button onClick={() => { logout(); setView('main'); toast.success('已登出'); }} className="accessible-btn w-full border-2 border-border text-foreground flex items-center justify-center gap-3">
              <LogOut size={24} /> 登出
            </button>
          </>
        ) : (
          <>
            <div className="card-accessible text-center text-muted-foreground">
              目前尚未登入。你可以瀏覽活動；登入後即可建立活動、加入活動並保存個人紀錄。
            </div>
            <button onClick={() => setView('login')} className="accessible-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-3">
              <LogIn size={24} /> 登入
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Account;
