import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { ingestOrderOnce, ORDER_IDEMPOTENCY_KEY_MAX } from "@/modules/orders/use-cases/ingest-order-once"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { listOrders } from "@/modules/orders/use-cases/list-orders"
import { parseDeliveryDate } from "@/modules/orders/domain/order-list-filter"
import type { OrderListCursor, OrderStatus, ProductionStatus, DeliveryStatus } from "@/modules/orders/domain/order-types"
import { decodeCursor, encodeCursor } from "@/core/http/pagination"
import { createOrderBody } from "@/app/api/v1/_contracts/requests-orders"

/** `GET /api/v1/orders` (R1) — Danh sách đơn hàng, phân trang con trỏ `{ data, next_cursor, meta: { total } }` */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R1")

  const url = new URL(request.url)
  const status = url.searchParams.get("status") as OrderStatus | null
  const productionStatus = url.searchParams.get("production_status") as ProductionStatus | null
  const deliveryStatus = url.searchParams.get("delivery_status") as DeliveryStatus | null
  const branchId = url.searchParams.get("branch_id") ?? undefined
  const customerId = url.searchParams.get("customer_id") ?? undefined
  const search = url.searchParams.get("search") ?? undefined
  // Lọc nâng cao (checklist ALG 4.3): khoảng ngày giao YYYY-MM-DD, nhân viên bán
  const deliveryFrom = parseDeliveryDate(url.searchParams.get("delivery_from"))
  const deliveryTo = parseDeliveryDate(url.searchParams.get("delivery_to"))
  const saleId = url.searchParams.get("sale_id")?.trim().slice(0, 64) || undefined
  const limitParam = url.searchParams.get("limit")
  // Trần 100 (audit API-03): trước đây `?limit=` không chặn — số lớn tải hết đơn kèm quan hệ, chữ → NaN → 500
  const limit = limitParam ? Number(limitParam) : 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationFailed({ limit: "Phải là số nguyên từ 1 đến 100" })
  }

  const cursor = readOrderCursor(url.searchParams.get("cursor"))
  const result = await listOrders(ctx, {
    status: status || undefined,
    productionStatus: productionStatus || undefined,
    deliveryStatus: deliveryStatus || undefined,
    branchId,
    customerId,
    search,
    deliveryFrom,
    deliveryTo,
    saleId,
    limit,
    cursor,
  })
  // Chuẩn v1.1 (audit API-10, PO 09/11/2026): `{ data, next_cursor }`, tổng ở `meta.total` — trước đây `{ orders, total }`.
  return jsonResponse({
    data: result.orders,
    next_cursor: result.nextCursor ? encodeCursor({ at: result.nextCursor.createdAt, id: result.nextCursor.id }) : null,
    meta: { total: result.total },
  })
})

/** Con trỏ mờ `{ at, id }` (base64url); hỏng/giả → 400 `cursor`. */
function readOrderCursor(raw: string | null): OrderListCursor | undefined {
  if (!raw) return undefined
  const value = decodeCursor(raw)
  const at = typeof value.at === "string" ? value.at : ""
  if (typeof value.id !== "string" || !value.id || Number.isNaN(Date.parse(at))) throw validationFailed({ cursor: "Con trỏ không hợp lệ" })
  return { createdAt: at, id: value.id }
}

/**
 * `POST /api/v1/orders` (R2) — Tạo đơn hàng mới. Header `Idempotency-Key` (tuỳ chọn, ≤ 255 ký tự): gửi lại cùng
 * khoá → trả lại đơn đã tạo kèm `Idempotent-Replayed: true`, không tạo đơn thứ hai (audit API-11).
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R2")

  const idempotencyKey = readIdempotencyKey(request)
  if (idempotencyKey && idempotencyKey.length > ORDER_IDEMPOTENCY_KEY_MAX) {
    throw validationFailed({ "Idempotency-Key": `Tối đa ${ORDER_IDEMPOTENCY_KEY_MAX} ký tự` })
  }
  const body = await request.json()
  const parsed = createOrderBody.parse(body)

  const { order, replayed } = await ingestOrderOnce(ctx, { ...parsed, source: "MANUAL" }, idempotencyKey)
  if (replayed) return jsonResponse({ order }, { status: 201, headers: { "Idempotent-Replayed": "true" } })
  // Đơn thiếu địa chỉ/SĐT người nhận → tự sinh yêu cầu bổ sung (checklist ALG 4.14)
  await syncOrderInfoRequests(ctx, order.id)
  return jsonResponse({ order }, { status: 201 })
})
