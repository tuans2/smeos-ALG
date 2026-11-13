import { prisma } from "@/core/tenancy/infra/prisma"
import type { CertificateStatus, CustomDomainStatus, OwnedResource } from "../domain/custom-domain"

/**
 * Bảng `custom_domains` (checklist ALG 10.8). Phía cửa hàng luôn lọc theo `organizationId` lấy từ phiên;
 * bản ghi của tổ chức khác coi như không tồn tại (404). Tra theo tên miền và tra chủ sở hữu trang công khai
 * dùng cho `src/proxy.ts` — chạy với quyền hệ thống vì request trên tên miền riêng chưa có phiên.
 */

export interface CustomDomainRow {
  id: string
  organization_id: string
  hostname: string
  verification_token: string
  status: CustomDomainStatus
  verified_at: Date | null
  last_checked_at: Date | null
  certificate_status: CertificateStatus
  locked_reason: string | null
  created_at: Date
}

const SELECT = {
  id: true, organization_id: true, hostname: true, verification_token: true, status: true, verified_at: true,
  last_checked_at: true, certificate_status: true, locked_reason: true, created_at: true,
} as const

export class CustomDomainRepository {
  listForOrganization(organizationId: string): Promise<CustomDomainRow[]> {
    return prisma.custom_domains.findMany({ where: { organization_id: organizationId }, select: SELECT, orderBy: { created_at: "asc" } })
  }

  find(organizationId: string, id: string): Promise<CustomDomainRow | null> {
    return prisma.custom_domains.findFirst({ where: { id, organization_id: organizationId }, select: SELECT })
  }

  /** Tên miền đã có ai gắn chưa (mọi tổ chức) — tên miền là duy nhất toàn hệ thống. */
  async hostnameTaken(hostname: string): Promise<boolean> {
    return (await prisma.custom_domains.count({ where: { hostname } })) > 0
  }

  countForOrganization(organizationId: string): Promise<number> {
    return prisma.custom_domains.count({ where: { organization_id: organizationId } })
  }

  create(input: { organizationId: string; hostname: string; token: string; createdBy: string }): Promise<CustomDomainRow> {
    return prisma.custom_domains.create({
      data: { organization_id: input.organizationId, hostname: input.hostname, verification_token: input.token, created_by: input.createdBy },
      select: SELECT,
    })
  }

  /** Cập nhật có điều kiện theo tổ chức — không trả bản ghi của tổ chức khác. */
  async update(
    organizationId: string, id: string,
    data: Partial<{ status: CustomDomainStatus; verified_at: Date | null; last_checked_at: Date; certificate_status: CertificateStatus; locked_reason: string | null }>,
  ): Promise<CustomDomainRow | null> {
    const res = await prisma.custom_domains.updateMany({ where: { id, organization_id: organizationId }, data })
    return res.count === 0 ? null : this.find(organizationId, id)
  }

  async remove(organizationId: string, id: string): Promise<boolean> {
    return (await prisma.custom_domains.deleteMany({ where: { id, organization_id: organizationId } })).count > 0
  }

  // ── Dùng cho proxy (quyền hệ thống) ─────────────────────────────────────────

  async byHostname(hostname: string): Promise<{ organizationId: string; orgSlug: string; status: CustomDomainStatus } | null> {
    const row = await prisma.custom_domains.findUnique({
      where: { hostname },
      select: { organization_id: true, status: true, organization: { select: { slug: true } } },
    })
    return row ? { organizationId: row.organization_id, orgSlug: row.organization.slug, status: row.status } : null
  }

  /** Tổ chức sở hữu dữ liệu mà trang công khai sẽ mở — cùng khoá tra như chính trang đó. */
  async ownerOf(resource: OwnedResource, key: string): Promise<string | null> {
    switch (resource) {
      case "catalog_link":
        return (await prisma.catalog_links.findUnique({ where: { slug: key }, select: { organization_id: true } }))?.organization_id ?? null
      case "greeting_catalog":
        return (await prisma.greeting_catalogs.findFirst({ where: { id: key }, select: { organization_id: true } }))?.organization_id ?? null
      case "greeting_session":
        return (await prisma.greeting_sessions.findFirst({ where: { send_code: key.toUpperCase().trim() }, select: { organization_id: true } }))?.organization_id ?? null
      case "share_link":
        return (await prisma.greeting_share_links.findFirst({ where: { code: key.toUpperCase() }, select: { organization_id: true } }))?.organization_id ?? null
      case "store_profile":
        return (await prisma.store_share_links.findUnique({ where: { slug: key }, select: { organization_id: true } }))?.organization_id ?? null
      case "org_slug":
        return (await prisma.organizations.findUnique({ where: { slug: key }, select: { id: true } }))?.id ?? null
    }
  }

  /** Trang chủ của tên miền riêng: trang thông tin cửa hàng đang chia sẻ gần nhất (nếu có). */
  async homeStoreProfileSlug(organizationId: string): Promise<string | null> {
    const link = await prisma.store_share_links.findFirst({
      where: { organization_id: organizationId, is_revoked: false },
      orderBy: { created_at: "desc" },
      select: { slug: true },
    })
    return link?.slug ?? null
  }

  // ── Console nền tảng ───────────────────────────────────────────────────────

  async organizationExists(organizationId: string): Promise<boolean> {
    return (await prisma.organizations.count({ where: { id: organizationId } })) > 0
  }

  findById(id: string): Promise<CustomDomainRow | null> {
    return prisma.custom_domains.findUnique({ where: { id }, select: SELECT })
  }
}

let instance: CustomDomainRepository | null = null
export function getCustomDomainRepository(): CustomDomainRepository {
  instance ??= new CustomDomainRepository()
  return instance
}
