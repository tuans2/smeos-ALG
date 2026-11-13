import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { InfoTip } from "../info-tip"

describe("InfoTip (OPERATING_PRINCIPLES §6)", () => {
  it("là nút có nhãn truy cập, vùng bấm ≥ 32px, giải thích chưa hiện khi đóng", () => {
    const html = renderToStaticMarkup(<InfoTip label="Thương hiệu">Giải thích dài</InfoTip>)
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Giải thích: Thương hiệu"')
    expect(html).toContain("w-8 h-8")
    expect(html).not.toContain("Giải thích dài")
  })
})
