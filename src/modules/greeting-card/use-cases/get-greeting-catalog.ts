import { AppError } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { paymentInstructionsFor } from "./payment-instructions"
import { withPaymentCodeFlag, type ShippingConfig } from "../domain/brochure-pricing"
import type {
  BrochurePaymentInstructions,
  GreetingCatalogProduct,
  GreetingSessionStatus,
  ProductSnapshot,
  PublicBrochureSessionView,
} from "../domain/greeting-card-types"
import { loadPublicSession } from "./brochure-session-access"
import { linkAvailability } from "../domain/greeting-card-rules"
import { collectImageAssetIds, toCatalogProduct } from "./brochure-product-mapper"
import { applyPriceVisibility, readPriceVisibility } from "../domain/price-visibility"
import { toPublicCatalogFilters } from "../domain/greeting-template-registry"
import type { ShopContact } from "../domain/shop-contact"
import { getShopContact } from "./get-shop-contact"
import { parsePaymentPolicy, resolveTrackingTriggerPolicy, type TrackingTriggerPolicy } from "../domain/brochure-payment-policy"
import { loadPolicyGovernance } from "@/modules/organization/use-cases/governance-matrix"
import type { EntryActions } from "@/modules/orders/domain/entry-actions"
import { brochureEntryActions } from "../domain/brochure-entry-actions"

export type CustomerBrochureView = {
  status: "ACTIVE"
  session: PublicBrochureSessionView
  /** Tên, SĐT, Zalo, địa chỉ, logo của tiệm — khách luôn liên hệ được */
  shop: ShopContact
  catalog: { id: string; code: string; name: string; description: string | null; filters?: Record<string, unknown> | null }
  products: GreetingCatalogProduct[]
  order: { id: string; code: string; status: string; productionStatus?: string | null; totalVnd: number; paidVnd: number } | null
  /** Khu vực giao + phí của tiệm để khách chọn trên form. */
  shipping: ShippingConfig
  /** Hướng dẫn chuyển khoản cho đơn hiện có — `null` khi chưa có đơn hoặc tiệm chưa cấu hình. */
  payment: BrochurePaymentInstructions | null
  /** Cơ chế kích hoạt bước tiếp theo (PAYMENT_ONLY hoặc PAYMENT_OR_COORDINATOR). */
  trackingTriggerPolicy?: TrackingTriggerPolicy
  /** Nút "Đặt hàng" / "Liên hệ" chủ cửa hàng bật cho Bộ sưu tập riêng */
  entryActions: EntryActions
}

/**
 * Dữ liệu trang khách `/b/[sendCode]`. Chỉ trả những gì khách cần — không
 * SĐT, không id tổ chức/sale. Không ghi gì (xem `markBrochureOpened`).
 */
export async function getGreetingCatalogForCustomer(
  sendCode: string,
  repo = getGreetingCardRepository()
): Promise<CustomerBrochureView | { status: "NOT_FOUND" } | { status: "UNAVAILABLE"; reason: "EXPIRED" | "CLOSED"; shop: ShopContact }> {
  let session
  try {
    session = await loadPublicSession(sendCode, repo)
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      // Link có thật nhưng đã hết hạn / thu hồi / bộ sưu tập ngừng: cho khách cách liên hệ tiệm
      const raw = await repo.getPublicSessionBySendCode(sendCode).catch(() => null)
      const contact = raw ? await getShopContact(raw.organization_id) : null
      if (!raw || !contact) return { status: "NOT_FOUND" }
      // Hết hạn (theo thời hạn Điều hành cài) → lời nhắn riêng; thu hồi / bộ sưu tập ngừng → lời nhắn chung
      const expired = linkAvailability({ expiresAt: raw.expires_at, revokedAt: raw.revoked_at, hasOrder: raw.order_id !== null }) === "EXPIRED"
      return { status: "UNAVAILABLE", reason: expired ? "EXPIRED" : "CLOSED", shop: contact }
    }
    throw error
  }

  // CHỈ ĐỌC: không đánh dấu "đã mở" ở đây — Zalo/Facebook tải trang này để dựng ảnh xem trước.
  // Trình duyệt thật của khách gọi `markBrochureOpened` sau khi trang chạy (máy quét không chạy JS).
  const status = session.status as GreetingSessionStatus

  const urls = await repo.getAssetsStorageMap(session.organization_id, collectImageAssetIds(session.catalog.items))
  // Mẫu tạm hết hàng vẫn hiện (đánh dấu `available: false`) để khách xem mẫu tương tự / hỏi tiệm;
  // chọn và đặt mẫu hết hàng bị chặn ở máy chủ (`resolveOrderableProduct`).
  const visibility = readPriceVisibility(session.organization?.settings)
  const products = session.catalog.items.map((item) => applyPriceVisibility(toCatalogProduct(item, urls), visibility))
  const shop = await repo.getShopProfile(session.organization_id)
  const contact = (await getShopContact(session.organization_id)) ?? {
    name: shop.name, phone: shop.phone, zaloUrl: null, address: null, logoUrl: null,
  }

  const order = session.order
    ? {
        id: session.order.id,
        code: session.order.code,
        status: session.order.status,
        productionStatus: session.order.production_status ?? null,
        totalVnd: Number(session.order.total_vnd),
        paidVnd: Number(session.order.paid_vnd),
      }
    : null
  const payment = order && order.status !== "CANCELLED" ? paymentInstructionsFor(shop.settings, { ...order, createdAt: session.order?.created_at, pricingRuleRef: session.order?.pricing_rule_ref }, order.code) : null
  const paymentPolicy = parsePaymentPolicy(shop.settings)
  const trackingTriggerPolicy = resolveTrackingTriggerPolicy(paymentPolicy, session.catalog.filters)

  return {
    status: "ACTIVE",
    session: {
      sendCode: session.send_code,
      status,
      customerName: session.customer_name,
      selectedProductId: session.selected_product_id,
      productSnapshot: (session.product_snapshot as unknown as ProductSnapshot | null) ?? null,
    },
    shop: contact,
    catalog: {
      id: session.catalog.id,
      code: session.catalog.code,
      name: session.catalog.name,
      description: session.catalog.description,
      filters: toPublicCatalogFilters(session.catalog.filters, session.organization?.settings, undefined, await loadPolicyGovernance(session.organization_id)),
    },
    products,
    shipping: withPaymentCodeFlag(shop.settings),
    order,
    payment,
    trackingTriggerPolicy,
    entryActions: brochureEntryActions(session.organization?.settings),
  }
}

/**
 * Trình duyệt của khách báo đã mở link (gọi từ trang sau khi chạy JavaScript). Chỉ đổi
 * CREATED → OPENED một lần; link sai/hết hạn → 404 như trang khách.
 */
export async function markBrochureOpened(sendCode: string, repo = getGreetingCardRepository()): Promise<{ opened: boolean }> {
  const session = await loadPublicSession(sendCode, repo)
  if (session.status !== "CREATED") return { opened: false }
  const now = new Date()
  if (!(await repo.markOpened(session.id, now))) return { opened: false }
  await repo.recordJourneyEvent(session.organization_id, session.id, "OPEN", { openedAt: now.toISOString() })
  return { opened: true }
}
