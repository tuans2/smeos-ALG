import * as React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { ChannelProviderCard } from "../channel-provider-card"
import type { ChannelProviderStateView, ProviderDefinitionView } from "../channel-providers-api"

const def: ProviderDefinitionView = {
  key: "esms", channel: "SMS", label: "eSMS.vn — SMS Brandname", ready: true,
  fields: [{ name: "apiKey", label: "API key", secret: true, required: true }, { name: "brandname", label: "Brandname đã đăng ký", secret: false, required: true }],
}
const state = (over: Partial<ChannelProviderStateView>): ChannelProviderStateView => ({
  channel: "SMS", provider: null, values: {}, secretsSet: {}, configured: false, ready: true, pending: null, activated: false, ...over,
})
const render = (s: ChannelProviderStateView) => renderToStaticMarkup(<ChannelProviderCard state={s} definition={def} onChanged={async () => undefined} />)

describe("thẻ kênh liên lạc (4.30)", () => {
  it("chưa kết nối: công tắc khoá, nói rõ điều kiện bật", () => {
    const html = render(state({}))
    expect(html).toContain("Chưa kết nối")
    expect(html).toContain("Cần nhập đủ thông số nhà cung cấp trước khi bật.")
    expect(html).toMatch(/role="switch"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*role="switch"|data-disabled/)
  })

  it("đã kết nối: ô khoá trống kiểu mật khẩu, chỉ báo đã lưu; ô thường hiện giá trị", () => {
    const html = render(state({ provider: "esms", configured: true, values: { brandname: "HOAMAU" }, secretsSet: { apiKey: true } }))
    expect(html).toContain("Đã kết nối, đang tắt")
    expect(html).toContain('type="password"')
    expect(html).toContain("Đã lưu, bỏ trống để giữ")
    expect(html).toContain('value="HOAMAU"')
    expect(html).toContain("Gửi thử")
    expect(html).toContain("Gỡ kết nối")
  })
})
