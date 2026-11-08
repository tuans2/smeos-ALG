/**
 * Organization Repository Port (Domain Interface).
 * Belongs to Domain Layer of Organization / Tenancy module (Core Platform).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

import type { TenantContext } from "@/core/tenancy"

/** Sổ cái credit (checklist ALG 10.6) — loại dòng và thông tin đi kèm mỗi lần đổi số dư. */
export type CreditEntryKind = "OPENING" | "TOPUP" | "GIFT" | "REFUND" | "USAGE" | "EXPIRE"
export type CreditService = "AI" | "SMS" | "ZNS" | "CHAT" | "SUBSCRIPTION"
export interface CreditEntryMeta {
  service?: CreditService | null | undefined
  reason?: string | null | undefined
  reference?: string | null | undefined
  actorId?: string | null | undefined
  /** Hoàn: thời điểm đã trừ khoản này — trả lại hạn mức của ĐÚNG tháng đó, không phải tháng hiện tại (audit BL-17). */
  chargedAt?: Date | null | undefined
}

export type OrganizationType =
  | "EXPERIENCE"
  | "SINGLE"
  | "STORE"
  | "CHAIN"

export interface OrganizationEntity {
  id: string
  name: string
  slug: string
  type: OrganizationType
  credit_balance: number
  credit_plan?: string | null | undefined
  data_region?: string | null | undefined
  settings: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export interface CreateOrganizationInput {
  name: string
  slug: string
  type: OrganizationType
  credit_balance: number
  settings?: Record<string, unknown> | undefined
}

export interface UpdateOrganizationInput {
  name?: string | undefined
  settings?: Record<string, unknown> | undefined
}

export interface IOrganizationRepository {
  /** Tổ chức đang hoạt động của phiên. Cách ly tuyệt đối theo ctx.organizationId. */
  current(ctx: TenantContext): Promise<OrganizationEntity | null>

  /** Tìm tổ chức theo slug công khai. */
  findBySlug(slug: string): Promise<OrganizationEntity | null>

  /** Đọc tổ chức theo ID (dành cho console vận hành nền tảng). */
  findById(organizationId: string): Promise<OrganizationEntity | null>

  /** Cập nhật tên hoặc cấu hình tổ chức hiện tại. */
  update(ctx: TenantContext, input: UpdateOrganizationInput): Promise<OrganizationEntity | null>

  /** Tạo mới tổ chức lúc đăng ký hoặc cấp phát tài khoản. */
  create(input: CreateOrganizationInput): Promise<OrganizationEntity>

  /** Trừ credit có điều kiện chống đua cho job. */
  tryDeductCredit(ctx: TenantContext, cost: number, meta?: CreditEntryMeta): Promise<boolean>

  /** Trừ credit có điều kiện cho đường không có phiên (khách chat qua kênh). */
  tryDeductCreditFor(organizationId: string, cost: number, meta?: CreditEntryMeta): Promise<boolean>

  /** Nạp credit cấp nền tảng. */
  topUpCredit(organizationId: string, amount: number, kind?: "TOPUP" | "GIFT" | "REFUND", meta?: CreditEntryMeta): Promise<number | null>

  /** Hoàn credit khi job thất bại hoặc bị huỷ. */
  refundCredit(ctx: TenantContext, amount: number, meta?: CreditEntryMeta): Promise<void>

  /** Thu hồi credit tặng hết hạn. */
  expireCredit(organizationId: string, amount: number, meta?: CreditEntryMeta): Promise<number>

  /** Hoàn credit cho đường không có phiên. */
  refundCreditFor(organizationId: string, amount: number, meta?: CreditEntryMeta): Promise<void>

  /** Danh sách tổ chức mà user là thành viên. */
  listForUser(userId: string): Promise<OrganizationEntity[]>

  /** Cập nhật settings. */
  updateSettings(ctx: TenantContext, settings: Record<string, unknown>): Promise<void>

  /** Cập nhật loại tổ chức và settings (dành cho console vận hành / nâng cấp gói). */
  updateTypeAndSettings(
    organizationId: string,
    type: OrganizationType,
    settings: Record<string, unknown>
  ): Promise<OrganizationEntity>
}
