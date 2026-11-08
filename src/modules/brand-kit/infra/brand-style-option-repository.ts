import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import type {
  BrandStyleOptionRow,
  IBrandStyleOptionRepository,
  NewBrandStyleOption,
} from "../domain/repositories/brand-style-option-repository.interface"
import type { BrandOptionKind } from "../domain/option-rules"

type InputJsonValue = Prisma.InputJsonValue

const SELECT = {
  id: true, kind: true, style_key: true, batch: true, content: true, profile_fingerprint: true,
  job_id: true, selected_at: true, created_at: true,
} as const

const toRow = (r: { kind: string } & Omit<BrandStyleOptionRow, "kind">): BrandStyleOptionRow => ({ ...r, kind: r.kind as BrandOptionKind })

/** `brand_style_options` — phương án Bộ nhận diện / Landing page của mục Thương hiệu, theo tổ chức của phiên. */
export class BrandStyleOptionRepository implements IBrandStyleOptionRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async list(ctx: TenantContext, kind: BrandOptionKind): Promise<BrandStyleOptionRow[]> {
    const rows = await this.db.brand_style_options.findMany({
      where: scopedWhere(ctx, { kind }),
      orderBy: [{ batch: "desc" }, { created_at: "asc" }],
      select: SELECT,
      take: 200,
    })
    return rows.map(toRow)
  }

  async findById(ctx: TenantContext, id: string): Promise<BrandStyleOptionRow | null> {
    const row = await this.db.brand_style_options.findFirst({ where: scopedWhere(ctx, { id }), select: SELECT })
    return row ? toRow(row) : null
  }

  async createMany(ctx: TenantContext, rows: readonly NewBrandStyleOption[]): Promise<BrandStyleOptionRow[]> {
    const created = await this.db.$transaction(
      rows.map((r, i) =>
        this.db.brand_style_options.create({
          data: scopedData(ctx, {
            kind: r.kind,
            style_key: r.style_key,
            batch: r.batch,
            content: r.content as InputJsonValue,
            profile_fingerprint: r.profile_fingerprint,
            job_id: r.job_id,
            created_by: ctx.userId,
            // Thứ tự trong lượt = thứ tự tạo; cộng i ms để không trùng mốc khi tạo cùng lúc
            created_at: new Date(Date.now() + i),
          }),
          select: SELECT,
        })
      )
    )
    return created.map(toRow)
  }

  async select(ctx: TenantContext, kind: BrandOptionKind, id: string, now: Date): Promise<boolean> {
    const [, chosen] = await this.db.$transaction([
      this.db.brand_style_options.updateMany({ where: scopedWhere(ctx, { kind, NOT: { id } }), data: { selected_at: null } }),
      this.db.brand_style_options.updateMany({ where: scopedWhere(ctx, { kind, id }), data: { selected_at: now } }),
    ])
    return chosen.count === 1
  }

  async updateContent(ctx: TenantContext, id: string, content: unknown): Promise<void> {
    await this.db.brand_style_options.updateMany({ where: scopedWhere(ctx, { id }), data: { content: content as InputJsonValue } })
  }
}

let defaultRepo: IBrandStyleOptionRepository | null = null

export function getBrandStyleOptionRepository(): IBrandStyleOptionRepository {
  if (!defaultRepo) defaultRepo = new BrandStyleOptionRepository()
  return defaultRepo
}
