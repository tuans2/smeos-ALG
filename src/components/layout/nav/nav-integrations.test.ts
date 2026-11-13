import { describe, expect, it } from "vitest"
import { buildNav } from "./index"

const all = () => true
const hrefs = (view: ReturnType<typeof buildNav>) => view.groups.flatMap((g) => g.entries.map((e) => e.href))

describe("Mục Tích hợp trong sidebar 4 tầng", () => {
  it("cửa hàng và chuỗi thấy /tich-hop ngay sau mục cài đặt", () => {
    for (const orgType of ["SINGLE", "CHAIN"]) {
      const list = hrefs(buildNav(all, null, null, null, orgType))
      expect(list).toContain("/tich-hop")
      expect(list.indexOf("/tich-hop")).toBe(list.indexOf("/cai-dat") + 1)
    }
  })

  it("tầng Mẹ thấy /van-hanh/tich-hop, tầng Ngành thấy /tich-hop", () => {
    expect(hrefs(buildNav(all, null, null, null, "PLATFORM"))).toContain("/van-hanh/tich-hop")
    expect(hrefs(buildNav(all, null, null, null, "INDUSTRY"))).toContain("/tich-hop")
  })

  it("thiếu quyền W1 hoặc ngành ẩn mục thì không hiện", () => {
    const noW1 = (code: string) => code !== "W1"
    expect(hrefs(buildNav(noW1, null, null, null, "SINGLE"))).not.toContain("/tich-hop")
    expect(hrefs(buildNav(all, null, null, ["integrations"], "SINGLE"))).not.toContain("/tich-hop")
  })
})
