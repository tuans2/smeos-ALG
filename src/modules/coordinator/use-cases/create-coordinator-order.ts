/**
 * Use-case: tiếp nhận đơn điều phối (F01, R2).
 *
 * Mã đơn sinh ở máy chủ, tuần tự theo ngày (`FLR-YYMMDD-NNNN`) — client không
 * đặt mã. Bản trước sinh `FLR-2026-<3 số ngẫu nhiên>` ở CẢ client lẫn máy
 * chủ: 900 mã một năm, trùng là chuyện chắc chắn.
 */

import { AppError, validationFailed } from "@/core/http/errors"
import { vnTodayIso } from "@/lib/vn-date"
import { newOrderDeliveryErrors } from "@/modules/orders/domain/order-input-rules"
import { assertWithinPriceBounds } from "@/modules/costing/use-cases/price-floor-guard"
import type { CoordinatorEntrySource } from "@/modules/orders/domain/order-source"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ICustomerRepository } from "@/modules/crm/domain/repositories/customer-repository.interface"
import { getCustomerRepository } from "@/modules/crm/infra/customer-repository"
import { applyCustomFields } from "@/modules/field-platform/use-cases/apply-custom-fields"
import { assertActiveCatalogCode, getActiveCatalogValue } from "@/modules/field-platform/use-cases/validate-catalog-code"
import { projectCoordinatorSnapshot } from "@/modules/products/domain/product-master-index"
import type { CoordinationRiskLevel } from "../domain/coordinator-types"
import { diffAgainstSnapshot, type OrderFieldOverride } from "../domain/order-overrides"
import { coordinatorOrderCode, defaultNextAction } from "../domain/operation-rules"
import { suggestPriority } from "../domain/priority-suggestion"
import { computeDeliveryTargetAt } from "../domain/sla-calculation"
import { mapStageToOrderAxes } from "../domain/state-mapper"
import { DirectMasterIndexConnector } from "../connectors/master-index-connector"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import { isUniqueViolation, runInTransaction } from "../infra/transaction"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, ensureAssetsOwned, getOrderView } from "./shared"

export interface CreateCoordinatorOrderInput {
  customerId?: string | undefined
  /** ĐP-2.6 (26/09/2026): có thì máy chủ đọc PMI và chụp snapshot (§5). Tuỳ
   * chọn — không có vẫn tạo được đơn mẫu ngoài danh mục, BOM nhập tay. */
  productId?: string | undefined
  customerName: string
  customerTier?: string | undefined
  customerPhone?: string | undefined
  recipientName: string
  recipientPhone: string
  deliveryAddress: Record<string, unknown>
  deliveryTargetTime: string
  deliveryTargetAt?: string | undefined
  productTitle: string
  sampleImageUrl?: string | undefined
  sampleAssetId?: string | undefined
  unitPriceVnd: number
  flowers: Array<{ flowerName: string; quantity: number; unit: string; color: string; role: string }>
  cardMessage?: string | undefined
  /** ĐP-4a.1 (26/09/2026) — `cardMessage` bắt buộc khi true (kiểm ở `http-schemas.ts`). */
  cardRequired?: boolean | undefined
  internalNote?: string | undefined
  riskLevel?: CoordinationRiskLevel | undefined
  /** ĐP-3.16 (26/09/2026): giá trị trường tự tạo (entity = ORDER), qua `applyCustomFields`. */
  customFields?: Record<string, unknown> | undefined
  // ── ĐP-4a.1 (26/09/2026) — T01: đủ trường P0/P1 (Đặc tả trường §2.1/§3.1) ──
  source?: CoordinatorEntrySource | undefined
  sourceReference?: string | undefined
  /** Danh mục §2.15.3 (MỞ) — kiểm active thật ở `assertActiveCatalogCode`. */
  channel?: string | undefined
  /** Danh mục §2.15.4 (CÓ HÀNH VI) — kích hoạt nhóm trường có điều kiện §12. */
  orderType?: string | undefined
  /** Danh mục §2.15.1 (CÓ HÀNH VI) — bỏ trống thì máy GỢI Ý (`suggestPriority`). */
  priority?: string | undefined
  /** Danh mục §2.15.2 (CÓ HÀNH VI) — dùng tính SLA giao (ĐP-4a.2, chưa làm ở đợt này). */
  serviceLevel?: string | undefined
  /** Danh mục §2.15.5 (CÓ HÀNH VI). */
  deliveryType?: string | undefined
  /** Danh mục §2.15.5 (CÓ HÀNH VI) — kích hoạt nhóm trường có điều kiện §12. */
  deliveryLocationType?: string | undefined
  receivedAt?: string | undefined
  deliveryWindowStart?: string | undefined
  deliveryWindowEnd?: string | undefined
}

const MAX_CODE_ATTEMPTS = 5

export async function createCoordinatorOrder(
  ctx: TenantContext,
  input: CreateCoordinatorOrderInput,
  now = new Date()
): Promise<CoordinatorOrderView> {
  // PO 07/11/2026 (Q11, Q12): không tạo đơn với ngày giao đã qua; SĐT người nhận chỉ số Việt Nam
  const deliveryErrors = newOrderDeliveryErrors(
    { deliveryDate: input.deliveryTargetAt ? vnTodayIso(new Date(input.deliveryTargetAt)) : null, recipientPhone: input.recipientPhone },
    now
  )
  if (Object.keys(deliveryErrors).length > 0) {
    throw validationFailed({
      ...(deliveryErrors.deliveryDate ? { deliveryTargetAt: deliveryErrors.deliveryDate } : {}),
      ...(deliveryErrors.recipientPhone ? { recipientPhone: deliveryErrors.recipientPhone } : {}),
    })
  }
  // Giá ở màn Điều phối qua cùng sàn (C10) và trần (C9) như sổ đơn, báo giá (audit BL-20). Giá 0 = chờ báo giá.
  if (input.productId && input.unitPriceVnd > 0) {
    await assertWithinPriceBounds(ctx, [{ productId: input.productId, quantity: 1 }], input.unitPriceVnd, input.unitPriceVnd)
  }
  // ĐP-2.9 (26/09/2026): có `customerId` → tên/hạng/SĐT LẤY từ Customer
  // Master Index, bỏ qua giá trị client gửi (Hợp đồng MI §5 điểm 5,7 — hạng
  // khách do client gửi chỉ có nghĩa cho khách lẻ, không có `customerId`).
  // Trước bản này, form vẫn gửi `customerName`/`customerTier` tự nhập ngay cả
  // khi đã chọn khách từ CMI, và máy chủ ghi y nguyên — hai nguồn dữ liệu
  // khách hàng (form nhập tay vs CMI) trôi dạt khỏi nhau ngay từ lúc tạo đơn.
  let customerName = input.customerName
  let customerTier = input.customerTier ?? "NEW"
  let customerPhone = input.customerPhone
  if (input.customerId) {
    const customer = await getCustomerRepository().getById(ctx, input.customerId)
    if (!customer) throw new AppError("UNPROCESSABLE_ENTITY", "Khách hàng không tồn tại", { customerId: input.customerId })
    customerName = customer.name
    customerTier = customer.metrics.tier
    customerPhone = customer.phone || customerPhone
  }

  // ĐP-2.6/2.7/2.8 (26/09/2026): có `productId` → đọc Product Master Index,
  // chụp snapshot bất biến (§5) rồi so BOM Sales gửi lên với snapshot để ghi
  // vết override tối thiểu (§6). Không có `productId` → đơn mẫu ngoài danh
  // mục: chỉ có BOM nhập tay, không snapshot, không override.
  let snapshot: ReturnType<typeof projectCoordinatorSnapshot> | null = null
  let overrides: OrderFieldOverride[] = []
  if (input.productId) {
    const product = await new DirectMasterIndexConnector().getProductMasterIndex(ctx, input.productId)
    if (!product) {
      throw new AppError("UNPROCESSABLE_ENTITY", "Sản phẩm không tồn tại trong Master Index", {
        productId: input.productId,
      })
    }
    snapshot = projectCoordinatorSnapshot(product, now)
    overrides = diffAgainstSnapshot(snapshot, input.flowers, ctx.userId, now)
  }

  // ĐP-3.16 (26/09/2026): kiểm/lọc giá trị trường tự tạo TRƯỚC transaction —
  // đọc `field_definitions` (bảng nền tảng, không thuộc giao dịch của đơn).
  const customFieldValues = await applyCustomFields(ctx, "ORDER", input.customFields)

  // ĐP-4a.1 (26/09/2026) — kiểm mọi mã danh mục ĐANG ACTIVE trước transaction,
  // giống cách `productId`/`customerId` đã kiểm tồn tại ở trên. `priority` bỏ
  // trống thì máy GỢI Ý (§2.15.1) rồi mới kiểm giá trị gợi ý đó.
  await assertActiveCatalogCode("channel", input.channel, "Kênh tiếp nhận")
  await assertActiveCatalogCode("orderType", input.orderType, "Loại đơn")
  // ĐP-4a.2 (26/09/2026) — đọc luôn `behavior`/`params` của serviceLevel để
  // tính SLA (`computeDeliveryTargetAt`) thay vì chỉ kiểm tồn tại; input có
  // mã mà không active thì đây cũng CHÍNH LÀ phép kiểm (ném lỗi như cũ).
  const serviceLevelValue = await getActiveCatalogValue("serviceLevel", input.serviceLevel)
  if (input.serviceLevel && !serviceLevelValue) {
    throw new AppError(
      "UNPROCESSABLE_ENTITY",
      `Cam kết thời gian giao "${input.serviceLevel}" không hợp lệ hoặc đã bị tắt trong danh mục`,
      { catalogKey: "serviceLevel", code: input.serviceLevel }
    )
  }
  await assertActiveCatalogCode("deliveryType", input.deliveryType, "Hình thức giao")
  await assertActiveCatalogCode("deliveryLocationType", input.deliveryLocationType, "Loại địa điểm giao")
  const priority =
    input.priority ??
    suggestPriority({ serviceLevel: input.serviceLevel, orderType: input.orderType, customerTier })
  // Chỉ kiểm danh mục khi client TỰ chọn priority — giá trị máy tự gợi ý
  // (suggestPriority) luôn là mã hợp lệ theo PRIORITY_TIER_BEHAVIORS (Lớp mã),
  // không cần soi qua field_catalog_values (Lớp cấu hình), vốn có thể chưa
  // được seed ở một số môi trường (vd. DB test tenant — xem TRANG_THAI.md).
  // Bug đã sửa 27/09/2026: trước đây validate priority vô điều kiện khiến MỌI
  // đơn hàng bị 422 khi danh mục "priority" trống, kể cả đơn không hề chọn
  // priority.
  if (input.priority) {
    await assertActiveCatalogCode("priority", priority, "Mức ưu tiên")
  }

  // ĐP-4a.2 (26/09/2026), §2.15.2 — mốc giao THẬT tính từ hành vi serviceLevel
  // (tham số đọc từ danh mục), không còn dùng thẳng giờ Sales nhập khi đã
  // chọn serviceLevel. Không chọn serviceLevel → giữ nguyên hành vi cũ.
  const deliveryTargetAt = computeDeliveryTargetAt({
    behavior: serviceLevelValue?.behavior ?? null,
    params: serviceLevelValue?.params ?? null,
    orderCreatedAt: now,
    requestedDeliveryAt: input.deliveryTargetAt ? new Date(input.deliveryTargetAt) : null,
    deliveryWindowStart: input.deliveryWindowStart ? new Date(input.deliveryWindowStart) : null,
    deliveryWindowEnd: input.deliveryWindowEnd ? new Date(input.deliveryWindowEnd) : null,
  })

  const stage = "INTAKE" as const
  const prefix = coordinatorOrderCode(0, now).slice(0, -4)

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const created = await runInTransaction(async (tx) => {
        if (input.sampleAssetId) await ensureAssetsOwned(ctx, tx, [input.sampleAssetId])
        const repo = getCoordinatorRepository(tx)
        const seq = (await repo.countOrdersWithCodePrefix(ctx, prefix)) + 1 + attempt
        const result = await repo.createOrder(ctx, {
          code: coordinatorOrderCode(seq, now),
          stage,
          axes: mapStageToOrderAxes(stage),
          riskLevel: input.riskLevel ?? "NORMAL",
          nextAction: defaultNextAction(stage),
          totalVnd: input.unitPriceVnd,
          customerId: input.customerId ?? null,
          cardMessage: input.cardMessage?.trim() || null,
          cardRequired: input.cardRequired ?? false,
          internalNote: input.internalNote?.trim() || null,
          deliveryWindow: { timeSlot: input.deliveryTargetTime, targetAt: input.deliveryTargetAt ?? null },
          deliveryAddress: input.deliveryAddress,
          estimatedDeliveryAt: deliveryTargetAt,
          sampleAssetId: input.sampleAssetId ?? null,
          // ĐP-4a.1 (26/09/2026) — T01. `source` mặc định MANUAL (đây LÀ điểm
          // nhập tay); `salesOwnerId` gán = người tạo đơn, giống `coordinatorId`
          // (chưa có API đổi người phụ trách — cùng tình trạng "MỘT PHẦN").
          source: input.source ?? "MANUAL",
          sourceReference: input.sourceReference?.trim() || null,
          channel: input.channel ?? null,
          orderType: input.orderType ?? null,
          priority,
          serviceLevel: input.serviceLevel ?? null,
          deliveryType: input.deliveryType ?? null,
          deliveryLocationType: input.deliveryLocationType ?? null,
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : now,
          deliveryWindowStart: input.deliveryWindowStart ? new Date(input.deliveryWindowStart) : null,
          deliveryWindowEnd: input.deliveryWindowEnd ? new Date(input.deliveryWindowEnd) : null,
          salesOwnerId: ctx.userId,
          // ĐP-2.7: MỘT dòng `order_items` cho mỗi sản phẩm — bỏ kiểu "mỗi
          // loài hoa một dòng" của bản trước. `metadata.flowers` giữ tên
          // phẳng để màn "Chi tiết đơn" chung (`order-detail-modal.tsx`,
          // module `orders`) vẫn đọc được BOM có cấu trúc của đơn Điều phối.
          items: [
            {
              productId: input.productId ?? null,
              description: input.productTitle,
              quantity: 1,
              unitPriceVnd: input.unitPriceVnd,
              metadata: {
                flowers: input.flowers,
                sampleImageUrl: input.sampleImageUrl ?? null,
                ...(snapshot ? { product: snapshot, overrides } : {}),
              },
            },
          ],
          metadata: {
            customerName,
            customerTier,
            customerPhone: customerPhone?.trim() || null,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            productTitle: input.productTitle,
            sampleImageUrl: input.sampleImageUrl ?? null,
            flowers: input.flowers,
          },
          customFields: customFieldValues,
        })
        await audit(ctx, tx, "coordinator.order.create", result.id, null, { code: result.code, stage })
        return result
      })
      return getOrderView(ctx, created.id)
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_CODE_ATTEMPTS - 1) continue
      throw error
    }
  }
  throw new AppError("CONFLICT", "Không cấp được mã đơn — thử lại.")
}
