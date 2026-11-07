/**
 * `POST /api/v1/public/catalog/:slug/order` — khách đặt hàng trên catalog/landing công khai (P3, §3.2).
 * - Tổ chức suy từ catalog (A12); catalog thu hồi → 404; nút Đặt hàng đang tắt cho nguồn này → 404.
 * - Giá tính lại ở máy chủ từ chính catalog; mẫu chưa có giá → đơn chờ Sale báo giá (không bịa giá).
 * - Tạo đơn qua cổng chung `ingestOrder` (nguồn CATALOG/LANDING), gắn lead đang mở cùng SĐT, sale phụ trách mặc định.
 */

import { assertAcceptingPublicOrders } from "@/modules/subscription/use-cases/public-order-guard"
import type { HumanVerifier } from "@/core/ports/human-verification"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { VN_PHONE, normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"
import { isPastVnDate, PAST_DELIVERY_MESSAGE } from "../domain/order-input-rules"
import { CatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { BrochureCheckoutRepository } from "@/modules/greeting-card/infra/brochure-checkout-repository"
import { parseDefaultOwnerId } from "@/modules/greeting-card/domain/link-ownership"
import { parseStorePaymentMethods } from "@/modules/greeting-card/domain/store-payment-methods"
import { getHumanVerifier } from "@/modules/acquisition/adapters/human-verifier"
import { isActiveOrgMember } from "../infra/order-lead-link"
import { PublicOrderRepository } from "../infra/public-order-repository"
import { ingestOrder } from "./ingest-order"

export const PUBLIC_ORDER_PHONE_LIMIT_PER_HOUR = 5
const HOUR_MS = 60 * 60_000

export interface PublicOrderInput {
  productId: string
  quantity: number
  name: string
  phone: string
  address: string
  deliveryDate?: string | undefined
  timeSlot?: string | undefined
  note?: string | undefined
  verificationToken?: string | undefined
}

export interface PublicOrderDeps {
  catalogLinks: Pick<CatalogLinkRepository, "findBySlug">
  catalog: typeof getPublicCatalog
  repo: Pick<PublicOrderRepository, "orgSettings" | "countRecentByPhone" | "openLeadId">
  customers: Pick<BrochureCheckoutRepository, "findOrCreateCustomer">
  isMember: typeof isActiveOrgMember
  ingest: typeof ingestOrder
  verifier: HumanVerifier
  now: () => Date
  /** Gói dịch vụ quá hạn → ném lỗi, không tạo đơn */
  acceptsOrders: (organizationId: string) => Promise<void>
}

const defaultDeps = (): PublicOrderDeps => ({
  catalogLinks: new CatalogLinkRepository(),
  catalog: getPublicCatalog,
  repo: new PublicOrderRepository(),
  customers: new BrochureCheckoutRepository(),
  isMember: isActiveOrgMember,
  ingest: ingestOrder,
  verifier: getHumanVerifier(),
  now: () => new Date(),
  acceptsOrders: assertAcceptingPublicOrders,
})

export function validatePublicOrder(input: PublicOrderInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!input.name.trim() || input.name.trim().length > 100) e.name = "Nhập họ tên (tối đa 100 ký tự)"
  if (!VN_PHONE.test(normalizeInquiryPhone(input.phone))) e.phone = "Số điện thoại chưa đúng"
  if (!input.address.trim() || input.address.trim().length > 300) e.address = "Nhập địa chỉ nhận hàng"
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 50) e.quantity = "Số lượng từ 1 đến 50"
  if (input.deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate)) e.deliveryDate = "Ngày giao chưa đúng"
  else if (input.deliveryDate && isPastVnDate(input.deliveryDate)) e.deliveryDate = PAST_DELIVERY_MESSAGE // PO 07/11/2026, Q11
  if (input.timeSlot && input.timeSlot.length > 20) e.timeSlot = "Khung giờ chưa đúng"
  if (input.note && input.note.length > 500) e.note = "Ghi chú tối đa 500 ký tự"
  return e
}

function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "public:catalog-order", branchId: null, capabilities: new Set() }
}

export async function placePublicCatalogOrder(slug: string, input: PublicOrderInput, remoteIp: string | undefined, deps: PublicOrderDeps = defaultDeps()) {
  const errors = validatePublicOrder(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  if (!(await deps.verifier.verify({ token: input.verificationToken, remoteIp }))) {
    throw validationFailed({ verification: "Chưa xác minh được bạn không phải máy, vui lòng thử lại" })
  }
  const link = await deps.catalogLinks.findBySlug(slug)
  if (!link || link.is_revoked) throw notFound()
  const page = await deps.catalog(slug)
  if (page.status !== "ACTIVE" || page.entryActions?.order === false) throw notFound()
  const product = page.products.find((p) => p.id === input.productId)
  if (!product) throw validationFailed({ productId: "Mẫu không có trong bộ sưu tập này" })

  const organizationId = link.organization_id
  // Gói dịch vụ của tiệm quá hạn thanh toán → không nhận đơn qua link công khai (PO 05/11/2026)
  await deps.acceptsOrders(organizationId)
  const phone = normalizeInquiryPhone(input.phone)
  const now = deps.now()
  if ((await deps.repo.countRecentByPhone(organizationId, phone, new Date(now.getTime() - HOUR_MS))) >= PUBLIC_ORDER_PHONE_LIMIT_PER_HOUR) {
    throw new AppError("RATE_LIMITED", "Cửa hàng đã nhận đơn của bạn và sẽ liên hệ sớm.")
  }

  const name = input.name.trim()
  const settings = await deps.repo.orgSettings(organizationId)
  const ownerId = parseDefaultOwnerId(settings)
  const ownerSaleId = ownerId && (await deps.isMember(organizationId, ownerId)) ? ownerId : null
  const customerId = await deps.customers.findOrCreateCustomer({ organizationId, customerPhone: phone, customerName: name, deliveryAddress: input.address.trim() })
  const leadId = await deps.repo.openLeadId(organizationId, phone)
  const unitPrice = product.price && product.price > 0 ? product.price : 0
  const order = await deps.ingest(systemContext(organizationId), {
    source: page.campaignConfig ? "LANDING" : "CATALOG",
    customerId,
    leadId,
    ownerSaleId,
    items: [{ productId: product.id, description: `${product.name} [${product.code}]`, quantity: input.quantity, unitPriceVnd: unitPrice }],
    deliveryAddress: { recipientName: name, phone, street: input.address.trim() },
    ...(input.deliveryDate ? { deliveryWindow: { date: input.deliveryDate, ...(input.timeSlot ? { timeSlot: input.timeSlot } : {}) } } : {}),
    internalNote: [`Khách đặt trên trang công khai /c/${slug}`, input.note?.trim()].filter(Boolean).join("\n"),
  })

  const bank = parseStorePaymentMethods(settings)
  const canTransfer = bank.enableVietQr && Boolean(bank.accountNo)
  return {
    orderCode: order.code,
    totalVnd: order.totalVnd,
    needsQuote: order.totalVnd <= 0,
    payment: canTransfer && order.totalVnd > 0
      ? { bankName: bank.bankName || null, accountNo: bank.accountNo, accountName: bank.accountName || null, transferContent: order.code }
      : null,
  }
}
