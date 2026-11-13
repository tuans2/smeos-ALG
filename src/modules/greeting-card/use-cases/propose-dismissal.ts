import type { TenantContext } from "@/core/tenancy"
import { DismissalRepository, getDismissalRepository } from "../infra/dismissal-repository"
import type { DismissalProposalInput } from "../domain/dismissal-policy"
import { canDecideDismissal } from "../domain/dismissal-policy"
import { GreetingMessageRepository, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import { visibleTarget } from "./internal-messages"

/**
 * Người có quyền duyệt (R6 — chỉ Điều hành) bỏ trực tiếp; người khác (Sale) chỉ đề xuất.
 * Sale "chỉ khách của mình" không đề xuất bỏ đơn/link của sale khác — 404.
 */
export async function proposeDismissal(ctx: TenantContext, input: DismissalProposalInput, repo = getDismissalRepository()) {
  await visibleTarget(ctx, input.type === "ORDER" ? { orderId: input.id } : { sessionId: input.id }, getGreetingMessageRepository())
  return repo.propose(ctx, input, canDecideDismissal(ctx.capabilities))
}
