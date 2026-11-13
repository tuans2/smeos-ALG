import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import type { DismissalInfo, DismissalProposalInput } from "../domain/dismissal-policy"
import {
  obj, orderDismissible, sessionDismissible, writeOrderDismissal, writeSessionDismissal,
} from "./dismissal-store"

const ORDER_SELECT = { id: true, status: true, paid_vnd: true, production_status: true, pricing_rule_ref: true } as const
const SESSION_SELECT = { id: true, revoked_at: true, expires_at: true, status: true, product_snapshot: true } as const
type Target = { id: string; type: "ORDER" | "SESSION" }

/** Ngữ cảnh hệ thống cho tự duyệt quá hạn — audit ghi rõ nguồn, không mang năng lực của ai. */
function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: "system:dismissal-timeout", branchId: null, capabilities: new Set() }
}

/**
 * Bỏ hiển thị đơn/link chưa thanh toán: Sale đề xuất (chờ duyệt, quá hạn thì bộ quét nền tự duyệt),
 * Điều hành/Điều phối duyệt hoặc bỏ trực tiếp. Mọi lần ghi khoá lạc quan + audit; đơn huỷ có lịch sử.
 */
export class DismissalRepository {
  constructor(private readonly db = prisma) {}

  private async userName(ctx: TenantContext): Promise<string> {
    if (ctx.userId.startsWith("system:")) return "Hệ thống"
    const m = await this.db.memberships.findFirst({
      where: scopedWhere(ctx, { user_id: ctx.userId }),
      select: { user: { select: { name: true, email: true } } },
    })
    return m?.user.name?.trim() || m?.user.email.split("@")[0] || "Nhân viên"
  }

  private async load(ctx: TenantContext, t: Target) {
    if (t.type === "ORDER") {
      const order = await this.db.orders.findFirst({ where: scopedWhere(ctx, { id: t.id }), select: ORDER_SELECT })
      if (!order) throw notFound()
      return { kind: "ORDER" as const, order, current: obj(obj(order.pricing_rule_ref).dismissal) as unknown as DismissalInfo }
    }
    const session = await this.db.greeting_sessions.findFirst({ where: scopedWhere(ctx, { id: t.id }), select: SESSION_SELECT })
    if (!session) throw notFound()
    return { kind: "SESSION" as const, session, current: obj(obj(session.product_snapshot)._dismissal) as unknown as DismissalInfo }
  }

  private async write(ctx: TenantContext, loaded: Awaited<ReturnType<DismissalRepository["load"]>>, info: DismissalInfo, action: string, now: Date) {
    await this.db.$transaction(async (tx) => {
      if (loaded.kind === "ORDER") await writeOrderDismissal(tx, ctx, loaded.order, info, now)
      else await writeSessionDismissal(tx, ctx, loaded.session, info, now)
      await recordAuditLog(ctx, {
        action: `${loaded.kind === "ORDER" ? "order" : "session"}.dismiss.${action}`,
        entityType: loaded.kind === "ORDER" ? "order" : "greeting_session",
        entityId: loaded.kind === "ORDER" ? loaded.order.id : loaded.session.id,
        before: { dismissal: loaded.current?.status ? loaded.current : null },
        after: { dismissal: info },
      }, tx)
    })
  }

  async propose(ctx: TenantContext, input: DismissalProposalInput, direct: boolean): Promise<{ directApproved: boolean; dismissal: DismissalInfo }> {
    const now = new Date()
    const loaded = await this.load(ctx, input)
    const check = loaded.kind === "ORDER" ? orderDismissible(loaded.order) : sessionDismissible(loaded.session, now)
    if (!check.allowed) throw conflict(check.reason ?? "Không thể bỏ hiển thị mục này.")
    if (loaded.current?.status === "PENDING") throw conflict("Mục này đã có đề xuất bỏ hiển thị đang chờ duyệt.")

    const name = await this.userName(ctx)
    const note = input.note?.trim() || undefined
    const dismissal: DismissalInfo = {
      status: direct ? "APPROVED" : "PENDING",
      reason: note ? `${input.reasonText.trim()} (${note})` : input.reasonText.trim(),
      category: input.reasonId,
      note,
      proposedBy: ctx.userId,
      proposedByName: name,
      proposedAt: now.toISOString(),
      ...(direct ? { decidedBy: ctx.userId, decidedByName: name, decidedAt: now.toISOString() } : {}),
    }
    await this.write(ctx, loaded, dismissal, direct ? "direct" : "propose", now)
    return { directApproved: direct, dismissal }
  }

  async decide(ctx: TenantContext, input: Target & { approve: boolean; note?: string; auto?: boolean }): Promise<{ status: "APPROVED" | "REJECTED" }> {
    const now = new Date()
    const loaded = await this.load(ctx, input)
    const current = loaded.current
    if (current?.status !== "PENDING") throw conflict("Không có đề xuất bỏ hiển thị nào đang chờ duyệt.")
    const status = input.approve ? "APPROVED" : "REJECTED"
    const name = input.auto ? "Hệ thống (tự duyệt khi quá hạn)" : await this.userName(ctx)
    const reply = input.note?.trim()
    const decided: DismissalInfo = {
      ...current,
      status,
      decidedBy: ctx.userId,
      decidedByName: name,
      decidedAt: now.toISOString(),
      ...(input.auto ? { autoDismissed: true } : {}),
      note: reply ? `${current.note ? `${current.note}; ` : ""}Phản hồi: ${reply}` : current.note,
    }
    await this.write(ctx, loaded, decided, input.auto ? "auto_approve" : input.approve ? "approve" : "reject", now)
    return { status }
  }

  /** Đề xuất còn chờ, tạo trước `before` — bộ quét nền tự duyệt (lọc theo JSON, mọi tiệm). */
  async listExpired(before: Date, take = 50) {
    const pending = { equals: "PENDING" }
    const [orders, sessions] = await Promise.all([
      this.db.orders.findMany({
        where: { pricing_rule_ref: { path: ["dismissal", "status"], ...pending } },
        select: { id: true, organization_id: true, pricing_rule_ref: true }, take,
      }),
      this.db.greeting_sessions.findMany({
        where: { product_snapshot: { path: ["_dismissal", "status"], ...pending } },
        select: { id: true, organization_id: true, product_snapshot: true }, take,
      }),
    ])
    const expired = (d: unknown) => {
      const t = Date.parse(String(obj(d).proposedAt))
      return Number.isFinite(t) && t <= before.getTime()
    }
    return [
      ...orders.filter((o) => expired(obj(o.pricing_rule_ref).dismissal)).map((o) => ({ type: "ORDER" as const, id: o.id, organizationId: o.organization_id })),
      ...sessions.filter((s) => expired(obj(s.product_snapshot)._dismissal)).map((s) => ({ type: "SESSION" as const, id: s.id, organizationId: s.organization_id })),
    ]
  }

  async autoApprove(organizationId: string, t: Target) {
    return this.decide(systemContext(organizationId), { ...t, approve: true, auto: true })
  }
}

let _dismissalRepositorySingleton: DismissalRepository | null = null
export function getDismissalRepository(): DismissalRepository {
  if (!_dismissalRepositorySingleton) _dismissalRepositorySingleton = new DismissalRepository()
  return _dismissalRepositorySingleton
}
