import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { OccasionRepository, getOccasionRepository } from "@/modules/organization/infra/occasion-repository"
import {
  validateUpdateOccasionInput,
  type UpdateOccasionInput,
} from "@/modules/organization/domain/occasion-rules"

/**
 * `PATCH /occasions/:id` (nợ #104). Không nhận `code` trong input — xem lý do
 * chặn đổi mã ở `validateUpdateOccasionInput` (`occasion-rules.ts`). Tắt một
 * dịp là `isActive: false` qua route này, không có endpoint xoá cứng — cùng
 * quy ước với `BranchRepository`/`update-branch.ts`.
 */
export async function updateOccasion(ctx: TenantContext, id: string, input: UpdateOccasionInput) {
  const validated = validateUpdateOccasionInput(input)
  if ("field" in validated) {
    throw validationFailed({ [validated.field]: validated.message })
  }
  if (Object.keys(validated).length === 0) {
    throw validationFailed({ body: "Không có trường nào để sửa" })
  }

  const updated = await getOccasionRepository().update(ctx, id, validated)
  if (!updated) throw notFound()
  return updated
}
