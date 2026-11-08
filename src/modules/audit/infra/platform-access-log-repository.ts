/**
 * `platform_access_logs` (ADR-013 D-I5, D-60): ghi khi nhân viên nền tảng truy cập dữ liệu một tổ chức; chủ tổ chức
 * đọc danh sách của chính tổ chức mình (`scopedWhere`). Bảng chỉ thêm dòng (trigger `smeos_append_only_guard`).
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"

export interface PlatformAccessRow {
  id: string
  operatorId: string
  operatorName: string | null
  purpose: string
  method: string
  route: string
  createdAt: Date
}

export class PlatformAccessLogRepository {
  /** Ghi một dòng nếu tổ chức tồn tại (id sai → 0 dòng, route vẫn trả 404 như cũ). Trả số dòng đã ghi. */
  recordIfOrgExists(input: { organizationId: string; operatorId: string; purpose: string; method: string; route: string }): Promise<number> {
    return prisma.$executeRaw`
      INSERT INTO "platform_access_logs" ("id", "organization_id", "operator_id", "purpose", "method", "route")
      SELECT gen_random_uuid()::text, o."id", ${input.operatorId}, ${input.purpose}, ${input.method}, ${input.route}
      FROM "organizations" o WHERE o."id" = ${input.organizationId}`
  }

  async list(ctx: TenantContext, options: { limit: number; cursor?: string | null }): Promise<PlatformAccessRow[]> {
    const rows = await prisma.platform_access_logs.findMany({
      where: scopedWhere(ctx, {}),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
    const operatorIds = [...new Set(rows.map((r) => r.operator_id))]
    const operators = operatorIds.length
      ? await prisma.users.findMany({ where: { id: { in: operatorIds } }, select: { id: true, name: true } })
      : []
    const nameOf = new Map(operators.map((u) => [u.id, u.name]))
    return rows.map((r) => ({
      id: r.id,
      operatorId: r.operator_id,
      operatorName: nameOf.get(r.operator_id) ?? null,
      purpose: r.purpose,
      method: r.method,
      route: r.route,
      createdAt: r.created_at,
    }))
  }
}

let repo: PlatformAccessLogRepository | null = null
export function getPlatformAccessLogRepository(): PlatformAccessLogRepository {
  if (!repo) repo = new PlatformAccessLogRepository()
  return repo
}
