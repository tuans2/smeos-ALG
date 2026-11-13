/**
 * Chốt đơn gia công cho chi nhánh đã nhận: chi nhánh bấm "Chốt làm ngay", hoặc hết thời gian được
 * huỷ nhận (grace) mà chi nhánh không huỷ — PO 22/10/2026 "bật cả hai": tự chốt khi hết hạn và tự
 * mời vòng sau khi hết hạn vòng. Trước đó chỉ có nhánh bấm tay; logic tự chốt nằm trong một bộ
 * lập lịch không được gọi ở đâu (rà soát cụm G).
 *
 * Chốt dưới khoá dòng (bấm lại / sweep chạy chồng không gửi lại tin). Báo khách "đã nhận đơn" do
 * repository gửi sau giao dịch khi đơn chuyển sang sản xuất.
 */

import { conflict, unprocessable } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { publicAppUrl } from "@/lib/public-url"

import { parseChainDispatchPolicy, renderDispatchMessage } from "../domain/chain-dispatch-policy"
import { commitSubcontractOrder } from "../domain/subcontract-order"
import { ChainBranchRepository } from "../infra/chain-branch-repository"
import { MultiChannelDispatchNotifier } from "../infra/dispatch-notification-adapter"
import { subcontractBranchUrl } from "../infra/subcontract-link-token"
import { SubcontractOrderRepository } from "../infra/subcontract-order-repository"

export interface CommitSubcontractInput {
  orderId: string
  orderCode: string
  deliveryWindow: Record<string, unknown> | null
  shopSettings: unknown
  /** Chi nhánh bấm chốt (phải là chi nhánh đang giữ đơn). Bỏ trống = hệ thống chốt khi hết hạn. */
  branchId?: string | undefined
  now?: Date | undefined
}

export type CommitSubcontractOutcome = "COMMITTED" | "ALREADY_COMMITTED" | "NOT_DUE"

export async function commitSubcontractClaim(
  ctx: TenantContext,
  input: CommitSubcontractInput,
  deps: {
    repo?: Pick<SubcontractOrderRepository, "updateSubcontractState">
    branches?: Pick<ChainBranchRepository, "findByCode">
    notifier?: Pick<MultiChannelDispatchNotifier, "sendSubcontractInvite">
  } = {}
): Promise<CommitSubcontractOutcome> {
  const now = input.now ?? new Date()
  const repo = deps.repo ?? new SubcontractOrderRepository()
  let claimant: { id: string; name: string } | null = null
  const outcome = await repo.updateSubcontractState(ctx, input.orderId, (current) => {
    if (input.branchId) {
      if (!current || current.claimedBranchId !== input.branchId) throw unprocessable("Không thể chốt đơn khi bạn chưa tiếp nhận.")
      if (current.dispatchStatus === "COMMITTED") return { next: null, result: "ALREADY_COMMITTED" as const }
      if (current.dispatchStatus !== "CLAIMED_GRACE") throw conflict("Đơn hàng không ở trạng thái có thể chốt.")
    } else {
      // Hệ thống: chỉ khi vẫn đang trong grace của một chi nhánh và đã hết hạn huỷ nhận
      const expired = current?.dispatchStatus === "CLAIMED_GRACE" && current.claimedBranchId && current.graceExpiresAt
        && new Date(current.graceExpiresAt).getTime() <= now.getTime()
      if (!current || !expired) return { next: null, result: "NOT_DUE" as const }
    }
    claimant = { id: current.claimedBranchId!, name: current.claimedBranchName ?? current.claimedBranchId! }
    const committed = commitSubcontractOrder(current)
    return { next: { ...committed, remindersSent: { ...(committed.remindersSent ?? {}), M1_PREP: now.toISOString() } }, result: "COMMITTED" as const }
  })
  if (outcome !== "COMMITTED" || !claimant) return outcome

  await sendPrepMessage(ctx, input, claimant, deps)
  return outcome
}

/** Tin M1 "bắt đầu chế tác" cho chi nhánh vừa được chốt. */
async function sendPrepMessage(
  ctx: TenantContext,
  input: CommitSubcontractInput,
  branch: { id: string; name: string },
  deps: { branches?: Pick<ChainBranchRepository, "findByCode">; notifier?: Pick<MultiChannelDispatchNotifier, "sendSubcontractInvite"> }
): Promise<void> {
  const policy = parseChainDispatchPolicy(input.shopSettings as Record<string, unknown> | null | undefined)
  const window = input.deliveryWindow ?? {}
  const deliveryTime = typeof window.timeSlot === "string" && typeof window.date === "string" ? `${window.timeSlot} ngày ${window.date}` : "Giao trong ngày"
  const messageText = renderDispatchMessage(policy.messageTemplates.prepReminder, {
    orderCode: input.orderCode,
    branchName: branch.name,
    deliveryTime,
    claimUrl: subcontractBranchUrl({ baseUrl: publicAppUrl(), organizationId: ctx.organizationId, orderCode: input.orderCode, branchId: branch.id }),
  })
  const record = await (deps.branches ?? new ChainBranchRepository()).findByCode(ctx.organizationId, branch.id)
  await (deps.notifier ?? new MultiChannelDispatchNotifier()).sendSubcontractInvite(ctx, {
    branch: {
      branchId: branch.id,
      branchName: branch.name,
      qualityScore: 100,
      activeJobsCount: 0,
      maxConcurrentJobs: 10,
      isActive: true,
      channels: { telegramChatId: record?.channels?.telegramChatId },
    },
    orderCode: input.orderCode,
    messageText,
    claimUrl: "",
  })
}
