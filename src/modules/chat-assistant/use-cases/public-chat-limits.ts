/**
 * Hạn mức chat công khai của tiệm: xem mức đang áp dụng và gửi yêu cầu nâng
 * lên Admin nền tảng. Chủ tiệm không tự nâng được — chỉ ghi yêu cầu chờ duyệt.
 */
import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { requireCapability } from "@/core/rbac/capabilities"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { getChatChannelRepository } from "../infra/chat-channel-repository"
import { resolvePublicChatLimits, type PublicChatLimits } from "../domain/public-chat-policy"
import {
  PENDING_PUBLIC_CHAT_LIMITS_KEY,
  canRequestLimits,
  readPendingLimitRequest,
  type PendingPublicChatLimitRequest,
} from "../domain/public-chat-limit-request"

export interface PublicChatLimitStatus {
  current: PublicChatLimits
  pending: PendingPublicChatLimitRequest | null
}

export async function getPublicChatLimitStatus(ctx: TenantContext): Promise<PublicChatLimitStatus> {
  const [org, catalog] = await Promise.all([
    getOrganizationRepository().current(ctx),
    getChatChannelRepository().findByChannel(ctx, "STOREFRONT_CATALOG"),
  ])
  return { current: resolvePublicChatLimits(catalog?.config), pending: readPendingLimitRequest(org?.settings) }
}

export interface RequestPublicChatLimitInput {
  perVisitor: number
  perIp: number
  note?: string | null | undefined
}

export async function requestPublicChatLimits(
  ctx: TenantContext,
  input: RequestPublicChatLimitInput,
): Promise<PendingPublicChatLimitRequest> {
  requireCapability(ctx, "T4")
  const orgRepo = getOrganizationRepository()
  const org = await orgRepo.current(ctx)
  if (!org) throw validationFailed({ organization: "Không tìm thấy tổ chức" })

  const { current, pending } = await getPublicChatLimitStatus(ctx)
  if (pending) throw conflict("Yêu cầu nâng hạn mức trước đó đang chờ duyệt")
  if (!canRequestLimits(current, input.perVisitor, input.perIp)) {
    throw validationFailed({ limits: "Mức đề nghị không hợp lệ hoặc không cao hơn mức hiện tại" })
  }

  const request: PendingPublicChatLimitRequest = {
    per_visitor: input.perVisitor,
    per_ip: input.perIp,
    requested_at: new Date().toISOString(),
    requested_by: ctx.userId,
    note: input.note?.trim() || null,
  }
  const settings = org.settings && typeof org.settings === "object" ? (org.settings as Record<string, unknown>) : {}
  await orgRepo.updateSettings(ctx, { ...settings, [PENDING_PUBLIC_CHAT_LIMITS_KEY]: request })

  await recordAuditLog(ctx, {
    action: "chat.public_limits_requested",
    entityType: "organizations",
    entityId: org.id,
    before: { per_visitor: current.perVisitor, per_ip: current.perIp },
    after: { per_visitor: request.per_visitor, per_ip: request.per_ip, note: request.note },
  })
  return request
}
