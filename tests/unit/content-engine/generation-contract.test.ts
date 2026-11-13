import { describe, expect, it } from "vitest"

import { generateContentBodySchema, generationLookupQuerySchema } from "@/modules/content-engine/contracts/generation"

describe("generateContentBodySchema", () => {
  it("hợp lệ khi có asset_id + channels", () => {
    const r = generateContentBodySchema.safeParse({ asset_id: "123e4567-e89b-12d3-a456-426614174000", channels: ["facebook"] })
    expect(r.success).toBe(true)
  })

  it("hợp lệ khi có product_id thay vì asset_id", () => {
    const r = generateContentBodySchema.safeParse({ product_id: "123e4567-e89b-12d3-a456-426614174000", channels: ["facebook", "zalo"] })
    expect(r.success).toBe(true)
  })

  it("thiếu cả asset_id lẫn product_id → lỗi", () => {
    const r = generateContentBodySchema.safeParse({ channels: ["facebook"] })
    expect(r.success).toBe(false)
  })

  it("channels rỗng → lỗi", () => {
    const r = generateContentBodySchema.safeParse({ asset_id: "123e4567-e89b-12d3-a456-426614174000", channels: [] })
    expect(r.success).toBe(false)
  })

  it("channels quá 4 → lỗi", () => {
    const r = generateContentBodySchema.safeParse({
      asset_id: "123e4567-e89b-12d3-a456-426614174000",
      channels: ["facebook", "instagram", "tiktok", "zalo", "facebook"],
    })
    expect(r.success).toBe(false)
  })

  it("kênh không hợp lệ → lỗi", () => {
    const r = generateContentBodySchema.safeParse({ asset_id: "123e4567-e89b-12d3-a456-426614174000", channels: ["youtube"] })
    expect(r.success).toBe(false)
  })
})

describe("generationLookupQuerySchema", () => {
  it("cho phép tất cả trường vắng mặt (undefined)", () => {
    const r = generationLookupQuerySchema.safeParse({})
    expect(r.success).toBe(true)
  })

  it("mode sai giá trị → lỗi", () => {
    const r = generationLookupQuerySchema.safeParse({ mode: "OTHER" })
    expect(r.success).toBe(false)
  })
})
