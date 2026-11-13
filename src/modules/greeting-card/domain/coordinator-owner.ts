/** Hình dạng tối thiểu của đơn để xác định Điều phối phụ trách (`events` xếp mới nhất trước). */
export interface CoordinatorOwnerSource {
  coordination?: { coordinator_id: string | null } | null
  events: Array<{ axis: string; actor_id: string | null }>
  qc_records?: Array<{ inspector_id?: string | null }>
  assignments: Array<{ assigned_by?: string | null }>
}

/**
 * Điều phối phụ trách — MỘT quy tắc cho mọi màn (Theo dõi, Sale, Điều phối):
 * người được phân công → người thao tác sản xuất/giao gần nhất → người duyệt QC → người giao việc cho thợ.
 * Pure TypeScript.
 */
export function resolveCoordinatorId(order: CoordinatorOwnerSource): string | null {
  return (
    order.coordination?.coordinator_id ||
    order.events.find((e) => (e.axis === "production" || e.axis === "delivery") && e.actor_id)?.actor_id ||
    order.qc_records?.[0]?.inspector_id ||
    order.assignments[0]?.assigned_by ||
    null
  )
}
