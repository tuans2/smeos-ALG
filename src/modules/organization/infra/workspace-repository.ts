import type { workspace_kind, workspaces } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"

export class WorkspaceRepository {
  constructor(private readonly db: DbClient = prisma) {}

  list(ctx: TenantContext): Promise<workspaces[]> {
    return this.db.workspaces.findMany({
      where: scopedWhere(ctx),
      orderBy: { created_at: "asc" },
    })
  }

  findById(ctx: TenantContext, id: string): Promise<workspaces | null> {
    return this.db.workspaces.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  create(
    ctx: TenantContext,
    input: {
      name: string
      kind: workspace_kind
      trial_limit?: number | null
      trial_status?: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | null
    }
  ): Promise<workspaces> {
    return this.db.workspaces.create({
      data: {
        organization_id: ctx.organizationId,
        name: input.name,
        kind: input.kind,
        trial_limit: input.trial_limit ?? null,
        trial_status: input.trial_status ?? null,
      },
    })
  }

  /**
   * Dùng lúc đăng ký, khi tổ chức vừa ra đời và chưa có `TenantContext` nào để
   * gác. `organizationId` ở đây đến từ bản ghi vừa tạo phía máy chủ, không từ
   * client.
   */
  createForNewOrganization(input: {
    organizationId: string
    name: string
    kind: workspace_kind
    trial_limit: number | null
    trial_status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | null
  }): Promise<workspaces> {
    return this.db.workspaces.create({
      data: {
        organization_id: input.organizationId,
        name: input.name,
        kind: input.kind,
        trial_limit: input.trial_limit,
        trial_status: input.trial_status,
      },
    })
  }

  /**
   * Tăng `trial_count` có điều kiện — dùng trong giao dịch `enqueue-job` khi
   * workspace là `EXPERIENCE` (đặc tả 07 mục 11.1, `YC-U6`). So sánh
   * `trial_count < trial_limit` là so cột với cột, Prisma không diễn tả được
   * qua API fluent (`lt` chỉ nhận giá trị literal) nên phải viết SQL thô —
   * vẫn có điều kiện ngay trong câu `UPDATE`, chốt chặn đua giống
   * `OrganizationRepository.tryDeductCredit`. `trial_limit IS NULL` nghĩa là
   * không giới hạn (workspace trải nghiệm chưa cấu hình hạn mức).
   */
  async tryConsumeTrial(workspaceId: string): Promise<boolean> {
    // Trong môi trường dev: nới rộng không giới hạn lượt dùng thử để thoải mái phát triển
    if (process.env.NODE_ENV === "development") {
      await this.db.$queryRaw`
        UPDATE workspaces
           SET trial_count = trial_count + 1
         WHERE id = ${workspaceId}
      `
      return true
    }

    const rows = await this.db.$queryRaw<Array<{ trial_count: number }>>`
      UPDATE workspaces
         SET trial_count = trial_count + 1
       WHERE id = ${workspaceId}
         AND (trial_limit IS NULL OR trial_count < trial_limit)
      RETURNING trial_count
    `
    return rows.length > 0
  }

  /**
   * Workspace mặc định của tổ chức đang hoạt động của phiên, dùng để dựng
   * `TenantContext`. Tham số `organizationId` chỉ được phép đến từ
   * `sessions.organization_id`, tức là từ phía máy chủ — đây là bước *sinh ra*
   * ngữ cảnh nên chưa có ngữ cảnh nào để gác.
   */
  findDefaultForSessionOrganization(organizationId: string): Promise<workspaces | null> {
    return this.db.workspaces.findFirst({
      where: { organization_id: organizationId },
      orderBy: { created_at: "asc" },
    })
  }
}

let _workspaceRepositorySingleton: WorkspaceRepository | null = null
export function getWorkspaceRepository(db?: DbClient): WorkspaceRepository {
  if (db) return new WorkspaceRepository(db)
  if (!_workspaceRepositorySingleton) _workspaceRepositorySingleton = new WorkspaceRepository()
  return _workspaceRepositorySingleton
}
