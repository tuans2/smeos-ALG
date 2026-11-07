import { prisma } from "@/core/tenancy/infra/prisma"
import { withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { branchScopedWhere, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { conflict } from "@/core/http/errors"
import { resolveCoordinatorId } from "../domain/coordinator-owner"
import { sortByDelivery } from "../domain/coordinator-board"
import type { delivery_status, order_status, production_status } from "@/generated/prisma/client"
import { orderListExtraWhere, type OrderListExtraFilter } from "@/modules/orders/domain/order-list-filter"
import { phoneSearch } from "@/core/security/pii-lookup"

export const ORDER_STATUSES: readonly order_status[] = [
  "DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED",
]
/** Đơn hàng nguồn Thẻ chào: tạo đơn, thu tiền, tra cứu, cập nhật xưởng. */
/** Mã đơn, mã link, tên khách hàng (không phân biệt hoa thường) hoặc SĐT khách (4 số cuối / đủ số). */
function searchConditions(q: string, organizationId?: string) {
  const text = q.trim()
  const cleanText = text.replace(/^#/, "").trim()
  const digits = text.replace(/\D/g, "")
  const hasLetters = /[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(text)
  return [
    { code: { contains: text, mode: "insensitive" as const } },
    ...(cleanText && cleanText !== text ? [{ code: { contains: cleanText, mode: "insensitive" as const } }] : []),
    { customer: { name: { contains: text, mode: "insensitive" as const } } },
    { greeting_sessions: { some: { send_code: { contains: text, mode: "insensitive" as const } } } },
    { greeting_sessions: { some: { customer_name: { contains: text, mode: "insensitive" as const } } } },
    ...(!hasLetters && organizationId && phoneSearch(organizationId, digits) // P-5b (D-49): 4 số cuối hoặc đủ số
      ? [{ customer: phoneSearch(organizationId, digits)! }, { greeting_sessions: { some: phoneSearch(organizationId, digits, "customer_phone")! } }]
      : []),
  ]
}

export class BrochureOrderRepository {
  constructor(private readonly db = prisma) {}

  /**
   * Danh sách đơn Thẻ chào cho các tab nội bộ. Cột tiền `Decimal` đổi sang
   * `number` TẠI ĐÂY: Prisma Decimal ra JSON thành CHUỖI, và UI cũ so sánh
   * `paid_vnd >= total_vnd` theo thứ tự chữ ("1000000" < "850000") nên đơn
   * đã thu đủ vẫn hiện "Chưa thu tiền".
   */
  /**
   * Bảng việc Điều phối: mọi đơn Thẻ chào chưa huỷ còn việc, cộng đơn đã giao trong 24 giờ qua;
   * tuỳ chọn một ngày giao. Trần `COORDINATOR_BOARD_MAX`, xếp ở use-case theo giờ giao.
   */
  async listCoordinatorBoard(ctx: TenantContext, options: { date?: string | undefined; saleId?: string | undefined; doneSince: Date; max: number }) {
    const where = scopedWhere(ctx, {
      source: "BROCHURE", ...branchScopedWhere(ctx),
      NOT: { status: "CANCELLED" as const },
      OR: [{ delivery_status: { not: "DELIVERED" as const } }, { updated_at: { gte: options.doneSince } }],
      ...(options.date ? { delivery_window: { path: ["date"], equals: options.date } } : {}),
      ...(options.saleId ? { greeting_sessions: { some: { sale_id: options.saleId } } } : {}),
    })
    // Vượt trần: giữ đơn có ngày + giờ giao GẦN NHẤT (trước đây giữ đơn tạo sớm nhất, bỏ mất đơn mới sắp giao)
    const keep = (await this.db.orders.count({ where })) > options.max
      ? sortByDelivery(await this.db.orders.findMany({ where, select: { id: true, delivery_window: true, created_at: true } })).slice(0, options.max).map((o) => o.id)
      : null
    const rows = await this.db.orders.findMany({
      where: keep ? { ...where, id: { in: keep } } : where,
      include: {
        customer: { select: { id: true, code: true, name: true, phone: true } },
        items: true,
        greeting_sessions: { select: { id: true, send_code: true, status: true, product_snapshot: true, selected_product_id: true, sale_id: true, payment_proof_asset_id: true, payment_proof_balance_asset_id: true, catalog: { select: { filters: true } } } },
        coordination: { select: { coordinator_id: true, metadata: true } },
        assignments: { take: 1, select: { assignee_id: true, assigned_by: true }, orderBy: { assigned_at: "desc" as const } },
        events: { select: { axis: true, created_at: true, actor_id: true, reason: true }, orderBy: { created_at: "desc" as const } },
        qc_records: { select: { inspector_id: true, notes: true, created_at: true } },
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      take: options.max,
    })
    const userIds = rows
      .flatMap((o) => [o.greeting_sessions[0]?.sale_id, resolveCoordinatorId(o)])
      .filter((id): id is string => Boolean(id))
    const names = await this.memberNames(ctx, userIds)

    return rows.map((o) => {
      const saleId = o.greeting_sessions[0]?.sale_id ?? null
      const coordinatorId = resolveCoordinatorId(o)
      const saleName = saleId ? names.get(saleId) ?? "Nhân viên đã rời" : "Chưa gán"
      const coordinatorName = coordinatorId ? names.get(coordinatorId) ?? "Nhân viên đã rời" : "Chưa gán"

      return {
        ...o,
        total_vnd: Number(o.total_vnd),
        paid_vnd: Number(o.paid_vnd),
        balance_vnd: Number(o.balance_vnd),
        saleId,
        saleName,
        coordinatorId,
        coordinatorName,
        items: o.items.map((i) => ({ ...i, unit_price_vnd: Number(i.unit_price_vnd) })),
      }
    })
  }

  async memberNames(ctx: TenantContext, userIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(userIds)].filter(Boolean)
    if (ids.length === 0) return new Map()
    const rows = await this.db.memberships.findMany({
      where: scopedWhere(ctx, { user_id: { in: ids } }),
      select: { user_id: true, user: { select: { name: true, email: true } } },
    })
    return new Map(rows.map((r) => [r.user_id, r.user.name?.trim() || r.user.email.split("@")[0] || "Nhân viên"]))
  }

  async listBrochureOrders(
    ctx: TenantContext,
    options: {
      status?: order_status | undefined
      /** OUTSTANDING = còn phải thu (chưa huỷ); PAID = đã thu đủ. */
      payment?: "OUTSTANDING" | "PAID" | undefined
      /** Chỉ đơn từ link do sale này gửi (chế độ xem "chỉ đơn của mình") */
      saleId?: string | undefined
      /** Tìm theo mã đơn / mã link / số điện thoại khách (Điều hành đối chiếu sao kê) */
      q?: string | undefined
      /** Chỉ đơn khách đã bấm "Tôi đã chuyển khoản" */
      reported?: boolean | undefined
      /** Chỉ đơn đã giao (báo cáo đơn đã giao còn nợ khi đi cùng payment=OUTSTANDING) */
      delivered?: boolean | undefined
      /** Chỉ đúng đơn này (mở từ Hộp việc) */
      orderId?: string | undefined
      limit: number
      cursor?: string | undefined
    } & Omit<OrderListExtraFilter, "saleId">
  ) {
    const rows = await this.db.orders.findMany({
      where: { AND: [orderListExtraWhere(options), scopedWhere(ctx, {
        source: "BROCHURE", ...branchScopedWhere(ctx),
        ...(options.orderId ? { id: options.orderId } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.saleId ? { greeting_sessions: { some: { sale_id: options.saleId } } } : {}),
        // Đơn chờ báo giá (tổng 0) cũng tính là "còn phải thu"
        ...(options.payment === "OUTSTANDING"
          ? { OR: [{ balance_vnd: { gt: 0 } }, { total_vnd: 0 }], NOT: { status: "CANCELLED" as const } }
          : {}),
        ...(options.payment === "PAID" ? { balance_vnd: { lte: 0 }, total_vnd: { gt: 0 } } : {}),
        ...(options.reported ? { greeting_sessions: { some: { status: "PAYMENT_REPORTED" as const, ...(options.saleId ? { sale_id: options.saleId } : {}) } } } : {}),
        ...(options.q || options.delivered
          ? { AND: [...(options.q ? [{ OR: searchConditions(options.q, ctx.organizationId) }] : []), ...(options.delivered ? [{ OR: [{ delivery_status: "DELIVERED" as const }, { status: "COMPLETED" as const }] }] : [])] }
          : {}),
      })] },
      include: {
        customer: { select: { id: true, code: true, name: true, phone: true } },
        items: true,
        payments: true,
        greeting_sessions: { select: { id: true, send_code: true, status: true, product_snapshot: true, selected_product_id: true, payment_proof_asset_id: true, payment_proof_balance_asset_id: true } },
        qc_records: { select: { notes: true, created_at: true } },
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit + 1, // dư 1 dòng để biết còn trang sau
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
    return rows.map((o) => ({
      ...o,
      total_vnd: Number(o.total_vnd),
      paid_vnd: Number(o.paid_vnd),
      balance_vnd: Number(o.balance_vnd),
      items: o.items.map((i) => ({ ...i, unit_price_vnd: Number(i.unit_price_vnd) })),
      payments: o.payments.map((p) => ({ ...p, amount_vnd: Number(p.amount_vnd) })),
    }))
  }

  /** Đơn đã giao mà còn nợ (mọi thời điểm, không chỉ 7 ngày như bảng theo dõi) — mục 3, PO 15/10/2026. */
  async listDeliveredWithDebt(ctx: TenantContext, saleId: string | null, take = 200) {
    const rows = await this.db.orders.findMany({
      where: scopedWhere(ctx, {
        source: "BROCHURE", ...branchScopedWhere(ctx),
        NOT: { status: "CANCELLED" as const },
        OR: [{ delivery_status: "DELIVERED" as const }, { status: "COMPLETED" as const }],
        balance_vnd: { gt: 0 },
        ...(saleId ? { greeting_sessions: { some: { sale_id: saleId } } } : {}),
      }),
      select: { id: true, code: true, balance_vnd: true, updated_at: true, customer: { select: { name: true } }, greeting_sessions: { select: { id: true, sale_id: true, customer_name: true }, take: 1 } },
      orderBy: { updated_at: "asc" },
      take,
    })
    return rows.map((o) => ({
      orderId: o.id, code: o.code, balanceVnd: Number(o.balance_vnd), deliveredAt: o.updated_at,
      saleId: o.greeting_sessions[0]?.sale_id ?? null, sessionId: o.greeting_sessions[0]?.id ?? null,
      customerName: o.customer?.name ?? o.greeting_sessions[0]?.customer_name ?? "Khách",
    }))
  }

  async findBrochureOrder(ctx: TenantContext, orderId: string) {
    return this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, source: "BROCHURE", ...branchScopedWhere(ctx) }),
      include: {
        qc_records: { select: { notes: true, created_at: true } },
        greeting_sessions: { select: { id: true, send_code: true, status: true, sale_id: true, payment_proof_asset_id: true, catalog: { select: { filters: true } } } },
      },
    })
  }

  async findOrderById(organizationId: string, orderId: string) {
    return this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: { id: true, code: true, status: true, total_vnd: true, paid_vnd: true, created_at: true, pricing_rule_ref: true },
    })
  }

  /** Tra cứu công khai: chỉ đơn nguồn Thẻ chào; mã trùng giữa hai tiệm → không trả gì. */
  async getTrackingOrderByCode(orderCode: string) {
    const matches = await this.db.orders.findMany({
      where: { code: orderCode.trim().toUpperCase(), source: "BROCHURE" },
      include: {
        items: { take: 1 },
        // Đủ để tách ảnh thành phẩm và ảnh người nhận (mỗi loại tối đa 5 ảnh + 2 video)
        qc_records: { orderBy: { created_at: "desc" }, take: 20 },
        // Chỉ để xác minh người xem (không trả ra ngoài)
        customer: { select: { phone: true } },
        greeting_sessions: {
          select: {
            send_code: true,
            status: true,
            payment_proof_asset_id: true,
            catalog: { select: { filters: true } },
          },
        },
        organization: { select: ORG_SETTINGS_SELECT }, // ngành theo cột (ADR-012 T-6c-1)
        coordination: {
          select: { metadata: true },
        },
      },
      take: 2,
    })
    return matches.length === 1 ? withOrganizationIndustry(matches[0] ?? null) : null
  }

  /** Đề xuất huỷ của một đơn (mới nhất trước) — trang theo dõi dựng thông báo huỷ cho khách. */
  async cancellationRecordsOf(organizationId: string, orderId: string) {
    const rows = await this.db.greeting_messages.findMany({
      where: { organization_id: organizationId, order_id: orderId, kind: "CANCELLATION_REQUEST" },
      select: { sender_role: true, payload: true },
      orderBy: { created_at: "desc" },
      take: 10,
    })
    return rows.map((r) => ({ senderRole: r.sender_role, payload: r.payload }))
  }

  /** Sale phụ trách đơn (người gửi link) — `null` khi đơn không thuộc tổ chức / không phải đơn Thẻ chào. */
  async saleOfOrder(ctx: TenantContext, orderId: string): Promise<string | null> {
    const order = await this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, source: "BROCHURE", ...branchScopedWhere(ctx) }),
      select: { greeting_sessions: { select: { sale_id: true }, take: 1 } },
    })
    return order?.greeting_sessions[0]?.sale_id ?? null
  }

  /** Loại + dung lượng của các asset thuộc đúng tổ chức (asset tổ chức khác không có trong kết quả). */
  async ownedAssetsMeta(ctx: TenantContext, assetIds: readonly string[]) {
    return this.db.assets.findMany({
      where: scopedWhere(ctx, { id: { in: [...new Set(assetIds)] } }),
      select: { id: true, mime_type: true, file_size: true },
    })
  }

  /**
   * Cập nhật tiến độ xưởng + ghi `order_events` (+ phiếu QC kèm ảnh nếu có)
   * trong một giao dịch. Kiểm thứ tự tác vụ nằm ở use-case.
   */
  async applyProgress(
    ctx: TenantContext,
    order: { id: string; code: string; internal_note: string | null; production_status: production_status; delivery_status: delivery_status },
    input: {
      eventType: string
      productionStatus?: production_status | undefined
      deliveryStatus?: delivery_status | undefined
      orderStatus?: order_status | undefined
      noteAppend?: string | undefined
      /** Ảnh/video của lần chụp này — một bản ghi QC chứa cả bộ */
      qcAssetIds?: readonly string[] | undefined
    }
  ) {
    return this.db.$transaction(async (tx) => {
      if (input.qcAssetIds && input.qcAssetIds.length > 0) {
        await tx.order_qc_records.create({
          data: {
            organization_id: ctx.organizationId,
            order_id: order.id,
            image_asset_ids: [...input.qcAssetIds],
            status: "PASSED",
            notes: input.eventType,
            inspector_id: ctx.userId,
          },
        })
      }

      // Khoá lạc quan: chỉ ghi khi đơn chưa huỷ và tiến độ xưởng/giao vẫn đúng như lúc đọc. Thiếu khoá này,
      // Điều hành huỷ đơn trong lúc Điều phối đang tải ảnh người nhận thì đơn CANCELLED bị ghi đè thành
      // COMPLETED; hai người bấm cùng một tác vụ thì ghi hai sự kiện + gửi khách hai tin.
      const moved = await tx.orders.updateMany({
        where: {
          id: order.id,
          organization_id: ctx.organizationId,
          status: { not: "CANCELLED" },
          production_status: order.production_status,
          delivery_status: order.delivery_status,
        },
        data: {
          ...(input.productionStatus ? { production_status: input.productionStatus } : {}),
          ...(input.deliveryStatus ? { delivery_status: input.deliveryStatus } : {}),
          ...(input.orderStatus ? { status: input.orderStatus } : {}),
          ...(input.noteAppend
            ? { internal_note: [order.internal_note, input.noteAppend].filter(Boolean).join("\n") }
            : {}),
        },
      })
      if (moved.count === 0) throw conflict("Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại")

      const isDelivery = input.deliveryStatus !== undefined
      await tx.order_events.create({
        data: {
          organization_id: ctx.organizationId,
          order_id: order.id,
          axis: isDelivery ? "delivery" : "production",
          from_value: isDelivery ? order.delivery_status : order.production_status,
          to_value: input.deliveryStatus ?? input.productionStatus ?? "UPDATED",
          reason: input.eventType,
          actor_id: ctx.userId,
        },
      })

      // Tác vụ xưởng cũng vào nhật ký kiểm toán như thao tác tiền: ai làm, lúc nào, đổi gì
      await recordAuditLog(
        ctx,
        {
          action: `greeting_card.order.${input.eventType.toLowerCase()}`,
          entityType: "order",
          entityId: order.id,
          before: { productionStatus: order.production_status, deliveryStatus: order.delivery_status },
          after: {
            ...(input.productionStatus ? { productionStatus: input.productionStatus } : {}),
            ...(input.deliveryStatus ? { deliveryStatus: input.deliveryStatus } : {}),
            ...(input.orderStatus ? { status: input.orderStatus } : {}),
            ...(input.noteAppend ? { note: input.noteAppend } : {}),
            ...(input.qcAssetIds?.length ? { assetIds: [...input.qcAssetIds] } : {}),
          },
        },
        tx
      )

      return { orderId: order.id, orderCode: order.code }
    })
  }
}

let _brochureOrderRepositorySingleton: BrochureOrderRepository | null = null
export function getBrochureOrderRepository(): BrochureOrderRepository {
  if (!_brochureOrderRepositorySingleton) _brochureOrderRepositorySingleton = new BrochureOrderRepository()
  return _brochureOrderRepositorySingleton
}
