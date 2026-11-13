import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { CatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { listCatalogLinks } from "@/modules/catalog-links/use-cases/list-catalog-links"
import { getCatalogLinkBySlug } from "@/modules/catalog-links/use-cases/get-catalog-link"
import { updateCatalogLink } from "@/modules/catalog-links/use-cases/update-catalog-link"
import { revokeCatalogLink } from "@/modules/catalog-links/use-cases/revoke-catalog-link"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { validationFailed, notFound } from "@/core/http/errors"

describe("catalog-links tenant isolation", () => {
  let tenantA: Tenant
  let tenantB: Tenant
  let repo: CatalogLinkRepository

  beforeEach(async () => {
    await resetDatabase()
    tenantA = await createTenant("alpha")
    tenantB = await createTenant("beta")
    // Founder role (dieu_hanh) has J1 (catalog.create) and J2 (catalog.publish) by default
    const defaultCaps = new Set(["J1", "J2"])
    tenantA = { ...tenantA, ctx: { ...tenantA.ctx, capabilities: new Set([...tenantA.ctx.capabilities, ...defaultCaps]) } }
    tenantB = { ...tenantB, ctx: { ...tenantB.ctx, capabilities: new Set([...tenantB.ctx.capabilities, ...defaultCaps]) } }
    repo = new CatalogLinkRepository()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tenant A cannot see tenant B's catalog links", async () => {
    await createCatalogLink(tenantA.ctx, {
      slug: "tenant-a-catalog",
      name: "Tenant A Catalog",
      description: null,
      filters: null,
    })

    await createCatalogLink(tenantB.ctx, {
      slug: "tenant-b-catalog",
      name: "Tenant B Catalog",
      description: null,
      filters: null,
    })

    const linksA = await listCatalogLinks(tenantA.ctx, { includeRevoked: false })
    const linksB = await listCatalogLinks(tenantB.ctx, { includeRevoked: false })

    expect(linksA).toHaveLength(1)
    expect(linksA[0]?.slug).toBe("tenant-a-catalog")
    expect(linksB).toHaveLength(1)
    expect(linksB[0]?.slug).toBe("tenant-b-catalog")
  })

  it("tenant A cannot get tenant B's catalog by slug via repo", async () => {
    await createCatalogLink(tenantB.ctx, {
      slug: "tenant-b-catalog",
      name: "Tenant B Catalog",
      description: null,
      filters: null,
    })

    const link = await getCatalogLinkBySlug("tenant-b-catalog")
    expect(link).not.toBeNull()
    // getCatalogLinkBySlug returns CatalogLinkResult which doesn't have organization_id
    // The repo method findBySlugInOrg does the tenant check
    const linkA = await repo.findBySlugInOrg(tenantA.ctx, "tenant-b-catalog")
    expect(linkA).toBeNull()
  })

  it("tenant A cannot update tenant B's catalog", async () => {
    await createCatalogLink(tenantB.ctx, {
      slug: "tenant-b-catalog",
      name: "Tenant B Catalog",
      description: null,
      filters: null,
    })

    await expect(
      updateCatalogLink(tenantA.ctx, "tenant-b-catalog", { name: "Hacked" })
    ).rejects.toThrow(notFound().message)
  })

  it("tenant A cannot revoke tenant B's catalog", async () => {
    await createCatalogLink(tenantB.ctx, {
      slug: "tenant-b-catalog",
      name: "Tenant B Catalog",
      description: null,
      filters: null,
    })

    await expect(
      revokeCatalogLink(tenantA.ctx, "tenant-b-catalog")
    ).rejects.toThrow(notFound().message)
  })

  it("tenant A cannot create catalog with slug used by tenant B", async () => {
    await createCatalogLink(tenantB.ctx, {
      slug: "shared-slug",
      name: "Tenant B Catalog",
      description: null,
      filters: null,
    })

    await expect(
      createCatalogLink(tenantA.ctx, {
        slug: "shared-slug",
        name: "Tenant A Catalog",
        description: null,
        filters: null,
      })
    ).rejects.toThrow(validationFailed({ slug: "Slug đã được sử dụng" }).message)
  })

  it("revoked catalogs are hidden by default but visible with includeRevoked", async () => {
    await createCatalogLink(tenantA.ctx, {
      slug: "catalog-1",
      name: "Catalog 1",
      description: null,
      filters: null,
    })

    await createCatalogLink(tenantA.ctx, {
      slug: "catalog-2",
      name: "Catalog 2",
      description: null,
      filters: null,
    })

    await revokeCatalogLink(tenantA.ctx, "catalog-1")

    const activeLinks = await listCatalogLinks(tenantA.ctx, { includeRevoked: false })
    const allLinks = await listCatalogLinks(tenantA.ctx, { includeRevoked: true })

    expect(activeLinks).toHaveLength(1)
    expect(activeLinks[0]?.slug).toBe("catalog-2")
    expect(allLinks).toHaveLength(2)
    expect(allLinks.find((l) => l.slug === "catalog-1")?.is_revoked).toBe(true)
  })

  it("filters are stored and returned correctly", async () => {
    const filters = {
      occasionCodes: ["valentine"],
      colorCodes: ["red"],
      collections: ["wedding"],
      priceRange: { min: 100000, max: 500000 },
    }

    await createCatalogLink(tenantA.ctx, {
      slug: "filtered-catalog",
      name: "Filtered Catalog",
      description: "Test filters",
      filters,
    })

    const links = await listCatalogLinks(tenantA.ctx, { includeRevoked: false })
    const link = links.find((l) => l.slug === "filtered-catalog")

    expect(link).toBeDefined()
    expect(link?.filters).toEqual(filters)
  })

  it("slug uniqueness is global across tenants", async () => {
    await createCatalogLink(tenantA.ctx, {
      slug: "unique-slug",
      name: "Tenant A",
      description: null,
      filters: null,
    })

    try {
      await createCatalogLink(tenantB.ctx, {
        slug: "unique-slug",
        name: "Tenant B",
        description: null,
        filters: null,
      })
    } catch (e) {
      // Check details.slug for the actual validation message
      expect(e).toBeInstanceOf(Error)
      const appError = e as { details?: { slug?: string } }
      expect(appError.details?.slug).toBe("Slug đã được sử dụng")
      return
    }
    throw new Error("Expected createCatalogLink to throw")
  })
  it("link công khai cá nhân hoá theo tên khách nhưng không bao giờ lộ số điện thoại", async () => {
    await createCatalogLink(tenantA.ctx, {
      slug: "rieng-cho-chi-lan",
      name: "Gợi ý riêng",
      description: null,
      filters: { customerName: "Chị Lan", customerPhone: "0987654321", personalizedGreeting: "Chúc mừng sinh nhật" },
    })

    const result = await getPublicCatalog("rieng-cho-chi-lan")
    expect(result.status).toBe("ACTIVE")
    if (result.status !== "ACTIVE") return
    expect(result.customer?.name).toBe("Chị Lan")
    expect(JSON.stringify(result)).not.toContain("0987654321")
  })
})