import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Activity = {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  status: string;
};

type Participant = {
  user_id: string;
  status: string;
  joined_at: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  verification_type: string;
  game_type: string | null;
  config: Record<string, unknown> | null;
};

type Progress = {
  task_id: string;
  user_id: string;
  status: string;
};

type Submission = {
  progress_id: string;
  task_id: string;
  task_title: string;
  participant_id: string;
  participant_name: string;
  progress_status: string;
  submission: Record<string, unknown> | null;
  submitted_at: string;
};

const isVerified = (status: string) =>
  ['verified', 'completed', 'approved'].includes(status);

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 16);
};

export default function CloudManageActivity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 新增選擇題的表單狀態
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '']);
  const [quizCorrectIndexes, setQuizCorrectIndexes] = useState<number[]>([0]);
  const [quizPoints, setQuizPoints] = useState('0');
  const [addingQuiz, setAddingQuiz] = useState(false);

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrectIndexes, setEditCorrectIndexes] = useState<number[]>([]);
  const [editPoints, setEditPoints] = useState('0');
  const [editingBusy, setEditingBusy] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);


  // 一般任務：新增與編輯（主辦人審核型）
  const [newVerificationType, setNewVerificationType] = useState<'auto' | 'social' | 'organizer'>('organizer');
  const [generalTitle, setGeneralTitle] = useState('');
  const [generalDescription, setGeneralDescription] = useState('');
  const [generalPoints, setGeneralPoints] = useState('0');
  const [generalCorrectAnswer, setGeneralCorrectAnswer] = useState('');
  const [addingGeneral, setAddingGeneral] = useState(false);
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null);
  const [editGeneralTitle, setEditGeneralTitle] = useState('');
  const [editGeneralDescription, setEditGeneralDescription] = useState('');
  const [editGeneralPoints, setEditGeneralPoints] = useState('0');
  const [generalBusy, setGeneralBusy] = useState(false);

  // 社交驗證任務：新增與編輯
  const [socialTitle, setSocialTitle] = useState('');
  const [socialDescription, setSocialDescription] = useState('');
  const [socialPoints, setSocialPoints] = useState('0');
  const [addingSocial, setAddingSocial] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [editSocialTitle, setEditSocialTitle] = useState('');
  const [editSocialDescription, setEditSocialDescription] = useState('');
  const [editSocialPoints, setEditSocialPoints] = useState('0');
  const [socialBusy, setSocialBusy] = useState(false);

  const showError = (value: unknown) => {
    if (value instanceof Error) return value.message;
    if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
      return value.message;
    }
    return '操作失敗，請稍後再試';
  };

  const refresh = useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: activityData, error: activityError } =
        await supabase
          .from('activities')
          .select(
            'id,organizer_id,title,description,location,start_time,end_time,max_participants,status'
          )
          .eq('id', id)
          .single();

      if (activityError) throw activityError;

      if (activityData.organizer_id !== user.id) {
        throw new Error('只有活動主辦人可以管理此活動');
      }

      const a = activityData as Activity;

      setActivity(a);
      setTitle(a.title);
      setDescription(a.description || '');
      setLocation(a.location || '');
      setStartTime(toLocalInput(a.start_time));
      setEndTime(toLocalInput(a.end_time));
      setMaxParticipants(
        a.max_participants === null
          ? ''
          : String(a.max_participants)
      );

      const [participantResult, taskResult, reviewResult] =
        await Promise.all([
          supabase
            .from('activity_participants')
            .select('user_id,status,joined_at')
            .eq('activity_id', id),

          supabase
            .from('tasks')
            .select('id,title,description,verification_type,game_type,config')
            .eq('activity_id', id)
            .order('sort_order'),

          supabase.rpc('get_organizer_task_submissions', {
            p_activity_id: id,
          }),
        ]);

      if (participantResult.error) throw participantResult.error;
      if (taskResult.error) throw taskResult.error;
      if (reviewResult.error) throw reviewResult.error;

      const loadedTasks = (taskResult.data || []) as Task[];

      setParticipants(
        (participantResult.data || []) as Participant[]
      );
      setTasks(loadedTasks);
      setSubmissions(
        (reviewResult.data || []) as Submission[]
      );

      if (loadedTasks.length > 0) {
        const { data: progressData, error: progressError } =
          await supabase
            .from('task_progress')
            .select('task_id,user_id,status')
            .in(
              'task_id',
              loadedTasks.map(task => task.id)
            );

        if (progressError) throw progressError;
        setProgress((progressData || []) as Progress[]);
      } else {
        setProgress([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);


  const addGeneralTask = async () => {
    if (!activity || !user || activity.organizer_id !== user.id) {
      toast.error('只有活動建立者可以新增任務');
      return;
    }
    const name = generalTitle.trim();
    const points = Number(generalPoints);
    if (!name) return void toast.error('請輸入任務名稱');
    if (!Number.isInteger(points) || points < 0 || points > 10 || !generalPoints.trim()) {
      return void toast.error('積分必須是 0～10 的整數');
    }
    if (tasks.some(t => t.title.trim() === name)) {
      return void toast.error('任務名稱不可與現有任務重複');
    }
    if (newVerificationType === 'auto' && (
      !generalCorrectAnswer.trim() || generalCorrectAnswer.length > 500
    )) {
      return void toast.error('請輸入正確答案（1～500 字）');
    }

    setAddingGeneral(true);
    try {
      const rpcName = newVerificationType === 'auto'
        ? 'create_auto_task'
        : newVerificationType === 'social'
          ? 'create_social_task'
          : 'create_general_task';

      const params = {
        p_activity_id: activity.id,
        p_title: name,
        p_description: generalDescription.trim(),
        p_points: points,
        p_sort_order: tasks.length,
        ...(newVerificationType === 'auto'
          ? { p_correct_answer: generalCorrectAnswer.trim() }
          : {}),
      };

      const { error: rpcError } = await supabase.rpc(rpcName, params);
      if (rpcError) throw rpcError;

      const successMessage = newVerificationType === 'auto'
        ? '系統自動驗證任務新增成功'
        : newVerificationType === 'social'
          ? '社交驗證任務新增成功'
          : '主辦人審核任務新增成功';
      toast.success(successMessage);
      setGeneralTitle('');
      setGeneralDescription('');
      setGeneralPoints('0');
      setGeneralCorrectAnswer('');
      await refresh();
    } catch (e: unknown) {
      toast.error('無法新增任務', { description: showError(e) });
    } finally {
      setAddingGeneral(false);
    }
  };

  const openGeneralEditor = (task: Task) => {
    setEditingQuizId(null);
    setEditingSocialId(null);
    setEditingGeneralId(task.id);
    setEditGeneralTitle(task.title);
    // 任務說明由 tasks 查詢取得，避免編輯時覆蓋原內容
    setEditGeneralDescription(task.description || '');
    setEditGeneralPoints(String(task.config?.points ?? 0));
  };

  const saveGeneralTask = async () => {
    if (!editingGeneralId || !activity || !user || activity.organizer_id !== user.id) return;
    const name = editGeneralTitle.trim();
    const points = Number(editGeneralPoints);
    if (!name) return void toast.error('請輸入任務名稱');
    if (!Number.isInteger(points) || points < 0 || points > 10 || !editGeneralPoints.trim()) {
      return void toast.error('積分必須是 0～10 的整數');
    }
    if (tasks.some(t => t.id !== editingGeneralId && t.title.trim() === name)) {
      return void toast.error('任務名稱不可與現有任務重複');
    }
    setGeneralBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('update_general_task', {
        p_task_id: editingGeneralId,
        p_title: name,
        p_description: editGeneralDescription.trim(),
        p_points: points,
      });
      if (rpcError) throw rpcError;
      setEditingGeneralId(null);
      toast.success('一般任務修改成功');
      await refresh();
    } catch (e: unknown) {
      const message = showError(e);
      toast.error('無法修改一般任務', {
        description: message.includes('已有參與紀錄')
          ? '此任務已有參與者進度或互動紀錄，為保護紀錄，無法修改。'
          : message,
      });
    } finally {
      setGeneralBusy(false);
    }
  };

  const addSocialTask = async () => {
    if (!activity || !user || activity.organizer_id !== user.id) {
      toast.error('只有活動建立者可以新增社交任務');
      return;
    }
    const name = socialTitle.trim();
    const points = Number(socialPoints);
    if (!name) return void toast.error('請輸入社交任務名稱');
    if (!socialPoints.trim() || !Number.isInteger(points) || points < 0 || points > 10) {
      return void toast.error('積分必須是 0～10 的整數');
    }
    if (tasks.some(t => t.title.trim() === name)) {
      return void toast.error('任務名稱不可與現有任務重複');
    }
    setAddingSocial(true);
    try {
      const { error: rpcError } = await supabase.rpc('create_social_task', {
        p_activity_id: activity.id,
        p_title: name,
        p_description: socialDescription.trim(),
        p_points: points,
        p_sort_order: tasks.length,
      });
      if (rpcError) throw rpcError;
      setSocialTitle('');
      setSocialDescription('');
      setSocialPoints('0');
      toast.success('社交驗證任務新增成功');
      await refresh();
    } catch (e: unknown) {
      toast.error('無法新增社交任務', { description: showError(e) });
    } finally {
      setAddingSocial(false);
    }
  };

  const openSocialEditor = (task: Task) => {
    setEditingQuizId(null);
    setEditingGeneralId(null);
    setEditingSocialId(task.id);
    setEditSocialTitle(task.title);
    setEditSocialDescription(task.description || '');
    setEditSocialPoints(String(task.config?.points ?? 0));
  };

  const saveSocialTask = async () => {
    if (!editingSocialId || !activity || !user || activity.organizer_id !== user.id) return;
    const name = editSocialTitle.trim();
    const points = Number(editSocialPoints);
    if (!name) return void toast.error('請輸入社交任務名稱');
    if (!editSocialPoints.trim() || !Number.isInteger(points) || points < 0 || points > 10) {
      return void toast.error('積分必須是 0～10 的整數');
    }
    if (tasks.some(t => t.id !== editingSocialId && t.title.trim() === name)) {
      return void toast.error('任務名稱不可與現有任務重複');
    }
    setSocialBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('update_social_task', {
        p_task_id: editingSocialId,
        p_title: name,
        p_description: editSocialDescription.trim(),
        p_points: points,
      });
      if (rpcError) throw rpcError;
      setEditingSocialId(null);
      toast.success('社交任務修改成功');
      await refresh();
    } catch (e: unknown) {
      const message = showError(e);
      toast.error('無法修改社交任務', {
        description: message.includes('已有參與或社交互動紀錄')
          ? '此任務已有參與者進度或社交邀請，為保護既有紀錄，無法修改。'
          : message,
      });
    } finally {
      setSocialBusy(false);
    }
  };

  const addQuizToActivity = async () => {
    if (!activity || !user || activity.organizer_id !== user.id) return;

    const question = quizQuestion.trim();
    const options = quizOptions.map(option => option.trim());
    const points = Number(quizPoints);

    if (!question) {
      toast.error('請輸入題目');
      return;
    }

    if (options.length < 2 || options.some(option => !option)) {
      toast.error('請至少填寫兩個非空白選項');
      return;
    }

    if (new Set(options).size !== options.length) {
      toast.error('選項內容不可重複');
      return;
    }

    if (
      quizCorrectIndexes.length === 0 ||
      quizCorrectIndexes.some(index => index < 0 || index >= options.length)
    ) {
      toast.error('請至少指定一個正確答案');
      return;
    }

    if (!Number.isInteger(points) || points < 0 || points > 5 || !quizPoints.trim()) {
      toast.error('選擇題積分必須是 0～5 的整數');
      return;
    }

    if (tasks.some(task => task.title.trim() === question)) {
      toast.error('題目名稱不可與現有任務重複');
      return;
    }

    setAddingQuiz(true);

    try {
      const { error: quizError } = await supabase.rpc('create_quiz_task', {
        p_activity_id: activity.id,
        p_question: question,
        p_options: options,
        p_correct_indexes: [...quizCorrectIndexes].sort((a, b) => a - b),
        p_points: points,
        p_sort_order: tasks.length,
      });

      if (quizError) throw quizError;

      toast.success('選擇題已新增至雲端活動');

      setQuizQuestion('');
      setQuizOptions(['', '']);
      setQuizCorrectIndexes([0]);
      setQuizPoints('0');

      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAddingQuiz(false);
    }
  };



  const openQuizEditor = async (taskId: string) => {
    setEditingGeneralId(null);
    setEditingBusy(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_quiz_task_for_edit',
        { p_task_id: taskId }
      );

      if (rpcError) throw rpcError;
      if (!data) throw new Error('無法讀取題目');

      setEditQuestion(data.question);
      setEditOptions(data.options);
      setEditCorrectIndexes(data.correct_indexes);
      setEditPoints(String(data.points));
      setEditingQuizId(taskId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditingBusy(false);
    }
  };

  const saveQuizEdit = async () => {
    if (!editingQuizId) return;

    const question = editQuestion.trim();
    const options = editOptions.map(option => option.trim());
    const points = Number(editPoints);

    if (!question) {
      toast.error('請輸入題目');
      return;
    }

    if (options.length < 2 || options.some(option => !option)) {
      toast.error('請至少填寫兩個非空白選項');
      return;
    }

    if (new Set(options).size !== options.length) {
      toast.error('選項不可重複');
      return;
    }

    if (
      editCorrectIndexes.length === 0 ||
      new Set(editCorrectIndexes).size !== editCorrectIndexes.length ||
      editCorrectIndexes.some(index => index < 0 || index >= options.length)
    ) {
      toast.error('請選擇有效的正確答案');
      return;
    }

    if (!Number.isInteger(points) || points < 0 || points > 5) {
      toast.error('積分必須是 0 到 5 的整數');
      return;
    }

    setEditingBusy(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        'update_quiz_task',
        {
          p_task_id: editingQuizId,
          p_question: question,
          p_options: options,
          p_correct_indexes: [...editCorrectIndexes].sort((a, b) => a - b),
          p_points: points,
        }
      );

      if (rpcError) throw rpcError;

      toast.success('選擇題修改成功');
      setEditingQuizId(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditingBusy(false);
    }
  };

  const deleteTask = async (task: Task) => {
    if (!activity || !user || activity.organizer_id !== user.id) {
      toast.error('無法刪除任務', {
        description: '只有這場活動的建立者可以刪除任務。',
      });
      return;
    }

    const confirmed = window.confirm(
      `確定要刪除任務「${task.title}」嗎？\n\n` +
      '刪除後無法復原。若已有參與者進度或社交互動紀錄，系統將禁止刪除。'
    );

    if (!confirmed) return;

    setDeletingTaskId(task.id);

    try {
      const { error: deleteError } = await supabase.rpc(
        'delete_activity_task',
        { p_task_id: task.id }
      );

      if (deleteError) throw deleteError;

      if (editingQuizId === task.id) {
        setEditingQuizId(null);
      }
      if (editingGeneralId === task.id) {
        setEditingGeneralId(null);
      }
      if (editingSocialId === task.id) {
        setEditingSocialId(null);
      }

      toast.success('任務刪除成功', {
        description: `「${task.title}」已從活動中移除。`,
      });

      await refresh();
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'object' &&
              e !== null &&
              'message' in e &&
              typeof e.message === 'string'
            ? e.message
            : String(e);

      if (errorMessage.includes('已有參與者進度')) {
        toast.error('無法刪除任務', {
          description:
            '此任務已有參與者作答或完成紀錄。為保護參與者的成果與積分，無法刪除。',
        });
      } else if (errorMessage.includes('已有社交互動紀錄')) {
        toast.error('無法刪除任務', {
          description:
            '此任務已有社交互動紀錄，為避免影響參與者的互動資料，無法刪除。',
        });
      } else if (errorMessage.includes('沒有刪除權限')) {
        toast.error('權限不足', {
          description: '只有這場活動的建立者可以刪除任務。',
        });
      } else {
        toast.error('刪除任務失敗', {
          description:
            '系統暫時無法刪除這項任務，請稍後再試。若問題持續發生，請聯絡管理員。',
        });

        console.error('刪除任務失敗：', e);
      }
    } finally {
      setDeletingTaskId(null);
    }
  };


  const saveActivity = async () => {
    if (!activity || !user) return;

    if (!title.trim() || !startTime || !endTime) {
      toast.error('請填寫活動名稱及時間');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      toast.error('結束時間必須晚於開始時間');
      return;
    }

    const limit = maxParticipants.trim()
      ? Number(maxParticipants)
      : null;

    if (
      limit !== null &&
      (!Number.isInteger(limit) || limit <= 0)
    ) {
      toast.error('人數上限必須是正整數');
      return;
    }

    setSaving(true);

    try {
      const { data, error: updateError } = await supabase
        .from('activities')
        .update({
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || null,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          max_participants: limit,
        })
        .eq('id', activity.id)
        .eq('organizer_id', user.id)
        .select('id');

      if (updateError) throw updateError;

      if (!data?.length) {
        throw new Error('活動未更新，請檢查 Supabase UPDATE 權限');
      }

      toast.success('活動資料已儲存至 Supabase');
      await refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setSaving(false);
    }
  };

  const registered = participants.filter(
    p => p.status === 'registered'
  );

  const totalPossible = registered.length * tasks.length;

  const completedTasks = progress.filter(
    p =>
      registered.some(r => r.user_id === p.user_id) &&
      tasks.some(t => t.id === p.task_id) &&
      isVerified(p.status)
  ).length;

  const completionRate =
    totalPossible > 0
      ? Math.round((completedTasks / totalPossible) * 100)
      : 0;

  // 儀表板：只計算目前已報名者及已驗證的任務紀錄，避免重複計數。
  const registeredIds = new Set(registered.map(p => p.user_id));
  const verifiedPairs = new Set(
    progress.filter(p => registeredIds.has(p.user_id) && isVerified(p.status))
      .map(p => `${p.user_id}:${p.task_id}`)
  );
  const taskStats = tasks.map(task => {
    const done = registered.filter(p => verifiedPairs.has(`${p.user_id}:${task.id}`)).length;
    return {
      id: task.id,
      title: task.title,
      done,
      remaining: registered.length - done,
      rate: registered.length ? Math.round(done / registered.length * 100) : 0,
    };
  });
  const participantStats = registered.map((p, index) => {
    const done = tasks.filter(t => verifiedPairs.has(`${p.user_id}:${t.id}`)).length;
    return {
      number: index + 1,
      joinedAt: p.joined_at,
      done,
      rate: tasks.length ? Math.round(done / tasks.length * 100) : 0,
    };
  });
  const allDoneCount = tasks.length > 0
    ? participantStats.filter(p => p.done === tasks.length).length : 0;
  const partialCount = participantStats.filter(p => p.done > 0 && p.done < tasks.length).length;
  const notStartedCount = participantStats.filter(p => p.done === 0).length;

  const exportDashboardCsv = () => {
    if (!activity) return;
    // 避免試算表把使用者輸入的字串當成公式執行。
    const csvCell = (value: string | number) => {
      let text = String(value ?? '');
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows: Array<Array<string | number>> = [
      ['活動成效報表', activity.title],
      ['匯出時間', new Date().toLocaleString('zh-TW')],
      ['報名人數', registered.length],
      ['任務總數', tasks.length],
      ['已驗證任務次數', completedTasks],
      ['整體任務完成率(%)', completionRate],
      ['全部完成的人數', allDoneCount],
      ['部分完成的人數', partialCount],
      ['尚未開始的人數', notStartedCount],
      [],
      ['任務名稱', '完成人數', '未完成人數', '完成率(%)'],
      ...taskStats.map(t => [t.title, t.done, t.remaining, t.rate]),
      [],
      ['參與者編號（匿名）', '報名時間', '已完成任務數', '完成率(%)'],
      ...participantStats.map(p => [p.number, new Date(p.joinedAt).toLocaleString('zh-TW'), p.done, p.rate]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-report-${activity.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('活動報表已匯出');
  };

  if (authLoading || loading) {
    return (
      <div className="pb-24">
        <PageHeader title="雲端活動管理" showBack />
        <p className="p-6">正在讀取 Supabase 資料…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pb-24">
        <PageHeader title="請先登入" showBack />
        <div className="p-6">
          <Link to="/auth" className="text-primary underline">
            前往登入
          </Link>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="pb-24">
        <PageHeader title="無法管理活動" showBack />
        <div className="p-6 space-y-3">
          <p className="text-destructive">
            {error || '找不到活動'}
          </p>
          <Button onClick={() => void refresh()}>
            重新讀取
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title={`管理：${activity.title}`} showBack />

      <div className="mx-auto max-w-5xl p-4 space-y-5">

        <div className="card-accessible space-y-2">
          <h2 className="text-lg font-bold">雲端活動管理</h2>
          <p className="text-sm text-muted-foreground">
            所有資料直接讀取 Supabase，不使用本機活動資料。
          </p>
          <p className="text-sm">
            活動狀態：{activity.status === 'published' ? '已發布' : activity.status === 'draft' ? '草稿' : activity.status}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={saving}
            >
              重新同步
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/cloud-activities/${activity.id}`)
              }
            >
              查看參與者頁面
            </Button>
          </div>
        </div>


        {/* 新增任務：驗證方式可選 */}
        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">新增任務</h2>
          <p className="text-sm text-muted-foreground">
            可自行選擇驗證方式。已有參與紀錄後不可修改或刪除。
          </p>
          <label className="block text-sm font-medium">任務名稱</label>
          <Input value={generalTitle} onChange={e => setGeneralTitle(e.target.value)}
            placeholder="例如：拍攝校園特色照片" />
          <label className="block text-sm font-medium">任務說明</label>
          <Textarea value={generalDescription}
            onChange={e => setGeneralDescription(e.target.value)}
            placeholder="請說明參與者要完成的內容" />
          <label className="block text-sm font-medium">驗證方式</label>
          <select
            value={newVerificationType}
            onChange={e => setNewVerificationType(e.target.value as 'auto' | 'social' | 'organizer')}
            className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm"
          >
            <option value="auto">系統自動驗證</option>
            <option value="social">社交互動驗證</option>
            <option value="organizer">活動發起者驗證</option>
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {newVerificationType === 'auto' && '參與者輸入正確答案後，系統會自動驗證並完成任務。'}
            {newVerificationType === 'social' && '由同一活動的另一位參與者確認互動；對方接受後才會完成任務。'}
            {newVerificationType === 'organizer' && '參與者提交任務成果後，由活動主辦人審核通過。'}
          </p>
          {newVerificationType === 'auto' && (
            <>
              <label htmlFor="auto-correct-answer" className="block text-sm font-medium">
                正確答案（僅主辦人設定）
              </label>
              <Input
                id="auto-correct-answer"
                type="text"
                maxLength={500}
                autoComplete="off"
                value={generalCorrectAnswer}
                onChange={e => setGeneralCorrectAnswer(e.target.value)}
                placeholder="例如：CAMPUS2026"
              />
              <p className="text-xs text-muted-foreground">
                答案會儲存在 Supabase 私人資料表，不會寫入公開任務設定。
              </p>
            </>
          )}
          <label className="block text-sm font-medium">完成積分（0～10）</label>
          <Input type="number" min={0} max={10} step={1} value={generalPoints}
            onChange={e => setGeneralPoints(e.target.value)} />
          <Button className="w-full h-12" disabled={addingGeneral || saving || generalBusy}
            onClick={() => void addGeneralTask()}>
            {addingGeneral ? '新增中…' : '新增任務至活動'}
          </Button>
        </div>

        {/* 新增選擇題 */}
        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">新增選擇題</h2>

          <p className="text-sm text-muted-foreground">
            正確答案透過 Supabase 安全儲存，參與者無法直接讀取。
          </p>

          <label className="block text-sm font-medium">
            題目
          </label>
          <Textarea
            value={quizQuestion}
            onChange={e => setQuizQuestion(e.target.value)}
            placeholder="例如：台灣的首都是哪裡？"
          />

          <label className="block text-sm font-medium">
            選項（勾選左側方框設定正確答案，可複選）
          </label>

          {quizOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`選項 ${index + 1} 是正確答案`}
                checked={quizCorrectIndexes.includes(index)}
                onChange={e =>
                  setQuizCorrectIndexes(previous =>
                    e.target.checked
                      ? [...previous, index]
                      : previous.filter(value => value !== index)
                  )
                }
                className="h-5 w-5"
              />

              <Input
                aria-label={`選項 ${index + 1}`}
                value={option}
                onChange={e =>
                  setQuizOptions(previous =>
                    previous.map((value, i) =>
                      i === index ? e.target.value : value
                    )
                  )
                }
                placeholder={`選項 ${index + 1}`}
              />

              {quizOptions.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQuizOptions(previous =>
                      previous.filter((_, i) => i !== index)
                    );

                    setQuizCorrectIndexes(previous =>
                      previous
                        .filter(value => value !== index)
                        .map(value =>
                          value > index ? value - 1 : value
                        )
                    );
                  }}
                >
                  移除
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            disabled={quizOptions.length >= 8}
            onClick={() =>
              setQuizOptions(previous => [...previous, ''])
            }
          >
            ＋ 增加選項
          </Button>

          <label className="block text-sm font-medium">
            答對積分
          </label>

          <Input
            type="number"
            min={0}
            max={5}
            step={1}
            value={quizPoints}
            onChange={e => setQuizPoints(e.target.value)}
          />

          <Button
            className="w-full h-12"
            disabled={addingQuiz || saving}
            onClick={() => void addQuizToActivity()}
          >
            {addingQuiz ? '新增中…' : '新增選擇題至活動'}
          </Button>
        </div>

        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">編輯活動資訊</h2>

          <label className="block text-sm font-medium">
            活動名稱
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label className="block text-sm font-medium">
            活動說明
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <label className="block text-sm font-medium">
            活動地點
          </label>
          <Input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="無實體地點可留空"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                開始時間
              </label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                結束時間
              </label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <label className="block text-sm font-medium">
            人數上限（留空代表不限）
          </label>
          <Input
            type="number"
            min={1}
            value={maxParticipants}
            onChange={e => setMaxParticipants(e.target.value)}
          />

          <Button
            className="w-full h-12"
            disabled={saving}
            onClick={saveActivity}
          >
            {saving ? '儲存中…' : '儲存活動修改'}
          </Button>
        </div>

        <div className="card-accessible space-y-4" id="activity-dashboard">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">活動成效儀表板</h2>
              <p className="text-sm text-muted-foreground">依 Supabase 即時資料統計</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void refresh()}>
                更新統計
              </Button>
              <Button type="button" onClick={exportDashboardCsv}>
                匯出 CSV 報表
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '已報名人數', value: registered.length },
              { label: '任務總數', value: tasks.length },
              { label: '已驗證任務次數', value: completedTasks },
              { label: '整體任務完成率', value: `${completionRate}%` },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-xl border p-4 space-y-3" aria-label="各任務完成情況">
              <h3 className="font-semibold">各任務完成情況</h3>
              {tasks.length === 0 && <p className="text-sm text-muted-foreground">尚未建立任務</p>}
              {taskStats.map(t => (
                <div key={t.id} className="space-y-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="break-words min-w-0">{t.title}</span>
                    <span className="shrink-0 tabular-nums">{t.done}/{registered.length} 人（{t.rate}%）</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden" role="progressbar"
                    aria-label={`${t.title}完成率`} aria-valuenow={t.rate} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-primary rounded-full" style={{ width: `${t.rate}%` }} />
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-xl border p-4 space-y-3" aria-label="參與者任務完成分布">
              <h3 className="font-semibold">參與者任務完成分布</h3>
              {[
                { label: '全部完成', count: allDoneCount, color: 'bg-primary' },
                { label: '部分完成', count: partialCount, color: 'bg-blue-400' },
                { label: '尚未開始', count: notStartedCount, color: 'bg-muted-foreground' },
              ].map(item => {
                const percent = registered.length ? item.count / registered.length * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm gap-2">
                      <span>{item.label}</span>
                      <span className="tabular-nums">{item.count} 人（{Math.round(percent)}%）</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden" role="progressbar"
                      aria-label={`${item.label}比例`} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <p className="text-xs text-muted-foreground">尚無任務時，報名者均列為「尚未開始」。</p>
              )}
            </section>
          </div>

          <p className="text-xs text-muted-foreground">
            完成率＝已報名者已驗證任務數 ÷（已報名人數 × 任務總數）。
            「全部完成」表示完成本活動全部任務。統計僅包含目前已報名者，
            並受 Supabase RLS 可讀取範圍限制；匯出報表以匿名編號表示參與者。
          </p>
        </div>

        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">
            參與者（{registered.length}）
          </h2>

          {registered.length === 0 && (
            <p className="text-muted-foreground">
              尚無參與者，或目前權限無法讀取完整名單。
            </p>
          )}

          {registered.map(p => {
            const done = tasks.filter(task =>
              progress.some(
                record =>
                  record.user_id === p.user_id &&
                  record.task_id === task.id &&
                  isVerified(record.status)
              )
            ).length;

            const percent = tasks.length
              ? Math.round((done / tasks.length) * 100)
              : 0;

            return (
              <div
                key={p.user_id}
                className="rounded-xl border p-3 space-y-2"
              >
                <p className="font-medium break-all">
                  會員：{p.user_id}
                </p>
                <p className="text-sm">
                  加入時間：
                  {new Date(p.joined_at).toLocaleString('zh-TW')}
                </p>
                <p className="text-sm">
                  已完成 {done}/{tasks.length} 項任務
                </p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">任務列表</h2>

          {tasks.map(task => (
            <div
              key={task.id}
              className="rounded-xl border p-3 space-y-1"
            >
              <p className="font-bold">{task.title}</p>
              <p className="text-sm text-muted-foreground">
                {task.game_type === 'quiz'
                  ? '選擇題'
                  : task.verification_type === 'organizer'
                    ? '主辦人驗證'
                    : task.verification_type === 'social'
                      ? '社交驗證'
                      : '自動驗證'}
                {' · '}
                {Number(task.config?.points || 0)} 分
              </p>

              <div className="flex flex-wrap gap-2">
                {task.game_type === 'quiz' && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={editingBusy || deletingTaskId !== null}
                    onClick={() => void openQuizEditor(task.id)}
                  >
                    編輯選擇題
                  </Button>
                )}

                {task.game_type === null && task.verification_type === 'organizer' && (
                  <Button type="button" variant="outline"
                    disabled={generalBusy || deletingTaskId !== null || editingBusy}
                    onClick={() => openGeneralEditor(task)}>
                    編輯一般任務
                  </Button>
                )}


                {task.game_type === null && task.verification_type === 'social' && (
                  <Button type="button" variant="outline"
                    disabled={socialBusy || deletingTaskId !== null || editingBusy}
                    onClick={() => openSocialEditor(task)}>
                    編輯社交任務
                  </Button>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingTaskId !== null || editingBusy}
                  onClick={() => void deleteTask(task)}
                >
                  {deletingTaskId === task.id
                    ? '刪除中…'
                    : '刪除任務'}
                </Button>
              </div>




            </div>
          ))}

        {editingSocialId && (
          <div className="card-accessible space-y-3">
            <h2 className="text-lg font-bold">編輯社交驗證任務</h2>
            <label className="block text-sm font-medium">任務名稱</label>
            <Input value={editSocialTitle}
              onChange={e => setEditSocialTitle(e.target.value)} />
            <label className="block text-sm font-medium">任務說明</label>
            <Textarea value={editSocialDescription}
              onChange={e => setEditSocialDescription(e.target.value)} />
            <label className="block text-sm font-medium">完成積分（0～10）</label>
            <Input type="number" min={0} max={10} step={1}
              value={editSocialPoints}
              onChange={e => setEditSocialPoints(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={socialBusy || editingBusy}
                onClick={() => void saveSocialTask()}>
                {socialBusy ? '儲存中…' : '儲存社交任務修改'}
              </Button>
              <Button variant="outline" disabled={socialBusy}
                onClick={() => setEditingSocialId(null)}>取消</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              已有參與進度或社交邀請紀錄的任務不可修改。
            </p>
          </div>
        )}

        {editingGeneralId && (
          <div className="card-accessible space-y-3">
            <h2 className="text-lg font-bold">編輯一般任務</h2>
            <label className="block text-sm font-medium">任務名稱</label>
            <Input value={editGeneralTitle}
              onChange={e => setEditGeneralTitle(e.target.value)} />
            <label className="block text-sm font-medium">任務說明</label>
            <Textarea value={editGeneralDescription}
              onChange={e => setEditGeneralDescription(e.target.value)} />
            <label className="block text-sm font-medium">完成積分（0～10）</label>
            <Input type="number" min={0} max={10} step={1}
              value={editGeneralPoints}
              onChange={e => setEditGeneralPoints(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={generalBusy || editingBusy}
                onClick={() => void saveGeneralTask()}>
                {generalBusy ? '儲存中…' : '儲存一般任務修改'}
              </Button>
              <Button variant="outline" disabled={generalBusy}
                onClick={() => setEditingGeneralId(null)}>取消</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              已有參與紀錄的任務不可修改，以保護既有成果。
            </p>
          </div>
        )}

        {editingQuizId && (
          <div className="card-accessible space-y-3">
            <h2 className="text-lg font-bold">編輯選擇題</h2>

            <label className="block text-sm font-medium">
              題目
            </label>
            <Textarea
              value={editQuestion}
              onChange={e => setEditQuestion(e.target.value)}
            />

            <label className="block text-sm font-medium">
              選項與正確答案
            </label>

            {editOptions.map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  aria-label={`選項 ${index + 1} 是正確答案`}
                  className="h-5 w-5"
                  checked={editCorrectIndexes.includes(index)}
                  onChange={e =>
                    setEditCorrectIndexes(previous =>
                      e.target.checked
                        ? [...previous, index]
                        : previous.filter(value => value !== index)
                    )
                  }
                />

                <Input
                  aria-label={`選項 ${index + 1}`}
                  value={option}
                  onChange={e =>
                    setEditOptions(previous =>
                      previous.map((value, i) =>
                        i === index ? e.target.value : value
                      )
                    )
                  }
                />

                {editOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditOptions(previous =>
                        previous.filter((_, i) => i !== index)
                      );
                      setEditCorrectIndexes(previous =>
                        previous
                          .filter(value => value !== index)
                          .map(value => value > index ? value - 1 : value)
                      );
                    }}
                  >
                    移除
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              disabled={editOptions.length >= 8}
              onClick={() =>
                setEditOptions(previous => [...previous, ''])
              }
            >
              ＋ 增加選項
            </Button>

            <label className="block text-sm font-medium">
              答對積分（0～5）
            </label>
            <Input
              type="number"
              min={0}
              max={5}
              step={1}
              value={editPoints}
              onChange={e => setEditPoints(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={editingBusy}
                onClick={() => void saveQuizEdit()}
              >
                {editingBusy ? '儲存中…' : '儲存題目修改'}
              </Button>

              <Button
                variant="outline"
                disabled={editingBusy}
                onClick={() => setEditingQuizId(null)}
              >
                取消
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              已有作答進度的題目不可修改，以保護既有驗證紀錄。
            </p>
          </div>
        )}
        </div>

        <div className="card-accessible space-y-3">
          <h2 className="text-lg font-bold">任務提交資料（唯讀）</h2>
          <p className="text-sm text-muted-foreground">
            任務核准與積分發放暫停，待官方審查流程完成資料庫端串接後再開放。
          </p>

          {submissions.length === 0 && (
            <p className="text-muted-foreground">
              目前沒有審核紀錄。
            </p>
          )}

          {submissions.map(item => (
            <div
              key={item.progress_id}
              className="rounded-xl border p-3 space-y-2"
            >
              <p className="font-bold">{item.task_title}</p>
              <p className="text-sm">
                參與者：{item.participant_name}
              </p>
              <p className="text-sm">
                狀態：{item.progress_status}
              </p>
              <p className="text-xs break-all">
                提交內容：{JSON.stringify(item.submission)}
              </p>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
