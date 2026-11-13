/**
 * Lượt kiểm sức khoẻ kết nối (cron 5 phút, mỗi kết nối tối đa 30 phút/lần): kết nối lâu chưa kiểm nhất trước, có giới hạn mỗi lượt.
 * Chuyển sang EXPIRED/ERROR → thông báo cho tổ chức một lần (không thông báo lại khi vẫn lỗi).
 */

import { canTransition, statusAfterHealthCheck } from "../domain/connection-lifecycle"
import { openCredential } from "../infra/credential-vault"
import { defaultHubDeps, type HubDeps } from "./hub-deps"

export const MAX_HEALTH_CHECKS_PER_SWEEP = 50
/** Cron chạy 5 phút/lần; mỗi kết nối chỉ được kiểm lại sau khoảng này để không dồn lời gọi tới nhà cung cấp. */
export const HEALTH_CHECK_INTERVAL_MS = 30 * 60_000

export async function runHealthChecks(deps: HubDeps = defaultHubDeps()): Promise<{ checked: number; degraded: number }> {
  const now = deps.now()
  const batch = await deps.connections.listForHealthCheck(
    MAX_HEALTH_CHECKS_PER_SWEEP,
    new Date(now.getTime() - HEALTH_CHECK_INTERVAL_MS)
  )
  let degraded = 0
  for (const connection of batch) {
    const connector = deps.getConnector(connection.connectorKey)
    if (!connector || !connection.credentialEncrypted) continue
    const health = await connector
      .testConnection({ secret: openCredential(connection.connectorKey, connection.credentialEncrypted) }, connection.config)
      .catch(() => ({ ok: false, transient: true, errorCode: "UNREACHABLE" }))
    const next = statusAfterHealthCheck(connection.status, health)
    const status = canTransition(connection.status, next) ? next : connection.status
    await deps.connections.setHealthSystem(connection.id, status, health.ok ? null : (health.errorCode ?? "CHECK_FAILED"), now)
    const becameBroken = (status === "EXPIRED" || status === "ERROR") && status !== connection.status
    if (becameBroken) {
      degraded++
      await deps.notify({ organizationId: connection.organizationId, eventKey: "INTEGRATION_CONNECTION_DEGRADED" })
    }
  }
  return { checked: batch.length, degraded }
}
