import { randomBytes } from "node:crypto"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import { hashPassword } from "@/modules/organization/infra/password-hasher"
import { slugCandidates } from "@/modules/organization/domain/slug"
import { CHAIN_LINK_TYPES, recomputePrimaryLink, toChainLinkType } from "@/modules/organization/infra/organization-links"
import { conflict } from "@/core/http/errors"
import { findStoreByIdentifier, type StoreByIdentifier } from "./store-identifier-lookup"
import type {
  IChainPartnershipRepository,
  ListPartnershipsFilter,
} from "../domain/repositories/chain-partnership-repository.interface"
import type {
  ChainPartnershipEntity,
  ProvisionPartnerInput,
  PartnershipStatus,
  PartnershipType,
} from "../domain/partnership-entities"

/**
 * Quan hệ chuỗi → cửa hàng đối tác nằm ở `organization_links` (ADR-012 D-T3; `chain_partnerships` xoá ở T-3b).
 * Mỗi lệnh ghi đặt lại cạnh chính (`recomputePrimaryLink`) trong cùng giao dịch rồi đọc lại dòng để trả về.
 */
const LINK_INCLUDE = { child_organization: { select: { name: true, slug: true, settings: true } } } as const
type LinkRow = Prisma.organization_linksGetPayload<{ include: typeof LINK_INCLUDE }>

const PARTNER_CODE_TAKEN_MESSAGE = "Mã đối tác đã được dùng cho một cửa hàng khác của chuỗi."

async function readLink(db: Prisma.TransactionClient | PrismaClient, id: string): Promise<LinkRow> {
  return db.organization_links.findUniqueOrThrow({ where: { id }, include: LINK_INCLUDE })
}

export class PrismaChainPartnershipRepository implements IChainPartnershipRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async provisionPartner(input: ProvisionPartnerInput): Promise<{
    partnership: ChainPartnershipEntity
    partnerOrgId: string
    founderUserId: string
    temporaryPassword?: string | undefined
  }> {
    const temporaryPassword = input.password ? undefined : randomBytes(12).toString("base64url") // AUD-009: không dùng mật khẩu chung
    const passwordHash = await hashPassword(input.password || temporaryPassword!)

    // Generate unique slug for partner store
    const candidateSlugs = slugCandidates(input.partnerStoreName)
    let partnerSlug = candidateSlugs[0] || `store-${Date.now()}`
    const existingOrg = await this.prisma.organizations.findUnique({
      where: { slug: partnerSlug },
    })
    if (existingOrg) {
      partnerSlug = `${partnerSlug}-${Date.now().toString().slice(-4)}`
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Tạo tổ chức Cửa hàng đối tác (STORE)
      const partnerOrg = await tx.organizations.create({
        data: {
          name: input.partnerStoreName,
          slug: partnerSlug,
          type: "STORE",
          settings: {
            address: input.address,
            province: input.province,
            district: input.district,
            chain_id: input.chainOrgId,
          },
        },
      })

      // 2. Tạo Workspace mặc định cho Cửa hàng
      await tx.workspaces.create({
        data: {
          organization_id: partnerOrg.id,
          name: "Không gian làm việc",
          kind: "PRODUCTION",
        },
      })

      // 3. Tạo User đối tác (hoặc lấy nếu email đã tồn tại)
      let user = await tx.users.findUnique({
        where: { email: input.contactEmail.toLowerCase().trim() },
      })
      if (!user) {
        user = await tx.users.create({
          data: {
            email: input.contactEmail.toLowerCase().trim(),
            password_hash: passwordHash,
            // Mật khẩu tạm do hệ thống sinh → đối tác phải tự đổi lần đầu (checklist ALG 1.4)
            must_change_password: !input.password,
            name: input.contactName,
            phone: input.contactPhone,
          },
        })
      }

      // 4. Tìm vai store_admin hoặc vai quản trị mặc định
      const role = await tx.roles.findFirst({
        where: {
          OR: [{ key: "store_admin" }, { key: "dieu_hanh" }, { is_system: true }],
        },
      })

      // 5. Tạo Membership cho đối tác tại tổ chức mới
      if (role) {
        await tx.memberships.create({
          data: {
            organization_id: partnerOrg.id,
            user_id: user.id,
            role_id: role.id,
            status: "ACTIVE",
          },
        })
      }

      // 6. Tạo liên kết Chuỗi → Đối tác (organization_links)
      const row = await tx.organization_links.create({
        data: {
          parent_org_id: input.chainOrgId,
          child_org_id: partnerOrg.id,
          partner_code: input.partnerCode,
          link_type: toChainLinkType(input.partnershipType),
          status: "ACTIVE",
          capacity_daily: input.capacityDaily ?? 10,
          commission_rate: input.commissionRate ? Number(input.commissionRate) : null,
          contact_name: input.contactName,
          contact_phone: input.contactPhone,
          contact_email: input.contactEmail,
          address: input.address ?? null,
          province: input.province ?? null,
          district: input.district ?? null,
        },
      })
      await recomputePrimaryLink(tx, partnerOrg.id)

      return {
        partnership: this.mapEntity(await readLink(tx, row.id)),
        partnerOrgId: partnerOrg.id,
        founderUserId: user.id,
        temporaryPassword: user.password_hash === passwordHash ? temporaryPassword : undefined, // email đã có tài khoản → giữ mật khẩu cũ
      }
    })
  }
  async listPartnerships(filter: ListPartnershipsFilter): Promise<{
    items: ChainPartnershipEntity[]
    total: number
  }> {
    const where: Prisma.organization_linksWhereInput = {
      parent_org_id: filter.chainOrgId,
      link_type: { in: [...CHAIN_LINK_TYPES] },
    }

    if (filter.status) {
      where.status = filter.status
    }
    if (filter.province) {
      where.province = filter.province
    }
    if (filter.query) {
      where.OR = [
        { partner_code: { contains: filter.query, mode: "insensitive" } },
        { contact_name: { contains: filter.query, mode: "insensitive" } },
        { contact_phone: { contains: filter.query, mode: "insensitive" } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.organization_links.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: Math.min(filter.limit ?? 50, 100),
        skip: filter.offset ?? 0,
        include: LINK_INCLUDE,
      }),
      this.prisma.organization_links.count({ where }),
    ])

    return { items: rows.map((r) => this.mapEntity(r)), total }
  }

  async findPartnershipById(id: string): Promise<ChainPartnershipEntity | null> {
    const row = await this.prisma.organization_links.findFirst({
      where: { id, link_type: { in: [...CHAIN_LINK_TYPES] } },
      include: LINK_INCLUDE,
    })
    return row ? this.mapEntity(row) : null
  }

  async updateStatus(id: string, status: PartnershipStatus): Promise<ChainPartnershipEntity> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization_links.update({
        where: { id },
        data: { status, valid_to: status === "TERMINATED" ? new Date() : null },
        select: { child_org_id: true },
      })
      await recomputePrimaryLink(tx, updated.child_org_id)
      return readLink(tx, id)
    })
    return this.mapEntity(row)
  }

  async findOrganizationType(orgId: string): Promise<string | null> {
    const org = await this.prisma.organizations.findUnique({ where: { id: orgId }, select: { type: true } })
    return org?.type ?? null
  }

  findStoreByIdentifier(identifier: string): Promise<StoreByIdentifier | null> {
    return findStoreByIdentifier(this.prisma, identifier)
  }

  /**
   * Tạo hoặc dùng lại liên kết của cặp chuỗi–cửa hàng (ADR-012 T-3b: liên kết lại = cùng dòng, ACTIVE trở lại).
   * Không chép SĐT/email của tổ chức kia vào liên kết — Chuỗi tự nhập liên hệ khi cần (audit hành trình C1, UJ-01).
   * Liên kết lại cần cửa hàng chấp nhận: làm ở UJ-10 (luồng mời–chấp nhận).
   */
  async linkExistingStore(params: {
    chainOrgId: string
    partnerOrgId: string
    partnerCode: string
    partnershipType?: string | undefined
    commissionRate?: number | undefined
    capacityDaily?: number | undefined
    contactName?: string | undefined
  }): Promise<ChainPartnershipEntity> {
    const terms = {
      partner_code: params.partnerCode,
      link_type: toChainLinkType(params.partnershipType),
      commission_rate: params.commissionRate ? Number(params.commissionRate) : null,
      capacity_daily: params.capacityDaily ?? 10,
    }
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const saved = await tx.organization_links.upsert({
          where: { parent_org_id_child_org_id: { parent_org_id: params.chainOrgId, child_org_id: params.partnerOrgId } },
          update: { ...terms, status: "ACTIVE", valid_to: null, ...(params.contactName !== undefined ? { contact_name: params.contactName } : {}) },
          create: {
            ...terms,
            parent_org_id: params.chainOrgId,
            child_org_id: params.partnerOrgId,
            status: "ACTIVE",
            contact_name: params.contactName ?? null,
          },
          select: { id: true },
        })
        await recomputePrimaryLink(tx, params.partnerOrgId)
        return readLink(tx, saved.id)
      })
      return this.mapEntity(row)
    } catch (error) {
      // Mã đối tác đã dùng cho một cửa hàng khác của chuỗi (`@@unique([parent_org_id, partner_code])`)
      if ((error as { code?: unknown } | null)?.code === "P2002") throw conflict(PARTNER_CODE_TAKEN_MESSAGE)
      throw error
    }
  }

  private mapEntity(row: LinkRow): ChainPartnershipEntity {
    const partnerSettings = row.child_organization.settings
    const s = partnerSettings && typeof partnerSettings === "object" ? (partnerSettings as Record<string, unknown>) : {}
    const unlocked = Array.isArray(s.unlocked_tools)
      ? (s.unlocked_tools as unknown[]).filter((x): x is string => typeof x === "string")
      : null

    return {
      id: row.id,
      chainOrgId: row.parent_org_id,
      partnerOrgId: row.child_org_id,
      partnerCode: row.partner_code,
      partnershipType: row.link_type as PartnershipType,
      status: row.status,
      commissionRate: row.commission_rate ? Number(row.commission_rate) : undefined,
      capacityDaily: row.capacity_daily,
      contactName: row.contact_name ?? undefined,
      contactPhone: row.contact_phone ?? undefined,
      contactEmail: row.contact_email ?? undefined,
      address: row.address ?? undefined,
      province: row.province ?? undefined,
      district: row.district ?? undefined,
      partnerOrgName: row.child_organization.name,
      partnerOrgSlug: row.child_organization.slug,
      unlockedTools: unlocked,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

let defaultRepo: IChainPartnershipRepository | null = null

export function getChainPartnershipRepository(): IChainPartnershipRepository {
  if (!defaultRepo) {
    defaultRepo = new PrismaChainPartnershipRepository()
  }
  return defaultRepo
}
