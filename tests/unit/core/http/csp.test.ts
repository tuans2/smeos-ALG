import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { buildCsp, CSP_REPORT_URI, cspHeaderName, cspMode, newCspNonce } from "@/core/http/csp"
import { proxy } from "@/proxy"

/** ARC-022 A6 (PO 12/11/2026): CSP theo nonce, chặn ngay khi triển khai; `CSP_MODE=report-only` để tạm lùi. */
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `))?.split(" ").slice(1) ?? []

describe("buildCsp", () => {
  const csp = buildCsp("abc123", { NODE_ENV: "production", STORAGE_ENDPOINT: "https://kho.r2.example.com/bucket" })

  it("script chỉ chạy khi có nonce của request (strict-dynamic), không unsafe-inline/unsafe-eval ở production", () => {
    expect(directive(csp, "script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"])
    expect(csp).not.toContain("'unsafe-eval'")
    expect(directive(csp, "script-src")).not.toContain("'unsafe-inline'")
  })

  it("chặn plugin, base, form ra ngoài và nhúng từ site lạ; có nơi nhận báo cáo", () => {
    expect(directive(csp, "object-src")).toEqual(["'none'"])
    expect(directive(csp, "base-uri")).toEqual(["'self'"])
    expect(directive(csp, "form-action")).toEqual(["'self'"])
    expect(directive(csp, "frame-ancestors")).toEqual(["'self'"])
    expect(directive(csp, "report-uri")).toEqual([CSP_REPORT_URI])
  })

  it("cho đúng các nguồn ngoài mã đang dùng: origin kho (PUT ảnh), Turnstile, YouTube/TikTok, ảnh/video https", () => {
    expect(directive(csp, "connect-src")).toEqual(["'self'", "https://kho.r2.example.com", "https://challenges.cloudflare.com"])
    expect(directive(csp, "frame-src")).toEqual(["'self'", "https://www.youtube.com", "https://www.tiktok.com", "https://challenges.cloudflare.com"])
    expect(directive(csp, "img-src")).toContain("https:")
    expect(directive(csp, "media-src")).toContain("https:")
  })

  it("không có kho S3 (đĩa cục bộ) thì connect-src không thêm origin lạ; dev thêm unsafe-eval và ws:", () => {
    expect(directive(buildCsp("n", { NODE_ENV: "production" }), "connect-src")).toEqual(["'self'", "https://challenges.cloudflare.com"])
    expect(directive(buildCsp("n", { NODE_ENV: "production", STORAGE_ENDPOINT: "khong-phai-url" }), "connect-src")).toEqual(["'self'", "https://challenges.cloudflare.com"])
    const dev = buildCsp("n", { NODE_ENV: "development" })
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'")
    expect(directive(dev, "connect-src")).toContain("ws:")
  })
})

describe("cspMode / cspHeaderName / newCspNonce", () => {
  it("mặc định chặn; chỉ report-only khi đặt rõ", () => {
    expect(cspMode({})).toBe("enforce")
    expect(cspMode({ CSP_MODE: "khac" })).toBe("enforce")
    expect(cspMode({ CSP_MODE: " Report-Only " })).toBe("report-only")
    expect(cspHeaderName("enforce")).toBe("Content-Security-Policy")
    expect(cspHeaderName("report-only")).toBe("Content-Security-Policy-Report-Only")
  })

  it("nonce mới mỗi lần, đủ dài, ký tự base64", () => {
    const a = newCspNonce()
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(newCspNonce()).not.toBe(a)
  })
})

describe("proxy gắn CSP", () => {
  it("phản hồi có Content-Security-Policy chặn thật với nonce mới mỗi request", async () => {
    const one = await proxy(new NextRequest("http://localhost/dang-nhap"))
    const two = await proxy(new NextRequest("http://localhost/dang-nhap"))
    const csp1 = one.headers.get("content-security-policy") ?? ""
    const csp2 = two.headers.get("content-security-policy") ?? ""
    expect(directive(csp1, "script-src")).toContain("'strict-dynamic'")
    const nonce1 = /'nonce-([^']+)'/.exec(csp1)?.[1]
    expect(nonce1).toBeTruthy()
    expect(csp2).not.toContain(`'nonce-${nonce1}'`)
    expect(one.headers.get("content-security-policy-report-only")).toBeNull()
    // Nonce đi kèm request để Next.js gắn vào script khi render
    expect(one.headers.get("x-middleware-request-x-nonce")).toBe(nonce1)
  })
})
