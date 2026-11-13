import { conflict, notFound } from "@/core/http/errors"
import { SOLD_OUT_MESSAGE } from "../domain/product-availability"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { linkAvailability, validateSendCode } from "../domain/greeting-card-rules"
import { resolveEffectiveStepTimeoutPolicy, isSessionBrowsingExpired } from "../domain/step-timeout-policy"
import type { GreetingCatalogProduct } from "../domain/greeting-card-types"
import { collectImageAssetIds, toCatalogProduct } from "./brochure-product-mapper"
import { applyPriceVisibility, readPriceVisibility } from "../domain/price-visibility"

export type PublicSession = NonNullable<Awaited<ReturnType<GreetingCardRepository["getPublicSessionBySendCode"]>>>

/**
 * Phiên công khai theo mã gửi. Mã sai định dạng hoặc không có → 404 (không
 * chạm DB với mã rác). Catalog đã ngừng thì link chết, trừ khi khách đã có
 * đơn (vẫn phải xem được thanh toán và theo dõi). Link hết hạn hoặc đã thu
 * hồi (chưa có đơn) cũng trả 404.
 */
export async function loadPublicSession(sendCode: string, repo: GreetingCardRepository): Promise<PublicSession> {
  if (!validateSendCode(sendCode)) throw notFound()
  const session = await repo.getPublicSessionBySendCode(sendCode)
  if (!session) throw notFound()
  if (!session.catalog.is_active && !session.order_id) throw notFound()
  const availability = linkAvailability({
    expiresAt: session.expires_at,
    revokedAt: session.revoked_at,
    hasOrder: session.order_id !== null,
  })
  if (availability !== "ACTIVE") throw notFound()

  // JIT Evaluation: Kiểm tra quá hạn chọn mẫu (browsing timeout) khi khách chưa có đơn
  if (!session.order_id && session.opened_at) {
    const policy = resolveEffectiveStepTimeoutPolicy(session.organization?.settings, session.catalog?.filters)
    if (isSessionBrowsingExpired({ openedAt: session.opened_at, status: session.status, lastActiveAt: session.last_active_at }, policy)) {
      throw notFound()
    }
  }

  return session
}

/**
 * Mẫu thuộc đúng catalog của phiên — chỉ khi đó mới được chọn/đặt. Mẫu chưa
 * niêm yết giá vẫn đặt được; cửa hàng báo giá sau.
 */
export async function resolveOrderableProduct(
  session: PublicSession,
  productId: string,
  repo: GreetingCardRepository
): Promise<GreetingCatalogProduct> {
  const item = session.catalog.items.find((i) => i.product.id === productId)
  if (!item) throw notFound()
  const urls = await repo.getAssetsStorageMap(session.organization_id, collectImageAssetIds([item]))
  // Tiệm tắt giá (ALG 5.5): đơn đi luồng chờ báo giá, không lấy giá niêm yết
  const product = applyPriceVisibility(toCatalogProduct(item, urls), readPriceVisibility(session.organization?.settings))
  if (product.available === false) throw conflict(SOLD_OUT_MESSAGE)
  return product
}
