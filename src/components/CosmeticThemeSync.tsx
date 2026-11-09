import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const applyTheme = (themeId: string | null) => {
  if (themeId) document.documentElement.dataset.cosmeticTheme = themeId;
  else delete document.documentElement.dataset.cosmeticTheme;
};

export default function CosmeticThemeSync() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    let active = true;
    const syncTheme = async () => {
      if (!userId || !supabase) {
        applyTheme(null);
        return;
      }

      const { data, error } = await supabase.from('cosmetic_purchases')
        .select('item_id').eq('user_id', userId).eq('slot', 'app_theme').eq('equipped', true).maybeSingle();
      if (!active) return;
      if (error) {
        console.error('無法讀取已裝備的介面主題:', error.message);
        return;
      }
      applyTheme(data?.item_id ?? null);
    };

    void syncTheme();
    window.addEventListener('cosmetics-changed', syncTheme);
    return () => {
      active = false;
      window.removeEventListener('cosmetics-changed', syncTheme);
      applyTheme(null);
    };
  }, [userId]);

  return null;
}
