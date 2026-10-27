
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseConfigurationMessage } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function SupabaseAuth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error("請輸入電子郵件與密碼");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      toast.error("密碼至少需要 8 個字元");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        toast.success("登入成功");
        navigate("/account");
      } else {
        await signUp(email.trim(), password);
        toast.success(
          "註冊請求已送出，請檢查信箱並完成驗證"
        );
        setMode("login");
      }

      setPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "操作失敗，請稍後再試"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("已登出 Supabase 帳號");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "登出失敗"
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        正在確認登入狀態...
      </div>
    );
  }

  if (user) {
    return (
      <div className="p-6 pb-28 space-y-5">
        <h1 className="text-2xl font-bold">
          Supabase 帳號
        </h1>

        <div className="rounded-2xl border p-5 space-y-3">
          <p className="font-bold text-green-600">
            已成功登入
          </p>

          <p className="break-all">
            電子郵件：{user.email}
          </p>

          <p className="text-sm text-muted-foreground break-all">
            使用者 UUID：{user.id}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="accessible-btn w-full bg-primary text-primary-foreground"
        >
          登出
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-28 space-y-6">
      <h1 className="text-2xl font-bold">
        {mode === "login" ? "帳號登入" : "註冊帳號"}
      </h1>

      <p className="text-muted-foreground">
        使用電子郵件與密碼登入智慧校園活動互動系統。
      </p>

      {!supabase && (
        <p role="status" className="card-accessible text-sm text-muted-foreground">
          {supabaseConfigurationMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`min-h-[56px] rounded-xl border-2 font-bold ${
            mode === "login"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border"
          }`}
        >
          登入
        </button>

        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-[56px] rounded-xl border-2 font-bold ${
            mode === "signup"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border"
          }`}
        >
          註冊
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label
            htmlFor="auth-email"
            className="font-bold"
          >
            電子郵件
          </label>

          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.edu.tw"
            className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="auth-password"
            className="font-bold"
          >
            密碼
          </label>

          <input
            id="auth-password"
            type="password"
            autoComplete={
              mode === "signup"
                ? "new-password"
                : "current-password"
            }
            required
            minLength={mode === "signup" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入密碼"
            className="w-full min-h-[60px] rounded-2xl border-2 border-input bg-background px-4 text-lg"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="accessible-btn w-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {submitting
            ? "處理中..."
            : mode === "login"
              ? "登入"
              : "建立帳號"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        註冊後如果需要電子郵件驗證，請先到信箱點擊驗證連結，再回來登入。
      </p>
    </div>
  );
}
