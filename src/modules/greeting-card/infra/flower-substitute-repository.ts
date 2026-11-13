import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { CUSTOMER_SENDER_ID } from "../domain/internal-message"
import { applyFlowerSubstitution, readFlowerPayload, type FlowerSubstitutePayload } from "../domain/flower-substitute"
import { FLOWER_PROPOSAL_KIND, SUBSTITUTE_PROPOSAL_KIND } from "./substitute-repository"

export { FLOWER_PROPOSAL_KIND }
export const FLOWER_RESPONSE_KIND = "FLOWER_SUBSTITUTE_RESPONSE"

const CLOSED_STATUS = ["CANCELLED", "COMPLETED", "DELIVERED"] as const
const LEFT_SHOP = ["DISPATCHED", "DELIVERING", "DELIVERED"] as const
const OPEN_ORDER = { status: { notIn: [...CLOSED_STATUS] }, delivery_status: { notIn: [...LEFT_SHOP] } }
// Cùng khoá với đề xuất đổi mẫu: mỗi đơn chỉ một đề xuất (đổi mẫu hoặc đổi hoa) chờ khách
const lockKey = (orderId: string) => `substitute:${orderId}`
const json = (v: unknown) => v as Prisma.InputJsonValue

/**
 * Đề xuất đổi một loại hoa phụ (ALG 5.14) = tin `FLOWER_SUBSTITUTE_PROPOSAL`; câu trả lời cập nhật
 * payload, đồng ý thì đổi dòng hoa trong công thức của đơn (`order_items.metadata.flowers`).
 */
export class FlowerSubstituteRepository {
  constructor(private readonly db = prisma) {}

  /** Ảnh hoa thay thế phải thuộc đúng tổ chức và là tệp ảnh. */
  async photoBelongs(ctx: TenantContext, assetId: string): Promise<boolean> {
    const asset = await this.db.assets.findFirst({ where: scopedWhere(ctx, { id: assetId }), select: { mime_type: true } })
    return !!asset && (asset.mime_type ?? "").startsWith("image/")
  }

  async listForOrder(organizationId: string, orderId: string, take = 5) {
    const rows = await this.db.greeting_messages.findMany({
      where: { organization_id: organizationId, order_id: orderId, kind: FLOWER_PROPOSAL_KIND },
      select: { id: true, payload: true, created_at: true },
      orderBy: { created_at: "desc" },
      take,
    })
    return rows.flatMap((r) => {
      const payload = readFlowerPayload(r.payload)
      return payload ? [{ id: r.id, createdAt: r.created_at, payload }] : []
    })
  }

  async createProposal(ctx: TenantContext, order: { id: string; saleId: string | null }, payload: FlowerSubstitutePayload, body: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(order.id)}))`
      const open = await tx.orders.count({ where: scopedWhere(ctx, { id: order.id, ...OPEN_ORDER }) })
      if (open === 0) throw conflict("Đơn đã giao cho shipper hoặc đã đóng — không đổi hoa được nữa")
      const pending = await tx.greeting_messages.count({
        where: scopedWhere(ctx, { order_id: order.id, kind: { in: [SUBSTITUTE_PROPOSAL_KIND, FLOWER_PROPOSAL_KIND] }, payload: { path: ["status"], equals: "PENDING" } }),
      })
      if (pending > 0) throw conflict("Đơn đang có một đề xuất chờ khách trả lời")
      const created = await tx.greeting_messages.create({
        data: scopedData(ctx, {
          id: randomUUID(), order_id: order.id, step_key: "GENERAL", sender_id: ctx.userId, sender_role: "COORDINATOR",
          ...(order.saleId && order.saleId !== "public" ? { to_user_id: order.saleId } : { to_role: "SALE" }),
          kind: FLOWER_PROPOSAL_KIND, body, payload: json(payload),
        }),
        select: { id: true, created_at: true },
      })
      await recordAuditLog(ctx, {
        action: "greeting_card.flower_substitute.propose", entityType: "order", entityId: order.id,
        after: { reason: payload.reason, line: payload.line, replacement: payload.replacement },
      }, tx)
      return created
    })
  }

  /**
   * Khách trả lời, nguyên tử: chốt đề xuất (chỉ khi còn chờ), đơn chưa rời tiệm. Đồng ý → đổi đúng
   * dòng hoa trong công thức của đơn; mọi lựa chọn ghi một dòng ghi chú nội bộ và báo Điều phối.
   */
  async respond(
    order: { id: string; organization_id: string },
    input: { proposalId: string; answered: FlowerSubstitutePayload; internalNote: string; body: string },
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(order.id)}))`
      const row = await tx.orders.findFirst({
        where: { id: order.id, organization_id: order.organization_id, ...OPEN_ORDER },
        select: { internal_note: true, items: { select: { id: true, metadata: true }, take: 1 } },
      })
      if (!row) throw conflict("Hoa đã giao cho shipper hoặc đơn đã đóng — vui lòng liên hệ cửa hàng")
      const locked = await tx.greeting_messages.updateMany({
        where: { id: input.proposalId, organization_id: order.organization_id, order_id: order.id, kind: FLOWER_PROPOSAL_KIND, payload: { path: ["status"], equals: "PENDING" } },
        data: { payload: json(input.answered) },
      })
      if (locked.count === 0) throw notFound()

      const item = row.items[0]
      if (input.answered.choice === "ACCEPT" && item) {
        const next = applyFlowerSubstitution(item.metadata, input.answered)
        if (!next) throw conflict("Công thức của đơn đã thay đổi — vui lòng liên hệ cửa hàng")
        await tx.order_items.updateMany({ where: { id: item.id, organization_id: order.organization_id }, data: { metadata: json(next) } })
      }
      const note = row.internal_note ? `${row.internal_note}\n${input.internalNote}` : input.internalNote
      await tx.orders.updateMany({ where: { id: order.id, organization_id: order.organization_id }, data: { internal_note: note } })
      await tx.greeting_messages.create({
        data: {
          id: randomUUID(), organization_id: order.organization_id, order_id: order.id, step_key: "GENERAL",
          sender_id: CUSTOMER_SENDER_ID, sender_role: "CUSTOMER", to_role: "COORDINATOR", kind: FLOWER_RESPONSE_KIND,
          reply_to_id: input.proposalId, body: input.body, payload: json(input.answered),
        },
      })
    })
  }
}

let singleton: FlowerSubstituteRepository | null = null
export function getFlowerSubstituteRepository(): FlowerSubstituteRepository {
  if (!singleton) singleton = new FlowerSubstituteRepository()
  return singleton
}
