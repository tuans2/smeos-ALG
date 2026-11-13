import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

/**
 * UJ-07 (audit hành trình 06/11/2026, O6): thông điệp lỗi trả về giao diện từng chèn thẳng mã trạng thái
 * (`PENDING`, `FAILED`, `APPROVED`…) — `CLAUDE.md` #6 cấm mã kỹ thuật trên màn hình. Khoá các tệp đã sửa:
 * không còn `conflict(`/`AppError(` nào chứa mã viết hoa hoặc nội suy thẳng trường trạng thái.
 */
const FILES = [
  "src/modules/jobs/use-cases/cancel-job.ts",
  "src/modules/jobs/use-cases/retry-job.ts",
  "src/modules/products/use-cases/reject-analysis.ts",
  "src/modules/products/use-cases/edit-analysis.ts",
  "src/modules/sales/use-cases/convert-quotation-to-order.use-case.ts",
  "src/modules/sales/use-cases/send-quotation.use-case.ts",
  "src/modules/coordinator/domain/stage-transitions.ts",
  // Audit User Journey R2-10 (12/11/2026): "hiện: ${stage}" lộ mã bước điều phối
  "src/modules/coordinator/use-cases/operations.ts",
]

describe("thông điệp lỗi không lộ mã trạng thái", () => {
  it.each(FILES)("%s", (file) => {
    const src = readFileSync(file, "utf8")
    const messages = [...src.matchAll(/(?:conflict|unprocessable|validationFailed|AppError)\(([\s\S]*?)\)\s*$/gm)].map((m) => m[1] ?? "")
    const strings = messages.flatMap((m) => [...m.matchAll(/(["`])((?:\\.|(?!\1).)*)\1/g)].map((s) => s[2] ?? ""))
    const leaks = strings.filter(
      (s) => /\b(PENDING|PROCESSING|COMPLETED|FAILED|CANCELLED|APPROVED|REJECTED|SENT|ACCEPTED|EXPIRED|CONVERTED)\b/.test(s) ||
        /\$\{(?:[^}]*\.)?(status|approval_state|stage)\}/.test(s) || /\/api\/|POST \//.test(s)
    )
    expect(leaks).toEqual([])
  })
})
