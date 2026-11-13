import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { CUSTOMER_SENDER_ID } from "../domain/internal-message"
import { readSubstitutePayload, type SubstituteOption, type SubstitutePayload } from "../domain/substitute-proposal"
import { CATALOG_ITEMS_INCLUDE } from "./greeting-catalog-repository"

export const SUBSTITUTE_PROPOSAL_KIND = "SUBSTITUTE_PROPOSAL"
export const SUBSTITUTE_RESPONSE_KIND = "SUBSTITUTE_RESPONSE"
/** Đề xuất đổi một loại hoa phụ (ALG 5.14) — dùng chung khoá "một đề xuất chờ khách mỗi đơn" */
export const FLOWER_PROPOSAL_KIND = "FLOWER_SUBSTITUTE_PROPOSAL"

/** Đơn đã rời tiệm hoặc đã đóng — không đổi mẫu được nữa (khớp `substituteLockReason`). */
const CLOSED_STATUS = ["CANCELLED", "COMPLETED", "DELIVERED"] as const
const LEFT_SHOP = ["DISPATCHED", "DELIVERING", "DELIVERED"] as const
const OPEN_ORDER = { status: { notIn: [...CLOSED_STATUS] }, delivery_status: { notIn: [...LEFT_SHOP] } }

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const lockKey = (orderId: string) => `substitute:${orderId}`

/**
 * Đề xuất mẫu thay thế = tin `SUBSTITUTE_PROPOSAL` (nhân viên gửi, payload giữ trạng thái + câu trả
 * lời của khách); câu trả lời = cập nhật payload + tin `SUBSTITUTE_RESPONSE` gửi Điều phối.
 */
export class SubstituteRepository {
  constructor(private readonly db = prisma) {}

  /** Đơn Thẻ chào của tổ chức kèm mẫu đang đặt và bộ sưu tập gốc. */
  async orderForStaff(ctx: TenantContext, orderId: string) {
    return this.db.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, source: "BROCHURE" }),
      select: {
        id: true, code: true, status: true, delivery_status: true,
        items: { select: { id: true, product_id: true, description: true, metadata: true }, take: 1 },
        greeting_sessions: { select: { id: true, sale_id: true, catalog_id: true }, take: 1 },
      },
    })
  }

  /** Các mẫu của bộ sưu tập (đúng tổ chức) — để dựng danh sách mẫu thay thế. */
  async catalogItems(ctx: TenantContext, catalogId: string) {
    const catalog = await this.db.greeting_catalogs.findFirst({ where: scopedWhere(ctx, { id: catalogId }), include: CATALOG_ITEMS_INCLUDE })
    return catalog?.items ?? []
  }

  /** Các đề xuất của đơn, mới nhất trước. */
  async listForOrder(organizationId: string, orderId: string, take = 5) {
    const rows = await this.db.greeting_messages.findMany({
      where: { organization_id: organizationId, order_id: orderId, kind: SUBSTITUTE_PROPOSAL_KIND },
      select: { id: true, payload: true, created_at: true },
      orderBy: { created_at: "desc" },
      take,
    })
    return rows.flatMap((r) => {
      const payload = readSubstitutePayload(r.payload)
      return payload ? [{ id: r.id, createdAt: r.created_at, payload }] : []
    })
  }

  /** Gửi đề xuất. Khoá theo đơn: mỗi đơn chỉ một đề xuất đang chờ khách trả lời. */
  async createProposal(ctx: TenantContext, order: { id: string; saleId: string | null }, payload: SubstitutePayload, body: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(order.id)}))`
      const open = await tx.orders.count({ where: scopedWhere(ctx, { id: order.id, ...OPEN_ORDER }) })
      if (open === 0) throw conflict("Đơn đã giao cho shipper hoặc đã đóng — không đổi mẫu được nữa")
      const pending = await tx.greeting_messages.count({
        where: scopedWhere(ctx, { order_id: order.id, kind: { in: [SUBSTITUTE_PROPOSAL_KIND, FLOWER_PROPOSAL_KIND] }, payload: { path: ["status"], equals: "PENDING" } }),
      })
      if (pending > 0) throw conflict("Đơn đang có một đề xuất chờ khách trả lời")
      const created = await tx.greeting_messages.create({
        data: scopedData(ctx, {
          id: randomUUID(), order_id: order.id, step_key: "GENERAL", sender_id: ctx.userId, sender_role: "COORDINATOR",
          ...(order.saleId && order.saleId !== "public" ? { to_user_id: order.saleId } : { to_role: "SALE" }),
          kind: SUBSTITUTE_PROPOSAL_KIND, body, payload: payload as unknown as Prisma.InputJsonValue,
        }),
        select: { id: true, created_at: true },
      })
      await recordAuditLog(ctx, {
        action: "greeting_card.substitute.propose", entityType: "order", entityId: order.id,
        after: { reason: payload.reason, original: payload.original, options: payload.options.map((o) => o.productId) },
      }, tx)
      return created
    })
  }

  /**
   * Khách trả lời, nguyên tử: chốt đề xuất (chỉ khi còn chờ), đơn phải chưa rời tiệm. Chọn mẫu →
   * đổi mẫu trên dòng hàng + bản chụp của phiên, giữ nguyên giá. Mọi lựa chọn đều ghi một dòng vào
   * ghi chú nội bộ để thợ cắm thấy, và báo Điều phối.
   */
  async respond(
    order: { id: string; organization_id: string },
    input: { proposalId: string; answered: SubstitutePayload; option: SubstituteOption | null; internalNote: string; body: string },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(order.id)}))`
      const row = await tx.orders.findFirst({
        where: { id: order.id, organization_id: order.organization_id, ...OPEN_ORDER },
        select: { internal_note: true, items: { select: { id: true, metadata: true }, take: 1 }, greeting_sessions: { select: { id: true }, take: 5 } },
      })
      if (!row) throw conflict("Hoa đã giao cho shipper hoặc đơn đã đóng — vui lòng liên hệ cửa hàng")
      const locked = await tx.greeting_messages.updateMany({
        where: { id: input.proposalId, organization_id: order.organization_id, order_id: order.id, kind: SUBSTITUTE_PROPOSAL_KIND, payload: { path: ["status"], equals: "PENDING" } },
        data: { payload: input.answered as unknown as Prisma.InputJsonValue },
      })
      if (locked.count === 0) throw notFound()

      const note = row.internal_note ? `${row.internal_note}\n${input.internalNote}` : input.internalNote
      await tx.orders.updateMany({ where: { id: order.id, organization_id: order.organization_id }, data: { internal_note: note } })

      const item = row.items[0]
      if (input.option && item) {
        const old = obj(item.metadata)
        // Bản chụp mới hoàn toàn — không giữ công thức/BOM của mẫu cũ cho thợ cắm
        const snapshot = {
          id: input.option.productId, code: input.option.code, name: input.option.name,
          imageUrl: input.option.imageUrl, driveLink: input.option.driveLink,
          description: null, flowersSummary: null, variant: null,
          // Giá theo đơn đã chốt — tổng tiền không đổi khi đổi mẫu
          price: typeof old.price === "number" ? old.price : input.option.priceVnd,
          substitutedFrom: { id: input.answered.original.productId, name: input.answered.original.name, proposalId: input.proposalId },
          selectedAt: input.answered.answeredAt,
        }
        await tx.order_items.updateMany({
          where: { id: item.id, organization_id: order.organization_id },
          data: { product_id: input.option.productId, description: input.option.name, metadata: snapshot as unknown as Prisma.InputJsonValue },
        })
        await tx.greeting_sessions.updateMany({
          where: { id: { in: row.greeting_sessions.map((s) => s.id) }, organization_id: order.organization_id },
          data: { selected_product_id: input.option.productId, product_snapshot: snapshot as unknown as Prisma.InputJsonValue },
        })
      }

      await tx.greeting_messages.create({
        data: {
          id: randomUUID(), organization_id: order.organization_id, order_id: order.id, step_key: "GENERAL",
          sender_id: CUSTOMER_SENDER_ID, sender_role: "CUSTOMER", to_role: "COORDINATOR", kind: SUBSTITUTE_RESPONSE_KIND,
          reply_to_id: input.proposalId, body: input.body, payload: input.answered as unknown as Prisma.InputJsonValue,
        },
      })
    })
  }
}

let _substituteRepositorySingleton: SubstituteRepository | null = null
export function getSubstituteRepository(): SubstituteRepository {
  if (!_substituteRepositorySingleton) _substituteRepositorySingleton = new SubstituteRepository()
  return _substituteRepositorySingleton
}
