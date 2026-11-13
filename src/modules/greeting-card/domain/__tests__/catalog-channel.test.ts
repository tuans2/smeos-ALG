import { describe, expect, it } from "vitest"
import { buildChannelFunnel, normalizeChannel, withChannel } from "../catalog-channel"

describe("catalog-channel", () => {
  it("kênh lạ hoặc trống quy về trực tiếp", () => {
    expect(normalizeChannel("Zalo")).toBe("zalo")
    expect(normalizeChannel("<script>")).toBe("truc-tiep")
    expect(normalizeChannel(undefined)).toBe("truc-tiep")
  })

  it("gắn ?kenh= vào link, không chọn kênh thì giữ nguyên", () => {
    expect(withChannel("https://x.vn/bst/a/b", "zalo")).toBe("https://x.vn/bst/a/b?kenh=zalo")
    expect(withChannel("https://x.vn/g/1?a=1", "facebook")).toBe("https://x.vn/g/1?a=1&kenh=facebook")
    expect(withChannel("https://x.vn/g/1", "")).toBe("https://x.vn/g/1")
  })

  it("gom phễu theo kênh và tính tỷ lệ đặt", () => {
    const rows = buildChannelFunnel([
      { channel: "zalo", eventType: "VIEW", visitors: 10 },
      { channel: "zalo", eventType: "ORDER", visitors: 2 },
      { channel: "facebook", eventType: "VIEW", visitors: 4 },
      { channel: "facebook", eventType: "FORM_OPEN", visitors: 1 },
    ])
    expect(rows.map((r) => r.channel)).toEqual(["zalo", "facebook"])
    expect(rows[0]).toMatchObject({ label: "Zalo", views: 10, orders: 2, orderRate: 20 })
    expect(rows[1]).toMatchObject({ formOpens: 1, orders: 0, orderRate: 0 })
  })
})
