-- 在 Supabase SQL Editor 以專案管理者執行。
-- 修復既有會員沒有 profiles 記錄、及會員無法更新自己的暱稱。
-- 不開放用戶自行變更 role、積分或他人資料。

INSERT INTO public.profiles (id, display_name, role)
SELECT u.id,
       COALESCE(NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''), '新使用者'),
       'participant'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles
FOR SELECT TO authenticated USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

-- 重要：RLS 只控制列，不能限制更新哪些欄位。
-- 只允許 authenticated 更新暱稱與頭像；避免使用者自行升級 role。
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
