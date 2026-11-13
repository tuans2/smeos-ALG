/**
 * setup-hooks.ts — Tự động cài đặt Git Pre-Commit Hook cho ALG
 *
 * Tự động chạy khi `npm run setup:hooks` hoặc `npm run prepare`.
 * Hook này sẽ:
 *   1. Chạy `npm run check:industry` khi có thay đổi ngành hoặc trước khi commit.
 *   2. Đảm bảo 100% tuân thủ SSOT đa ngành và không phát sinh từ ngữ cứng vi phạm ratchet.
 */

import { existsSync, writeFileSync, chmodSync } from "node:fs"
import { join } from "node:path"

const REPO_ROOT = join(__dirname, "..")
const GIT_HOOKS_DIR = join(REPO_ROOT, ".git/hooks")
const PRE_COMMIT_PATH = join(GIT_HOOKS_DIR, "pre-commit")

const HOOK_SCRIPT = `#!/bin/sh
# ALG Git Pre-Commit Hook — SSOT & Industry Compliance Gate
# Tự động kiểm tra tính tuân thủ Đa ngành trước khi commit

echo "🔍 [Pre-Commit] Đang kiểm tra tính tuân thủ Đa ngành & UX Lint..."

# Kiểm tra xem có file ngành nào bị thay đổi không
CHANGED_FILES=$(git diff --cached --name-only)

# 1. Kiểm tra 4 trụ cột Đa ngành SSOT (Contract, Registry, Types, Ratchet Terminology)
npx tsx scripts/check-industry.ts --check
CHECK_STATUS=$?

if [ $CHECK_STATUS -ne 0 ]; then
  echo ""
  echo "❌ [Pre-Commit BỊ CHẶN] Phát hiện vi phạm chuẩn Đa ngành SSOT!"
  echo "   Vui lòng sửa các lỗi được liệt kê ở trên rồi thử commit lại."
  echo "   Chạy 'npm run check:industry' để kiểm tra lại."
  exit 1
fi

echo "✅ [Pre-Commit] Đạt chuẩn Đa ngành SSOT! Tiếp tục commit..."
exit 0
`

function main() {
  if (!existsSync(GIT_HOOKS_DIR)) {
    console.log("⚠️  Thư mục .git/hooks không tồn tại (có thể không phải git repo). Bỏ qua cài đặt hook.")
    return
  }

  try {
    writeFileSync(PRE_COMMIT_PATH, HOOK_SCRIPT, { encoding: "utf-8" })
    chmodSync(PRE_COMMIT_PATH, 0o755)
    console.log("✅ Đã cài đặt Git Pre-Commit Hook tại .git/hooks/pre-commit")
    console.log("   Từ bây giờ, mỗi lần git commit hệ thống sẽ tự động chạy check SSOT đa ngành.")
  } catch (err: any) {
    console.error("❌ Không thể cài hook:", err.message)
  }
}

main()
