/**
 * zalo-oa-link.ts
 *
 * Nhân viên chi nhánh quan tâm Zalo OA chung rồi nhắn mã liên kết của chi nhánh (vd. ZLABCD2345).
 * Webhook OA gọi vào đây: xác thực chữ ký Zalo, tìm chi nhánh theo mã, lưu Zalo user id.
 * Tổ chức suy ra TỪ MÃ (duy nhất toàn nền tảng) — không bao giờ từ dữ liệu webhook.
 */

import { createHash, timingSafeEqual } from "node:crypto"

const LINK_CODE_PATTERN = /\bZL[A-HJ-NP-Z2-9]{8}\b/
/** Webhook cũ hơn ngưỡng này bị bỏ qua (chống phát lại) */
const MAX_EVENT_AGE_MS = 10 * 60 * 1000

export interface ZaloWebhookEvent {
  app_id?: string
  event_name?: string
  timestamp?: string
  sender?: { id?: string }
  message?: { text?: string }
}

/**
 * Chữ ký Zalo OA: header `X-ZEvent-Signature: mac=<sha256(appId + body + timestamp + OA secret key)>`.
 * So sánh thời gian hằng; thiếu cấu hình → luôn từ chối.
 */
export function verifyZaloSignature(input: {
  rawBody: string
  header: string | null
  appId: string | undefined
  oaSecretKey: string | undefined
  timestamp: string | undefined
}): boolean {
  if (!input.header || !input.appId || !input.oaSecretKey || !input.timestamp) return false
  const received = input.header.replace(/^mac=/i, "").trim().toLowerCase()
  const expected = createHash("sha256").update(input.appId + input.rawBody + input.timestamp + input.oaSecretKey).digest("hex")
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isFreshEvent(timestamp: string | undefined, now = Date.now()): boolean {
  const ts = Number(timestamp)
  return Number.isFinite(ts) && Math.abs(now - ts) <= MAX_EVENT_AGE_MS
}

export function extractLinkCode(text: string | undefined): string | null {
  return text?.toUpperCase().match(LINK_CODE_PATTERN)?.[0] ?? null
}

export interface ZaloLinkPorts {
  linkZaloUser(linkCode: string, zaloUserId: string): Promise<{ organizationId: string; branchName: string } | null>
  reply(zaloUserId: string, text: string): Promise<unknown>
}

export type ZaloLinkOutcome = "LINKED" | "UNKNOWN_CODE" | "IGNORED"

export async function handleZaloOaEvent(event: ZaloWebhookEvent, ports: ZaloLinkPorts): Promise<ZaloLinkOutcome> {
  const userId = event.sender?.id
  if (event.event_name !== "user_send_text" || !userId) return "IGNORED"
  const code = extractLinkCode(event.message?.text)
  if (!code) return "IGNORED"

  const linked = await ports.linkZaloUser(code, userId)
  if (!linked) {
    await ports.reply(userId, "Mã liên kết không đúng hoặc đã bị đổi. Vui lòng lấy lại mã trong phần cài đặt điều phối của cửa hàng.")
    return "UNKNOWN_CODE"
  }
  await ports.reply(userId, `Đã liên kết Zalo này với chi nhánh "${linked.branchName}". Từ giờ bạn sẽ nhận lời mời nhận đơn gia công tại đây.`)
  return "LINKED"
}
