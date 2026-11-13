import { prisma } from "@/core/tenancy/infra/prisma"

import { ACTIVE_CHAIN_LINK } from "./organization-links"

export interface OrganizationIdentityData {
  organization: {
    id: string
    shortId: string
    slug: string
    name: string
    displayName: string
    type: string
    phone: string | null
    email: string | null
    address: string | null
    createdAt: Date
    connectCode: string
  }
  chainRelations: {
    asPartnerOf: Array<{
      partnershipId: string
      partnerCode: string
      partnershipType: string
      chainOrgId: string
      chainName: string
      chainSlug: string
      chainConnectCode: string
    }>
    asChainOf: Array<{
      partnershipId: string
      partnerCode: string
      partnershipType: string
      partnerOrgId: string
      partnerName: string
      partnerSlug: string
    }>
  }
  members: Array<{
    membershipId: string
    memberId: string
    userId: string
    name: string
    email: string
  }>
}

export async function getOrganizationIdentity(orgId: string): Promise<OrganizationIdentityData | null> {
  const org = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      created_at: true,
      business_profile: {
        select: {
          display_name: true,
          phone: true,
          email: true,
          address: true,
        },
      },
    },
  })

  if (!org) {
    return null
  }

  // Lấy quan hệ chuỗi — tổ chức này là ĐỐI TÁC của chuỗi nào?
  const asPartner = await prisma.organization_links.findMany({
    where: { child_org_id: orgId, ...ACTIVE_CHAIN_LINK },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: {
      id: true,
      partner_code: true,
      link_type: true,
      parent_organization: { select: { id: true, name: true, slug: true } },
    },
    take: 20,
  })

  // Lấy quan hệ chuỗi — tổ chức này là CHUỖI đang quản lý ai?
  const asChain = await prisma.organization_links.findMany({
    where: { parent_org_id: orgId, ...ACTIVE_CHAIN_LINK },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: {
      id: true,
      partner_code: true,
      link_type: true,
      child_organization: { select: { id: true, name: true, slug: true } },
    },
    take: 50,
  })

  // Thành viên / nhân viên của tổ chức này
  const members = await prisma.memberships.findMany({
    where: { organization_id: orgId, status: "ACTIVE" },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
    take: 100,
  })

  return {
    organization: {
      id: org.id,
      shortId: org.id.slice(0, 8).toUpperCase(),
      slug: org.slug,
      name: org.name,
      displayName: org.business_profile?.display_name ?? org.name,
      type: org.type,
      phone: org.business_profile?.phone ?? null,
      email: org.business_profile?.email ?? null,
      address: org.business_profile?.address ?? null,
      createdAt: org.created_at,
      connectCode: org.slug,
    },
    chainRelations: {
      asPartnerOf: asPartner.map((r) => ({
        partnershipId: r.id,
        partnerCode: r.partner_code,
        partnershipType: r.link_type,
        chainOrgId: r.parent_organization.id,
        chainName: r.parent_organization.name,
        chainSlug: r.parent_organization.slug,
        chainConnectCode: r.parent_organization.slug,
      })),
      asChainOf: asChain.map((r) => ({
        partnershipId: r.id,
        partnerCode: r.partner_code,
        partnershipType: r.link_type,
        partnerOrgId: r.child_organization.id,
        partnerName: r.child_organization.name,
        partnerSlug: r.child_organization.slug,
      })),
    },
    members: members.map((m) => ({
      membershipId: m.id,
      memberId: m.id.slice(0, 8).toUpperCase(),
      userId: m.user.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
    })),
  }
}
