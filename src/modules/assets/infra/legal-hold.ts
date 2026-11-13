import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Đặt/gỡ legal hold cho một asset của `organizationId`. Chỉ dùng từ console
 * vận hành nền tảng (N14) — nơi chỉ có `organizationId`, không có phiên
 * tenant. Trả `null` khi asset không thuộc tổ chức đó.
 */
export async function setLegalHoldUntil(
  organizationId: string,
  assetId: string,
  until: Date | null
): Promise<{ before: Date | null } | null> {
  const asset = await prisma.assets.findFirst({
    where: { id: assetId, organization_id: organizationId },
    select: { legal_hold_until: true },
  })
  if (!asset) return null
  await prisma.assets.updateMany({
    where: { id: assetId, organization_id: organizationId },
    data: { legal_hold_until: until },
  })
  return { before: asset.legal_hold_until }
}

/** Hạn legal hold cấp tổ chức (SDAGF D-04), `null` khi không giữ. */
export async function organizationLegalHoldUntil(organizationId: string): Promise<Date | null> {
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { legal_hold_until: true },
  })
  return org?.legal_hold_until ?? null
}

/** Đặt/gỡ legal hold cấp tổ chức. Trả `null` khi không có tổ chức đó. */
export async function setOrganizationLegalHoldUntil(
  organizationId: string,
  until: Date | null
): Promise<{ before: Date | null } | null> {
  const before = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { legal_hold_until: true },
  })
  if (!before) return null
  await prisma.organizations.update({ where: { id: organizationId }, data: { legal_hold_until: until } })
  return { before: before.legal_hold_until }
}
