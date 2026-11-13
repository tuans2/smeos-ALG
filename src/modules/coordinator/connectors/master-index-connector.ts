/**
 * Master Index Connector.
 * Cổng kết nối và nạp Product Master Index & Customer Master Index SSOT.
 *
 * ĐP-2.5 (26/09/2026): thi công thật — trước bản này cả hai phương thức luôn
 * trả `null`, khiến "cổng Master Index của Điều phối" chỉ tồn tại trên giấy
 * (Hợp đồng MI §11, tiêu chí #9). Không còn lời gọi nào khác dùng connector
 * này (đã rà `src/`), nên đổi luôn chữ ký sang nhận `TenantContext` thay vì
 * `organizationId` rời — đúng cách mọi kho dữ liệu khác trong Điều phối nhận
 * ngữ cảnh (không tự chọn tổ chức, xem `core/tenancy/tenant-context.ts`).
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ProductMasterIndex } from "@/modules/products/domain/product-master-index"
import { ProductMasterIndexRepository } from "@/modules/products/infra/product-master-index-repository"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"
import { CustomerRepository } from "@/modules/crm/infra/customer-repository"

export interface IMasterIndexConnector {
  getProductMasterIndex(ctx: TenantContext, productId: string): Promise<ProductMasterIndex | null>
  getCustomerMasterIndex(ctx: TenantContext, customerId: string): Promise<CustomerMasterIndex | null>
}

export class DirectMasterIndexConnector implements IMasterIndexConnector {
  private readonly products = new ProductMasterIndexRepository()
  private readonly customers = new CustomerRepository()

  getProductMasterIndex(ctx: TenantContext, productId: string): Promise<ProductMasterIndex | null> {
    return this.products.getById(ctx, productId)
  }

  getCustomerMasterIndex(ctx: TenantContext, customerId: string): Promise<CustomerMasterIndex | null> {
    return this.customers.getById(ctx, customerId)
  }
}
