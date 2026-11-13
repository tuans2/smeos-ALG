import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { COORDINATOR_BOARD_MAX, DONE_VISIBLE_MS, sortByDelivery } from "../domain/coordinator-board"
import { BrochureOrderRepository, getBrochureOrderRepository } from "../infra/brochure-order-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { withOrderProduct } from "./order-product-views"
import { resolveSaleScope } from "./order-scope"
import { orderPhotoApproval } from "../domain/photo-approval"
import { parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { extractGate2State } from "../domain/subcontract-gate2-extractor"

/**
 * `GET /greeting-card/coordinator-board` — toàn bộ đơn còn việc cho bảng Điều phối, xếp theo ngày +
 * giờ giao gần nhất (đếm "Cần làm / Đang làm / Xong" trên đủ đơn, không cắt 20 đơn như trước).
 */
export async function getCoordinatorBoard(ctx: TenantContext, input: { date?: string | undefined }, repo = getBrochureOrderRepository(), now = new Date()) {
  const saleId = (await resolveSaleScope(ctx)) ?? undefined
  const rows = await repo.listCoordinatorBoard(ctx, {
    date: input.date,
    saleId,
    doneSince: new Date(now.getTime() - DONE_VISIBLE_MS),
    max: COORDINATOR_BOARD_MAX,
  })
  const truncated = rows.length >= COORDINATOR_BOARD_MAX
  if (truncated) log.warn("greeting_card.coordinator_board_truncated", { organizationId: ctx.organizationId, feature: "greeting-card", max: COORDINATOR_BOARD_MAX })

  // Batch-resolve ảnh chuyển khoản lần 1 & lần 2 (tránh N+1, ký asset đúng tổ chức)
  const proofAssetIds = rows
    .flatMap((o) => [
      o.greeting_sessions[0]?.payment_proof_asset_id,
      o.greeting_sessions[0]?.payment_proof_balance_asset_id,
    ])
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  const proofUrls = proofAssetIds.length > 0
    ? await getGreetingCardRepository().getAssetsStorageMap(ctx.organizationId, proofAssetIds)
    : new Map<string, string>()

  // Chờ khách duyệt ảnh thành phẩm (mục 4, PO 15/10/2026): Điều phối thấy đếm ngược trước khi giao ship
  const shopSettings = (await getGreetingCardRepository().getShopProfile(ctx.organizationId)).settings
  const reviewMinutes = parsePaymentPolicy(shopSettings).productPhotoReviewMinutes
  const rowsWithProof = rows.map((o) => ({
    ...o,
    photo_approval: orderPhotoApproval(o, shopSettings, reviewMinutes, now),
    gate2: extractGate2State(o.coordination),
    payment_proof_url: o.greeting_sessions[0]?.payment_proof_asset_id
      ? (proofUrls.get(o.greeting_sessions[0].payment_proof_asset_id) ?? null)
      : null,
    payment_proof_balance_url: o.greeting_sessions[0]?.payment_proof_balance_asset_id
      ? (proofUrls.get(o.greeting_sessions[0].payment_proof_balance_asset_id) ?? null)
      : null,
  }))

  // `product`: thông tin mẫu hoa dựng một chỗ (SSOT, cùng nguồn với bảng theo dõi)
  return { data: sortByDelivery(await withOrderProduct(ctx, rowsWithProof)), truncated }
}
