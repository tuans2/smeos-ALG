import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { OccasionRepository, getOccasionRepository } from "@/modules/organization/infra/occasion-repository"
import {
  validateCreateOccasionInput,
  type CreateOccasionInput,
} from "@/modules/organization/domain/occasion-rules"

/** `POST /occasions` (nợ #104 — quản lý dịp, dùng chung F2 với hồ sơ tổ chức). */
export async function createOccasion(ctx: TenantContext, input: CreateOccasionInput) {
  const validated = validateCreateOccasionInput(input)
  if ("field" in validated) {
    throw validationFailed({ [validated.field]: validated.message })
  }

  const repository = getOccasionRepository()
  if (await repository.findByCode(ctx, validated.code)) {
    throw conflict(`Mã dịp ${validated.code} đã tồn tại`)
  }

  return repository.create(ctx, {
    code: validated.code,
    name: validated.name,
    register: validated.register,
    sortOrder: validated.sortOrder,
  })
}
