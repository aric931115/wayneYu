import { useAppContext } from '@/contexts/AppContext';
import { useActivities } from '@/hooks/useActivities';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { user, pointAwardRequests, reviewPointAward } = useAppContext();
  const { activities, reviewActivity } = useActivities();
  const pendingActivities = activities.filter(activity => activity.reviewStatus === 'pending');
  const pendingAwards = pointAwardRequests.filter(request => request.status === 'pending');

  if (user.role !== 'admin') {
    return (
      <div className="pb-24">
        <PageHeader title="官方管理" showBack />
        <div className="mx-auto max-w-xl p-4">
          <div className="card-accessible text-center">此頁面僅供官方管理帳號使用。</div>
        </div>
      </div>
    );
  }

  const handleActivityReview = (activityId: number, approve: boolean) => {
    if (reviewActivity(activityId, user.id, approve)) {
      toast.success(approve ? '活動已核准並公開' : '已退回活動，請發起者修改後重新送審');
    } else {
      toast.error('活動審查狀態已更新，請重新整理確認');
    }
  };

  const handleAwardReview = (requestId: string, approve: boolean) => {
    if (reviewPointAward(requestId, approve)) {
      toast.success(approve ? '積分已核准並加入使用者帳戶' : '已退回此積分申請');
    } else {
      toast.error('無法更新積分申請，請確認使用者資料是否仍存在');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title="官方管理審查" showBack />
      <div className="mx-auto w-full max-w-4xl p-4 space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          本頁為本機展示流程。管理員代碼 ADMIN1 僅供測試；目前審查與積分資料保存在此瀏覽器，不能作為正式權限控管。
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">待審活動（{pendingActivities.length}）</h2>
          {pendingActivities.length === 0 ? (
            <div className="card-accessible text-muted-foreground">目前沒有待審活動。</div>
          ) : pendingActivities.map(activity => (
            <article key={activity.id} className="card-accessible space-y-3">
              <div>
                <h3 className="text-lg font-bold">{activity.title}</h3>
                <p className="text-sm text-muted-foreground">發起者：{activity.organizerProfile?.name || activity.organizerName || activity.organizerId}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.date} {activity.startTime}–{activity.endTime}
                  {activity.noPhysicalLocation ? ' · 無實體地點' : ` · ${activity.location}`}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{activity.desc}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  任務 {activity.tasks.length} 項 · 任務及問答最高合計 {
                    activity.tasks.reduce((total, task) => total + task.points, 0)
                    + activity.quiz.reduce((total, question) => total + question.points, 0)
                  } 分
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleActivityReview(activity.id, false)}
                  className="accessible-btn border-2 border-border"
                >
                  退回修改
                </button>
                <button
                  type="button"
                  onClick={() => handleActivityReview(activity.id, true)}
                  className="accessible-btn bg-primary text-primary-foreground"
                >
                  核准並公開
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">待核發積分（{pendingAwards.length}）</h2>
          {pendingAwards.length === 0 ? (
            <div className="card-accessible text-muted-foreground">目前沒有待核發積分。</div>
          ) : pendingAwards.map(request => (
            <article key={request.id} className="card-accessible space-y-3">
              <div>
                <h3 className="font-bold">{request.recipientName}（{request.recipientId}）</h3>
                <p>{request.reason} · {request.amount} 分</p>
                <p className="text-sm text-muted-foreground">活動 #{request.activityId} · {request.createdAt}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAwardReview(request.id, false)}
                  className="accessible-btn border-2 border-border"
                >
                  退回申請
                </button>
                <button
                  type="button"
                  onClick={() => handleAwardReview(request.id, true)}
                  className="accessible-btn bg-primary text-primary-foreground"
                >
                  核准發放
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
