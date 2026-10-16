# 🚀 快速啟動指南

## Bridge Heart Connect 應用程式

### 快速啟動（最簡單）

1. **Windows：雙擊 `start-dev.bat`**
   - macOS：在終端機執行 `npm ci`，再執行 `npm run dev`
   - PowerShell：執行 `.\start-dev.ps1`

2. 等待自動安裝完成

3. 應用程式會自動在瀏覽器中開啟：
   - **主要網址**: http://localhost:8080/
   - **備用網址**: http://localhost:8081/ (如果 8080 被佔用)

### 手動啟動（進階）

如果自動腳本有問題，可以手動執行：

```bash
# 1. 依 package-lock.json 安裝固定版本的依賴
npm ci

# 2. 啟動開發伺服器
npm run dev
```

### 應用程式功能

- 📅 **活動管理** - 創建和管理社交活動
- 🏠 **任務室** - 與其他人合作完成任務
- 🎮 **遊戲** - 享受遊戲功能
- 👥 **社交** - 用戶互動
- 👤 **帳戶** - 個人檔案管理
- ⚙️ **設定** - 系統配置

### 開發工具

- **VS Code** - 推薦的編輯器
- **Lovable** - AI 輔助開發平台
- **GitHub** - 版本控制

### 技術堆疊

- ⚛️ React 18 + TypeScript
- ⚡ Vite (建構工具)
- 🎨 Tailwind CSS + shadcn/ui
- 🔄 React Router (路由)
- 📡 React Query (狀態管理)

---

**有問題嗎？** 檢查終端輸出或查看 `README.md` 獲取更多資訊。