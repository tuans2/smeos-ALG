import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { integration_client } from "@/modules/integration/infra/entities"
import type { IIntegrationTokenRepository, IntegrationClient } from "../domain/repositories/integration-repository.interface"
import { getIntegrationTokenRepository } from "../infra/integration-token-repository"
import { hashIntegrationToken, newIntegrationToken } from "@/modules/integration/infra/token-crypto"
import { MAX_TOKEN_TTL_DAYS, MIN_TOKEN_TTL_DAYS, resolveExpiry } from "@/modules/integration/domain/token-rules"

const CLIENTS: readonly integration_client[] = ["LOCALBUDD", "SOCIALFLOW"]

export type IssueIntegrationTokenResult = {
  id: string
  client: string
  /** Giá trị thật — chỉ trả về đúng MỘT lần lúc cấp. Cơ sở dữ liệu chỉ giữ HMAC. */
  token: string
  expires_at: Date
}

/**
 * `POST /integration-tokens` (`F9`, P7). Không nhận danh sách mã năng lực từ
 * client — phạm vi quyền của token cố định theo `client`, áp thẳng trong
 * từng route `/api/v1/integration/*` (đặc tả 08 mục 3), không phải một tập
 * do người gọi tự chọn lúc cấp phát.
 */
export async function issueIntegrationToken(
  ctx: TenantContext,
  input: { client: string; createdBy: string; ttlDays?: number | undefined },
  repo: IIntegrationTokenRepository = getIntegrationTokenRepository()
): Promise<IssueIntegrationTokenResult> {
  if (!CLIENTS.includes(input.client as integration_client)) {
    throw validationFailed({ client: `Phải là một trong: ${CLIENTS.join(", ")}` })
  }
  if (
    input.ttlDays !== undefined &&
    (!Number.isInteger(input.ttlDays) || input.ttlDays < MIN_TOKEN_TTL_DAYS || input.ttlDays > MAX_TOKEN_TTL_DAYS)
  ) {
    throw validationFailed({ ttl_days: `Phải trong khoảng ${MIN_TOKEN_TTL_DAYS}..${MAX_TOKEN_TTL_DAYS}` })
  }

  const raw = newIntegrationToken()
  const expiresAt = resolveExpiry(new Date(), input.ttlDays)

  const row = await repo.create(ctx, {
    client: input.client as integration_client,
    tokenHash: hashIntegrationToken(raw),
    createdBy: input.createdBy,
    expiresAt,
  })

  return { id: row.id, client: row.client, token: raw, expires_at: row.expires_at }
}
