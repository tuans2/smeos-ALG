/**
 * Kênh bán thử (chỉ ngoài production): chạy trọn luồng đăng sản phẩm → nhận đơn → còn/hết hàng mà không
 * gọi sàn thật. Webhook ký giống đầu nối thử (`x-echo-signature`); thân `{ "id", "type": "order.created",
 * "orderId": "<mã>" }`. Mã đơn dạng `<SKU>x<số lượng>` (vd. `HOA-01x2`) sinh đơn có đúng dòng đó, thu hộ khi giao;
 * thêm đuôi `p` (vd. `HOA-01x2p`) = khách đã trả đủ trên sàn.
 */

import type { ChannelOrder } from "@/core/ports/sales-channel-order-provider"
import type { Connector } from "../connector-contract"
import { testEchoConnector } from "./test-echo-connector"

function orderFromId(externalOrderId: string): ChannelOrder | null {
  const match = /^([A-Za-z0-9_-]{1,40})x(\d{1,3})(p?)$/.exec(externalOrderId)
  if (!match) return null
  const quantity = Number(match[2])
  return {
    externalOrderId,
    createdAt: new Date(0).toISOString(),
    items: [{ sellerSku: match[1] ?? null, title: `Sản phẩm ${match[1]}`, quantity, unitPriceVnd: 100_000 }],
    buyerNote: null,
    recipient: null,
    payment: match[3] ? { kind: "PREPAID", paidVnd: quantity * 100_000 } : { kind: "COD", paidVnd: 0 },
  }
}

export const testShopConnector: Connector = {
  key: "test_shop",
  connectWithSecret: testEchoConnector.connectWithSecret!,
  testConnection: testEchoConnector.testConnection,
  verifyWebhook: testEchoConnector.verifyWebhook!,
  parseWebhook(request) {
    const body = JSON.parse(request.rawBody) as { id?: unknown; type?: unknown; orderId?: unknown }
    return [
      {
        externalEventId: typeof body.id === "string" ? body.id : null,
        eventType: typeof body.type === "string" ? body.type : "order.created",
        payload: { orderId: typeof body.orderId === "string" ? body.orderId : null },
      },
    ]
  },
  sales: {
    async upsertListings(_credential, _config, listings) {
      return listings.map((l) =>
        l.title.startsWith("LOI")
          ? { productId: l.productId, status: "REJECTED" as const, reason: "Kênh thử từ chối tên bắt đầu bằng LOI" }
          : { productId: l.productId, status: "SYNCED" as const, externalId: `ts-${l.productId}` }
      )
    },
    async removeListings() {},
    async getOrder(_credential, _config, externalOrderId) {
      return orderFromId(externalOrderId)
    },
    async pullOrders() {
      return { orders: [], nextCursor: null }
    },
    async pushAvailability() {},
  },
}
