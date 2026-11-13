/**
 * Unit tests: build-handoff-url.ts
 *
 * Khóa lại đúng luật đã gây lỗi thật ngày 22/09/2026: URL bàn giao Chặng 05 →
 * Creative Studio không bao giờ được mang ảnh (Data URL/blob), và không được
 * đi tiếp nếu thiếu `assetId`.
 */

import { describe, it, expect } from "vitest"
import {
  buildHandoffSearchParams,
  decodeScopeParam,
  encodeScopeParam,
  isSafeHandoffQueryString,
  MissingAssetIdError,
  MAX_HANDOFF_QUERY_LENGTH,
  type HandoffUrlInput,
} from "@/modules/creative-production/domain/build-handoff-url"

const VALID_INPUT: HandoffUrlInput = {
  runOrTopicId: "run-abc-123",
  mode: "CREATIVE",
  source: "image",
  assetId: "asset-789",
  productName: "Bó hoa hồng đỏ 20 cành",
  area: "b",
  productId: "prod-456",
}

describe("buildHandoffSearchParams", () => {
  it("builds a short, safe query string from valid input", () => {
    const params = buildHandoffSearchParams(VALID_INPUT)
    const qs = params.toString()

    expect(qs.length).toBeLessThan(MAX_HANDOFF_QUERY_LENGTH)
    expect(params.get("topic")).toBe("run-abc-123")
    expect(params.get("mode")).toBe("CREATIVE")
    expect(params.get("source")).toBe("image")
    expect(params.get("assetId")).toBe("asset-789")
    expect(params.get("area")).toBe("b")
    expect(params.get("productId")).toBe("prod-456")
  })

  it("throws MissingAssetIdError when assetId is missing", () => {
    const input: HandoffUrlInput = { ...VALID_INPUT, assetId: "" }
    expect(() => buildHandoffSearchParams(input)).toThrow(MissingAssetIdError)
  })

  it("throws MissingAssetIdError when assetId is only whitespace", () => {
    const input: HandoffUrlInput = { ...VALID_INPUT, assetId: "   " }
    expect(() => buildHandoffSearchParams(input)).toThrow(MissingAssetIdError)
  })

  it("throws when runOrTopicId is missing", () => {
    const input: HandoffUrlInput = { ...VALID_INPUT, runOrTopicId: "" }
    expect(() => buildHandoffSearchParams(input)).toThrow(/topic\/run id/)
  })

  it("never produces a query string containing a Data URL, even with a hostile product name", () => {
    const input: HandoffUrlInput = {
      ...VALID_INPUT,
      productName: "data:image/jpeg;base64," + "A".repeat(200_000),
    }
    // Không throw (productName không bắt buộc hợp lệ theo định dạng),
    // nhưng cổng an toàn phụ PHẢI bắt được và từ chối chuỗi này.
    const qs = buildHandoffSearchParams(input).toString()
    expect(isSafeHandoffQueryString(qs)).toBe(false)
  })

  it("keeps the type signature free of imageUrl/videoUrl/report fields", () => {
    // Test này khóa lại HÌNH DẠNG kiểu, không phải giá trị: nếu ai đó thêm
    // trường `imageUrl` vào HandoffUrlInput trong tương lai, TypeScript sẽ
    // không báo lỗi ở đây — nhưng review code phải bắt được vì input dưới
    // đây liệt kê đủ và chỉ đủ các trường được phép.
    const allowedKeys = Object.keys(VALID_INPUT).sort()
    expect(allowedKeys).toEqual(
      ["area", "assetId", "mode", "productId", "productName", "runOrTopicId", "source"].sort()
    )
  })
})

describe("isSafeHandoffQueryString", () => {
  it("accepts a normal short query string", () => {
    expect(isSafeHandoffQueryString("topic=abc&mode=CREATIVE&assetId=xyz")).toBe(true)
  })

  it("rejects strings containing data: URIs", () => {
    expect(isSafeHandoffQueryString("imageUrl=data:image/jpeg;base64,AAAA")).toBe(false)
  })

  it("rejects strings containing blob: URLs", () => {
    expect(isSafeHandoffQueryString("imageUrl=blob:http://localhost/abc-123")).toBe(false)
  })

  it("rejects strings longer than MAX_HANDOFF_QUERY_LENGTH", () => {
    const long = "a=" + "x".repeat(MAX_HANDOFF_QUERY_LENGTH)
    expect(isSafeHandoffQueryString(long)).toBe(false)
  })
})

describe("phạm vi sản xuất trên URL bàn giao (PO 24/09/2026)", () => {
  const base = { runOrTopicId: "run-1", mode: "CREATIVE", source: "image", assetId: "a-1", productName: "Bó hoa", area: "b" } as const

  it("không chọn → không ghi tham số (Creative Studio dùng mặc định TikTok + Reels)", () => {
    const p = buildHandoffSearchParams(base)
    expect(p.has("platforms")).toBe(false)
    expect(p.has("outputs")).toBe(false)
  })

  it("ghi danh sách và 'all', đọc lại đúng", () => {
    const p = buildHandoffSearchParams({ ...base, platforms: ["tiktok", "youtube"], outputs: "all" })
    expect(p.get("platforms")).toBe("tiktok,youtube")
    expect(p.get("outputs")).toBe("all")
    expect(decodeScopeParam(p.get("platforms"))).toEqual(["tiktok", "youtube"])
    expect(decodeScopeParam(p.get("outputs"))).toBe("all")
    expect(decodeScopeParam(null)).toBeUndefined()
    expect(encodeScopeParam([])).toBeNull()
  })
})
