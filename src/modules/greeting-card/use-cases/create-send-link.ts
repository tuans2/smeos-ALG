import type { TenantContext } from "@/core/tenancy"
import { assertShopReadyForCustomers } from "./get-shop-contact"
import { conflict, notFound } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { normalizePhone, randomCode } from "../domain/greeting-card-rules"
import { linkExpiryFrom, parseLinkLifetimeHours } from "../domain/link-lifetime"
import { resolveEffectiveStepTimeoutPolicy } from "../domain/step-timeout-policy"
import { GreetingMessageRepository, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import { visibleTarget } from "./internal-messages"

export interface CreateSendLinkInput {
  catalogId?: string | undefined
  catalogCode?: string | undefined
  customerName?: string | null | undefined
  customerPhone?: string | null | undefined
  prefix?: string | undefined
  // Support creating Client Catalog on the fly
  customCatalog?: {
    name: string
    description?: string | null | undefined
    filters?: Record<string, unknown> | null | undefined
    productIds: string[]
  } | undefined
}

/**
 * Bộ sưu tập tạo nhanh khi gửi link chỉ nhận khoá hiển thị. Các khoá chính sách (bắt buộc ảnh bill,
 * cơ chế duyệt thanh toán…) chỉ sửa ở màn cài đặt bộ sưu tập — không để người tạo link ghi đè chính sách tiệm.
 */
const CUSTOM_CATALOG_FILTER_KEYS = ["templateId", "occasion", "category", "flowerType", "colorTone"] as const

export function displayFiltersOnly(filters: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!filters) return null
  const picked = Object.fromEntries(CUSTOM_CATALOG_FILTER_KEYS.filter((k) => filters[k] !== undefined).map((k) => [k, filters[k]]))
  return Object.keys(picked).length > 0 ? picked : null
}

export async function createSendLink(
  ctx: TenantContext,
  input: CreateSendLinkInput,
  repo = getGreetingCardRepository()
) {
  await assertShopReadyForCustomers(ctx.organizationId)
  let targetCatalogId = input.catalogId

  // If Sale provided a custom catalog (Client Catalog)
  if (!targetCatalogId && input.customCatalog) {
    const clientCatalog = await repo.createCatalog(ctx, {
      code: `cc-${randomCode(8).toLowerCase()}`,
      name: input.customCatalog.name || "Bộ sưu tập riêng theo yêu cầu",
      type: "CLIENT",
      description: input.customCatalog.description ?? null,
      filters: displayFiltersOnly(input.customCatalog.filters),
      productIds: input.customCatalog.productIds,
      createdBy: ctx.userId,
    })
    targetCatalogId = clientCatalog.id
  }

  if (!targetCatalogId && input.catalogCode) {
    const found = await repo.getCatalogByCode(ctx, input.catalogCode)
    if (!found) throw notFound()
    targetCatalogId = found.id
  }

  if (!targetCatalogId) {
    // If still no catalog, pick the latest active catalog
    const catalogs = await repo.listCatalogs(ctx)
    if (!catalogs[0]) throw notFound()
    targetCatalogId = catalogs[0].id
  }

  // Hạn dùng: Thẻ Chào ghi đè > Cài đặt Hồ sơ tiệm > Mặc định hệ thống
  const [shop, catalogFilters] = await Promise.all([
    repo.getShopProfile(ctx.organizationId),
    repo.getCatalogFilters(ctx, targetCatalogId),
  ])
  const effectivePolicy = resolveEffectiveStepTimeoutPolicy(shop.settings, catalogFilters)
  const explicitLifetime = parseLinkLifetimeHours(shop.settings)
  // Thứ tự ưu tiên: cài riêng của tiệm (brochure_link_lifetime_hours) > step timeout policy > mặc định 24h
  const hasExplicitSetting = (shop.settings && typeof shop.settings === "object"
    ? (shop.settings as Record<string, unknown>)["brochure_link_lifetime_hours"]
    : undefined) !== undefined
  const expiryHours = hasExplicitSetting
    ? explicitLifetime
    : effectivePolicy.autoCancelUnopened
      ? effectivePolicy.unopenedExpiryHours
      : explicitLifetime
  const phone = input.customerPhone ? normalizePhone(input.customerPhone) : null
  const session = await repo.createSession(ctx, {
    catalogId: targetCatalogId,
    prefix: input.prefix,
    saleId: ctx.userId,
    customerName: input.customerName?.trim() || null,
    customerPhone: phone || null,
    expiresAt: linkExpiryFrom(expiryHours),
  })

  return {
    sessionId: session.id,
    sendCode: session.send_code,
    catalogId: session.catalog_id,
    shareUrl: `/b/${session.send_code}`,
    expiresAt: session.expires_at?.toISOString() ?? null,
  }
}

/**
 * Thu hồi link đã gửi (chưa có đơn): khách mở lại sẽ thấy link không còn hiệu lực.
 * Sale "chỉ khách của mình" không thu hồi được link của sale khác — 404 như mọi thao tác trên link.
 */
export async function revokeSendLink(ctx: TenantContext, sessionId: string, repo = getGreetingCardRepository()) {
  await visibleTarget(ctx, { sessionId }, getGreetingMessageRepository())
  const changed = await repo.revokeSession(ctx, sessionId)
  if (changed) {
    await repo.recordJourneyEvent(ctx.organizationId, sessionId, "LINK_REVOKED", { revokedBy: ctx.userId })
    return { revoked: true }
  }
  const state = await repo.findSessionState(ctx, sessionId)
  if (!state) throw notFound()
  if (state.order_id) throw conflict("Link đã có đơn hàng — hãy huỷ đơn thay vì thu hồi link")
  return { revoked: true } // đã thu hồi trước đó — idempotent
}
