/**
 * ALG Inputs Architecture v2.1 — Chain Collection Profile Repository
 *
 * Implements persistent storage for Chain Collection Profiles within
 * organization configuration settings.
 */

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import type {
  ChainCollectionProfile,
  CollectionRule,
  DataSharingAgreement,
} from "../domain/chain-collection-profile"

const FULL_BRANCH_INCLUDE = {
  organization: {
    include: {
      business_profile: true,
      brand_profile: true,
    },
  },
  inventory: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          attributes: true,
        },
      },
    },
    take: 10,
  },
} satisfies Prisma.branchesInclude

export type FullBranch = Prisma.branchesGetPayload<{ include: typeof FULL_BRANCH_INCLUDE }>

export interface IChainCollectionProfileRepository {
  getProfile(organizationId: string): Promise<ChainCollectionProfile | null>
  saveProfile(profile: ChainCollectionProfile): Promise<void>
  getStoreDsa(storeId: string): Promise<DataSharingAgreement | null>
  listActiveDsas(organizationId: string): Promise<readonly DataSharingAgreement[]>
  listBranchesWithInventory(organizationId: string): Promise<Array<{
    id: string
    name: string
    code: string
    address: string | null
    is_active: boolean
    created_at: Date
    _count: { inventory: number }
  }>>
  findBranchBasic(storeId: string): Promise<{ id: string; name: string; organization_id: string } | null>
  findBranchWithFullProfiles(storeId: string): Promise<FullBranch | null>
  countActiveBranches(organizationId: string): Promise<number>
  createPartnerBranch(data: {
    organizationId: string
    name: string
    code: string
    address?: string | null | undefined
    dsa: DataSharingAgreement
  }): Promise<{ id: string; name: string; code: string }>
}

const SETTINGS_KEY = "chain_collection_profile"
const DSA_KEY = "data_sharing_agreements"

export class ChainCollectionProfileRepository implements IChainCollectionProfileRepository {
  async getProfile(organizationId: string): Promise<ChainCollectionProfile | null> {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })

    if (!org?.settings || typeof org.settings !== "object") {
      return null
    }

    const settingsObj = org.settings as Record<string, unknown>
    const stored = settingsObj[SETTINGS_KEY]

    if (!stored || typeof stored !== "object") {
      return null
    }

    return stored as ChainCollectionProfile
  }

  async saveProfile(profile: ChainCollectionProfile): Promise<void> {
    const org = await prisma.organizations.findUnique({
      where: { id: profile.organizationId },
      select: { settings: true },
    })

    const currentSettings =
      org?.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {}

    const updatedSettings = {
      ...currentSettings,
      [SETTINGS_KEY]: profile,
    }

    await prisma.organizations.update({
      where: { id: profile.organizationId },
      data: {
        settings: JSON.parse(JSON.stringify(updatedSettings)),
      },
    })
  }

  async getStoreDsa(storeId: string): Promise<DataSharingAgreement | null> {
    const branch = await prisma.branches.findUnique({
      where: { id: storeId },
      select: { organization_id: true },
    })

    if (!branch) return null

    const org = await prisma.organizations.findUnique({
      where: { id: branch.organization_id },
      select: { settings: true },
    })

    if (!org?.settings || typeof org.settings !== "object") return null

    const settingsObj = org.settings as Record<string, unknown>
    const dsas = (settingsObj[DSA_KEY] as Record<string, DataSharingAgreement>) ?? {}

    return dsas[storeId] ?? null
  }

  async listActiveDsas(organizationId: string): Promise<readonly DataSharingAgreement[]> {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    })

    if (!org?.settings || typeof org.settings !== "object") return []

    const settingsObj = org.settings as Record<string, unknown>
    const dsas = (settingsObj[DSA_KEY] as Record<string, DataSharingAgreement>) ?? {}

    return Object.values(dsas).filter((d) => d.status === "ACTIVE")
  }

  async listBranchesWithInventory(organizationId: string) {
    return prisma.branches.findMany({
      where: { organization_id: organizationId },
      include: {
        _count: {
          select: {
            inventory: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    })
  }

  async findBranchBasic(storeId: string) {
    return prisma.branches.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, organization_id: true },
    })
  }

  async findBranchWithFullProfiles(storeId: string) {
    return prisma.branches.findUnique({
      where: { id: storeId },
      include: FULL_BRANCH_INCLUDE,
    })
  }

  async countActiveBranches(organizationId: string): Promise<number> {
    return prisma.branches.count({
      where: { organization_id: organizationId, is_active: true },
    })
  }

  async createPartnerBranch(data: {
    organizationId: string
    name: string
    code: string
    address?: string | null
    dsa: DataSharingAgreement
  }) {
    const branch = await prisma.branches.create({
      data: {
        organization_id: data.organizationId,
        name: data.name,
        code: data.code,
        address: data.address ?? null,
        is_active: true,
      },
    })

    const org = await prisma.organizations.findUnique({
      where: { id: data.organizationId },
      select: { settings: true },
    })

    const currentSettings =
      org?.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>)
        : {}

    const existingDsas = (currentSettings[DSA_KEY] as Record<string, DataSharingAgreement>) ?? {}

    const updatedSettings = {
      ...currentSettings,
      [DSA_KEY]: {
        ...existingDsas,
        [branch.id]: {
          ...data.dsa,
          storeId: branch.id,
        },
      },
    }

    await prisma.organizations.update({
      where: { id: data.organizationId },
      data: {
        settings: JSON.parse(JSON.stringify(updatedSettings)),
      },
    })

    return branch
  }
}

let _chainCollectionRepo: ChainCollectionProfileRepository | null = null
export function getChainCollectionProfileRepository(): ChainCollectionProfileRepository {
  if (!_chainCollectionRepo) _chainCollectionRepo = new ChainCollectionProfileRepository()
  return _chainCollectionRepo
}
