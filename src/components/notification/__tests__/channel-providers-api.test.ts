import { describe, expect, it } from "vitest"

import { canActivate, channelStatus, providerSaveBody, type ChannelProviderStateView, type ProviderDefinitionView } from "../channel-providers-api"

const base: ChannelProviderStateView = { channel: "SMS", provider: "esms", values: {}, secretsSet: {}, configured: true, ready: true, pending: null, activated: false }

describe("khối Kênh liên lạc — luật hiển thị (4.30)", () => {
  it("trạng thái bằng lời theo kết nối và bật/tắt", () => {
    expect(channelStatus({ ...base, configured: false })).toEqual({ label: "Chưa kết nối", tone: "neutral" })
    expect(channelStatus(base).label).toBe("Đã kết nối, đang tắt")
    expect(channelStatus({ ...base, activated: true }).label).toBe("Đang dùng")
    expect(channelStatus({ ...base, channel: "PUSH", ready: false }).label).toBe("Đã lưu khoá, chưa gửi được")
  })

  it("chỉ bật được kênh đã kết nối và gửi được; tắt luôn được", () => {
    expect(canActivate({ ...base, configured: false })).toBe(false)
    expect(canActivate({ ...base, ready: false })).toBe(false)
    expect(canActivate(base)).toBe(true)
    expect(canActivate({ ...base, configured: false, activated: true })).toBe(true)
  })

  it("ô khoá để trống không gửi lên (giữ khoá đã lưu); ô thường gửi cả khi trống", () => {
    const def: ProviderDefinitionView = {
      key: "esms", channel: "SMS", label: "eSMS", ready: true,
      fields: [{ name: "apiKey", label: "API key", secret: true, required: true }, { name: "brandname", label: "Brandname", secret: false, required: true }],
    }
    expect(providerSaveBody("SMS", def, { apiKey: " ", brandname: "" })).toEqual({ channel: "SMS", provider: "esms", values: { brandname: "" } })
    expect(providerSaveBody("SMS", def, { apiKey: "k" }).values).toEqual({ apiKey: "k", brandname: "" })
  })
})
