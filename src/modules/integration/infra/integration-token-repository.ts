import type { integration_client, integration_tokens } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type { DbClient } from "./db-client"

import type {
  IIntegrationTokenRepository,
  IntegrationTokenRecord,
  CreateIntegrationTokenInput,
} from "../domain/repositories/integration-repository.interface"

export type { CreateIntegrationTokenInput }


/**
 * Token máy gọi máy — P7, đặc tả 08 mục 3 (`YC-T8`). `create`/`list`/`revoke`
 * đòi `TenantContext` của một quản trị viên đã đăng nhập (`F9`); chỉ
 * `findActiveByHash` là ngoại lệ SINH ngữ cảnh, giống
 * `SessionRepository.findByTokenHash`.
 */
export class IntegrationTokenRepository implements IIntegrationTokenRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /**
   * Điểm vào của mọi route `/api/v1/integration/*` — chưa có
   * `TenantContext` nào để gác lúc gọi hàm này, vì đây chính là bước dựng ra
   * nó. Không lọc theo tổ chức: `token_hash` duy nhất toàn hệ thống.
   */
  findActiveByHash(tokenHash: string, now: Date): Promise<integration_tokens | null> {
    return this.db.integration_tokens.findFirst({
      where: { token_hash: tokenHash, revoked_at: null, expires_at: { gt: now } },
    })
  }

  list(ctx: TenantContext): Promise<integration_tokens[]> {
    return this.db.integration_tokens.findMany({
      where: scopedWhere(ctx),
      orderBy: { created_at: "desc" },
    })
  }

  findById(ctx: TenantContext, id: string): Promise<integration_tokens | null> {
    return this.db.integration_tokens.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  create(ctx: TenantContext, input: CreateIntegrationTokenInput): Promise<integration_tokens> {
    return this.db.integration_tokens.create({
      data: scopedData(ctx, {
        client: input.client as integration_client,
        token_hash: input.tokenHash,
        created_by: input.createdBy,
        expires_at: input.expiresAt,
        rotated_from_id: input.rotatedFromId ?? null,
      }),
    })
  }

  /**
   * `updateMany` + điều kiện tổ chức, không `update` theo khoá chính — cùng
   * lý do `BranchRepository.update` (`YC-T4`): tổ chức B không thu hồi được
   * token của tổ chức A dù đoán đúng id.
   */
  async revoke(ctx: TenantContext, id: string, now: Date): Promise<boolean> {
    const result = await this.db.integration_tokens.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { revoked_at: now },
    })
    return result.count > 0
  }
}

let integrationTokenRepoInstance: IIntegrationTokenRepository | null = null

export function getIntegrationTokenRepository(db?: DbClient): IIntegrationTokenRepository {
  if (db) return new IntegrationTokenRepository(db)
  if (!integrationTokenRepoInstance) {
    integrationTokenRepoInstance = new IntegrationTokenRepository()
  }
  return integrationTokenRepoInstance
}

