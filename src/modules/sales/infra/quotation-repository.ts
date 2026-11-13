import { randomBytes } from "node:crypto"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, quotation_status } from "@/generated/prisma/client"
import type { PublicQuotationView, Quotation, QuotationStatus } from "../domain/quotation"
import type {
  CreateQuotationDTO,
  IQuotationRepository,
  QuotationFilter,
  QuotationReferences,
  UpdateQuotationDTO,
} from "../domain/repositories/quotation-repository.interface"
import {
  PUBLIC_QUOTATION_INCLUDE,
  QUOTATION_INCLUDE,
  type QuotationRowWithRelations,
  toDomain,
  toPublicView,
} from "./quotation-mapper"
import { findForeignQuotationReferences } from "./quotation-reference-guard"

const CODE_ATTEMPTS = 5

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"
}

/** 32 byte ngẫu nhiên (256 bit), mã hoá base64url — 43 ký tự, an toàn trong URL. */
function generatePublicToken(): string {
  return randomBytes(32).toString("base64url")
}

export class QuotationRepository implements IQuotationRepository {
  async generateNextCode(ctx: TenantContext): Promise<string> {
    const count = await prisma.quotations.count({
      where: scopedWhere(ctx),
    })
    const num = (count + 1).toString().padStart(4, "0")
    return `BG-${num}`
  }

  /**
   * Mã `BG-xxxx` đánh số theo tổ chức nên hai yêu cầu đồng thời có thể lấy cùng số:
   * trùng mã → sinh lại số mới và thử lại, tối đa `CODE_ATTEMPTS` lần.
   */
  async create(ctx: TenantContext, dto: CreateQuotationDTO): Promise<Quotation> {
    let code = dto.code
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.insert(ctx, { ...dto, code })
      } catch (err) {
        if (!isUniqueViolation(err) || attempt >= CODE_ATTEMPTS) throw err
        code = await this.generateNextCode(ctx)
      }
    }
  }

  private async insert(ctx: TenantContext, dto: CreateQuotationDTO): Promise<Quotation> {
    const created = await prisma.quotations.create({
      data: {
        organization_id: ctx.organizationId,
        code: dto.code,
        public_token: generatePublicToken(),
        lead_id: dto.leadId ?? null,
        customer_id: dto.customerId ?? null,
        asset_usage_id: dto.assetUsageId ?? null,
        status: (dto.status ?? "DRAFT") as quotation_status,
        valid_until: dto.validUntil ?? null,
        subtotal: dto.subtotal,
        discount_amount: dto.discountAmount,
        shipping_fee: dto.shippingFee,
        total_amount: dto.totalAmount,
        terms: dto.terms ?? null,
        notes: dto.notes ?? null,
        created_by: dto.createdBy,
        items: {
          create: dto.items.map((it) => ({
            product_id: it.productId ?? null,
            name: it.name,
            variant_label: it.variantLabel ?? null,
            qty: it.qty,
            unit_price: it.unitPrice,
            total_price: it.totalPrice,
            note: it.note ?? null,
          })),
        },
      },
      include: QUOTATION_INCLUDE,
    })
    return toDomain(created)
  }

  async findById(ctx: TenantContext, id: string): Promise<Quotation | null> {
    const row = await prisma.quotations.findFirst({
      where: {
        ...scopedWhere(ctx),
        id,
      },
      include: QUOTATION_INCLUDE,
    })
    return row ? toDomain(row) : null
  }

  async findByCode(ctx: TenantContext, code: string): Promise<Quotation | null> {
    const row = await prisma.quotations.findFirst({
      where: {
        ...scopedWhere(ctx),
        code,
      },
      include: QUOTATION_INCLUDE,
    })
    return row ? toDomain(row) : null
  }

  async findPublicByToken(token: string): Promise<PublicQuotationView | null> {
    // Đọc không có TenantContext có chủ đích: token 256 bit là quyền xem duy nhất.
    const row = await prisma.quotations.findFirst({
      where: { public_token: token, status: { not: "DRAFT" } },
      include: PUBLIC_QUOTATION_INCLUDE,
    })
    if (!row) return null
    // Ảnh mẫu: chỉ ký asset thuộc đúng tổ chức sở hữu báo giá (checklist ALG 3.11)
    const assetIds = row.items.flatMap((it) => (it.product?.images[0] ? [it.product.images[0].asset_id] : []))
    const urls = new Map<string, string>()
    if (assetIds.length > 0) {
      const assets = await prisma.assets.findMany({ where: { id: { in: assetIds }, organization_id: row.organization_id }, select: { id: true, storage_key: true } })
      const exp = Date.now() + PUBLIC_IMAGE_TTL_MS
      for (const a of assets) urls.set(a.id, `/api/v1/storage/${a.storage_key}?exp=${exp}&sig=${signStorageUrl(a.storage_key, exp)}`)
    }
    return toPublicView(row, urls)
  }

  findForeignReferences(ctx: TenantContext, refs: QuotationReferences): Promise<string[]> {
    return findForeignQuotationReferences(ctx, refs)
  }

  async claimConversion(ctx: TenantContext, id: string, fromStatus: QuotationStatus): Promise<boolean> {
    const { count } = await prisma.quotations.updateMany({
      where: scopedWhere(ctx, { id, status: fromStatus as quotation_status }),
      data: { status: "CONVERTED" },
    })
    return count === 1
  }

  async releaseConversion(ctx: TenantContext, id: string, toStatus: QuotationStatus): Promise<void> {
    await prisma.quotations.updateMany({
      where: scopedWhere(ctx, { id, status: "CONVERTED" as quotation_status, converted_order_id: null }),
      data: { status: toStatus as quotation_status },
    })
  }

  async list(
    ctx: TenantContext,
    filter?: QuotationFilter,
  ): Promise<{ items: Quotation[]; total: number; nextCursor?: string | undefined }> {
    const where: Prisma.quotationsWhereInput = {
      ...scopedWhere(ctx),
    }

    if (filter?.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status as quotation_status[] }
      } else {
        where.status = filter.status as quotation_status
      }
    }
    if (filter?.leadId) {
      where.lead_id = filter.leadId
    }
    if (filter?.customerId) {
      where.customer_id = filter.customerId
    }
    if (filter?.search) {
      where.OR = [
        { code: { contains: filter.search, mode: "insensitive" } },
        { terms: { contains: filter.search, mode: "insensitive" } },
        { notes: { contains: filter.search, mode: "insensitive" } },
      ]
    }

    const limit = Math.min(Math.max(filter?.limit ?? 20, 1), 100)

    const findArgs: Prisma.quotationsFindManyArgs = {
      where,
      take: limit + 1,
      orderBy: { created_at: "desc" },
      include: QUOTATION_INCLUDE,
      ...(filter?.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.quotations.findMany(findArgs) as Promise<QuotationRowWithRelations[]>,
      prisma.quotations.count({ where }),
    ])

    let nextCursor: string | undefined
    let items = rows
    if (rows.length > limit) {
      const nextRow = rows[limit]
      if (nextRow) {
        nextCursor = nextRow.id
      }
      items = rows.slice(0, limit)
    }

    return {
      items: items.map(toDomain),
      total,
      nextCursor,
    }
  }

  async update(ctx: TenantContext, id: string, dto: UpdateQuotationDTO): Promise<Quotation> {
    const updateData: Prisma.quotationsUpdateInput = {}

    if (dto.status !== undefined) updateData.status = dto.status as quotation_status
    if (dto.validUntil !== undefined) updateData.valid_until = dto.validUntil
    if (dto.subtotal !== undefined) updateData.subtotal = dto.subtotal
    if (dto.discountAmount !== undefined) updateData.discount_amount = dto.discountAmount
    if (dto.shippingFee !== undefined) updateData.shipping_fee = dto.shippingFee
    if (dto.totalAmount !== undefined) updateData.total_amount = dto.totalAmount
    if (dto.terms !== undefined) updateData.terms = dto.terms
    if (dto.notes !== undefined) updateData.notes = dto.notes
    if (dto.convertedOrderId !== undefined) {
      updateData.converted_order = dto.convertedOrderId
        ? { connect: { id: dto.convertedOrderId } }
        : { disconnect: true }
    }

    if (dto.items) {
      updateData.items = {
        deleteMany: {},
        create: dto.items.map((it) => ({
          product_id: it.productId ?? null,
          name: it.name,
          variant_label: it.variantLabel ?? null,
          qty: it.qty,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
          note: it.note ?? null,
        })),
      }
    }

    const updated = await prisma.quotations.update({
      where: scopedWhere(ctx, { id }),
      data: updateData,
      include: QUOTATION_INCLUDE,
    })
    return toDomain(updated)
  }

  async countByStatus(ctx: TenantContext): Promise<Record<QuotationStatus, number>> {
    const counts: Record<QuotationStatus, number> = {
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      CONVERTED: 0,
    }

    const grouped = await prisma.quotations.groupBy({
      by: ["status"],
      where: scopedWhere(ctx),
      _count: { status: true },
    })

    for (const row of grouped) {
      if (row.status in counts) {
        counts[row.status as QuotationStatus] = row._count.status
      }
    }

    return counts
  }
}

const PUBLIC_IMAGE_TTL_MS = 7 * 86_400_000

let repositoryInstance: IQuotationRepository | null = null

export function getQuotationRepository(): IQuotationRepository {
  if (!repositoryInstance) {
    repositoryInstance = new QuotationRepository()
  }
  return repositoryInstance
}
