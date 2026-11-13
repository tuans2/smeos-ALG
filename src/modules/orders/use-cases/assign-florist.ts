/**
 * Use-case: Assign Florist (Phân công thợ chế tác — M10, R4).
 */

import { brochureLockReason } from "../domain/order-rules"
import { inBranchScope } from "@/core/tenancy"
import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "../domain/order-types"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { FloristQueueRepository } from "../infra/florist-queue-repository"

export interface AssignFloristInput {
  assigneeId: string
  difficulty?: string | undefined // "co_ban" | "trung_binh" | "kho" | "vip"
}

export async function assignFlorist(
  ctx: TenantContext,
  orderId: string,
  input: AssignFloristInput,
  repo: IOrderRepository = getOrderRepository(),
  notify: typeof notifyOrganization = notifyOrganization,
  queue: Pick<FloristQueueRepository, "isActiveMember" | "releaseActive"> = new FloristQueueRepository()
): Promise<OrderRecord> {
  const existing = await repo.findById(ctx.organizationId, orderId)
  // Ngoài chi nhánh được giao → như không tồn tại (checklist ALG 9.13)
  if (!existing || !inBranchScope(ctx, existing.branchId)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }

  const brochureLock = brochureLockReason(existing)
  if (brochureLock) throw new AppError("CONFLICT", brochureLock)

  if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Không thể phân công thợ chế tác cho đơn đã kết thúc.")
  }

  // Người nhận việc phải là thành viên đang hoạt động của chính tổ chức (checklist ALG 4.13)
  if (!(await queue.isActiveMember(ctx, input.assigneeId))) {
    throw new AppError("UNPROCESSABLE_ENTITY", "Người nhận việc không phải thành viên đang hoạt động của tổ chức.")
  }

  // Giao lại cho thợ khác: phân công cũ hết hiệu lực, việc rời khỏi hàng đợi của thợ cũ
  await queue.releaseActive(ctx, orderId)
  await repo.createAssignment(
    ctx.organizationId,
    orderId,
    input.assigneeId,
    ctx.userId,
    input.difficulty ?? "trung_binh"
  )

  // Cập nhật trạng thái sản xuất sang ASSIGNED
  await repo.recordEvent(
    ctx.organizationId,
    orderId,
    "production",
    "ASSIGNED",
    ctx.userId,
    existing.productionStatus,
    `Phân công thợ chế tác (ID: ${input.assigneeId})`
  )

  const updated = await repo.update(ctx.organizationId, orderId, {
    productionStatus: "ASSIGNED",
  })
  void notify({
    organizationId: ctx.organizationId,
    eventKey: "FLORIST_TASK_ASSIGNED",
    ownerUserId: input.assigneeId,
    message: `Bạn được giao chế tác đơn ${existing.code}.`,
    deepLink: "/",
  })
  return updated
}
