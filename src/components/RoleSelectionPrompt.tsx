import { useEffect, useState } from 'react';
import { CalendarPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext, type AppMode } from '@/contexts/AppContext';

export default function RoleSelectionPrompt() {
  const { user: authUser, loading } = useAuth();
  const { user: appUser, isDemoUser, setAppMode } = useAppContext();
  const sessionUserId = authUser?.id ?? (isDemoUser ? appUser.id : null);
  const [dismissedUserId, setDismissedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionUserId) setDismissedUserId(null);
  }, [sessionUserId]);

  if (!sessionUserId || loading || dismissedUserId === sessionUserId) return null;

  const chooseMode = (mode: AppMode) => {
    setSaving(true);
    setAppMode(mode);
    setDismissedUserId(sessionUserId);
    toast.success(`已切換為${mode === 'organizer' ? '發起者' : '參與者'}模式。`);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-selection-title"
        className="w-full max-w-lg space-y-5 rounded-3xl border-2 border-border bg-background p-6 shadow-2xl"
      >
        <div className="space-y-2 text-center">
          <h1 id="role-selection-title" className="text-2xl font-black">今天想如何使用？</h1>
          <p className="text-muted-foreground">選擇角色以顯示適合你的功能。下次登入或重新開啟時會再次詢問。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={saving} onClick={() => chooseMode('organizer')} className="accessible-btn flex h-auto min-h-32 flex-col items-center justify-center gap-2 bg-primary p-4 text-primary-foreground disabled:opacity-50">
            <CalendarPlus size={30} />
            <span>我是發起者</span>
            <span className="text-sm font-normal">瀏覽活動、建立活動、帳戶</span>
          </button>
          <button type="button" disabled={saving} onClick={() => chooseMode('participant')} className="accessible-btn flex h-auto min-h-32 flex-col items-center justify-center gap-2 bg-secondary p-4 text-secondary-foreground disabled:opacity-50">
            <Users size={30} />
            <span>我是參與者</span>
            <span className="text-sm font-normal">瀏覽活動、社交、帳戶</span>
          </button>
        </div>
      </section>
    </div>
  );
}
