import { describe, expect, it, vi } from "vitest"
import { resolveShortLink } from "../resolve-short-link"
import type { ShortLinkRepository } from "../../infra/short-link-repository"

const NOW = new Date("2026-10-30T03:00:00Z")
const link = { id: "sl-1", organization_id: "org-a", code: "abc2345", target_path: "/c/hoa", is_active: true, expires_at: null, utm_source: "smeos", utm_medium: "qr", utm_campaign: null }

function repo(found: unknown, recordEvent = vi.fn().mockResolvedValue(undefined)) {
  return { findPublicByCode: vi.fn().mockResolvedValue(found), recordEvent } as unknown as ShortLinkRepository & { recordEvent: typeof recordEvent }
}

const scan = { ip: "1.2.3.4", userAgent: "Mozilla/5.0 (iPhone) Mobile", referrer: null, now: NOW }

describe("resolveShortLink", () => {
  it("mã hợp lệ → đích có ref + UTM, ghi lượt quét không chứa IP thô", async () => {
    const r = repo(link)
    expect(await resolveShortLink("abc2345", scan, r)).toBe("/c/hoa?ref=abc2345&utm_source=smeos&utm_medium=qr")
    const event = r.recordEvent.mock.calls[0]![1] as { device: string; visitorHash: string }
    expect(event.device).toBe("MOBILE")
    expect(event.visitorHash).toHaveLength(32)
    expect(JSON.stringify(event)).not.toContain("1.2.3.4")
  })
  it("mã sai định dạng → null, không truy vấn", async () => {
    const r = repo(link)
    expect(await resolveShortLink("../../x", scan, r)).toBeNull()
    expect(r.findPublicByCode).not.toHaveBeenCalled()
  })
  it("tắt/hết hạn → null, không ghi lượt", async () => {
    const r = repo({ ...link, is_active: false })
    expect(await resolveShortLink("abc2345", scan, r)).toBeNull()
    expect(r.recordEvent).not.toHaveBeenCalled()
    expect(await resolveShortLink("abc2345", scan, repo({ ...link, expires_at: new Date("2026-10-01") }))).toBeNull()
  })
  it("ghi lượt lỗi vẫn chuyển khách tới trang", async () => {
    const r = repo(link, vi.fn().mockRejectedValue(new Error("db")))
    expect(await resolveShortLink("abc2345", scan, r)).toContain("/c/hoa")
  })
})
