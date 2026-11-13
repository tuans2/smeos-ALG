import { describe, expect, it } from "vitest"
import {
  applyFlowerSubstitution, buildFlowerProposal, buildFlowerResponse, flowerForCustomer, readFlowerPayload, secondaryFlowerLines,
  type FlowerSubstitutePayload,
} from "@/modules/greeting-card/domain/flower-substitute"

const META = {
  name: "Bó X",
  flowers: [
    { flowerName: "Hồng Ecuador", quantity: 10, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
    { flowerName: "Baby trắng", quantity: 3, unit: "cành", color: "Trắng", role: "Lấp đầy" },
  ],
}
const INPUT = { reason: "Baby trắng hôm nay hết", lineIndex: 1, replacementName: "Cẩm chướng", photoAssetId: "a1" }

describe("đổi một loại hoa phụ (ALG 5.14)", () => {
  it("chỉ hoa phụ được chọn; hoa chủ đạo bị từ chối; thiếu ảnh, lý do, tên trùng bị báo lỗi", () => {
    expect(secondaryFlowerLines(META).map((l) => l.index)).toEqual([1])
    expect(buildFlowerProposal(INPUT, META, true)).toMatchObject({ ok: true, line: { flowerName: "Baby trắng" }, replacement: { flowerName: "Cẩm chướng", color: null } })
    const bad = buildFlowerProposal({ ...INPUT, lineIndex: 0, reason: "x", replacementName: "Hồng Ecuador" }, META, false)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["lineIndex", "photoAssetId", "reason", "replacementName"])
    expect(buildFlowerProposal({ ...INPUT, replacementName: "baby TRẮNG" }, META, true).ok).toBe(false)
  })

  it("đồng ý → đổi đúng dòng, giữ số lượng và vai trò; công thức đã khác bản đề xuất → không ghi đè", () => {
    const built = buildFlowerProposal({ ...INPUT, replacementColor: "Hồng nhạt" }, META, true)
    if (!built.ok) throw new Error("phải hợp lệ")
    const payload: FlowerSubstitutePayload = { kind: "FLOWER", status: "ANSWERED", reason: built.reason, productName: "Bó X", line: built.line, replacement: built.replacement, proposedBy: "u", proposedAt: "t", choice: "ACCEPT", answeredAt: "t2" }
    const next = applyFlowerSubstitution(META, payload) as { name: string; flowers: Array<Record<string, unknown>> }
    expect(next.name).toBe("Bó X")
    expect(next.flowers[0]).toEqual(META.flowers[0])
    expect(next.flowers[1]).toMatchObject({ flowerName: "Cẩm chướng", color: "Hồng nhạt", quantity: 3, role: "Lấp đầy", substitutedFrom: { flowerName: "Baby trắng", color: "Trắng" } })
    expect(applyFlowerSubstitution(next, payload)).toBeNull()
    expect(readFlowerPayload(payload)).toEqual(payload)
    expect(readFlowerPayload({ ...payload, kind: "PRODUCT" })).toBeNull()
    expect(flowerForCustomer("p1", payload, "/s/x")).not.toHaveProperty("proposedBy")
  })

  it("câu trả lời chỉ nhận đồng ý / không đồng ý", () => {
    expect(buildFlowerResponse({ choice: "ACCEPT" })).toEqual({ ok: true, choice: "ACCEPT", note: "" })
    expect(buildFlowerResponse({ choice: "OPTION" }).ok).toBe(false)
  })
})
