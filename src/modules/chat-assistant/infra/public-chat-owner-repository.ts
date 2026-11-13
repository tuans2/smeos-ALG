/**
 * Tra tiệm sở hữu một trang công khai (theo khoá công khai của trang) để quyết
 * định có vẽ khung chat AI hay không. Không phiên đăng nhập — tổ chức suy từ
 * khoá của trang, không nhận từ trình duyệt. Link đã thu hồi → null.
 */
import { prisma } from "@/core/tenancy/infra/prisma"

export interface PublicChatOwner {
  organizationId: string
  shopSlug: string
  shopName: string
}

const ORG_SELECT = { select: { id: true, slug: true, name: true } } as const

function toOwner(org: { id: string; slug: string; name: string } | null | undefined): PublicChatOwner | null {
  return org ? { organizationId: org.id, shopSlug: org.slug, shopName: org.name } : null
}

export async function findOwnerByCatalogSlug(slug: string): Promise<PublicChatOwner | null> {
  const row = await prisma.catalog_links.findUnique({
    where: { slug },
    select: { is_revoked: true, organization: ORG_SELECT },
  })
  return row && !row.is_revoked ? toOwner(row.organization) : null
}

export async function findOwnerByStoreShareSlug(slug: string): Promise<PublicChatOwner | null> {
  const row = await prisma.store_share_links.findUnique({
    where: { slug },
    select: { is_revoked: true, organization: ORG_SELECT },
  })
  return row && !row.is_revoked ? toOwner(row.organization) : null
}

export async function findOwnerByOrgSlug(slug: string): Promise<PublicChatOwner | null> {
  return toOwner(await prisma.organizations.findUnique({ where: { slug }, ...ORG_SELECT }))
}

export async function findOwnerBySendCode(sendCode: string): Promise<PublicChatOwner | null> {
  const row = await prisma.greeting_sessions.findFirst({
    where: { send_code: sendCode, revoked_at: null },
    select: { organization: ORG_SELECT },
  })
  return toOwner(row?.organization)
}
