import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { BranchRepository, getBranchRepository } from "@/modules/organization/infra/branch-repository"

/** `POST /branches` (`F7`, đặc tả 06 mục 4). */
export async function createBranch(
  ctx: TenantContext,
  input: { name: string; code: string; address?: string | null }
) {
  const name = input.name.trim()
  const code = input.code.trim().toUpperCase()
  if (name.length === 0) throw validationFailed({ name: "Tên chi nhánh không được để trống" })
  if (code.length === 0) throw validationFailed({ code: "Mã chi nhánh không được để trống" })

  const repository = getBranchRepository()
  if (await repository.findByCode(ctx, code)) {
    throw conflict(`Mã chi nhánh ${code} đã tồn tại`)
  }

  return repository.create(ctx, { name, code, address: input.address ?? null })
}
