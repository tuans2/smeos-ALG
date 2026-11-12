import { AppError } from "@/core/http/errors"

import { lifecycleAccess, lifecycleBlockedMessage } from "../domain/organization-lifecycle"
import { lifecycleStatusOf } from "../infra/organization-lifecycle-repository"

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * ADR-016 D-S5 (S-3a): tổ chức `SUSPENDED` / `DELETED` → thành viên và khoá tích hợp không vào được; `OFFBOARDING`
 * → chỉ xem. Gọi sau khi đã gắn tổ chức (`requireTenantContext`, `requireIntegrationContext`, đăng nhập).
 */
export async function assertOrganizationLifecycle(organizationId: string, method: string): Promise<void> {
  const status = await lifecycleStatusOf(organizationId)
  if (!status) return
  const access = lifecycleAccess(status)
  if (access === "full") return
  if (access === "read-only" && READ_METHODS.has(method.toUpperCase())) return
  throw new AppError("ORGANIZATION_INACTIVE", lifecycleBlockedMessage(status), { lifecycleStatus: status })
}
