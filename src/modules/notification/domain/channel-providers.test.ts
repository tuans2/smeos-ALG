import { describe, expect, it } from "vitest"

import { CHANNEL_PROVIDERS, isProviderConfigured, maskProviderConfig, mergeProviderConfig, providerDefinition } from "./channel-providers"
import { smsPlainText } from "./notification-text"

const esms = providerDefinition("SMS", "esms")!

describe("sổ nhà cung cấp kênh (4.30)", () => {
  it("mỗi nhà cung cấp thuộc đúng một kênh; cả ba kênh đều gửi được khi đủ cấu hình", () => {
    expect(providerDefinition("ZALO", "esms")).toBeNull()
    expect(CHANNEL_PROVIDERS.every((p) => p.ready && !p.pending)).toBe(true)
  })

  it("ô bí mật để trống giữ khoá đã lưu; ô thường để trống bị xoá", () => {
    const current = { provider: "esms", values: { apiKey: "a", secretKey: "b", brandname: "X" } }
    const result = mergeProviderConfig(esms, { brandname: "Y", apiKey: "" }, current)
    expect(result).toEqual({ config: { provider: "esms", values: { apiKey: "a", secretKey: "b", brandname: "Y" } } })
    expect(mergeProviderConfig(esms, { brandname: "" }, current)).toEqual({ errors: { brandname: "Thiếu Brandname đã đăng ký" } })
  })

  it("đổi nhà cung cấp không mang khoá của nhà cung cấp cũ sang", () => {
    const zns = providerDefinition("ZALO", "zalo_zns")!
    const result = mergeProviderConfig(zns, { appId: "1", templateId: "2" }, { provider: "khac", values: { secretKey: "cu" } })
    expect("errors" in result && result.errors.secretKey).toBeTruthy()
  })

  it("che khoá bí mật: chỉ báo đã có/chưa, không trả nguyên văn", () => {
    const masked = maskProviderConfig("SMS", { provider: "esms", values: { apiKey: "a", secretKey: "b", brandname: "X" } })
    expect(masked).toMatchObject({ provider: "esms", values: { brandname: "X" }, secretsSet: { apiKey: true, secretKey: true }, configured: true, ready: true })
    expect(JSON.stringify(masked.values)).not.toContain('"a"')
    expect(isProviderConfigured("SMS", { provider: "esms", values: { apiKey: "a" } })).toBe(false)
    expect(isProviderConfigured("SMS", null)).toBe(false)
  })

  it("kênh chưa chọn nhà cung cấp vẫn báo đúng khả năng gửi theo sổ", () => {
    expect(maskProviderConfig("ZALO", null)).toMatchObject({ configured: false, ready: true, pending: null })
    expect(maskProviderConfig("PUSH", null)).toMatchObject({ configured: false, ready: true, pending: null })
  })

  it("nội dung SMS không dấu, giữ trọn link, tối đa 306 ký tự", () => {
    const text = smsPlainText({ title: "Đơn sắp giao", message: "Giao lúc 9 giờ ".repeat(40), link: "https://vd.vn/don/1" })
    expect(text.length).toBeLessThanOrEqual(306)
    expect(text.startsWith("Don sap giao: Giao luc 9 gio")).toBe(true)
    expect(text.endsWith(" https://vd.vn/don/1")).toBe(true)
  })
})
