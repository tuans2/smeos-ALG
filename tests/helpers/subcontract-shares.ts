import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

/**
 * Test dựng phiên điều phối gia công bằng cách ghi thẳng `order_coordinations.metadata` → cấp quyền xem đơn
 * (`shared_order_access`, ADR-014 P-4) theo phiên đó, như luồng thật làm trong `updateSubcontractState`.
 */
export async function syncSubcontractShares(organizationId: string, orderId: string): Promise<void> {
  await new SubcontractOrderRepository().syncSharesFromState(
    { organizationId, workspaceId: organizationId, userId: "test", branchId: null, capabilities: new Set() },
    orderId,
  )
}
