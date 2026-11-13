import { describe, expect, it } from "vitest"
import {
  approveProposal,
  decideEdit,
  expireProposal,
  isPendingProposal,
  markReminded,
  newProposal,
  planSweep,
  readProposal,
  rejectProposal,
  stripProposal,
} from "@/modules/products/domain/product-proposal"

const SALE = "user-sale"
const pending = { proposal: newProposal(SALE, new Date("2026-10-23T00:00:00Z")) }

describe("nhãn đề xuất", () => {
  it("đọc được mẫu đề xuất đang chờ và bỏ qua dữ liệu hỏng", () => {
    expect(isPendingProposal(pending)).toBe(true)
    expect(isPendingProposal({ proposal: { status: "pending" } })).toBe(false)
    expect(isPendingProposal(null)).toBe(false)
  })

  it("client không tự gắn hay gỡ được nhãn đề xuất", () => {
    expect(stripProposal({ a: 1, proposal: { status: "approved", byUserId: "x" } })).toEqual({ a: 1 })
    expect(stripProposal(null)).toBeNull()
  })

  it("duyệt giữ người đề xuất và ghi người duyệt", () => {
    const out = approveProposal(readProposal(pending)!, "user-dh", new Date("2026-10-24T00:00:00Z"))
    expect(out).toMatchObject({ status: "approved", byUserId: SALE, reviewedBy: "user-dh" })
  })
})

describe("decideEdit — ai được sửa gì", () => {
  const official = { price: 1 }

  it("Điều hành sửa được mọi mẫu", () => {
    expect(decideEdit({ canManageCatalog: true, userId: "dh", storedAttributes: official, input: { name: "x" } })).toBe("allow")
  })

  it("không ai khác ghi đè nội dung mẫu chính thức", () => {
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: official, input: { name: "x" } })).toBe("deny")
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: official, input: { attributes: {} } })).toBe("deny")
  })

  it("Điều phối được tạm ẩn / mở bán và chỉnh khả dụng trên mẫu chính thức", () => {
    expect(decideEdit({ canManageCatalog: false, userId: "dp", storedAttributes: official, input: { status: "DRAFT" } })).toBe("allow")
    expect(decideEdit({ canManageCatalog: false, userId: "dp", storedAttributes: official, input: { status: "ACTIVE", availabilityConfig: {} } })).toBe("allow")
    expect(decideEdit({ canManageCatalog: false, userId: "dp", storedAttributes: official, input: { status: "ARCHIVED" } })).toBe("deny")
  })

  it("người đề xuất sửa được mẫu đề xuất của chính mình, người khác thì không", () => {
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: pending, input: { name: "x" } })).toBe("allow")
    expect(decideEdit({ canManageCatalog: false, userId: "other", storedAttributes: pending, input: { name: "x" } })).toBe("deny")
  })

  it("mẫu đã duyệt trở thành chính thức", () => {
    const approved = { proposal: approveProposal(readProposal(pending)!, "dh") }
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: approved, input: { name: "x" } })).toBe("deny")
  })

  it("trường gửi lên với giá trị undefined không tính là sửa", () => {
    expect(decideEdit({ canManageCatalog: false, userId: "dp", storedAttributes: official, input: { name: undefined, status: "DRAFT" } })).toBe("allow")
  })
})

describe("vòng đời 30 ngày — planSweep", () => {
  const at = new Date("2026-10-01T00:00:00Z")
  const day = (n: number) => new Date(at.getTime() + n * 86_400_000)
  const p = newProposal(SALE, at)

  it("nhắc ở mốc 7/21/27, không nhắc trùng, không nhắc bù mốc đã qua", () => {
    expect(planSweep(p, day(3))).toBeNull()
    expect(planSweep(p, day(7))).toEqual({ kind: "remind", day: 7, daysLeft: 23 })
    expect(planSweep(markReminded(p, 7), day(8))).toBeNull()
    expect(planSweep(p, day(22))).toMatchObject({ kind: "remind", day: 21 })
    expect(planSweep(markReminded(p, 21), day(26))).toBeNull()
    expect(markReminded(p, 21).remindedDays).toEqual([7, 21])
  })

  it("đủ 30 ngày chưa duyệt → hết hạn", () => {
    expect(planSweep(markReminded(p, 27), day(30))).toEqual({ kind: "expire" })
  })

  it("bị từ chối / hết hạn quá 30 ngày → dọn vào thùng rác; đã duyệt thì không đụng", () => {
    const rejected = rejectProposal(p, "dh", "Trùng mẫu", day(2))
    expect(planSweep(rejected, day(20))).toBeNull()
    expect(planSweep(rejected, day(32))).toEqual({ kind: "purge" })
    expect(planSweep(expireProposal(p, day(30)), day(60))).toEqual({ kind: "purge" })
    expect(planSweep(approveProposal(p, "dh", day(1)), day(90))).toBeNull()
  })

  it("mẫu bị từ chối: người đề xuất không sửa được nữa", () => {
    const attrs = { proposal: rejectProposal(p, "dh", "x") }
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: attrs, input: { name: "y" } })).toBe("deny")
    expect(decideEdit({ canManageCatalog: false, userId: SALE, storedAttributes: attrs, input: { status: "ACTIVE" } })).toBe("deny")
  })

  it("đọc được dữ liệu giai đoạn 1 (approvedBy)", () => {
    expect(readProposal({ proposal: { status: "approved", byUserId: SALE, at: "x", approvedBy: "dh", approvedAt: "y" } })).toMatchObject({ reviewedBy: "dh", reviewedAt: "y" })
  })
})
