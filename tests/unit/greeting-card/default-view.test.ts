import { describe, expect, it } from "vitest"
import { defaultTheChaoView } from "@/components/greeting-card/default-view"

const canOf = (codes: string[]) => (code: string) => codes.includes(code)

describe("Thẻ chào mở đúng chỗ làm việc theo năng lực", () => {
  it("Điều hành (R11) → bảng Điều hành", () => {
    expect(defaultTheChaoView(canOf(["R1", "R2", "R3", "R11"]))).toEqual({ viewMode: "manager", activeTab: "payment" })
  })
  it("Điều phối (R3/R4/R5, không R11) → bảng Điều phối", () => {
    expect(defaultTheChaoView(canOf(["R1", "R2", "R5"]))).toEqual({ viewMode: "manager", activeTab: "coordinator" })
  })
  it("Sale → chế độ Quản lý, tab Bán hàng (cùng giao diện với Điều hành — PO 16/10/2026)", () => {
    expect(defaultTheChaoView(canOf(["R1", "R2", "L1"]))).toEqual({ viewMode: "manager", activeTab: "sales" })
  })
  it("không gửi được link (không R2) → Gửi nhanh, tab Bộ sưu tập", () => {
    expect(defaultTheChaoView(canOf(["R1", "L1"]))).toEqual({ viewMode: "wizard", activeTab: "catalog" })
  })
})
