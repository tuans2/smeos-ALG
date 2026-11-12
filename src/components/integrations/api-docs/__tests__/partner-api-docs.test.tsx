import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { partnerApiReference } from "@/modules/integration/use-cases/partner-api-reference"
import { PartnerApiDocs } from "../partner-api-docs"
import { PARTNER_GUIDE } from "../partner-guide"

/** ARC-024 B3–B5: trang tài liệu đối tác hiển thị đủ hướng dẫn, mọi endpoint và nhãn "Sắp gỡ" bằng chữ. */
describe("PartnerApiDocs", () => {
  const reference = partnerApiReference()
  const html = renderToStaticMarkup(<PartnerApiDocs reference={reference} />)

  it("có mọi mục hướng dẫn và mọi endpoint (nhãn Disclosure)", () => {
    for (const section of PARTNER_GUIDE) expect(html).toContain(section.title)
    for (const op of reference.operations) expect(html).toContain(`${op.method} ${op.path}`)
  })

  it("trường sắp gỡ có nhãn chữ và câu ngày gỡ; hướng dẫn nêu ngày thay đổi theo hằng số", () => {
    expect(html).toContain("Sắp gỡ")
    expect(html).toContain("Sắp gỡ: máy chủ bỏ trường này từ 2027-02-09")
    expect(html).toContain("09/02/2027")
    expect(html).toContain("600 lần gọi mỗi 60 giây")
  })

  it("không chữ tiếng Anh trơ trên nhãn khung, không mã quyền, không mã nội bộ, không ký hiệu markdown thô", () => {
    expect(html).not.toMatch(/\bF9\b/)
    expect(html).not.toMatch(/audit API|YC-[A-Z]\d|đặc tả 0\d/)
    expect(html).not.toContain("**")
    expect(html).not.toContain("Request body")
    expect(html).not.toContain("Response")
  })
})

describe("InlineText", () => {
  it("đổi **đậm** và `mã` thành thẻ, không để ký hiệu thô; không dựng HTML từ chuỗi", async () => {
    const { InlineText } = await import("../inline-text")
    const out = renderToStaticMarkup(<InlineText text={"Từ **09/02/2027** trả `422` <b>x</b>"} />)
    expect(out).toContain("<strong")
    expect(out).toContain(">09/02/2027</strong>")
    expect(out).toContain(">422</code>")
    expect(out).not.toContain("**")
    expect(out).toContain("&lt;b&gt;x&lt;/b&gt;")
  })
})
