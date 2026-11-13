/**
 * Cổng nhận đơn duy nhất cho mọi nguồn (trừ Thẻ chào) —
 * `docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §4.
 *
 * Mỗi nguồn (nhập tay, chat, kênh bán ngoài, catalog, landing…) là một adapter gọi `ingestOrder` với mã
 * nguồn của mình. Thẻ chào (`BROCHURE`) KHÔNG đi qua đây — luồng Thẻ chào được đóng băng (B1).
 *
 * `organization_id` chỉ lấy từ `ctx`. Đơn và việc đánh dấu lead đã thành đơn nằm cùng một giao dịch
 * (`OrderRepository.create`).
 */

import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { isOrderSourceCode, usesSharedIngestion } from "../domain/order-source"
import type { CreateOrderInput, IngestOrderInput, OrderRecord } from "../domain/order-types"
import { isActiveOrgMember } from "../infra/order-lead-link"
import { createOrder } from "./create-order"

export type { IngestOrderInput }

export interface IngestOrderDeps {
  create: (ctx: TenantContext, input: CreateOrderInput) => Promise<OrderRecord>
  isActiveMember: (organizationId: string, userId: string) => Promise<boolean>
}

function defaultDeps(): IngestOrderDeps {
  return { create: (ctx, input) => createOrder(ctx, input), isActiveMember: isActiveOrgMember }
}

export async function ingestOrder(
  ctx: TenantContext,
  input: IngestOrderInput,
  deps: IngestOrderDeps = defaultDeps(),
): Promise<OrderRecord> {
  if (!isOrderSourceCode(input.source) || !usesSharedIngestion(input.source)) {
    // Lỗi lập trình (adapter truyền sai mã) — không phải lỗi của khách.
    throw validationFailed({ source: "Nguồn đơn không hợp lệ cho cổng nhận đơn chung" })
  }
  if (input.ownerSaleId && !(await deps.isActiveMember(ctx.organizationId, input.ownerSaleId))) {
    throw validationFailed({ ownerSaleId: "Sale phụ trách phải là thành viên đang hoạt động của cửa hàng" })
  }
  return deps.create(ctx, input)
}
