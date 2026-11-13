/**
 * Đầu nối thử (chỉ ngoài production): kiểm toàn bộ luồng Hub mà không gọi nhà cung cấp thật.
 * Webhook ký `x-echo-signature: t=<unix>,v1=<hex HMAC-SHA256(t + "." + body, secret)>`, lệch tối đa 5 phút.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { Connector, InboundRequest, ParsedInboundEvent } from "../connector-contract"

export const ECHO_MAX_SKEW_MS = 5 * 60_000

export function signEcho(rawBody: string, secret: string, unixSeconds: number): string {
  const mac = createHmac("sha256", secret).update(`${unixSeconds}.${rawBody}`).digest("hex")
  return `t=${unixSeconds},v1=${mac}`
}

function parseHeader(header: string | null): { t: number; v1: string } | null {
  if (!header) return null
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]))
  const t = Number(parts["t"])
  return Number.isFinite(t) && parts["v1"] ? { t, v1: parts["v1"] } : null
}

export const testEchoConnector: Connector = {
  key: "test_echo",
  async connectWithSecret(secret) {
    if (secret.length < 16) throw new Error("WEAK_SECRET")
    return { externalAccountId: `echo-${randomBytes(4).toString("hex")}`, displayName: "Kết nối thử", config: {} }
  },
  async testConnection() {
    return { ok: true }
  },
  verifyWebhook(request: InboundRequest, credential, now) {
    const parsed = parseHeader(request.headers.get("x-echo-signature"))
    if (!parsed || Math.abs(now.getTime() - parsed.t * 1000) > ECHO_MAX_SKEW_MS) return false
    const expected = Buffer.from(signEcho(request.rawBody, credential.secret, parsed.t))
    const provided = Buffer.from(`t=${parsed.t},v1=${parsed.v1}`)
    return expected.length === provided.length && timingSafeEqual(expected, provided)
  },
  parseWebhook(request): ParsedInboundEvent[] {
    const body = JSON.parse(request.rawBody) as { id?: unknown; type?: unknown }
    return [
      {
        externalEventId: typeof body.id === "string" ? body.id : null,
        eventType: typeof body.type === "string" ? body.type : "echo",
        payload: body,
      },
    ]
  },
  async processEvent(event) {
    if (event.eventType === "echo.fail") throw new Error("ECHO_FORCED_FAILURE")
  },
}
