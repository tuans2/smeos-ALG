// Tạo lại `.claude/skills` → `.agents/skills` trên máy dev (thư mục `.agents/` không nằm trong git,
// chủ sản phẩm giữ riêng — AUD-039). Không có `.agents/` thì bỏ qua, không lỗi.
import { existsSync, lstatSync, symlinkSync, unlinkSync } from "node:fs"

const target = "../.agents/skills"
const link = ".claude/skills"
if (!existsSync(".agents/skills")) {
  console.log("Không có .agents/skills trên máy này — bỏ qua.")
  process.exit(0)
}
try {
  if (lstatSync(link, { throwIfNoEntry: false })) unlinkSync(link)
} catch {}
symlinkSync(target, link, "dir")
console.log(`Đã tạo ${link} → ${target}`)
