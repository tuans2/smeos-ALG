import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { BranchRepository, getBranchRepository } from "@/modules/organization/infra/branch-repository"

export type UpdateBranchInput = {
  name?: string | undefined
  address?: string | null | undefined
  is_active?: boolean | undefined
}

/** `PATCH /branches/:id` (`F7`, đặc tả 06 mục 4). */
export async function updateBranch(
  ctx: TenantContext,
  id: string,
  input: UpdateBranchInput
) {
  // `BranchRepository.update` không khai `| undefined` tường minh trên các
  // trường tuỳ chọn (P1, `exactOptionalPropertyTypes`), nên chỉ đưa vào
  // những khoá thật sự có giá trị thay vì chuyển tiếp `undefined`.
  const data: { name?: string; address?: string | null; is_active?: boolean } = {}
  if (input.name !== undefined) data.name = input.name
  if (input.address !== undefined) data.address = input.address
  if (input.is_active !== undefined) data.is_active = input.is_active

  const updated = await getBranchRepository().update(ctx, id, data)
  if (!updated) throw notFound()
  return updated
}
