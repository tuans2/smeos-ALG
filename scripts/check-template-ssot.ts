/**
 * check-template-ssot.ts
 *
 * P-Fix-6 (chống tái lệch / governance — KE_HOACH_HOAN_THIEN_TEMPLATE_SYSTEM.md).
 * Đối chiếu tên file .tsx thật trong `src/components/templates/` với tài
 * liệu SSOT `docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md`, để không lặp
 * lại tình trạng lệch tài liệu ↔ code đã phát hiện ở đợt audit P-Fix-5
 * (17-18/09/2026) — khi đó SSOT ghi sai đường dẫn thật của nhiều template
 * suốt một thời gian dài mà không ai phát hiện.
 *
 * Hai chiều kiểm tra:
 *  1. File .tsx thật tồn tại trên đĩa dưới `src/components/templates/`
 *     nhưng tên file KHÔNG xuất hiện ở đâu trong SSOT -> lệch, phải bổ
 *     sung tài liệu trước khi coi phase liên quan là xong.
 *  2. Tên file .tsx được SSOT nhắc như một phần của cây `templates/` (dòng
 *     đó KHÔNG có ghi chú "(ngoài SSOT)") nhưng KHÔNG tồn tại trên đĩa dưới
 *     `src/components/templates/` -> tài liệu ma (file đã xoá/đổi tên mà
 *     tài liệu chưa cập nhật), phải sửa hoặc xoá dòng đó.
 *
 * Cố tình KHÔNG kiểm tra `src/core/templates/` — bốn tệp ở đó (`golden-
 * templates.ts`, `domain/template-types.ts`, `domain/interpolation-
 * engine.ts`, `domain/variable-catalog.ts`) đã đánh dấu "DỰ TRỮ, KHÔNG
 * PHẢI NỢ" (quyết định anh Tony, Giai đoạn B nợ #99, 18/09/2026): không có
 * call site nào đang dùng, đối chiếu với SSOT ở giai đoạn này không có ý
 * nghĩa thực tế.
 *
 * Chạy: `npm run check:template-ssot`
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { extname, join } from "node:path"

const REPO_ROOT = join(__dirname, "..")
const TEMPLATES_DIR = join(REPO_ROOT, "src/components/templates")
const SSOT_PATH = join(REPO_ROOT, "docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md")

function listTsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const info = statSync(full)
    if (info.isDirectory()) {
      out.push(...listTsxFiles(full))
    } else if (extname(entry) === ".tsx") {
      out.push(entry)
    }
  }
  return out
}

function main(): void {
  const realFiles = Array.from(new Set(listTsxFiles(TEMPLATES_DIR))).sort()

  const ssotText = readFileSync(SSOT_PATH, "utf-8")
  const ssotLines = ssotText.split("\n")

  // Quét theo TÊN FILE xuất hiện bất kỳ đâu trong văn bản (bảng markdown
  // hay khối sơ đồ thư mục dạng code fence) — không chỉ trong dấu backtick
  // đơn, vì sơ đồ thư mục ở Mục 2 nằm trong khối code fence ba dấu backtick
  // và không bọc từng tên file riêng.
  const tsxPattern = /[\w-]+\.tsx\b/g

  const mentionedAnywhere = new Set<string>()
  const mentionedInScope = new Set<string>() // dòng KHÔNG đánh dấu ngoài phạm vi SSOT

  for (const line of ssotLines) {
    const matches = line.match(tsxPattern)
    if (!matches) continue
    // Hai cách tài liệu này tự đánh dấu "không thuộc phạm vi đối chiếu" —
    // xem đủ cả hai, phát hiện thật khi chạy lần đầu (18/09): bảng dùng
    // "(ngoài SSOT)", còn ghi chú văn xuôi (Mục 6, dòng cuối) dùng "ngoài
    // phạm vi ... của SSOT" — thiếu vế thứ hai gây báo lệch giả cho
    // `catalog-link-widgets.tsx`/`catalog-management-tab.tsx`.
    const isOutOfScope = line.includes("(ngoài SSOT)") || line.includes("ngoài phạm vi")
    for (const m of matches) {
      // Placeholder dạng `<feature>-guidance-card.tsx` (Mục 5.3, hướng dẫn
      // tạo template mới) không phải tên file thật — dấu `<`/`>` không nằm
      // trong lớp ký tự regex nên chỉ phần "-guidance-card.tsx" (bắt đầu
      // bằng dấu gạch ngang) khớp được. Không có file thật nào bắt đầu bằng
      // "-", nên loại thẳng token dạng này khỏi cả hai tập.
      if (m.startsWith("-")) continue
      mentionedAnywhere.add(m)
      if (!isOutOfScope) mentionedInScope.add(m)
    }
  }

  const missingFromDoc = realFiles.filter((f) => !mentionedAnywhere.has(f))
  const missingFromDisk = Array.from(mentionedInScope)
    .filter((f) => !realFiles.includes(f))
    .sort()

  let hasDrift = false

  if (missingFromDoc.length > 0) {
    hasDrift = true
    console.error(
      "❌ File .tsx thật trong src/components/templates/ nhưng CHƯA được nhắc trong SSOT:"
    )
    for (const f of missingFromDoc) console.error(`   - ${f}`)
  }

  if (missingFromDisk.length > 0) {
    hasDrift = true
    console.error(
      '❌ SSOT nhắc tên file (không đánh dấu "(ngoài SSOT)") nhưng KHÔNG tìm thấy trên đĩa dưới src/components/templates/:'
    )
    for (const f of missingFromDisk) console.error(`   - ${f}`)
  }

  if (hasDrift) {
    console.error(
      "\nSửa: cập nhật docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md hoặc cấu trúc thư mục thật cho khớp, rồi chạy lại `npm run check:template-ssot`."
    )
    process.exit(1)
  }

  console.log(
    `✅ SSOT khớp code thật — ${realFiles.length} file .tsx trong src/components/templates/, tất cả đã có trong tài liệu.`
  )
}

main()
