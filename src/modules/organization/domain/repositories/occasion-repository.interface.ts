/**
 * Port Interface: IOccasionRepository
 * Pure TypeScript — Domain layer (Zero ORM imports).
 */

import type { TenantContext } from "@/core/tenancy"
import type { OccasionRegisterValue } from "@/modules/organization/domain/occasion-rules"

export interface OccasionEntity {
  id: string
  organization_id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  register: string
  created_at: Date
  updated_at: Date
}

export interface CreateOccasionInput {
  code: string
  name: string
  register: OccasionRegisterValue
  sortOrder: number
}

export interface UpdateOccasionInput {
  name?: string | undefined
  register?: OccasionRegisterValue | undefined
  sort_order?: number | undefined
  is_active?: boolean | undefined
}

export interface IOccasionRepository {
  seedDefault(ctx: TenantContext): Promise<void>
  list(ctx: TenantContext): Promise<OccasionEntity[]>
  listAll(ctx: TenantContext): Promise<OccasionEntity[]>
  findByCode(ctx: TenantContext, code: string): Promise<OccasionEntity | null>
  findById(ctx: TenantContext, id: string): Promise<OccasionEntity | null>
  create(ctx: TenantContext, input: CreateOccasionInput): Promise<OccasionEntity>
  update(ctx: TenantContext, id: string, input: UpdateOccasionInput): Promise<OccasionEntity | null>
}
