import type { TenantContext } from "@/core/tenancy"
import { WorkspaceRepository, getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"

/** `GET /workspaces` (`F1`, đặc tả 06 mục 4). */
export function listWorkspaces(ctx: TenantContext) {
  return getWorkspaceRepository().list(ctx)
}
