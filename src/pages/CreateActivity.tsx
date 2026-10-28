import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, HelpCircle, School, Lock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import {
  useActivities,
  ActivityTask,
  QuizQuestion,
  ActivityCategory,
  ActivityTag,
  VerificationType,
} from '@/hooks/useActivities';

interface QuizDraft {
  question: string;
  options: string[];
  correctIndexes: number[];
  points: number;
}

type TaskDraft = { title: string; desc: string; targetCount: number; points: number; verificationType: VerificationType };

interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid?: boolean;
}

const TimeField = ({ label, value, onChange, onBlur, invalid = false }: TimeFieldProps) => {
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const updateTime = (nextHour: string, nextMinute: string) => {
    onChange(nextHour || nextMinute ? `${nextHour || '00'}:${nextMinute || '00'}` : '');
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label={`${label} 小時`}
        value={hour}
        onChange={event => updateTime(event.target.value, minute)}
        onBlur={onBlur}
        className={`h-12 min-w-0 rounded-xl border-2 border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${invalid ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
      >
        <option value="">時</option>
        {Array.from({ length: 24 }, (_, index) => {
          const option = String(index).padStart(2, '0');
          return <option key={option} value={option}>{option} 時</option>;
        })}
      </select>
      <select
        aria-label={`${label} 分鐘`}
        value={minute}
        onChange={event => updateTime(hour, event.target.value)}
        onBlur={onBlur}
        className={`h-12 min-w-0 rounded-xl border-2 border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${invalid ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
      >
        <option value="">分</option>
        {Array.from({ length: 60 }, (_, index) => {
          const option = String(index).padStart(2, '0');
          return <option key={option} value={option}>{option} 分</option>;
        })}
      </select>
    </div>
  );
};

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string; icon: typeof School; desc: string }[] = [
  { value: 'campus', label: '校園活動', icon: School, desc: '公開張貼在校園活動板' },
  { value: 'private', label: '私人活動', icon: Lock, desc: '僅憑代碼加入' },
];

const TAG_COLORS = [
  { name: '藍色', value: '#2563eb' },
  { name: '綠色', value: '#16a34a' },
  { name: '紫色', value: '#9333ea' },
  { name: '橘色', value: '#ea580c' },
  { name: '紅色', value: '#dc2626' },
];

const ROOM_GAME_OPTIONS = [
  { id: 'image-match', label: '圖像配對遊戲', desc: '找到相同的圖片配對！' },
] as const;

const CreateActivity = () => {
  const navigate = useNavigate();
  const { activities, addActivity } = useActivities();
  const { user } = useAppContext();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [noPhysicalLocation, setNoPhysicalLocation] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number | string>('');
  const [noParticipantLimit, setNoParticipantLimit] = useState(false);
  const [desc, setDesc] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0].value);
  const [category, setCategory] = useState<ActivityCategory>('campus');
  const [createRoom, setCreateRoom] = useState(false);
  const [selectedRoomGames, setSelectedRoomGames] = useState<string[]>([]);
  const [roomGamePoints, setRoomGamePoints] = useState(0);
  const [tasks, setTasks] = useState<TaskDraft[]>([
    { title: '', desc: '', targetCount: 1, points: 0, verificationType: 'organizer' },
  ]);
  const [quizzes, setQuizzes] = useState<QuizDraft[]>([]);
  const [touched, setTouched] = useState({ date: false, endDate: false, startTime: false, endTime: false });
  const [participantLimitTouched, setParticipantLimitTouched] = useState(false);
    const [createdActivity, setCreatedActivity] = useState<{ organizerQrCode: string; title: string } | null>(null);

  const addTask = () => setTasks([...tasks, { title: '', desc: '', targetCount: 1, points: 0, verificationType: 'organizer' }]);
  const removeTask = (idx: number) => setTasks(tasks.filter((_, i) => i !== idx));
  const updateTask = (idx: number, field: keyof TaskDraft, value: string | number) => {
    setTasks(tasks.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const addQuiz = () => setQuizzes([...quizzes, { question: '', options: ['', ''], correctIndexes: [0], points: 0 }]);
  const removeQuiz = (idx: number) => setQuizzes(quizzes.filter((_, i) => i !== idx));
  const updateQuizQuestion = (idx: number, value: string) => {
    setQuizzes(quizzes.map((q, i) => (i === idx ? { ...q, question: value } : q)));
  };
  const updateQuizOption = (qIdx: number, optIdx: number, value: string) => {
    setQuizzes(quizzes.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) } : q
    ));
  };
  const setCorrectAnswer = (qIdx: number, optIdx: number) => {
    setQuizzes(quizzes.map((q, i) => i === qIdx
      ? { ...q, correctIndexes: q.correctIndexes.includes(optIdx) ? q.correctIndexes.filter(index => index !== optIdx) : [...q.correctIndexes, optIdx] }
      : q
    ));
  };

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dateOrderError = Boolean(touched.endDate && date && endDate && endDate < date);
  const endBeforeStartError = Boolean(
    touched.endTime && touched.startTime && date && endDate && startTime && endTime
    && new Date(`${endDate}T${endTime}`) <= new Date(`${date}T${startTime}`)
  );
  const startPastError = Boolean(
    touched.startTime && date === todayString && startTime && new Date(`${date}T${startTime}`) < new Date()
  );
  const dateTimeError = dateOrderError
    ? '結束日期與時間必須晚於開始日期與時間'
    : endBeforeStartError
      ? '結束時間必須晚於開始時間'
      : startPastError
        ? '今天的開始時間已經過去，請選擇未來時間'
        : '';
  const duplicateTask = tasks.some((task, index) =>
    task.title.trim() && tasks.findIndex(other => other.title.trim() === task.title.trim()) !== index
  );
  const duplicateQuizQuestion = quizzes.some((quiz, index) =>
    quiz.question.trim() && quizzes.findIndex(other => other.question.trim() === quiz.question.trim()) !== index
  );
  const duplicateActivityTitle = activities.some(activity =>
    activity.title.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase()
  );
  const invalidParticipantLimit = !noParticipantLimit && typeof maxParticipants === 'string' && /^0\d+/.test(maxParticipants);
  const missingParticipantLimit = !noParticipantLimit && maxParticipants === '';
  const invalidQuiz = quizzes.some(q => {
    const options = q.options.map(option => option.trim());
    return !q.question.trim() || options.length === 0 || options.some(option => !option);
  });

  const handleSubmit = () => {
    if (!title.trim() || !date.trim() || !endDate.trim() || !startTime || !endTime || (!noPhysicalLocation && !location.trim()) || !desc.trim()) {
      toast.error('請填寫所有必要欄位');
      return;
    }
    if (!noParticipantLimit && (maxParticipants === '' || Number(maxParticipants) <= 0)) {
      toast.error('請填寫有效的人數上限，或勾選無人數上限');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error('活動日期不能選擇比今天更早的日期');
      return;
    }
    if (date === todayString && new Date(`${date}T${startTime}`) < new Date()) {
      toast.error('今天的開始時間已經過去，請選擇未來時間');
      return;
    }

    if (new Date(`${endDate}T${endTime}`) <= new Date(`${date}T${startTime}`)) {
      toast.error('結束日期與時間必須晚於開始日期與時間');
      return;
    }

    if (createRoom && selectedRoomGames.length === 0) {
      toast.error('請至少選擇一種活動房間遊戲');
      return;
    }
    if (duplicateActivityTitle) {
      toast.error('活動名稱不可重複');
      return;
    }
    if (invalidParticipantLimit) {
      toast.error('活動人數上限格式錯誤，請移除前導 0');
      return;
    }
    if (duplicateTask || duplicateQuizQuestion) {
      toast.error('請修正重複的任務名稱、題目或選項');
      return;
    }
    if (invalidQuiz || quizzes.some(q => {
      const options = q.options.map(option => option.trim()).filter(Boolean);
      return new Set(options).size !== options.length || q.correctIndexes.length === 0;
    })) {
      toast.error('問答題不可有空選項、重複選項，且至少要選一個正確答案');
      return;
    }

    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) {
      toast.error('請至少新增一個任務');
      return;
    }

    const validQuizzes: QuizQuestion[] = quizzes
          .filter(q => q.question.trim() && q.options.some(o => o.trim()))
          .map((q, i) => ({
            id: i + 1,
            question: q.question.trim(),
            options: q.options.map(o => o.trim() || '（空選項）'),
            correctIndexes: q.correctIndexes,
            points: Math.min(5, Math.max(0, Math.floor(q.points))),
          }))

    const newActivity = addActivity({
      title: title.trim(),
      date: date.trim(),
      endDate: endDate.trim(),
      startTime,
      endTime,
      location: location.trim(),
      noPhysicalLocation,
      organizerId: user.id,
      organizerAnonymous: false,
      organizerProfile: {
        name: user.name || user.id,
        department: user.department,
        avatar: user.avatar,
      },
      desc: desc.trim(),
      content: content.trim() || desc.trim(),
      category,
      tags,
      maxParticipants: noParticipantLimit ? 0 : Math.max(0, Math.floor(Number(maxParticipants) || 0)),
      tasks: validTasks.map<ActivityTask>((t, i) => ({
        id: i + 1,
        title: t.title.trim(),
        desc: t.desc.trim(),
        type: 'general',
        targetCount: Math.max(1, Math.floor(t.targetCount)),
        completedCount: 0,
        points: category === 'campus' ? Math.min(10, Math.max(0, Math.floor(t.points))) : 0,
        completed: false,
        verificationType: t.verificationType,
      })),
      quiz: validQuizzes,
      roomCode: createRoom ? undefined : '',
      roomGames: createRoom ? selectedRoomGames : [],
      roomGamePoints: createRoom ? Math.min(3, Math.max(0, Math.floor(roomGamePoints))) : 0,
    });

    toast.success('活動已送交官方審查，核准後才會公開。');
    setCreatedActivity({ organizerQrCode: newActivity.organizerQrCode, title: newActivity.title });
  };

  return (
    <div className="pb-24">
      <PageHeader title="建立新活動" showBack />

      <div className="mx-auto w-full max-w-4xl p-4 space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          活動送出後會先進入官方審查，核准後才會出現在活動大廳。參與者完成任務後，積分也需由官方確認發放。
        </div>

        {/* 活動類型 */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">🏷️ 活動類型 *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = category === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setCategory(opt.value)}
                  className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{CATEGORY_OPTIONS.find(c => c.value === category)?.desc}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">活動名稱 *</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：校園環保日" className={`h-12 text-base rounded-xl ${duplicateActivityTitle ? 'border-destructive ring-2 ring-destructive/20' : ''}`} />
          {duplicateActivityTitle && <p className="text-xs font-bold text-destructive">活動名稱不可重複。</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-sm font-bold text-foreground">開始日期與時間 *</h2>
            <Input
              aria-label="開始日期"
              type="date"
              value={date}
              min={todayString}
              onChange={e => setDate(e.target.value)}
              onBlur={() => setTouched(current => ({ ...current, date: true }))}
              className={`h-12 text-base rounded-xl ${touched.date && date < todayString ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
            />
            <TimeField
              label="開始時間"
              value={startTime}
              onChange={setStartTime}
              onBlur={() => setTouched(current => ({ ...current, startTime: true }))}
              invalid={startPastError}
            />
            {startPastError && (
              <p className="text-xs font-bold text-destructive">今天的開始時間已經過去，請重新選擇。</p>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-border p-4">
            <h2 className="text-sm font-bold text-foreground">結束日期與時間 *</h2>
            <Input
              aria-label="結束日期"
              type="date"
              value={endDate}
              min={date || todayString}
              onChange={e => setEndDate(e.target.value)}
              onBlur={() => setTouched(current => ({ ...current, endDate: true }))}
              className={`h-12 text-base rounded-xl ${dateOrderError ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
            />
            <TimeField
              label="結束時間"
              value={endTime}
              onChange={setEndTime}
              onBlur={() => setTouched(current => ({ ...current, endTime: true }))}
              invalid={endBeforeStartError}
            />
          </div>
        </div>
        {dateTimeError && <p className="text-xs font-bold text-destructive">{dateTimeError}</p>}

        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">是否建立活動房間</p>
            <p className="text-xs text-muted-foreground">勾選後才會產生房間代碼與遊戲選項</p>
          </div>
          <input
            type="checkbox"
            checked={createRoom}
            onChange={e => {
              setCreateRoom(e.target.checked);
              if (!e.target.checked) {
                setSelectedRoomGames([]);
              }
            }}
            className="h-5 w-5 accent-primary"
          />
        </div>

        {createRoom && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-foreground">選擇活動房間遊戲</p>
            <div className="space-y-2">
              {ROOM_GAME_OPTIONS.map(option => {
                const active = selectedRoomGames.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedRoomGames([option.id])}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold">{option.label}</div>
                        <div className="text-xs opacity-80">{option.desc}</div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        active ? 'border-primary bg-primary' : 'border-muted-foreground bg-transparent'
                      }`}>
                        {active && <span className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedRoomGames.includes('image-match') && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">水果配對遊戲每題積分（上限 3 分）</label>
                <Input type="number" min={0} max={3} value={roomGamePoints}
                  onChange={e => setRoomGamePoints(Math.min(3, Math.max(0, Number(e.target.value) || 0)))}
                  className="h-11 text-base rounded-xl" />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">活動地點 *</label>
          <Input value={location} disabled={noPhysicalLocation} onChange={e => setLocation(e.target.value)} placeholder="例如：操場" className="h-12 text-base rounded-xl" />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={noPhysicalLocation}
              onChange={e => {
                setNoPhysicalLocation(e.target.checked);
                if (e.target.checked) setLocation('');
              }}
              className="h-5 w-5 accent-primary"
            />
            無實體地點
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">活動人數上限</label>
          <Input
            type="number"
            min={0}
            step={1}
            value={maxParticipants}
          disabled={noParticipantLimit}
          onChange={e => { setParticipantLimitTouched(true); setMaxParticipants(e.target.value); }}
          onBlur={() => {
            setParticipantLimitTouched(true);
            if (maxParticipants !== '' && !/^0\d+/.test(String(maxParticipants))) {
              setMaxParticipants(Math.max(0, Math.floor(Number(maxParticipants) || 0)));
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (maxParticipants !== '' && !/^0\d+/.test(String(maxParticipants))) {
                setMaxParticipants(Math.max(0, Math.floor(Number(maxParticipants) || 0)));
              }
            }
          }}
          className={`h-12 text-base rounded-xl ${participantLimitTouched && (invalidParticipantLimit || missingParticipantLimit) ? 'border-destructive ring-2 ring-destructive/20' : ''}`}
          />
          {participantLimitTouched && (invalidParticipantLimit || missingParticipantLimit) && <p className="text-xs font-bold text-destructive">{invalidParticipantLimit ? '人數不可使用前導 0，例如 000121。' : '請填寫人數上限或勾選無人數上限。'}</p>}
          <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={noParticipantLimit}
            onChange={e => {
              setNoParticipantLimit(e.target.checked);
              if (e.target.checked) setMaxParticipants('');
            }}
            className="h-5 w-5 accent-primary"
          />
          無人數上限
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">活動說明（簡短）*</label>
          <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="一句話介紹活動" className="text-base rounded-xl" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">詳細內容</label>
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="活動的詳細內容（選填）" rows={4} className="text-base rounded-xl" />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground">主題標籤</label>
          <div className="flex gap-2">
            <Input
              value={tagDraft}
              maxLength={7}
              onChange={e => setTagDraft(e.target.value)}
              placeholder="輸入主題標籤（最多 7 字）"
              className="h-11 text-base rounded-xl"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!tagDraft.trim() || tags.length >= 5}
              onClick={() => {
                if (tagDraft.trim() && tags.length < 5) {
                  setTags([...tags, { label: tagDraft.trim().slice(0, 7), color: tagColor }]);
                  setTagDraft('');
                }
              }}
              className="rounded-xl"
            >
              新增
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(color => (
              <button
                type="button"
                key={color.value}
                aria-label={`選擇${color.name}`}
                onClick={() => setTagColor(color.value)}
                className={`h-8 w-8 rounded-full border-4 ${tagColor === color.value ? 'border-foreground' : 'border-transparent'}`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <button
                type="button"
                key={`${tag.label}-${index}`}
                onClick={() => setTags(tags.filter((_, i) => i !== index))}
                className="rounded-full px-3 py-1 text-sm font-bold text-white"
                style={{ backgroundColor: tag.color }}
                title="點擊移除標籤"
              >
                #{tag.label} ×
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">最多 5 個標籤，每個標籤不能超過 7 個字；點擊標籤可移除。</p>
        </div>

        {/* 任務設計 */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground">📋 任務設計</label>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
            任務建立在活動中，但活動本身不另外設定積分。每個任務可設定自己的完成獎勵；參與者達成任務條件後，依該任務設定取得積分。
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {tasks.map((task, idx) => {
            return (
              <div key={idx} className="card-accessible min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">
                    任務 {idx + 1}
                  </span>
                  {tasks.length > 1 && (
                    <button onClick={() => removeTask(idx)} className="text-destructive p-1" aria-label="刪除任務">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <Input value={task.title} onChange={e => updateTask(idx, 'title', e.target.value)} placeholder="任務名稱" className="h-11 text-base rounded-xl" />
                {duplicateTask && task.title.trim() && (
                  <p className="text-xs font-bold text-destructive">任務名稱不可重複。</p>
                )}
                <Input value={task.desc} onChange={e => updateTask(idx, 'desc', e.target.value)} placeholder="任務說明（選填）" className="h-11 text-base rounded-xl" />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">驗證方式</label>
                  <select value={task.verificationType} onChange={e => updateTask(idx, 'verificationType', e.target.value as VerificationType)} className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm">
                    <option value="auto">系統自動驗證</option>
                    <option value="social">社交互動驗證</option>
                    <option value="organizer">活動發起者驗證</option>
                  </select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {task.verificationType === 'auto' && '完成活動中的指定遊戲或問答後，系統會自動更新任務進度。'}
                    {task.verificationType === 'social' && '由同一活動的另一位參與者確認互動；對方接受後才會增加進度。'}
                    {task.verificationType === 'organizer' && '完成現場任務後，輸入活動主辦人提供的驗證碼，由系統確認完成。'}
                    {' '}驗證方式用來確認任務是否完成；積分是此任務的獎勵，與活動本身分開計算。達到指定完成次數後，系統才會發放任務設定的積分。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">完成次數</label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={task.targetCount}
                      onChange={e => updateTask(idx, 'targetCount', Math.max(1, Number(e.target.value) || 1))}
                      className="h-11 text-base rounded-xl"
                    />
                  </div>
                  {category === 'campus' && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">任務積分（上限 10）</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={task.points}
                        onChange={e => updateTask(idx, 'points', Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                        className="h-11 text-base rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
          <button onClick={addTask} className="flex items-center gap-2 text-primary font-bold py-2 active:scale-95 transition-transform">
            <Plus size={20} /> 新增任務
          </button>
        </div>

        <div className="space-y-3">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <HelpCircle size={16} /> 問答題（選填）
            </label>
            <p className="text-xs text-muted-foreground">可獨立建立問答題，不需要建立活動房間；每題答對最多 5 分。</p>

            {quizzes.map((quiz, qIdx) => (
              <div key={qIdx} className="card-accessible space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">第 {qIdx + 1} 題</span>
                  <button onClick={() => removeQuiz(qIdx)} className="text-destructive p-1" aria-label="刪除題目">
                    <Trash2 size={18} />
                  </button>
                </div>
                <Input
                  value={quiz.question}
                  onChange={e => updateQuizQuestion(qIdx, e.target.value)}
                  placeholder="問題內容"
                  className="h-11 text-base rounded-xl"
                />
                {duplicateQuizQuestion && quiz.question.trim() && (
                  <p className="text-xs font-bold text-destructive">題目不可重複。</p>
                )}
                <p className="text-xs text-muted-foreground">選項（可點擊多個圓圈設定正確答案）</p>
                {quiz.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectAnswer(qIdx, optIdx)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        quiz.correctIndexes.includes(optIdx) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                      }`}
                      aria-label={`設定選項 ${String.fromCharCode(65 + optIdx)} 為正確答案`}
                    >
                      {quiz.correctIndexes.includes(optIdx) && '✓'}
                    </button>
                    <Input
                      value={opt}
                      onChange={e => updateQuizOption(qIdx, optIdx, e.target.value)}
                      placeholder={`選項 ${String.fromCharCode(65 + optIdx)}`}
                      className="h-10 text-sm rounded-xl"
                    />
                    {quiz.options.some((value, index) => index !== optIdx && value.trim() && value.trim() === opt.trim()) && opt.trim() && (
                      <span className="text-xs font-bold text-destructive whitespace-nowrap">選項重複</span>
                    )}
                    {quiz.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuizzes(quizzes.map((q, i) => i === qIdx
                          ? { ...q, options: q.options.filter((_, index) => index !== optIdx), correctIndexes: q.correctIndexes.filter(index => index !== optIdx).map(index => index > optIdx ? index - 1 : index) }
                          : q
                        ))}
                        className="text-destructive"
                        aria-label="刪除選項"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQuizzes(quizzes.map((q, i) =>
                    i === qIdx ? { ...q, options: [...q.options, ''] } : q
                  ))}
                  className="text-sm font-bold text-primary"
                >
                  + 新增選項
                </button>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-muted-foreground">答對可得積分（每題上限 5 分）</label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={quiz.points}
                    onChange={e => setQuizzes(quizzes.map((q, i) =>
                      i === qIdx ? { ...q, points: Math.min(5, Math.max(0, Number(e.target.value) || 0)) } : q
                    ))}
                    placeholder="輸入答對可得積分"
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
              </div>
            ))}

            <button onClick={addQuiz} className="flex items-center gap-2 text-primary font-bold py-2 active:scale-95 transition-transform">
              <Plus size={20} /> 新增問答題
            </button>
          </div>

        <Button onClick={handleSubmit} className="w-full h-14 text-lg font-bold rounded-2xl" size="lg">
          發布活動
        </Button>
      </div>
      {createdActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl space-y-4">
            <button
              onClick={() => { setCreatedActivity(null); navigate('/activities'); }}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"
              aria-label="關閉建立成功視窗"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-foreground">活動建立成功</h2>
            <p className="text-sm text-muted-foreground">{createdActivity.title}</p>
            <div className="rounded-2xl bg-muted p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">建立者專屬代碼</p>
                <p className="text-2xl font-bold tracking-widest text-primary">{createdActivity.organizerQrCode}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-destructive">請保存建立者專屬代碼，參與者需輸入此代碼才能完成任務。</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateActivity;
