import { Type, Contrast, Volume2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAppContext } from '@/contexts/AppContext';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

const SystemSettings = ({ embedded = false }: { embedded?: boolean }) => {
  const { settings, updateSettings } = useAppContext();
  useVoiceAssistant(`系統設定頁面。目前文字大小為${settings.textSize === 'small' ? '小' : settings.textSize === 'medium' ? '中' : '大'}，高對比模式${settings.highContrast ? '已開啟' : '已關閉'}，語音助手已開啟。`);

  const sizes: Array<{ value: 'small' | 'medium' | 'large'; label: string }> = [
    { value: 'small', label: '小' },
    { value: 'medium', label: '中' },
    { value: 'large', label: '大' },
  ];

  return (
    <div className={embedded ? 'space-y-5' : 'pb-24'}>
      {!embedded && <PageHeader title="系統設定" />}
      <div className={embedded ? 'space-y-8' : 'p-6 space-y-8'}>
        {/* Text Size */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Type size={28} className="text-primary" />
            <h2 className="text-lg font-bold">文字大小</h2>
          </div>
          <div className="flex gap-3">
            {sizes.map(s => (
              <button
                key={s.value}
                onClick={() => updateSettings({ textSize: s.value })}
                className={`accessible-btn flex-1 text-center ${
                  settings.textSize === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast */}
        <div className="card-accessible flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Contrast size={28} className="text-primary" />
            <div>
              <div className="font-bold text-lg">高對比模式</div>
              <div className="text-muted-foreground text-sm">增強色彩對比度</div>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ highContrast: !settings.highContrast })}
            className={`w-16 h-9 rounded-full transition-colors relative ${
              settings.highContrast ? 'bg-primary' : 'bg-muted'
            }`}
            aria-label="切換高對比模式"
          >
            <div className={`w-7 h-7 bg-primary-foreground rounded-full absolute top-1 transition-transform ${
              settings.highContrast ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Voice Assistant */}
        <div className="card-accessible flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 size={28} className="text-primary" />
            <div>
              <div className="font-bold text-lg">語音助手</div>
              <div className="text-muted-foreground text-sm">啟用語音朗讀功能</div>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ voiceAssistant: !settings.voiceAssistant })}
            className={`w-16 h-9 rounded-full transition-colors relative ${
              settings.voiceAssistant ? 'bg-primary' : 'bg-muted'
            }`}
            aria-label="切換語音助手"
          >
            <div className={`w-7 h-7 bg-primary-foreground rounded-full absolute top-1 transition-transform ${
              settings.voiceAssistant ? 'translate-x-8' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
