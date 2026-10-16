#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ERROR] 目前資料夾不是 Git 專案。"
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "[ERROR] 請先切換到 main 分支，再執行同步。"
  echo "        git switch main && git pull --ff-only origin main"
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "沒有尚未同步的修改。"
  exit 0
fi

DEFAULT_DATE="$(date +%Y-%m-%d)"
while true; do
  read -r -p "同步日期 (YYYY-MM-DD) [$DEFAULT_DATE]: " SYNC_DATE
  SYNC_DATE="${SYNC_DATE:-$DEFAULT_DATE}"

  if [[ ! "$SYNC_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "[ERROR] 日期格式必須是 YYYY-MM-DD。"
    continue
  fi

  if ! VALIDATED_DATE="$(date -j -f "%Y-%m-%d" "$SYNC_DATE" "+%Y-%m-%d" 2>/dev/null)" || [[ "$VALIDATED_DATE" != "$SYNC_DATE" ]]; then
    echo "[ERROR] 日期無效，請重新輸入。"
    continue
  fi

  read -r -p "請確認這次同步日期為 $SYNC_DATE (y/N): " CONFIRM_DATE
  if [[ "$CONFIRM_DATE" =~ ^[Yy]$ ]]; then
    break
  fi
  echo "日期未確認，請重新輸入。"
done

MESSAGE="${1:-更新專案}"
COMMIT_MESSAGE="sync: $SYNC_DATE - $MESSAGE"

echo "正在加入修改..."
git add -A

echo "正在提交：$COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

echo "正在推送 main 分支到 GitHub..."
git push --set-upstream origin main

echo "同步完成：$SYNC_DATE"
