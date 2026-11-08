import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { ensureProspectCustomer } from "./session-customer"

/** Tên / SĐT khách ghi trên link chưa có đơn — để Sale biết link đã gửi cho ai. */
export class LinkCustomerRepository {
  constructor(private readonly db = prisma) {}

  /** Link của tổ chức (và của đúng sale khi bị giới hạn "chỉ khách của mình"); `null` = không thấy. */
  async find(ctx: TenantContext, sessionId: string, saleScope: string | null) {
    return this.db.greeting_sessions.findFirst({
      where: scopedWhere(ctx, { id: sessionId, ...(saleScope ? { sale_id: saleScope } : {}) }),
      select: { id: true, order_id: true, customer_name: true, customer_phone: true },
    })
  }

  /** Chỉ ghi khi link chưa thành đơn (đơn có thông tin khách riêng); trả `false` nếu vừa thành đơn. */
  async update(ctx: TenantContext, sessionId: string, data: { customerName: string | null; customerPhone: string | null }) {
    const res = await this.db.greeting_sessions.updateMany({
      where: scopedWhere(ctx, { id: sessionId, order_id: null }),
      data: {
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        // P-2: hồ sơ khách theo SĐT trên link (khách cũ hoặc PROSPECT); bỏ SĐT thì gỡ liên kết
        customer_id: await ensureProspectCustomer(this.db, ctx.organizationId, data.customerPhone, data.customerName),
      },
    })
    return res.count > 0
  }
}

let _linkCustomerRepositorySingleton: LinkCustomerRepository | null = null
export function getLinkCustomerRepository(): LinkCustomerRepository {
  if (!_linkCustomerRepositorySingleton) _linkCustomerRepositorySingleton = new LinkCustomerRepository()
  return _linkCustomerRepositorySingleton
}
