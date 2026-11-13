/**
 * Cổng webhook chung: xác thực → ghi nhật ký (chống trùng) → trả nhanh; xử lý ở lượt sau.
 * Không phiên đăng nhập: tổ chức xác định qua `connection_ref` ngẫu nhiên trong URL.
 * Mọi thất bại xác thực trả cùng một lỗi chung — không tiết lộ kết nối có tồn tại hay không.
 */

import { AppError } from "@/core/http/errors"
import { isUsable } from "../domain/connection-lifecycle"
import { redactPayload } from "../domain/redact-payload"
import { openCredential } from "../infra/credential-vault"
import { defaultHubDeps, type HubDeps } from "./hub-deps"
import { isOwnConnectionAllowed } from "./governance-mode"

export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024
export const MAX_EVENTS_PER_DELIVERY = 50

const rejected = () => new AppError("UNAUTHENTICATED", "Yêu cầu không hợp lệ")

export async function handleInboundWebhook(
  input: { connectorKey: string; connectionRef: string; rawBody: string; headers: Headers },
  deps: HubDeps = defaultHubDeps()
): Promise<{ accepted: number; duplicates: number }> {
  if (Buffer.byteLength(input.rawBody, "utf8") > MAX_WEBHOOK_BODY_BYTES) {
    throw new AppError("VALIDATION_FAILED", "Dữ liệu quá lớn")
  }
  const connection = await deps.connections.findByRef(input.connectorKey, input.connectionRef)
  const connector = deps.getConnector(input.connectorKey)
  if (!connection || !connector?.verifyWebhook || !connector.parseWebhook) throw rejected()
  if (!isUsable(connection.status) || !connection.credentialEncrypted) throw rejected()

  const request = { rawBody: input.rawBody, headers: input.headers }
  const secret = openCredential(connection.connectorKey, connection.credentialEncrypted)
  if (!connector.verifyWebhook(request, { secret }, deps.now())) throw rejected()
  // Cấp trên đã khoá / bắt dùng kết nối cấp trên → kết nối riêng không còn nhận dữ liệu (GĐ3).
  if (!(await isOwnConnectionAllowed(connection.organizationId, connection.connectorKey, deps))) throw rejected()

  let parsed
  try {
    parsed = connector.parseWebhook(request).slice(0, MAX_EVENTS_PER_DELIVERY)
  } catch {
    throw new AppError("VALIDATION_FAILED", "Dữ liệu không đọc được")
  }

  let accepted = 0
  let duplicates = 0
  for (const event of parsed) {
    const res = await deps.events.recordInbound({
      organizationId: connection.organizationId,
      connectionId: connection.id,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      payloadRedacted: redactPayload(event.payload),
    })
    if (res.duplicate) duplicates++
    else accepted++
  }
  return { accepted, duplicates }
}
