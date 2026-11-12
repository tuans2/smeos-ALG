/**
 * Customer Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma imports.
 * Belongs to Domain Layer of CRM (Store OS).
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerMasterIndex, CustomerTier } from "../customer-master-index"

export interface CreateCustomerInput {
  name: string
  phone: string
  email?: string | undefined
  address?: string | undefined
  notes?: string | undefined
  tags?: string[] | undefined
  preferredFlowers?: string[] | undefined
  preferredColors?: string[] | undefined
}

export interface UpdateCustomerInput {
  name?: string | undefined
  phone?: string | undefined
  email?: string | undefined
  address?: string | undefined
  notes?: string | undefined
  tags?: string[] | undefined
  preferredFlowers?: string[] | undefined
  preferredColors?: string[] | undefined
}

export interface AddOccasionInput {
  name: string
  date: string
  isRecurring?: boolean | undefined
  reminderDaysBefore?: number | undefined
  recipientName?: string | undefined
  notes?: string | undefined
}

export interface CustomerListFilters {
  tier?: CustomerTier | undefined
  search?: string | undefined
}

export interface CustomerListPagination {
  limit?: number | undefined
  offset?: number | undefined
}

/** Vị trí sau dòng cuối của trang trước, theo thứ tự `updated_at` giảm dần rồi `id` giảm dần. */
export interface CustomerPageAfter {
  updatedAt: string
  id: string
}

/** Đọc danh sách khách theo con trỏ (đặc tả 06 §2) — lấy `take` dòng tiếp theo sau `after`. */
export interface ICustomerPageReader {
  listPage(
    ctx: TenantContext,
    filters: CustomerListFilters,
    page: { take: number; after?: CustomerPageAfter | undefined }
  ): Promise<CustomerMasterIndex[]>
}

export interface ICustomerRepository {
  create(ctx: TenantContext, input: CreateCustomerInput): Promise<CustomerMasterIndex>
  getById(ctx: TenantContext, id: string): Promise<CustomerMasterIndex | null>
  findByPhone(ctx: TenantContext, phone: string): Promise<CustomerMasterIndex | null>
  update(ctx: TenantContext, id: string, input: UpdateCustomerInput): Promise<CustomerMasterIndex | null>
  delete(ctx: TenantContext, id: string): Promise<boolean>
  list(
    ctx: TenantContext,
    filters?: CustomerListFilters,
    pagination?: CustomerListPagination
  ): Promise<{ items: CustomerMasterIndex[]; total: number }>
  addOccasion(ctx: TenantContext, customerId: string, data: AddOccasionInput): Promise<unknown>
  updateConsent(
    ctx: TenantContext,
    customerId: string,
    channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION",
    granted: boolean
  ): Promise<unknown>
  syncMetricsFromOrders(ctx: TenantContext, customerId: string): Promise<void>
}
