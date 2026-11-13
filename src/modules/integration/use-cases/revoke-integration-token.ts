import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IIntegrationTokenRepository } from "../domain/repositories/integration-repository.interface"
import { getIntegrationTokenRepository } from "../infra/integration-token-repository"

/**
 * `DELETE /integration-tokens/:id` (`F9`). Thu hồi ngay bằng `revoked_at` —
 * không xoá bản ghi, giữ vết cho `rotated_from_id` và cho kiểm toán vận
 * hành.
 */
export async function revokeIntegrationToken(
  ctx: TenantContext,
  id: string,
  repo: IIntegrationTokenRepository = getIntegrationTokenRepository()
): Promise<void> {
  const ok = await repo.revoke(ctx, id, new Date())
  if (!ok) throw notFound()
}
