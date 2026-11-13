import { describe, expect, it } from "vitest"
import {
  buildSubstituteProposal,
  buildSubstituteResponse,
  readSubstitutePayload,
  substituteForCustomer,
  substituteInternalNote,
  substituteLockReason,
  type SubstituteOption,
  type SubstitutePayload,
} from "../substitute-proposal"

const opt = (id: string, priceVnd = 500_000): SubstituteOption => ({
  productId: id, code: `HOA-${id}`, name: `Bó ${id}`, imageUrl: null, driveLink: null, priceVnd,
})
const CATALOG = [opt("a"), opt("b"), opt("c"), opt("d")]
const PAYLOAD: SubstitutePayload = {
  status: "PENDING",
  reason: "Hoa hồng Ecuador hôm nay về bị dập",
  original: { productId: "x", name: "Bó X" },
  options: [opt("a"), opt("b")],
  proposedBy: "u1",
  proposedAt: "2026-10-08T03:00:00.000Z",
}

describe("substituteLockReason", () => {
  it("cho đề xuất khi hoa chưa rời tiệm, kể cả đang cắm", () => {
    expect(substituteLockReason({ status: "PROCESSING", deliveryStatus: "PENDING" })).toBeNull()
    expect(substituteLockReason({ status: "CONFIRMED", deliveryStatus: "FAILED" })).toBeNull()
  })
  it("khoá khi đã giao shipper, giao xong hoặc đã huỷ", () => {
    expect(substituteLockReason({ status: "PROCESSING", deliveryStatus: "DISPATCHED" })).toMatch(/shipper/)
    expect(substituteLockReason({ status: "PROCESSING", deliveryStatus: "DELIVERING" })).toMatch(/shipper/)
    expect(substituteLockReason({ status: "COMPLETED", deliveryStatus: "DELIVERED" })).toMatch(/giao xong/)
    expect(substituteLockReason({ status: "DELIVERED", deliveryStatus: "PENDING" })).toMatch(/giao xong/)
    expect(substituteLockReason({ status: "CANCELLED", deliveryStatus: "PENDING" })).toMatch(/huỷ/)
  })
})

describe("buildSubstituteProposal", () => {
  it("nhận 1–3 mẫu khác nhau trong bộ sưu tập, bỏ trùng, giữ thứ tự", () => {
    const r = buildSubstituteProposal({ reason: "  Hết hoa tulip  ", productIds: ["b", "a", "b"] }, "x", CATALOG)
    expect(r.ok && r.options.map((o) => o.productId)).toEqual(["b", "a"])
    expect(r.ok && r.reason).toBe("Hết hoa tulip")
  })
  it("từ chối lý do ngắn, quá 3 mẫu, mẫu đang đặt, mẫu ngoài bộ sưu tập", () => {
    const err = (reason: string, ids: string[], current = "x") => {
      const r = buildSubstituteProposal({ reason, productIds: ids }, current, CATALOG)
      return r.ok ? {} : r.errors
    }
    expect(err("hết", ["a"]).reason).toBeDefined()
    expect(err("Hết hoa", []).productIds).toBeDefined()
    expect(err("Hết hoa", ["a", "b", "c", "d"]).productIds).toMatch(/tối đa 3/)
    expect(err("Hết hoa", ["a"], "a").productIds).toMatch(/khác mẫu/)
    expect(err("Hết hoa", ["zz"]).productIds).toMatch(/hết hàng/)
  })
})

describe("buildSubstituteResponse", () => {
  const err = (input: Parameters<typeof buildSubstituteResponse>[1]) => {
    const r = buildSubstituteResponse(PAYLOAD, input)
    return r.ok ? {} : r.errors
  }
  it("chọn mẫu phải nằm trong các mẫu đề xuất", () => {
    expect(buildSubstituteResponse(PAYLOAD, { choice: "OPTION", productId: "b" })).toMatchObject({ ok: true, option: { productId: "b" } })
    expect(err({ choice: "OPTION", productId: "c" }).productId).toBeDefined()
  })
  it("nhờ tiệm chọn không cần ghi chú; huỷ phải có lý do; lựa chọn lạ bị từ chối", () => {
    expect(buildSubstituteResponse(PAYLOAD, { choice: "SHOP_DECIDES" })).toMatchObject({ ok: true, option: null })
    expect(err({ choice: "CANCEL" }).note).toBeDefined()
    expect(buildSubstituteResponse(PAYLOAD, { choice: "CANCEL", note: "Cần đúng mẫu" })).toMatchObject({ ok: true, choice: "CANCEL" })
    expect(err({ choice: "toString" }).choice).toBeDefined()
  })
})

describe("ghi chú nội bộ + bản cho khách", () => {
  it("ghi rõ mẫu cũ → mẫu mới cho thợ cắm", () => {
    expect(substituteInternalNote(PAYLOAD, { choice: "OPTION", option: opt("a"), note: "" })).toBe('[Đổi mẫu] Khách đồng ý đổi "Bó X" sang "Bó a" (HOA-a).')
    expect(substituteInternalNote(PAYLOAD, { choice: "SHOP_DECIDES", option: null, note: "Tông hồng" })).toMatch(/tương đương.*Tông hồng/)
  })
  it("bản cho khách bỏ mã nội bộ và người đề xuất", () => {
    const v = substituteForCustomer("m1", { ...PAYLOAD, status: "ANSWERED", choice: "OPTION", chosenProductId: "a", answeredAt: "t" })
    expect(v).toMatchObject({ id: "m1", chosenName: "Bó a", choiceLabel: "Khách chọn mẫu thay thế", originalName: "Bó X" })
    expect(JSON.stringify(v)).not.toContain("HOA-a")
    expect(JSON.stringify(v)).not.toContain("u1")
  })
  it("đọc payload lỗi trả null", () => {
    expect(readSubstitutePayload(null)).toBeNull()
    expect(readSubstitutePayload({ status: "X" })).toBeNull()
    expect(readSubstitutePayload(PAYLOAD)).not.toBeNull()
  })
})
