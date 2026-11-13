import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { QUOTATION_STATUS_LABELS, QUOTATION_STATUSES } from "@/modules/sales/domain/quotation"

/** Quy tắc UI số 6: không hiện mã kỹ thuật (`SENT`, `DRAFT`…) lên màn hình. */
describe("Báo giá — trạng thái hiển thị bằng nhãn tiếng Việt", () => {
  it("mỗi trạng thái có nhãn", () => {
    for (const s of QUOTATION_STATUSES) expect(QUOTATION_STATUS_LABELS[s]).toMatch(/\p{Ll}/u)
  })

  it.each(["partner-quote-builder.tsx", "quote-preview-card.tsx", "quotations-list-view.tsx"])(
    "%s không render trường status thô",
    (file) => {
      const src = readFileSync(path.resolve(__dirname, file), "utf-8")
      expect(src).not.toMatch(/\{\s*(createdQuote|q|quote)\.status\s*\}/)
      expect(src).not.toMatch(/\?\s*createdQuote\.status\s*:/)
      expect(src).not.toContain("ĐÃ GỬI")
    },
  )
})
