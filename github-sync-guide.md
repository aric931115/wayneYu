# GitHub 同步使用方法

macOS 和 Windows 都透過 GitHub 上的同一個分支共享程式碼。本專案目前使用 `aric931115-open-program`；換電腦或換作業系統時，請先取得該分支最新版本，再開始修改。

## 第一次在新電腦設定

安裝 Git 與 Node.js，然後複製同一個 GitHub 分支：

```bash
git clone --branch aric931115-open-program https://github.com/aric931115/wayneYu.git
cd wayneYu
npm ci
```

如果專案已經複製到電腦，確認目前在共用分支並取得最新修改：

```bash
git switch aric931115-open-program
git pull --ff-only origin aric931115-open-program
npm ci
```

## 提交並同步

macOS 在終端機執行：

```bash
./sync.sh
```

Windows 雙擊 `save-and-sync.bat`，或在 PowerShell 執行：

```powershell
.\save-and-sync.ps1
```

兩種方式都會在有待同步修改時要求輸入並確認同步日期，日期格式為 `YYYY-MM-DD`。按 Enter 使用當天日期；確認後，日期會以相同格式寫入提交訊息，例如 `sync: 2026-10-16 - 更新專案`，接著提交並推送目前分支。

## 換另一台電腦繼續工作

先取得 GitHub 上的最新提交，再開發：

```bash
git switch aric931115-open-program
git pull --ff-only origin aric931115-open-program
npm ci
```

`--ff-only` 可避免不知情地建立分歧歷史。若 pull 或 push 因遠端有新提交而失敗，先保留本機修改並處理分歧；不要使用 `git push --force`。

## 依賴套件

macOS 與 Windows 都使用 `package-lock.json` 搭配 `npm ci`，確保安裝相同版本的依賴。不要只同步原始碼而略過 GitHub 提交；不同電腦的瀏覽器 `localStorage` 資料目前不會隨程式碼同步。

第一次使用 Git 時，如尚未設定提交者資訊，可設定：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的信箱"
```
