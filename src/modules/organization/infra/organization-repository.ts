import type { InputJsonValue, organization_type, organizations } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type {
  CreateOrganizationInput,
  IOrganizationRepository,
  OrganizationEntity,
  OrganizationType,
  UpdateOrganizationInput,
} from "../domain/repositories/organization-repository.interface"

import type { DbClient } from "./db-client"
import { claimLowBalanceAlert, consumeMonthlyCredit, countMonthlyCreditUnchecked, lastTopupAmount, releaseMonthlyCredit } from "@/modules/usage/infra/usage-limit-repository"
import { overdraftFloor } from "@/modules/usage/domain/message-overdraft"
import { lowBalanceThreshold } from "@/modules/usage/domain/monthly-limit"
import type { PrismaClient } from "@/generated/prisma/client"
import { appendCreditEntry, type CreditEntryKind, type CreditEntryMeta } from "./credit-ledger"
import { withIndustryKey } from "../domain/industry-key"
import { organizationSettingsData as settingsData } from "./organization-industry" // ADR-012 T-6c-1: ngành ghi vào cột

function mapOrganization(row: organizations): OrganizationEntity {
  const org = withIndustryKey(row) // ADR-012 T-6b: settings.industry lấy từ cột industry_key
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type as OrganizationType,
    credit_balance: org.credit_balance,
    credit_plan: org.credit_plan ?? null,
    data_region: org.data_region ?? null,
    settings: (org.settings as Record<string, unknown> | null) ?? null,
    created_at: org.created_at,
    updated_at: org.updated_at,
  }
}

/**
 * `organizations` là chính tenant, nên khoá lọc của nó là cột `id` chứ không
 * phải `organization_id`. Bộ gác vẫn ở đây, không ở route: phương thức đọc
 * nhận `TenantContext` bắt buộc và không nhận id từ đâu khác.
 */
export class OrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /** Tổ chức đang hoạt động của phiên. Không có đường nào đọc tổ chức khác. */
  async current(ctx: TenantContext): Promise<OrganizationEntity | null> {
    const row = await this.db.organizations.findUnique({ where: { id: ctx.organizationId } })
    return row ? mapOrganization(row) : null
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const row = await this.db.organizations.findUnique({ where: { slug } })
    return row ? mapOrganization(row) : null
  }

  /**
   * Đọc tổ chức theo ID — dành cho người vận hành nền tảng (Platform Operator).
   */
  async findById(organizationId: string): Promise<OrganizationEntity | null> {
    const row = await this.db.organizations.findUnique({ where: { id: organizationId } })
    return row ? mapOrganization(row) : null
  }

  /**
   * Sửa hồ sơ tổ chức hiện tại — nguồn của `PATCH /organizations/current`
   * (`F2`). Lọc theo `ctx.organizationId`, không theo id truyền vào — không
   * đường nào sửa được tổ chức khác dù có đoán đúng id.
   */
  async update(
    ctx: TenantContext,
    input: UpdateOrganizationInput
  ): Promise<OrganizationEntity | null> {
    const data: { name?: string; settings?: InputJsonValue; industry_key?: string | null } = {}
    if (input.name !== undefined) data.name = input.name
    if (input.settings !== undefined) Object.assign(data, settingsData(input.settings as Record<string, unknown>))

    const result = await this.db.organizations.updateMany({
      where: { id: ctx.organizationId },
      data,
    })
    if (result.count === 0) return null
    return this.current(ctx)
  }

  /** Chỉ dùng lúc đăng ký, khi chưa có ngữ cảnh nào để gác. */
  async create(input: CreateOrganizationInput): Promise<OrganizationEntity> {
    const data: {
      name: string
      slug: string
      type: organization_type
      credit_balance: number
      settings?: InputJsonValue
      industry_key?: string | null
    } = {
      name: input.name,
      slug: input.slug,
      type: input.type as organization_type,
      credit_balance: input.credit_balance,
    }
    if (input.settings !== undefined) Object.assign(data, settingsData(input.settings as Record<string, unknown>))
    const row = await this.db.organizations.create({ data })
    // Credit khởi tạo (dùng thử) vào sổ cái như một khoản tặng (checklist ALG 10.6)
    if (row.credit_balance > 0) await appendCreditEntry(this.db, row.id, "GIFT", row.credit_balance, { reason: "Credit khởi tạo khi mở tài khoản" })
    return mapOrganization(row)
  }

  /**
   * Trừ credit có điều kiện — dùng trong giao dịch `enqueue-job` (đặc tả 05
   * mục 6, `YC-U3`). `updateMany` với `credit_balance: { gte: cost }` ngay
   * trong `where` là chốt chặn đua: hai job cùng lúc chỉ một cái trừ được
   * nếu số dư không đủ cho cả hai — không cần `SELECT … FOR UPDATE` riêng.
   * Trả `false` nghĩa là không đủ credit; use-case dịch thành
   * `QUOTA_EXCEEDED` (422) và toàn bộ giao dịch cha rollback, nên job không
   * bao giờ được tạo khi hạn mức chặn (`YC-U3`).
   */
  async tryDeductCredit(ctx: TenantContext, cost: number, meta: CreditEntryMeta = {}): Promise<boolean> {
    return this.tryDeductCreditFor(ctx.organizationId, cost, { actorId: ctx.userId, ...meta })
  }

  /** Như `tryDeductCredit` cho đường không có phiên người dùng (khách chat qua kênh). */
  async tryDeductCreditFor(organizationId: string, cost: number, meta: CreditEntryMeta = {}): Promise<boolean> {
    if (cost <= 0) return true
    // Trừ số dư, ghi sổ cái, tính hạn mức tháng (10.3/9.7) và cờ cảnh báo (10.5) trong MỘT giao dịch:
    // chạm hạn mức → QUOTA_EXCEEDED, số dư không bị trừ.
    const run = async (db: DbClient) => {
      const result = await db.organizations.updateMany({
        where: { id: organizationId, credit_balance: { gte: cost } },
        data: { credit_balance: { decrement: cost } },
      })
      if (result.count === 0) return null
      const balance = await appendCreditEntry(db, organizationId, "USAGE", -cost, meta)
      const consumed = await consumeMonthlyCredit(db, organizationId, cost, meta.service)
      const threshold = lowBalanceThreshold(await lastTopupAmount(db, organizationId), consumed.creditLimit)
      const low = threshold !== null && balance < threshold && (await claimLowBalanceAlert(db, organizationId)) ? balance : null
      return { near: consumed.near, lowBalance: low }
    }
    const alerts = "$transaction" in this.db ? await (this.db as PrismaClient).$transaction(run) : await run(this.db)
    if (!alerts) return false
    const { queueCreditAlerts } = await import("@/modules/usage/use-cases/credit-alerts")
    queueCreditAlerts(organizationId, alerts)
    return true
  }



  /**
   * Tin nhắn gửi khách khi đường trừ thường không qua được (hết credit hoặc chạm hạn mức tháng): trừ nếu số dư
   * sau khi trừ không thấp hơn `-overdraft` (PO 05/11/2026). Ghi sổ cái và mức dùng kỳ như lần trừ thường.
   * Trả số dư sau khi trừ, hoặc `null` khi đã hết mức thấu chi (tin không gửi).
   */
  async tryOverdraftCreditFor(organizationId: string, cost: number, overdraft: number, meta: CreditEntryMeta = {}): Promise<number | null> {
    if (cost <= 0) return null
    const run = async (db: DbClient) => {
      const result = await db.organizations.updateMany({
        where: { id: organizationId, credit_balance: { gte: cost + overdraftFloor(overdraft) } },
        data: { credit_balance: { decrement: cost } },
      })
      if (result.count === 0) return null
      const balance = await appendCreditEntry(db, organizationId, "USAGE", -cost, { ...meta, reason: `${meta.reason ?? "Tin nhắn"} (thấu chi)` })
      await countMonthlyCreditUnchecked(db, organizationId, cost)
      return balance
    }
    return "$transaction" in this.db ? (this.db as PrismaClient).$transaction(run) : run(this.db)
  }

  /**
   * Nạp credit cho một tổ chức — thao tác của NGƯỜI VẬN HÀNH NỀN TẢNG, không
   * của người dùng trong tổ chức. Vì thế nhận thẳng `organizationId` chứ
   * không nhận `TenantContext`: người chạy nó đứng ngoài mọi tổ chức, giống
   * `create()` ngay trên.
   *
   * Không có endpoint HTTP nào gọi hàm này (chốt với anh Tony 09/10): đường
   * duy nhất là `scripts/nap-credit.ts`, chạy tay trên máy có quyền truy cập
   * cơ sở dữ liệu. Mở nó thành endpoint đòi một khái niệm "quản trị nền
   * tảng" mà bộ 114 mã năng lực chưa có.
   *
   * Trả số dư mới, hoặc `null` nếu không có tổ chức nào mang `id` đó.
   */
  async topUpCredit(
    organizationId: string,
    amount: number,
    kind: Extract<CreditEntryKind, "TOPUP" | "GIFT" | "REFUND"> = "TOPUP",
    meta: CreditEntryMeta = {},
  ): Promise<number | null> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RangeError("Số credit nạp phải là số nguyên dương")
    }
    const result = await this.db.organizations.updateMany({
      where: { id: organizationId },
      data: { credit_balance: { increment: amount } },
    })
    if (result.count === 0) return null
    return appendCreditEntry(this.db, organizationId, kind, amount, meta)
  }


  /** Hoàn credit — job bị Identity Guard từ chối, quyết định D3. */
  async refundCredit(ctx: TenantContext, amount: number, meta: CreditEntryMeta = {}): Promise<void> {
    return this.refundCreditFor(ctx.organizationId, amount, meta)
  }

  /** Thu hồi credit tặng theo gói hết hạn cuối tháng (PO Q10) — không tính vào hạn mức dùng. */
  async expireCredit(organizationId: string, amount: number, meta: CreditEntryMeta = {}): Promise<number> {
    if (amount <= 0) return 0
    const result = await this.db.organizations.updateMany({
      where: { id: organizationId, credit_balance: { gte: amount } },
      data: { credit_balance: { decrement: amount } },
    })
    if (result.count === 0) return 0
    await appendCreditEntry(this.db, organizationId, "EXPIRE", -amount, meta)
    return amount
  }

  /** Hoàn credit cho đường không có phiên (tin nhắn gửi lỗi sau khi đã trừ). */
  async refundCreditFor(organizationId: string, amount: number, meta: CreditEntryMeta = {}): Promise<void> {
    if (amount <= 0) return
    const result = await this.db.organizations.updateMany({
      where: { id: organizationId },
      data: { credit_balance: { increment: amount } },
    })
    if (result.count === 0) return
    await appendCreditEntry(this.db, organizationId, "REFUND", amount, meta)
    // Hoàn lượt dùng → trả lại phần đã tính vào hạn mức tháng
    await releaseMonthlyCredit(this.db, organizationId, amount, meta.service, undefined, meta.chargedAt ?? undefined)
  }




  /**
   * Danh sách tổ chức người dùng là thành viên — nguồn của `GET /organizations`
   * và của bộ chọn tổ chức. Đây là truy vấn duy nhất trong core đi ngang qua
   * nhiều tổ chức, và nó lọc theo `user_id` chứ không theo tham số của client.
   */
  async listForUser(userId: string): Promise<OrganizationEntity[]> {
    const memberships = await this.db.memberships.findMany({
      where: { user_id: userId, status: "ACTIVE" },
      select: { organization_id: true },
    })
    const ids = memberships.map((m) => m.organization_id)
    if (ids.length === 0) return []

    const rows = await this.db.organizations.findMany({
      where: { id: { in: ids } },
      orderBy: { created_at: "asc" },
    })
    return rows.map(mapOrganization)
  }

  /** Cập nhật trường settings cho tổ chức hiện tại */
  async updateSettings(ctx: TenantContext, settings: Record<string, unknown>): Promise<void> {
    await this.db.organizations.update({
      where: { id: ctx.organizationId },
      data: settingsData(settings),
    })
  }

  /**
   * Cập nhật loại tổ chức và settings — dành cho Admin SaaS phê duyệt nâng cấp/chuyển đổi mô hình.
   */
  async updateTypeAndSettings(
    organizationId: string,
    type: OrganizationType,
    settings: Record<string, unknown>
  ): Promise<OrganizationEntity> {
    const row = await this.db.organizations.update({
      where: { id: organizationId },
      data: { type: type as organization_type, ...settingsData(settings) },
    })
    return mapOrganization(row)
  }
}

let orgRepoInstance: IOrganizationRepository | null = null

export function getOrganizationRepository(db?: DbClient): IOrganizationRepository {
  if (db) return new OrganizationRepository(db)
  if (!orgRepoInstance) {
    orgRepoInstance = new OrganizationRepository()
  }
  return orgRepoInstance!
}

