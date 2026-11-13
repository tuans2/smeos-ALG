/**
 * Use-case: chuyển bước điều phối (R3). Máy chủ quyết định bước nào hợp lệ
 * (`checkStageTransition`) từ bằng chứng trong CSDL — không tin client.
 */

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { findMissingRequiredFields } from "@/modules/field-platform/domain/stage-transitions"
import { loadEffectiveFieldConfigs } from "@/modules/field-platform/use-cases/get-effective-field-config"
import type { CoordinatorStage } from "../domain/coordinator-types"
import { defaultNextAction } from "../domain/operation-rules"
import { axesAfterTransition } from "../domain/stage-transitions"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import {
  audit,
  buildOrderFieldValueLookup,
  concurrentUpdate,
  ensureTransition,
  getOrderView,
  loadEditableOrderOrThrow,
  runCoordinatorTx,
} from "./shared"

export async function updateCoordinatorStage(
  ctx: TenantContext,
  orderIdOrCode: string,
  nextStage: CoordinatorStage,
  nextAction?: string | undefined
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadEditableOrderOrThrow(ctx, repo, orderIdOrCode)
    const from = row.coordination!.stage
    ensureTransition(from, nextStage, await repo.facts(ctx, row))

    // ĐP-3.16 (26/09/2026) — §6.2 mục 3.10: không cho RỜI `from` nếu còn
    // trường (lõi hoặc tự tạo) có `requiredAtStage = from` mà vẫn trống.
    // CANCELLED/EXCEPTION không đi qua hàm này (chặn ở `checkStageTransition`,
    // dùng route riêng) nên không cần loại trừ ở đây.
    const fieldConfigs = await loadEffectiveFieldConfigs(ctx, "ORDER")
    const missingFields = findMissingRequiredFields(fieldConfigs, from, buildOrderFieldValueLookup(row))
    if (missingFields.length > 0) {
      throw new AppError(
        "UNPROCESSABLE_ENTITY",
        `Thiếu trường bắt buộc để rời bước ${from}: ${missingFields.map((m) => m.label).join(", ")}`,
        { stage: from, missingFields }
      )
    }

    const moved = await repo.applyTransition(ctx, row, {
      from,
      to: nextStage,
      axes: axesAfterTransition(nextStage, {
        status: row.status,
        productionStatus: row.production_status,
        deliveryStatus: row.delivery_status,
      }),
      nextAction: nextAction?.trim() || defaultNextAction(nextStage),
      reason: `Điều phối chuyển bước ${from} → ${nextStage}`,
      coordination: from === "EXCEPTION" ? { resume_stage: null } : {},
    })
    if (!moved) throw concurrentUpdate()
    await audit(ctx, tx, "coordinator.stage.update", row.id, { stage: from }, { stage: nextStage })
    return row.id
  })
  return getOrderView(ctx, orderId)
}
