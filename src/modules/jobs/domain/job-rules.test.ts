import { describe, expect, it } from "vitest"

import {
  canCancel,
  canRetry,
  isDuplicateIdempotencyError,
  isStuck,
  isTerminalStatus,
} from "./job-rules"

describe("job-rules", () => {
  it("chỉ PENDING huỷ được", () => {
    expect(canCancel("PENDING")).toBe(true)
    expect(canCancel("PROCESSING")).toBe(false)
    expect(canCancel("COMPLETED")).toBe(false)
  })

  it("chỉ FAILED retry được — COMPLETED/REJECTED không phải job lỗi", () => {
    expect(canRetry("FAILED")).toBe(true)
    expect(canRetry("COMPLETED")).toBe(false)
    expect(canRetry("CANCELLED")).toBe(false)
    expect(canRetry("PENDING")).toBe(false)
  })

  it("trạng thái cuối", () => {
    expect(isTerminalStatus("COMPLETED")).toBe(true)
    expect(isTerminalStatus("FAILED")).toBe(true)
    expect(isTerminalStatus("CANCELLED")).toBe(true)
    expect(isTerminalStatus("PENDING")).toBe(false)
    expect(isTerminalStatus("PROCESSING")).toBe(false)
  })

  it("treo quá 15 phút mới coi là stuck", () => {
    const startedAt = new Date("2026-01-01T00:00:00Z")
    const at14min = new Date(startedAt.getTime() + 14 * 60 * 1000)
    const at16min = new Date(startedAt.getTime() + 16 * 60 * 1000)

    expect(isStuck({ status: "PROCESSING", started_at: startedAt }, at14min)).toBe(false)
    expect(isStuck({ status: "PROCESSING", started_at: startedAt }, at16min)).toBe(true)
    expect(isStuck({ status: "PENDING", started_at: null }, at16min)).toBe(false)
    expect(isStuck({ status: "COMPLETED", started_at: startedAt }, at16min)).toBe(false)
  })

  it("nhận diện đúng lỗi trùng Idempotency-Key, bỏ qua lỗi khác", () => {
    const target = ["organization_id", "feature", "idempotency_key"]
    expect(isDuplicateIdempotencyError({ code: "P2002", meta: { target } })).toBe(true)
    expect(isDuplicateIdempotencyError({ code: "P2002", meta: { target: target.join("_") } })).toBe(
      true
    )
    // Trùng khoá ở bảng khác (vd. `products.code`) KHÔNG được nuốt thành
    // "trùng lặp bình thường" — nó là lỗi thật.
    expect(
      isDuplicateIdempotencyError({ code: "P2002", meta: { target: ["organization_id", "code"] } })
    ).toBe(false)
    expect(isDuplicateIdempotencyError({ code: "P2010" })).toBe(false)
    expect(isDuplicateIdempotencyError(new Error("bất kỳ"))).toBe(false)
    expect(isDuplicateIdempotencyError(null)).toBe(false)
    expect(isDuplicateIdempotencyError(undefined)).toBe(false)
  })
})
