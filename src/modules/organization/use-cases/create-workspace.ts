import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { WorkspaceRepository, getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"

/** `POST /workspaces` (`F8`, đặc tả 06 mục 4). */
export async function createWorkspace(
  ctx: TenantContext,
  input: { name: string; kind: "EXPERIENCE" | "PRODUCTION" }
) {
  const name = input.name.trim()
  if (name.length === 0) throw validationFailed({ name: "Tên workspace không được để trống" })

  return getWorkspaceRepository().create(ctx, { name, kind: input.kind })
}
