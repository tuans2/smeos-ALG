import type { branches } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"

export class BranchRepository {
  constructor(private readonly db: DbClient = prisma) {}

  list(ctx: TenantContext): Promise<branches[]> {
    return this.db.branches.findMany({
      where: scopedWhere(ctx),
      orderBy: { code: "asc" },
    })
  }

  findById(ctx: TenantContext, id: string): Promise<branches | null> {
    return this.db.branches.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  findByCode(ctx: TenantContext, code: string): Promise<branches | null> {
    return this.db.branches.findFirst({ where: scopedWhere(ctx, { code }) })
  }

  create(
    ctx: TenantContext,
    input: { name: string; code: string; address?: string | null }
  ): Promise<branches> {
    return this.db.branches.create({
      data: scopedData(ctx, {
        name: input.name,
        code: input.code,
        address: input.address ?? null,
      }),
    })
  }

  /**
   * Cập nhật đi qua `updateMany` với điều kiện tổ chức, không qua `update` theo
   * khoá chính: `update` theo id sẽ sửa được bản ghi của tổ chức khác nếu đoán
   * đúng id. Số dòng chạm tới bằng 0 nghĩa là không tìm thấy — tầng trên dịch
   * thành 404, không phải 403 (`YC-T4`).
   */
  async update(
    ctx: TenantContext,
    id: string,
    input: { name?: string; address?: string | null; is_active?: boolean }
  ): Promise<branches | null> {
    const result = await this.db.branches.updateMany({
      where: scopedWhere(ctx, { id }),
      data: input,
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }
}

let _branchRepositorySingleton: BranchRepository | null = null
export function getBranchRepository(): BranchRepository {
  if (!_branchRepositorySingleton) _branchRepositorySingleton = new BranchRepository()
  return _branchRepositorySingleton
}
