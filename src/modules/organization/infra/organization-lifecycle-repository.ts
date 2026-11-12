import { prisma } from "@/core/tenancy/infra/prisma"

import type { IsolationTier } from "../domain/isolation-tier"
import type { OrganizationLifecycleStatus } from "../domain/organization-lifecycle"
import type { DbClient } from "./db-client"

/** Trạng thái vòng đời của một tổ chức (ADR-016 D-S5); tổ chức không tồn tại → `null`. */
export async function lifecycleStatusOf(organizationId: string, db: DbClient = prisma): Promise<OrganizationLifecycleStatus | null> {
  const row = await db.organizations.findUnique({ where: { id: organizationId }, select: { lifecycle_status: true } })
  return row?.lifecycle_status ?? null
}

/** Đổi trạng thái vòng đời; `offboardingUntil` chỉ giữ khi chuyển sang `OFFBOARDING`. */
export async function setLifecycleStatus(
  organizationId: string,
  status: OrganizationLifecycleStatus,
  offboardingUntil: Date | null,
  now: Date,
  db: DbClient = prisma,
): Promise<void> {
  await db.organizations.update({
    where: { id: organizationId },
    data: { lifecycle_status: status, lifecycle_changed_at: now, offboarding_until: status === "OFFBOARDING" ? offboardingUntil : null },
  })
}

/** Mức cô lập hiện tại (ADR-016 D-S2); tổ chức không tồn tại → `null`. */
export async function isolationTierOf(organizationId: string, db: DbClient = prisma): Promise<IsolationTier | null> {
  const row = await db.organizations.findUnique({ where: { id: organizationId }, select: { isolation_tier: true } })
  return row?.isolation_tier ?? null
}

export async function setIsolationTier(organizationId: string, tier: IsolationTier, db: DbClient = prisma): Promise<void> {
  await db.organizations.update({ where: { id: organizationId }, data: { isolation_tier: tier } })
}
