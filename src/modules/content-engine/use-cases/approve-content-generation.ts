/**
 * Duyệt bài Content Engine (P27) — endpoint duyệt tách khỏi endpoint sinh
 * (`POST /generations` gác `I1`, duyệt gác `J5` — cùng mã duyệt gói Chặng 09).
 * Ghi `audit_logs` trong CÙNG giao dịch với việc chuyển trạng thái (`YC-R4`).
 */

import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { runInTransaction } from "@/modules/jobs/infra/transaction"

import { decideApproval, type ApprovalPostInput, type ApprovedPost } from "../domain/approval-rules"
import {
  getContentGenerationRepository,
  type ContentGenerationStatus,
  type content_generations,
} from "../infra/content-generation-repository"
import type { IContentGenerationRepository } from "../domain/repositories/content-generation-repository.interface"

export async function approveContentGeneration(
  ctx: TenantContext,
  id: string,
  input: { readonly posts?: readonly ApprovalPostInput[] | undefined },
  repo: IContentGenerationRepository = getContentGenerationRepository()
): Promise<content_generations> {
  requireCapability(ctx, "J5")

  const row = await repo.findById(ctx, id)
  if (!row) throw notFound()

  const status = row.status as ContentGenerationStatus
  const decision = decideApproval({
    status,
    generatedPosts: (row.posts as unknown as Array<{ channel: string; text: string; hashtags?: string[] }>) ?? [],
    existingApproved: (row.approved_posts as unknown as ApprovedPost[] | null) ?? null,
    requested: input.posts,
  })
  if (!decision.ok) {
    if (decision.kind === "CONFLICT") throw conflict(decision.reason)
    throw validationFailed({ posts: decision.reason })
  }

  return runInTransaction(async (tx) => {
    const updated = await getContentGenerationRepository(tx).approve(ctx, id, {
      approvedBy: ctx.userId,
      approvedPosts: decision.approvedPosts,
      expectedStatus: status,
    })
    if (!updated) throw conflict("Trạng thái bài vừa thay đổi — tải lại rồi duyệt lại.")
    await recordAuditLog(
      ctx,
      {
        action: "content_generation.approve",
        entityType: "content_generations",
        entityId: id,
        before: { status },
        after: {
          status: "APPROVED",
          channels: decision.approvedPosts.map((p) => p.channel),
          edited_channels: decision.approvedPosts.filter((p) => p.edited).map((p) => p.channel),
        },
      },
      tx
    )
    return updated
  })
}
