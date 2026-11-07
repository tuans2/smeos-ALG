/**
 * Client của `/api/v1/coordinator/*` cho giao diện Control Tower.
 *
 * CSDL là nguồn DUY NHẤT: không localStorage, không đơn mẫu, không "lưu ngầm
 * rồi bỏ qua lỗi". Mỗi thao tác chờ máy chủ trả đơn đã cập nhật; máy chủ từ
 * chối (409/422/403) thì ném `CoordinatorApiError` mang đúng câu máy chủ nói,
 * giao diện hiện câu đó cho điều phối viên.
 */

import type { CoordinatorOrderView } from "@/modules/coordinator/use-cases/present-coordinator-order"
import type { PartnerView } from "@/modules/coordinator/use-cases/manage-partners"
import type { OrderPaymentView } from "@/modules/coordinator/use-cases/record-payment"
import type { TenantCatalogView } from "@/modules/field-platform/use-cases/list-catalogs-for-tenant"

export type CoordinationOrder = CoordinatorOrderView
export type CoordinationPartner = PartnerView
export type { OrderPaymentView, TenantCatalogView }

export class CoordinatorApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null
  ) {
    super(message)
    this.name = "CoordinatorApiError"
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  })
  const body = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: { issues?: Array<{ message?: string }> } } }
    | null
  if (!res.ok) {
    const issues = body?.error?.details?.issues
    const detail = issues?.map((i) => i.message).filter(Boolean).join("; ")
    throw new CoordinatorApiError(
      detail || body?.error?.message || `Máy chủ trả lỗi ${res.status}`,
      res.status,
      body?.error?.code ?? null
    )
  }
  return body as T
}

const BASE = "/api/v1/coordinator"
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) })

async function orderCall(url: string, init: RequestInit): Promise<CoordinationOrder> {
  return (await request<{ order: CoordinationOrder }>(url, init)).order
}

export interface CreateOrderRequest {
  customerId?: string
  /** ĐP-2.6 (26/09/2026): có thì máy chủ đọc Product Master Index và chụp snapshot. */
  productId?: string
  customerName: string
  customerTier: "NEW" | "BRONZE" | "SILVER" | "GOLD" | "VIP"
  customerPhone?: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: { street: string; ward: string; district: string; city: string; country?: string; formattedAddress?: string }
  deliveryTargetTime: string
  deliveryTargetAt?: string
  productTitle: string
  sampleImageUrl?: string
  sampleAssetId?: string
  unitPriceVnd: number
  flowers: Array<{ flowerName: string; quantity: number; unit: string; color: string; role: string }>
  cardMessage?: string
  /** ĐP-4a.1 (26/09/2026) — `cardMessage` bắt buộc khi true. */
  cardRequired?: boolean
  internalNote?: string
  /** ĐP-3.16 (26/09/2026): giá trị trường tự tạo (entity ORDER), khoá `cf_...`. */
  customFields?: Record<string, unknown>
  // ── ĐP-4a.1 (26/09/2026) — T01: đủ trường P0/P1 ──
  source?: "ORDER_M10" | "CHAT_M08" | "CATALOG_M06" | "MANUAL"
  sourceReference?: string
  channel?: string
  orderType?: string
  /** Bỏ trống thì máy chủ TỰ GỢI Ý (§2.15.1). */
  priority?: string
  serviceLevel?: string
  deliveryType?: string
  deliveryLocationType?: string
  receivedAt?: string
  deliveryWindowStart?: string
  deliveryWindowEnd?: string
}

/** ĐP-4a.3 (26/09/2026, sổ thu) — thân `POST .../payments`. */
export interface RecordPaymentBody {
  kind: "DEPOSIT" | "BALANCE" | "REFUND"
  amountVnd: number
  paymentMethod?: string
  reference?: string
  evidenceAssetId?: string
  note?: string
}

export const coordinatorApi = {
  listOrders: async () => (await request<{ orders: CoordinationOrder[] }>(`${BASE}/orders?limit=200`)).orders,
  getOrder: (id: string) => orderCall(`${BASE}/orders/${id}`, { method: "GET" }),
  createOrder: (body: CreateOrderRequest) => orderCall(`${BASE}/orders`, post(body)),
  updateStage: (id: string, stage: string, nextAction?: string) =>
    orderCall(`${BASE}/orders/${id}/stage`, { method: "PATCH", body: JSON.stringify({ stage, nextAction }) }),
  assignPartner: (
    id: string,
    body: { partnerId: string; notes?: string; overrideCapacity?: boolean; agreedCraftFeeVnd?: number }
  ) => orderCall(`${BASE}/orders/${id}/assign-partner`, post(body)),
  production: (
    id: string,
    body: {
      action: "UPDATE_PROGRESS" | "MARK_READY" | "REPORT_MATERIAL_ISSUE"
      progressPercent: number
      finishedAssetIds?: string[]
      issueNote?: string
    }
  ) => orderCall(`${BASE}/orders/${id}/production`, post(body)),
  qc: (id: string, body: { decision: "PASSED" | "REWORK_REQUESTED" | "REJECTED"; notes?: string; checklist?: Record<string, boolean> }) =>
    orderCall(`${BASE}/orders/${id}/qc`, post(body)),
  delivery: (
    id: string,
    body: {
      event: "PICKED_UP" | "ON_THE_WAY" | "DELIVERED_SUCCESS" | "DELIVERY_FAILED"
      carrier?: string
      shipperName: string
      shipperPhone?: string
      podAssetId?: string
      recipientSignedName?: string
      failureReason?: string
    }
  ) => orderCall(`${BASE}/orders/${id}/delivery`, post(body)),
  openException: (id: string, body: { type: string; severity: string; description: string }) =>
    orderCall(`${BASE}/orders/${id}/exceptions`, post(body)),
  resolveException: (exceptionId: string, resolution: string) =>
    orderCall(`${BASE}/exceptions/${exceptionId}/resolve`, post({ resolution })),
  close: (id: string, body: { partnerRating?: number; partnerPayoutVnd?: number; notes?: string }) =>
    orderCall(`${BASE}/orders/${id}/close`, post(body)),
  cancel: (id: string, reason: string) => orderCall(`${BASE}/orders/${id}/cancel`, post({ reason })),
  updateCustomFields: (id: string, customFields: Record<string, unknown>) =>
    orderCall(`${BASE}/orders/${id}/custom-fields`, { method: "PATCH", body: JSON.stringify({ customFields }) }),
  /** ĐP-4a.3 (26/09/2026) — ghi một dòng sổ thu (cọc/thu nốt/hoàn tiền); trả đơn đã cập nhật (paidVnd/balanceVnd/paymentStatus). */
  recordPayment: (id: string, body: RecordPaymentBody) => orderCall(`${BASE}/orders/${id}/payments`, post(body)),
  /** Điều hành xác nhận / từ chối khoản Sale-Điều phối đã ghi (checklist ALG 1.16); trả đơn đã cập nhật. */
  decidePayment: (id: string, paymentId: string, approve: boolean, note?: string) =>
    orderCall(`${BASE}/orders/${id}/payments/${paymentId}/decision`, post({ approve, ...(note ? { note } : {}) })),
  /** Liệt kê sổ thu của một đơn. */
  listPayments: async (id: string) =>
    (await request<{ payments: OrderPaymentView[] }>(`${BASE}/orders/${id}/payments`, { method: "GET" })).payments,
  listPartners: async (activeOnly = false) =>
    (await request<{ partners: CoordinationPartner[] }>(`${BASE}/partners${activeOnly ? "?active=1" : ""}`)).partners,
  createPartner: async (body: { code: string; name: string; phone: string; district?: string; province?: string; capacityDaily?: number }) =>
    (await request<{ partner: CoordinationPartner }>(`${BASE}/partners`, post(body))).partner,
  /** ĐP-4a.1 (26/09/2026) — danh mục (§2.15) cho ô chọn ở T01. `keys` bỏ trống trả hết. */
  listCatalogs: async (keys?: readonly string[]) => {
    const qs = keys && keys.length > 0 ? `?keys=${encodeURIComponent(keys.join(","))}` : ""
    return (await request<{ data: TenantCatalogView[] }>(`/api/v1/field-config/catalogs${qs}`, { method: "GET" })).data
  },
}

/**
 * Tải một ảnh (ảnh mẫu, ảnh thành phẩm, ảnh POD) lên kho `assets` của tổ
 * chức: xin URL ký → PUT tệp → đăng ký asset. Trả id để gắn vào đơn (máy chủ
 * kiểm id thuộc đúng tổ chức) và URL xem trước cục bộ. Không còn base64 nhét
 * vào đơn.
 */
export async function uploadCoordinatorPhoto(file: File): Promise<{ assetId: string; previewUrl: string }> {
  if (!file.type.startsWith("image/")) {
    throw new CoordinatorApiError("Chỉ nhận tệp ảnh (PNG, JPG, WebP).", 400, "VALIDATION_FAILED")
  }
  const slot = await request<{ upload_url: string; asset_id: string; storage_key: string }>(
    "/api/v1/assets/upload-url",
    post({ mime_type: file.type })
  )
  const put = await fetch(slot.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!put.ok) throw new CoordinatorApiError(`Tải ảnh lên thất bại (${put.status}).`, put.status, null)
  await request("/api/v1/assets", post({
    asset_id: slot.asset_id,
    kind: "ORIGINAL",
    storage_key: slot.storage_key,
    mime_type: file.type,
    file_size: file.size,
  }))
  return { assetId: slot.asset_id, previewUrl: URL.createObjectURL(file) }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định"
}
export { isStageAdvanceLocked } from "./coordinator-order-lock"
