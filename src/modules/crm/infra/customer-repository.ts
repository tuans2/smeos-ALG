import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerMasterIndex, CustomerTier } from "../domain/customer-master-index"
import { deriveCustomerTier } from "../domain/crm-rules"
import { branchForNewCustomer, customerBranchWhere } from "./customer-branch-scope"
import type {
  ICustomerRepository,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "../domain/repositories/customer-repository.interface"
import { phoneEquals, phoneSearch } from "@/core/security/pii-lookup"

export type { CreateCustomerInput, UpdateCustomerInput }

/** Hàng `customers` kèm các quan hệ mà truy vấn nào `include` thì có. */
type CustomerRow = {
  id: string
  organization_id: string
  code: string
  name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  tags: string[]
  preferred_flowers: string[]
  preferred_colors: string[]
  tier: string
  total_spent: unknown
  order_count: unknown
  last_order_at: Date | null
  updated_at: Date
  occasions?: Array<{
    id: string; name: string; date: string; is_recurring: boolean
    reminder_days_before: number; recipient_name: string | null; notes: string | null
  }>
  consents?: Array<{
    channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION"
    granted: boolean; granted_at: Date; revoked_at: Date | null
  }>
  vouchers?: Array<{
    code: string; discount_type: "PERCENTAGE" | "FIXED_AMOUNT"
    discount_value: unknown; expires_at: Date | null; min_order_vnd: unknown; max_discount_vnd: unknown
  }>
}

export class CustomerRepository implements ICustomerRepository {
  async create(ctx: TenantContext, input: CreateCustomerInput): Promise<CustomerMasterIndex> {
    const fields = {
      branch_id: branchForNewCustomer(ctx), // D-58: chi nhánh của người tạo
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      preferred_flowers: input.preferredFlowers ?? [],
      preferred_colors: input.preferredColors ?? [],
    }
    const include = {
      occasions: true,
      consents: true,
      // MI-2 (ĐP-1.6, 26/09/2026): "khả dụng" = chưa dùng VÀ chưa hết hạn — trước bản này chỉ lọc is_used, voucher hết hạn vẫn hiện ra được.
      vouchers: { where: { is_used: false, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } },
    }
    // P-2 (ADR-014 D-P2): SĐT đã có hồ sơ khách tiềm năng (link Thẻ chào) → nâng thành khách thường, giữ một hồ sơ
    const prospect = await prisma.customers.findFirst({
      where: { organization_id: ctx.organizationId, status: "PROSPECT", AND: [phoneEquals(ctx.organizationId, input.phone)] }, // P-5b
      select: { id: true },
    })
    if (prospect) {
      return this.mapToMasterIndex(await prisma.customers.update({ where: { id: prospect.id }, data: { ...fields, status: "ACTIVE" }, include }))
    }

    const count = await prisma.customers.count({ where: { organization_id: ctx.organizationId } })
    const code = `KH-${String(count + 1).padStart(4, "0")}`
    const row = await prisma.customers.create({
      data: { ...fields, organization_id: ctx.organizationId, code, tier: "NEW", total_spent: 0, order_count: 0 },
      include,
    })
    return this.mapToMasterIndex(row)
  }

  async getById(ctx: TenantContext, id: string): Promise<CustomerMasterIndex | null> {
    const row = await prisma.customers.findFirst({
      where: { id, organization_id: ctx.organizationId, status: "ACTIVE", ...(await customerBranchWhere(ctx)) },
      include: {
        occasions: true,
        consents: true,
        vouchers: { where: { is_used: false, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } },
      },
    })

    if (!row) return null
    return this.mapToMasterIndex(row)
  }

  async findByPhone(ctx: TenantContext, phone: string): Promise<CustomerMasterIndex | null> {
    const row = await prisma.customers.findFirst({
      where: { organization_id: ctx.organizationId, status: "ACTIVE", AND: [phoneEquals(ctx.organizationId, phone)] }, // P-5b
      include: {
        occasions: true,
        consents: true,
        vouchers: { where: { is_used: false, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } },
      },
    })

    if (!row) return null
    return this.mapToMasterIndex(row)
  }

  async update(ctx: TenantContext, id: string, input: UpdateCustomerInput): Promise<CustomerMasterIndex | null> {
    const existing = await prisma.customers.findFirst({
      where: { id, organization_id: ctx.organizationId, status: "ACTIVE", ...(await customerBranchWhere(ctx)) },
    })
    if (!existing) return null

    const updated = await prisma.customers.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email ?? null } : {}),
        ...(input.address !== undefined ? { address: input.address ?? null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.preferredFlowers !== undefined ? { preferred_flowers: input.preferredFlowers } : {}),
        ...(input.preferredColors !== undefined ? { preferred_colors: input.preferredColors } : {}),
      },
      include: {
        occasions: true,
        consents: true,
        vouchers: { where: { is_used: false, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } },
      },
    })

    return this.mapToMasterIndex(updated)
  }

  async delete(ctx: TenantContext, id: string): Promise<boolean> {
    const existing = await prisma.customers.findFirst({
      where: { id, organization_id: ctx.organizationId, status: "ACTIVE", ...(await customerBranchWhere(ctx)) },
    })
    if (!existing) return false

    // Khoá ghép đơn ↔ khách là NO ACTION (SetNull trên khoá ghép sẽ xoá cả organization_id) — gỡ khách khỏi đơn
    // trong cùng giao dịch, giữ đúng hành vi cũ: đơn còn, chỉ mất liên kết khách (audit BL-13)
    await prisma.$transaction([
      prisma.orders.updateMany({ where: { customer_id: id, organization_id: ctx.organizationId }, data: { customer_id: null } }),
      prisma.customers.delete({ where: { id } }),
    ])
    return true
  }

  async list(
    ctx: TenantContext,
    filters?: { tier?: CustomerTier | undefined; search?: string | undefined },
    pagination?: { limit?: number | undefined; offset?: number | undefined }
  ): Promise<{ items: CustomerMasterIndex[]; total: number }> {
    const where: Prisma.customersWhereInput = {
      organization_id: ctx.organizationId,
      status: "ACTIVE", // P-2: khách tiềm năng (link Thẻ chào chưa đặt) không hiện ở danh sách
      AND: [await customerBranchWhere(ctx)], // phạm vi chi nhánh (T-5) — AND để không đè OR của ô tìm
      ...(filters?.tier ? { tier: filters.tier } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              ...[phoneSearch(ctx.organizationId, filters.search)].filter((w) => w !== null), // P-5b: 4 số cuối / đủ số (D-49)
              { code: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.customers.findMany({
        where,
        include: {
          occasions: true,
          consents: true,
          vouchers: { where: { is_used: false, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] } },
        },
        orderBy: { updated_at: "desc" },
        take: pagination?.limit ?? 50,
        skip: pagination?.offset ?? 0,
      }),
      prisma.customers.count({ where }),
    ])

    return {
      items: rows.map((r) => this.mapToMasterIndex(r)),
      total,
    }
  }

  async addOccasion(
    ctx: TenantContext,
    customerId: string,
    data: {
      name: string
      date: string
      isRecurring?: boolean | undefined
      reminderDaysBefore?: number | undefined
      recipientName?: string | undefined
      notes?: string | undefined
    }
  ) {
    return prisma.customer_occasions.create({
      data: {
        organization_id: ctx.organizationId,
        customer_id: customerId,
        name: data.name,
        date: data.date,
        is_recurring: data.isRecurring ?? true,
        reminder_days_before: data.reminderDaysBefore ?? 7,
        recipient_name: data.recipientName ?? null,
        notes: data.notes ?? null,
      },
    })
  }

  async updateConsent(
    ctx: TenantContext,
    customerId: string,
    channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION",
    granted: boolean
  ) {
    return prisma.customer_consents.upsert({
      where: {
        customer_id_channel: {
          customer_id: customerId,
          channel,
        },
      },
      create: {
        organization_id: ctx.organizationId,
        customer_id: customerId,
        channel,
        granted,
        granted_at: new Date(),
      },
      update: {
        granted,
        ...(granted ? { granted_at: new Date(), revoked_at: null } : { revoked_at: new Date() }),
      },
    })
  }

  /**
   * Đồng bộ tự động chi tiêu và số đơn từ bảng `orders` của M10
   */
  async syncMetricsFromOrders(ctx: TenantContext, customerId: string): Promise<void> {
    const orders = await prisma.orders.findMany({
      where: {
        organization_id: ctx.organizationId,
        customer_id: customerId,
        status: { in: ["CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED"] },
      },
      select: { total_vnd: true, created_at: true },
      orderBy: { created_at: "desc" },
    })

    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_vnd), 0)
    const orderCount = orders.length
    const lastOrderAt = orders[0]?.created_at ?? null
    const tier = deriveCustomerTier(totalSpent, orderCount)

    await prisma.customers.update({
      where: { id: customerId },
      data: {
        total_spent: totalSpent,
        order_count: orderCount,
        last_order_at: lastOrderAt,
        tier,
      },
    })
  }

  private mapToMasterIndex(row: CustomerRow): CustomerMasterIndex {
    const totalSpentVnd = Number(row.total_spent)
    const orderCount = Number(row.order_count)
    const aovVnd = orderCount > 0 ? Math.round(totalSpentVnd / orderCount) : 0

    return {
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      name: row.name,
      phone: row.phone,
      // MI-3 (ĐP-2.1, 26/09/2026): phiên bản Master Index cho snapshot của Điều phối.
      updatedAt: row.updated_at.toISOString(),
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      notes: row.notes ?? undefined,
      tags: row.tags ?? [],
      metrics: {
        tier: row.tier as CustomerTier,
        totalSpentVnd,
        orderCount,
        lastOrderAt: row.last_order_at ? row.last_order_at.toISOString() : undefined,
        aovVnd,
      },
      preferences: {
        preferredFlowers: row.preferred_flowers ?? [],
        preferredColors: row.preferred_colors ?? [],
      },
      occasions: (row.occasions ?? []).map((o) => ({
        id: o.id,
        name: o.name,
        date: o.date,
        isRecurring: o.is_recurring,
        reminderDaysBefore: o.reminder_days_before,
        recipientName: o.recipient_name ?? undefined,
        notes: o.notes ?? undefined,
      })),
      consents: (row.consents ?? []).map((c) => ({
        channel: c.channel,
        granted: c.granted,
        grantedAt: c.granted_at.toISOString(),
        revokedAt: c.revoked_at ? c.revoked_at.toISOString() : undefined,
      })),
      availableVouchers: (row.vouchers ?? []).map((v) => ({
        code: v.code,
        discountType: v.discount_type,
        discountValue: Number(v.discount_value),
        expiresAt: v.expires_at ? v.expires_at.toISOString() : undefined,
        minOrderVnd: Number(v.min_order_vnd),
        maxDiscountVnd: v.max_discount_vnd != null ? Number(v.max_discount_vnd) : undefined,
      })),
    }
  }
}

let defaultCustomerRepository: ICustomerRepository | null = null

export function getCustomerRepository(): ICustomerRepository {
  if (!defaultCustomerRepository) {
    defaultCustomerRepository = new CustomerRepository()
  }
  return defaultCustomerRepository!
}
