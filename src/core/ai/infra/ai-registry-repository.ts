import { prisma } from "@/core/tenancy/infra/prisma"

import type { ai_capabilities, ai_models } from "./entities"
import type { DbClient } from "./db-client"
import type { IAiRegistryRepository } from "../domain/ai-repository.interface"

/**
 * Sổ đăng ký năng lực và mô hình — dữ liệu cấp NỀN TẢNG, không thuộc tenant.
 *
 * Vì thế repository này KHÔNG nhận `TenantContext`: không có `organization_id`
 * để lọc. Nó là ngoại lệ có chủ đích của quy ước "repository nhận ctx làm tham
 * số bắt buộc thứ nhất", cùng loại ngoại lệ với `flower_taxonomy` ở đặc tả 07
 * mục 16. Mọi đường GHI vào hai bảng này thuộc console vận hành nền tảng
 * (`N9`–`N11`), không thuộc bất kỳ route nào của tổ chức.
 */
export class AiRegistryRepository implements IAiRegistryRepository {
  constructor(private readonly db: DbClient = prisma) {}

  capabilities(): Promise<ai_capabilities[]> {
    return this.db.ai_capabilities.findMany({ where: { enabled: true }, orderBy: { code: "asc" } })
  }

  capability(code: string): Promise<ai_capabilities | null> {
    return this.db.ai_capabilities.findUnique({ where: { code } })
  }

  /**
   * Mô hình đủ điều kiện chạy: đã bật VÀ đủ bốn ô giấy phép (D18).
   *
   * Bộ lọc giấy phép nằm ở đây, không ở route: một mô hình thiếu ô giấy phép
   * không được lộ ra bất kỳ đâu, kể cả trong danh sách để người dùng chọn.
   */
  async eligibleModels(): Promise<ai_models[]> {
    const models = await this.db.ai_models.findMany({ orderBy: { key: "asc" } })
    return models.filter((model) => model.enabled && licenseComplete(model))
  }

  allModels(): Promise<ai_models[]> {
    return this.db.ai_models.findMany({ orderBy: { key: "asc" } })
  }
}

let aiRegistryRepoInstance: IAiRegistryRepository | null = null

export function getAiRegistryRepository(db?: DbClient): IAiRegistryRepository {
  if (db) return new AiRegistryRepository(db)
  if (!aiRegistryRepoInstance) {
    aiRegistryRepoInstance = new AiRegistryRepository()
  }
  return aiRegistryRepoInstance
}

/** Bốn ô của D18. Rỗng hoặc chỉ có khoảng trắng đều là thiếu. */
export function licenseComplete(model: {
  license: string | null
  territory: string | null
  allowed_use: string | null
  commercial_use: boolean | null
}): boolean {
  const filled = (value: string | null) => typeof value === "string" && value.trim().length > 0
  return (
    filled(model.license) &&
    filled(model.territory) &&
    filled(model.allowed_use) &&
    model.commercial_use === true
  )
}
