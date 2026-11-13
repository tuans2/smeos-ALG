/**
 * Lượt kéo đơn dự phòng (cron): webhook của sàn có thể lỡ — mỗi lượt kéo đơn mới của tối đa
 * `MAX_CONNECTIONS_PER_SWEEP` kết nối kênh bán, từ con trỏ đã lưu. Mỗi đơn nhập độc lập; một đơn lỗi không
 * chặn đơn khác (đơn lỗi được nhận lại ở lượt sau nhờ trạng thái FAILED).
 */

import { log } from "@/core/observability/log"
import { CONNECTOR_CATALOG } from "../domain/connector-catalog"
import { openCredential } from "../infra/credential-vault"
import { isOwnConnectionAllowed } from "./governance-mode"
import { importChannelOrder } from "./sales-channel"
import { defaultSalesDeps, type SalesDeps } from "./sales-channel-deps"

export const MAX_CONNECTIONS_PER_SWEEP = 20
const CURSOR = "orders"

export async function pollChannelOrders(deps: SalesDeps = defaultSalesDeps()): Promise<{ connections: number; imported: number }> {
  const keys = CONNECTOR_CATALOG.filter((m) => m.category === "SALES_CHANNEL" && deps.getConnector(m.key)?.sales).map((m) => m.key)
  const rows = await deps.sales.activeSalesConnectionsSystem(keys, MAX_CONNECTIONS_PER_SWEEP)
  let imported = 0
  for (const { id } of rows) {
    const connection = await deps.connections.findByIdSystem(id)
    const sales = connection ? deps.getConnector(connection.connectorKey)?.sales : null
    if (!connection || !sales || !connection.credentialEncrypted) continue
    if (!(await isOwnConnectionAllowed(connection.organizationId, connection.connectorKey, deps))) continue
    try {
      const cursor = await deps.sales.cursorSystem(connection.organizationId, connection.id, CURSOR)
      const credential = { secret: openCredential(connection.connectorKey, connection.credentialEncrypted) }
      const page = await sales.pullOrders(credential, connection.config, cursor)
      for (const order of page.orders) {
        try {
          if (await importChannelOrder(connection, order.externalOrderId, deps)) imported++
        } catch (err) {
          log.warn("integration.sales.import_failed", { connectionId: connection.id, error: err instanceof Error ? err.message : "unknown" })
        }
      }
      if (page.nextCursor) await deps.sales.saveCursorSystem(connection.organizationId, connection.id, CURSOR, page.nextCursor)
    } catch (err) {
      log.warn("integration.sales.poll_failed", { connectionId: connection.id, error: err instanceof Error ? err.message : "unknown" })
    }
  }
  return { connections: rows.length, imported }
}
