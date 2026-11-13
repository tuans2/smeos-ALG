/**
 * Use-case: sửa giá trị trường TỰ TẠO của một đơn đã tồn tại (ĐP-3.16,
 * 26/09/2026). `create-coordinator-order.ts` chỉ ghi được lúc TẠO đơn —
 * trước đợt này không có đường nào sửa `custom_fields` sau đó. Trộn vào
 * giá trị hiện có (`mergeCustomFields`) chứ không thay nguyên khối, để giá
 * trị của trường đã bị TẮT (không còn ACTIVE) không mất (§16.3).
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { applyCustomFields, mergeCustomFields } from "@/modules/field-platform/use-cases/apply-custom-fields"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { audit, getOrderView, loadOrderOrThrow, runCoordinatorTx } from "./shared"

export async function updateCoordinatorCustomFields(
  ctx: TenantContext,
  orderIdOrCode: string,
  values: Record<string, unknown>
): Promise<CoordinatorOrderView> {
  const orderId = await runCoordinatorTx(async (tx) => {
    const repo = getCoordinatorRepository(tx)
    const row = await loadOrderOrThrow(ctx, repo, orderIdOrCode)
    const before = (row.coordination!.custom_fields as Record<string, unknown> | null) ?? {}

    const validated = await applyCustomFields(ctx, "ORDER", values)
    const merged = mergeCustomFields(before, validated)

    await repo.updateCustomFields(ctx, row.id, merged)
    await audit(ctx, tx, "coordinator.order.custom_fields.update", row.id, before, merged)
    return row.id
  })
  return getOrderView(ctx, orderId)
}
