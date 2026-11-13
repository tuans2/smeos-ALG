import type { TenantContext } from "@/core/tenancy"

import type { SubcontractOrderState } from "../../domain/subcontract-order"
import type { ISubcontractStateStore } from "../dispatch-subcontract-order"

/**
 * `updateSubcontractState` giả cho test: đọc qua `loadSubcontractState` của chính mock, chạy hàm
 * sửa, ghi qua `saveSubcontractState` — để test vẫn kiểm được trạng thái cuối bằng spy `save`.
 */
export function lockedUpdate(getStore: () => Pick<ISubcontractStateStore, "loadSubcontractState" | "saveSubcontractState">) {
  return async <T>(
    ctx: TenantContext,
    orderId: string,
    change: (current: SubcontractOrderState | null) => { next: SubcontractOrderState | null; result: T }
  ): Promise<T> => {
    const store = getStore()
    const { next, result } = change(await store.loadSubcontractState(ctx, orderId))
    if (next) await store.saveSubcontractState(ctx, next)
    return result
  }
}
