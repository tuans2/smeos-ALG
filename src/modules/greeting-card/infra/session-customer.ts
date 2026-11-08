import type { Prisma } from "@/generated/prisma/client"
import { phoneEquals } from "@/core/security/pii-lookup"
import { isUniqueViolation } from "@/modules/coordinator/infra/transaction"
import { randomCode } from "../domain/greeting-card-rules"

/** Client hoặc giao dịch — chỉ cần bảng `customers`. */
type CustomersDb = Pick<Prisma.TransactionClient, "customers">

/** Tên hồ sơ PROSPECT khi link chỉ có SĐT (trùng chuỗi trong migration `customer_prospects`). */
export const PROSPECT_PLACEHOLDER_NAME = "Khách chưa rõ tên"

const CODE_ATTEMPTS = 3

/**
 * ADR-014 D-P2 (P-2): hồ sơ khách của SĐT trên link Thẻ chào, trong đúng tổ chức của link. Đã có (mọi trạng thái) → dùng
 * lại, không đổi trạng thái; chưa có → tạo khách PROSPECT (không hiện ở danh sách khách). Không SĐT → `null`.
 */
export async function ensureProspectCustomer(
  db: CustomersDb,
  organizationId: string,
  phone: string | null | undefined,
  name: string | null | undefined,
): Promise<string | null> {
  if (!phone) return null
  const where = { organization_id: organizationId, phone }
  const lookup = { organization_id: organizationId, AND: [phoneEquals(organizationId, phone)] } // P-5b
  const existing = await db.customers.findFirst({ where: lookup, select: { id: true } })
  if (existing) return existing.id
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    try {
      const created = await db.customers.create({
        data: { ...where, code: `KH-${randomCode(8)}`, name: name?.trim() || PROSPECT_PLACEHOLDER_NAME, status: "PROSPECT" },
        select: { id: true },
      })
      return created.id
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const raced = await db.customers.findFirst({ where: lookup, select: { id: true } })
      if (raced) return raced.id
    }
  }
  return null // trùng mã cả ba lần: link vẫn còn tên/SĐT riêng (giai đoạn ghi kép)
}

/** Dữ liệu tạo phiên kèm `customer_id` theo SĐT trên link (nếu có). */
export async function withSessionCustomer<T extends Prisma.greeting_sessionsUncheckedCreateInput>(db: CustomersDb, data: T): Promise<T> {
  const customerId = await ensureProspectCustomer(db, data.organization_id, data.customer_phone, data.customer_name)
  return customerId ? { ...data, customer_id: customerId } : data
}

/** Đặt đơn hoặc để lại lead: khách PROSPECT thành khách thường, lấy tên (và địa chỉ, nếu có) vừa nhập. */
export async function activateProspect(db: CustomersDb, customerId: string, data: { name: string; address?: string | null | undefined }) {
  await db.customers.updateMany({
    where: { id: customerId, status: "PROSPECT" },
    data: { status: "ACTIVE", name: data.name, ...(data.address ? { address: data.address } : {}) },
  })
}
