/**
 * Order Ingestion Connector.
 * Cổng nhận đơn từ các nguồn (danh mục chung `orders/domain/order-source.ts`).
 */

import type { CoordinatorEntrySource } from "@/modules/orders/domain/order-source"

export interface IngestOrderPayload {
  organizationId: string
  orderId: string
  source: CoordinatorEntrySource
  coordinatorNote?: string
}

export interface IOrderIngestionConnector {
  ingest(payload: IngestOrderPayload): Promise<{ coordinationId: string; success: boolean }>
}

/**
 * Adapter mặc định nhận đơn trong cùng tiến trình (in-process).
 */
export class InProcessOrderIngestionConnector implements IOrderIngestionConnector {
  async ingest(payload: IngestOrderPayload): Promise<{ coordinationId: string; success: boolean }> {
    // Sẵn sàng nhận lời gọi từ M10 khi đơn chuyển sang CONFIRMED
    return {
      coordinationId: `coord-${payload.orderId}`,
      success: true,
    }
  }
}
