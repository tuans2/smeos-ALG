/**
 * Pricing Rule Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma or database imports.
 * Belongs to Domain Layer of M03 / Products (Store OS).
 */

import type { TenantContext } from "@/core/tenancy"

export interface PricingRuleRecord {
  id: string
  organization_id: string
  branch_id: string | null
  key: string
  value: unknown
  effective_from: Date
  created_by: string
}

export interface CreatePricingRuleInput {
  key: string
  value: unknown
  branchId: string | null
  createdBy: string
}

export interface IPricingRuleRepository {
  create(ctx: TenantContext, input: CreatePricingRuleInput): Promise<PricingRuleRecord>
  currentRows(ctx: TenantContext): Promise<PricingRuleRecord[]>
}
