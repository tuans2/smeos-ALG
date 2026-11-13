/**
 * Use-case Trung tâm sự cố (F13, R3). Mở sự cố đưa đơn về EXCEPTION và nhớ
 * bước cũ (`resume_stage`); xử lý xong sự cố CUỐI CÙNG thì đơn tự quay về
 * đúng bước đó — không có đường tắt nhảy sang bước khác.
 */

import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import {
  checkOpenException,
  defaultNextAction,
  exceptionCode,
  type ExceptionSeverity,
  type ExceptionType,
} from "../domain/operation-rules"
import { axesAfterTransition } from "../domain/stage-transitions"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, concurrentUpdate, ensureRule, getOrderView, loadEditableOrderOrThrow, runCoordinatorTx } from "./shared"

export async function openCoordinatorException(
  ctx: TenantContext,
  orderIdOrCode: string,
  input: { type: ExceptionType; severity: ExceptionSeverity; description: string }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const from = row.coordination!.stage
    ensureRule(checkOpenException(from))

    const seq = (await repo.countExceptions(ctx, row.id)) + 1
    const exception = await repo.createException(ctx, {
      orderId: row.id,
      code: exceptionCode(row.code, seq),
      type: input.type,
      severity: input.severity,
      description: input.description.trim(),
    })
    if (from !== "EXCEPTION") {
      const moved = await repo.applyTransition(ctx, row, {
        from,
        to: "EXCEPTION",
        axes: axesAfterTransition("EXCEPTION", {
          status: row.status,
          productionStatus: row.production_status,
          deliveryStatus: row.delivery_status,
        }),
        nextAction: `Xử lý sự cố: ${input.description.trim()}`,
        reason: `Sự cố ${input.type}`,
        coordination: { resume_stage: from },
      })
      if (!moved) throw concurrentUpdate()
    }
    await audit(ctx, tx, "coordinator.exception.open", row.id, { stage: from }, { exception: exception.code, type: input.type })
    return row.id
  })
  return getOrderView(ctx, orderId)
}

export async function resolveCoordinatorException(
  ctx: TenantContext,
  exceptionId: string,
  input: { resolution: string }
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const exception = await repo.findException(ctx, exceptionId)
    if (!exception) throw notFound()
    if (exception.status === "RESOLVED" || exception.status === "CANCELLED") {
      throw new AppError("CONFLICT", `Sự cố ${exception.code} đã đóng.`)
    }
    await repo.resolveException(ctx, exception.id, input.resolution.trim())

    const row = await loadEditableOrderOrThrow(ctx, repo, exception.order_id)
    const c = row.coordination!
    const stillOpen = await repo.countOpenExceptions(ctx, row.id)
    if (c.stage === "EXCEPTION" && stillOpen === 0) {
      const back = c.resume_stage ?? "PLANNING"
      const moved = await repo.applyTransition(ctx, row, {
        from: "EXCEPTION",
        to: back,
        axes: axesAfterTransition(back, {
          status: row.status,
          productionStatus: row.production_status,
          deliveryStatus: row.delivery_status,
        }),
        nextAction: defaultNextAction(back),
        reason: `Đã xử lý sự cố ${exception.code}`,
        coordination: { resume_stage: null },
      })
      if (!moved) throw concurrentUpdate()
    }
    await audit(ctx, tx, "coordinator.exception.resolve", row.id, { exception: exception.code, status: exception.status }, {
      status: "RESOLVED",
      resolution: input.resolution.trim(),
    })
    return row.id
  })
  return getOrderView(ctx, orderId)
}
