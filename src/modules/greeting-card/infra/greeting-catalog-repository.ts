import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { conflict, notFound } from "@/core/http/errors"
import { Prisma } from "@/generated/prisma/client"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import type { GreetingCatalogType } from "../domain/greeting-card-types"
import { AuditLogRepository, type RecordAuditLogInput } from "@/modules/audit/infra/audit-log-repository"

const SIGNED_URL_TTL_MS = 7 * 86_400_000

/** Dòng catalog kèm sản phẩm — ảnh chính + tối đa 10 biến thể (size) theo giá tăng dần. */
export const CATALOG_ITEMS_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          images: { where: { role: "MAIN" as const }, take: 1 },
          variants: { orderBy: { multiplier: "asc" as const }, take: 10 },
          // Tồn kho theo chi nhánh — mẫu hết hàng không bán trên link khách (product-availability.ts)
          inventory: { select: { branch_id: true, status: true, quantity_available: true } },
          // Nguồn Master Index (bản phân tích APPROVED mới nhất) cho các trường hiển thị
          analyses: {
            where: { approval_state: "APPROVED" as const },
            orderBy: { created_at: "desc" as const },
            take: 1,
            select: { raw: true, edited: true },
          },
        },
      },
    },
    orderBy: { sort_order: "asc" as const },
  },
}

function signedStorageUrl(storageKey: string, exp: number): string {
  return `/api/v1/storage/${storageKey}?exp=${exp}&sig=${signStorageUrl(storageKey, exp)}`
}

/**
 * Bộ sưu tập Thẻ chào (CRUD trong phạm vi tổ chức) + ký URL ảnh.
 * `GreetingCardRepository` kế thừa lớp này và thêm phiên/link công khai.
 */
export class GreetingCatalogRepository {
  constructor(protected readonly db = prisma) {}

  /** Mọi `productIds` phải thuộc tổ chức hiện tại — bản cũ gắn được sản phẩm của tiệm khác. */
  private async assertProductsOwned(ctx: TenantContext, productIds: string[]) {
    const unique = [...new Set(productIds)]
    if (unique.length === 0) return unique
    const owned = await this.db.products.count({ where: scopedWhere(ctx, { id: { in: unique } }) })
    if (owned !== unique.length) throw notFound()
    return unique
  }

  async createCatalog(
    ctx: TenantContext,
    input: {
      code: string
      name: string
      type?: GreetingCatalogType | undefined
      description?: string | null | undefined
      filters?: Record<string, unknown> | null | undefined
      productIds?: string[] | undefined
      createdBy: string
    }
  ) {
    const productIds = await this.assertProductsOwned(ctx, input.productIds ?? [])

    const code = input.code.toLowerCase().trim()
    const taken = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { code }),
      select: { id: true },
    })
    if (taken) throw conflict(`Mã bộ sưu tập "${code}" đã tồn tại, vui lòng chọn mã khác`)

    return this.db.$transaction(async (tx) => {
      const catalog = await tx.greeting_catalogs.create({
        data: {
          organization_id: ctx.organizationId,
          code,
          name: input.name.trim(),
          type: input.type || "STANDARD",
          description: input.description ?? null,
          filters: (input.filters ?? Prisma.DbNull) as Prisma.InputJsonValue,
          created_by: input.createdBy,
        },
      })

      if (productIds.length > 0) {
        await tx.greeting_catalog_products.createMany({
          data: productIds.map((productId, index) => ({
            organization_id: ctx.organizationId,
            catalog_id: catalog.id,
            product_id: productId,
            sort_order: index,
          })),
          skipDuplicates: true,
        })
      }

      return catalog
    })
  }

  async getCatalogByCode(ctx: TenantContext, code: string) {
    return this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { code: code.toLowerCase().trim(), is_active: true }),
      select: { id: true },
    })
  }

  /** Bộ sưu tập, mới nhất trước; lấy dư 1 dòng để biết còn trang sau (`toPage`). Hỗ trợ lọc theo createdBy, trạng thái, và số ngày tạo. */
  async listCatalogs(
    ctx: TenantContext,
    options: {
      limit?: number
      cursor?: string | undefined
      createdBy?: string | undefined
      status?: "active" | "archived" | "all" | undefined
      days?: number | undefined
    } = {}
  ) {
    const limit = options.limit ?? 100
    const status = options.status ?? "active"

    let minCreatedAt: Date | undefined
    if (options.days && options.days > 0) {
      minCreatedAt = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000)
    }

    return this.db.greeting_catalogs.findMany({
      where: scopedWhere(ctx, {
        trashed_at: null, // trong thùng rác (Kho dữ liệu) thì không hiện
        ...(status === "active" ? { is_active: true } : status === "archived" ? { is_active: false } : {}),
        ...(options.createdBy ? { created_by: options.createdBy } : {}),
        ...(minCreatedAt ? { created_at: { gte: minCreatedAt } } : {}),
      }),
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { items: true, sessions: true } },
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
  }

  async getCatalogById(ctx: TenantContext, id: string) {
    const catalog = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { id }),
      include: { ...CATALOG_ITEMS_INCLUDE, _count: { select: { sessions: true } } },
    })
    if (!catalog) return null

    // Resolve storage_key → signed URL for each product's main image (chống N+1)
    const assetIds = catalog.items.flatMap((item) => item.product.images.map((img) => img.asset_id))
    const urls = await this.getAssetsStorageMap(ctx.organizationId, assetIds)

    return {
      ...catalog,
      items: catalog.items.map((item) => {
        const mainImg = item.product.images[0]
        const attrs = (item.product.attributes as Record<string, unknown>) ?? {}
        const fallbackImageUrl = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : undefined
        const masterImageUrl = (mainImg ? urls.get(mainImg.asset_id) : undefined) ?? fallbackImageUrl
        const driveFileId = fallbackImageUrl ? fallbackImageUrl.match(/[?&]file_id=([a-zA-Z0-9_-]+)/)?.[1] : undefined
        const driveLink = typeof attrs.drive_link === "string" && attrs.drive_link
          ? attrs.drive_link
          : (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined)
        return {
          ...item,
          product: { ...item.product, masterImageUrl, driveLink },
        }
      }),
    }
  }

  async updateCatalog(
    ctx: TenantContext,
    id: string,
    data: {
      name?: string | undefined
      description?: string | null | undefined
      type?: GreetingCatalogType | undefined
      isActive?: boolean | undefined
      filters?: Record<string, unknown> | null | undefined
    }
  ) {
    const result = await this.db.greeting_catalogs.updateMany({
      where: scopedWhere(ctx, { id }),
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.isActive !== undefined ? { is_active: data.isActive } : {}),
        ...(data.filters !== undefined
          ? { filters: (data.filters ?? Prisma.DbNull) as Prisma.InputJsonValue }
          : {}),
      },
    })
    if (result.count === 0) throw notFound()
  }

  async deleteCatalog(ctx: TenantContext, id: string) {
    // Soft delete: đặt is_active=false, không xóa thật
    const result = await this.db.greeting_catalogs.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { is_active: false },
    })
    if (result.count === 0) throw notFound()
  }

  /** Ẩn/khôi phục catalog và ghi `audit_logs` trong CÙNG transaction — không có thay đổi nào thiếu dấu vết. */
  async setCatalogActiveWithAudit(ctx: TenantContext, id: string, isActive: boolean, audit: RecordAuditLogInput) {
    await this.db.$transaction(async (tx) => {
      const result = await tx.greeting_catalogs.updateMany({
        where: scopedWhere(ctx, { id }),
        data: { is_active: isActive },
      })
      if (result.count === 0) throw notFound()
      await new AuditLogRepository(tx).record(ctx, audit)
    })
  }

  async addProductToCatalog(ctx: TenantContext, catalogId: string, productId: string) {
    const catalog = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { id: catalogId }),
      select: { id: true },
    })
    if (!catalog) throw notFound()
    await this.assertProductsOwned(ctx, [productId])

    const maxOrder = await this.db.greeting_catalog_products.aggregate({
      where: { catalog_id: catalogId },
      _max: { sort_order: true },
    })

    return this.db.greeting_catalog_products.upsert({
      where: { catalog_id_product_id: { catalog_id: catalogId, product_id: productId } },
      create: {
        organization_id: ctx.organizationId,
        catalog_id: catalogId,
        product_id: productId,
        sort_order: (maxOrder._max.sort_order ?? -1) + 1,
      },
      update: {},
    })
  }

  async removeProductFromCatalog(ctx: TenantContext, catalogId: string, productId: string) {
    const catalog = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { id: catalogId }),
      select: { id: true },
    })
    if (!catalog) throw notFound()

    return this.db.greeting_catalog_products.deleteMany({
      where: { organization_id: ctx.organizationId, catalog_id: catalogId, product_id: productId },
    })
  }

  /** Ký URL ảnh — chỉ ký asset của đúng tổ chức sở hữu thẻ. */
  async getAssetsStorageMap(organizationId: string, assetIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (assetIds.length === 0) return map
    const assets = await this.db.assets.findMany({
      where: { id: { in: [...new Set(assetIds)] }, organization_id: organizationId },
      select: { id: true, storage_key: true },
    })
    const exp = Date.now() + SIGNED_URL_TTL_MS
    for (const a of assets) map.set(a.id, signedStorageUrl(a.storage_key, exp))
    return map
  }

  async getPaymentProofAssetsMap(
    organizationId: string,
    assetIds: string[]
  ): Promise<Map<string, { url: string; analysis?: import("../domain/payment-proof-analysis").PaymentProofAnalysisResult | null }>> {
    const map = new Map<string, { url: string; analysis?: import("../domain/payment-proof-analysis").PaymentProofAnalysisResult | null }>()
    if (assetIds.length === 0) return map
    const assets = await this.db.assets.findMany({
      where: { id: { in: [...new Set(assetIds)] }, organization_id: organizationId },
      select: { id: true, storage_key: true, metadata: true },
    })
    const exp = Date.now() + SIGNED_URL_TTL_MS
    for (const a of assets) {
      const meta = (a.metadata as Record<string, unknown> | null) ?? {}
      map.set(a.id, {
        url: signedStorageUrl(a.storage_key, exp),
        analysis: (meta.ai_analysis as import("../domain/payment-proof-analysis").PaymentProofAnalysisResult | undefined) ?? null,
      })
    }
    return map
  }

  async getAssetStorageUrl(organizationId: string, assetId: string): Promise<string | null> {
    const map = await this.getAssetsStorageMap(organizationId, [assetId])
    return map.get(assetId) ?? null
  }
}

let _greetingCatalogRepositorySingleton: GreetingCatalogRepository | null = null
export function getGreetingCatalogRepository(): GreetingCatalogRepository {
  if (!_greetingCatalogRepositorySingleton) _greetingCatalogRepositorySingleton = new GreetingCatalogRepository()
  return _greetingCatalogRepositorySingleton
}
