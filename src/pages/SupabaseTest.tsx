
import { useState } from "react";
import { supabase, supabaseConfigurationMessage } from "@/lib/supabase";

export default function SupabaseTest() {
  const [result, setResult] = useState("尚未測試");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    if (!supabase) {
      setResult(supabaseConfigurationMessage);
      return;
    }
    setLoading(true);
    setResult("正在讀取資料庫...");

    try {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, status")
        .limit(5);

      if (error) {
        setResult("讀取失敗：" + error.message);
      } else {
        setResult(
          "讀取成功！\n" +
          JSON.stringify(data, null, 2)
        );
      }
    } catch (err) {
      setResult(
        "連線異常：" +
        (err instanceof Error
          ? err.message
          : String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Supabase 資料庫連線測試
      </h1>

      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? "測試中..." : "測試讀取 activities"}
      </button>

      <pre className="mt-5 p-4 bg-gray-100 text-black rounded-lg whitespace-pre-wrap break-all">
        {result}
      </pre>
    </div>
  );
}
