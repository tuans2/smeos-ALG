import { createHash } from "node:crypto"
import { log } from "@/core/observability/log"
import { buildRedirectPath, detectDevice, isShortLinkCode, isShortLinkLive, referrerHost } from "../domain/short-link-rules"
import { ShortLinkRepository } from "../infra/short-link-repository"

export interface ScanContext {
  ip: string
  userAgent: string | null
  referrer: string | null
  now?: Date | undefined
}

/**
 * Khách quét QR / bấm link `/r/<mã>`: trả đường dẫn đích (đã gắn `ref` + UTM) và ghi một
 * lượt. Mã sai, đã tắt, hết hạn → null (trang báo link không còn dùng). Không lưu IP thô:
 * băm IP + trình duyệt + ngày + mã để đếm khách riêng trong ngày.
 */
export async function resolveShortLink(code: string, scan: ScanContext, repo = new ShortLinkRepository()): Promise<string | null> {
  if (!isShortLinkCode(code)) return null
  const link = await repo.findPublicByCode(code)
  const now = scan.now ?? new Date()
  if (!link || !isShortLinkLive(link, now)) return null

  const day = now.toISOString().slice(0, 10)
  const visitorHash = createHash("sha256").update(`${scan.ip}|${scan.userAgent ?? ""}|${day}|${code}`).digest("hex").slice(0, 32)
  try {
    await repo.recordEvent(link, { device: detectDevice(scan.userAgent), referrerHost: referrerHost(scan.referrer), visitorHash })
  } catch (error) {
    // Ghi thống kê lỗi không được chặn khách tới trang.
    log.warn("short_link.record_failed", { error: error instanceof Error ? error.name : "unknown" })
  }
  return buildRedirectPath(link.target_path, link.code, { source: link.utm_source, medium: link.utm_medium, campaign: link.utm_campaign })
}
