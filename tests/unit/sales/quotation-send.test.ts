import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { unsentMessage } from "@/components/sales/quotation/quotation-send"

/** Audit BL-31 (11/11/2026): gửi báo giá lỗi bị nuốt (`.send(id).catch(() => quote)`), màn hình như đã gửi. */
describe("gửi báo giá không thành", () => {
  it("báo rõ báo giá đã lưu nháp và lý do", () => {
    expect(unsentMessage(new Error("Mất kết nối"))).toBe("Đã lưu báo giá nháp nhưng chưa gửi được cho khách (Mất kết nối). Mở danh sách báo giá để gửi lại.")
    expect(unsentMessage("x")).toBe("Đã lưu báo giá nháp nhưng chưa gửi được cho khách. Mở danh sách báo giá để gửi lại.")
  })

  it("không màn tạo báo giá nào còn nuốt lỗi gửi", () => {
    for (const f of ["customer-quote-builder.tsx", "partner-quote-builder.tsx"]) {
      const src = readFileSync(`src/components/sales/quotation/${f}`, "utf-8")
      expect(src).not.toMatch(/\.send\([^)]*\)\.catch\(\(\)\s*=>/)
    }
  })
})
