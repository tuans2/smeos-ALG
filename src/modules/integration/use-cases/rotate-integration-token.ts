import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IIntegrationTokenRepository } from "../domain/repositories/integration-repository.interface"
import { getIntegrationTokenRepository } from "../infra/integration-token-repository"
import { hashIntegrationToken, newIntegrationToken } from "@/modules/integration/infra/token-crypto"
import { resolveExpiry, ttlDaysOf } from "@/modules/integration/domain/token-rules"

export type RotateIntegrationTokenResult = {
  id: string
  token: string
  expires_at: Date
  rotated_from_id: string
}

/**
 * `POST /integration-tokens/:id/rotate` (`F9`). Tạo token MỚI cùng `client`
 * với token hiện có, nối `rotated_from_id` — KHÔNG tự thu hồi token cũ,
 * đúng đặc tả 08 mục 3: "core chấp nhận hai token cùng lúc trong thời gian
 * xoay". Người quản trị tự gọi `DELETE /integration-tokens/:id` (token cũ)
 * sau khi engine ngoài đã chuyển sang dùng token mới.
 */
export async function rotateIntegrationToken(
  ctx: TenantContext,
  id: string,
  repo: IIntegrationTokenRepository = getIntegrationTokenRepository()
): Promise<RotateIntegrationTokenResult> {
  const current = await repo.findById(ctx, id)
  if (!current) throw notFound()

  const raw = newIntegrationToken()
  // Giữ thời hạn đã chọn lúc cấp token đang xoay (audit API §19)
  const expiresAt = resolveExpiry(new Date(), ttlDaysOf(current))

  const row = await repo.create(ctx, {
    client: current.client,
    tokenHash: hashIntegrationToken(raw),
    createdBy: current.created_by,
    expiresAt,
    rotatedFromId: current.id,
  })

  return { id: row.id, token: raw, expires_at: row.expires_at, rotated_from_id: current.id }
}
