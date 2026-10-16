# 智慧校園活動互動系統 V2 修改摘要

本版保留原有 React/TypeScript/Tailwind UI 與活動流程，主要調整底層資料與任務驗證。

## 已修改
- 活動與參與資料使用 localStorage 持久化，重新整理後仍保留。
- 使用者資料、總積分與 PointHistory 使用 localStorage 持久化。
- 新活動取消匿名發布，建立時綁定目前使用者 ID (`organizerId`)。
- 活動管理頁只允許該活動建立者進入。
- 任務新增 `verificationType`: `auto` / `social` / `organizer`。
- 任務進度以每位參與者的 `taskProgress` 個別保存，不再以 ActivityTask 的共用 completedCount 作為畫面進度。
- `auto`: 答對問答、完成水果配對時會推進尚未完成的自動驗證任務。
- `social`: 需輸入同一活動內另一位參與者 ID；同一 ID 在同一任務只計一次。
- `organizer`: 僅此類任務顯示主辦人驗證碼欄位；一次成功驗證即完成該實體任務，避免同一代碼無限刷次數。
- 任務第一次完成時發放 Task.points，並寫入使用者 PointHistory。
- 「我的生涯」新增最近積分紀錄。
- 建立活動時可為每個任務選擇驗證方式。

## 展示版限制
目前專案沒有真正後端與正式登入服務，因此本版使用瀏覽器 localStorage 作為「簡易資料庫」。這適合目前專題展示與流程驗證，但不同電腦/瀏覽器不會同步資料。正式多人版本後續可將集中在 hook/context 的資料存取替換成 Supabase/Firebase/API。

社交驗證目前以「同活動中的不同參與者 ID」作為有效互動證明，並做去重；完整的跨裝置好友邀請→接受流程需在導入真正後端/帳號系統後完成。
