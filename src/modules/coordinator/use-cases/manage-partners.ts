/**
 * Use-case mạng lưới đối tác xưởng (F05/F15). Đọc: R1. Thêm/sửa: R4.
 */

import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { applyCustomFields, mergeCustomFields } from "@/modules/field-platform/use-cases/apply-custom-fields"
import type { IPartnerRepository, PartnerEntity } from "../domain/repositories/partner-repository.interface"
import { getPartnerRepository } from "../infra/partner-repository"
import { isUniqueViolation, runInTransaction } from "../infra/transaction"
import { audit } from "./shared"

export interface PartnerView {
  id: string
  code: string
  name: string
  phone: string
  address: string | null
  district: string | null
  province: string | null
  tier: string
  rating: number
  capacityDaily: number
  isActive: boolean
  /** Giá trị trường tự tạo cho đối tác (Console → Trường dữ liệu, entity PARTNER — audit L-09). */
  customFields: Record<string, unknown>
}

function present(p: PartnerEntity): PartnerView {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    phone: p.phone,
    address: p.address,
    district: p.district,
    province: p.province,
    tier: p.tier,
    rating: Number(p.rating),
    capacityDaily: p.capacity_daily,
    isActive: p.is_active,
    customFields: p.custom_fields ?? {},
  }
}

export async function listPartners(
  ctx: TenantContext,
  options: { activeOnly: boolean },
  repo: IPartnerRepository = getPartnerRepository()
): Promise<PartnerView[]> {
  return (await repo.listPartners(ctx, options)).map(present)
}

export interface PartnerInput {
  code: string
  name: string
  phone: string
  address?: string | undefined
  district?: string | undefined
  province?: string | undefined
  tier: "STANDARD" | "PREFERRED" | "VIP"
  capacityDaily: number
  customFields?: Record<string, unknown> | undefined
}

export async function createPartner(ctx: TenantContext, input: PartnerInput): Promise<PartnerView> {
  // Kiểm giá trị trường tự tạo theo định nghĩa đang bật (cùng một hàm với đơn điều phối)
  const customFields = await applyCustomFields(ctx, "PARTNER", input.customFields)
  try {
    const partner = await runInTransaction(async (tx) => {
      const p = await getPartnerRepository(tx).createPartner(ctx, {
        code: input.code.trim(),
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address?.trim() || null,
        district: input.district?.trim() || null,
        province: input.province?.trim() || null,
        tier: input.tier,
        capacityDaily: input.capacityDaily,
        ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
      })
      await audit(ctx, tx, "coordinator.partner.create", p.id, null, { code: p.code, name: p.name })
      return p
    })
    return present(partner)
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", `Mã đối tác ${input.code} đã có.`)
    throw error
  }
}

export async function updatePartner(
  ctx: TenantContext,
  id: string,
  input: { [K in keyof Omit<PartnerInput, "code">]?: PartnerInput[K] | undefined } & { isActive?: boolean | undefined }
): Promise<PartnerView> {
  const validated = input.customFields !== undefined ? await applyCustomFields(ctx, "PARTNER", input.customFields) : null
  return runInTransaction(async (tx) => {
    const repo = getPartnerRepository(tx)
    const before = await repo.findPartner(ctx, id)
    if (!before) throw notFound()
    await repo.updatePartner(ctx, id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
      ...(input.district !== undefined ? { district: input.district.trim() || null } : {}),
      ...(input.province !== undefined ? { province: input.province.trim() || null } : {}),
      ...(input.tier !== undefined ? { tier: input.tier } : {}),
      ...(input.capacityDaily !== undefined ? { capacity_daily: input.capacityDaily } : {}),
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      // Trộn vào giá trị cũ để giá trị của trường đã tắt không mất (§16.3), như đơn điều phối
      ...(validated ? { custom_fields: mergeCustomFields(before.custom_fields, validated) } : {}),
    })
    const after = (await repo.findPartner(ctx, id))!
    await audit(ctx, tx, "coordinator.partner.update", id, present(before), present(after))
    return present(after)
  })
}
