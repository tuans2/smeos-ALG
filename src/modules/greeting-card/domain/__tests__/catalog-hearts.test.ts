import { describe, expect, it } from "vitest"
import { tallyHearts, type HeartAction } from "../catalog-hearts"
import { buildChannelFunnel } from "../catalog-channel"

const at = (m: number) => new Date(Date.UTC(2026, 9, 7, 10, m))
const act = (source: HeartAction["source"], subject: string, productId: string, liked: boolean, m: number): HeartAction => ({ source, subject, productId, liked, at: at(m) })

describe("tổng tim của bộ sưu tập", () => {
  it("mỗi khách tối đa 1 tim/mẫu; thả nhiều lần vẫn tính 1", () => {
    const rows = tallyHearts([act("public", "v1", "p1", true, 1), act("public", "v1", "p1", true, 2), act("public", "v1", "p1", true, 3)])
    expect(rows).toEqual([{ productId: "p1", hearts: 1, privateHearts: 0, publicHearts: 1 }])
  })

  it("thao tác cuối quyết định — bỏ tim thì trừ lại, kể cả khi sự kiện đến không theo thứ tự", () => {
    const rows = tallyHearts([act("private", "s1", "p1", false, 5), act("private", "s1", "p1", true, 1)])
    expect(rows).toEqual([])
  })

  it("cộng link riêng + link công khai và xếp hạng theo số tim", () => {
    const rows = tallyHearts([
      act("private", "s1", "p2", true, 1),
      act("public", "v1", "p2", true, 1),
      act("public", "v2", "p2", true, 1),
      act("public", "v1", "p1", true, 1),
      // cùng mã chủ thể nhưng khác nguồn là hai khách khác nhau
      act("private", "v1", "p1", true, 1),
    ])
    expect(rows.map((r) => [r.productId, r.hearts, r.privateHearts, r.publicHearts])).toEqual([
      ["p2", 3, 1, 2],
      ["p1", 2, 1, 1],
    ])
  })

  it("phễu kênh không đếm thả tim là đơn đặt", () => {
    const rows = buildChannelFunnel([
      { channel: "zalo", eventType: "VIEW", visitors: 4 },
      { channel: "zalo", eventType: "LIKE", visitors: 3 },
      { channel: "zalo", eventType: "ORDER", visitors: 1 },
    ])
    expect(rows[0]).toMatchObject({ views: 4, orders: 1, orderRate: 25 })
  })
})
