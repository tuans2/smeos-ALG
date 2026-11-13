import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, type TenantContext } from "@/core/tenancy"
import type { Prisma } from "@/generated/prisma/client"

type InputJsonValue = Prisma.InputJsonValue

export type SaveLandingPageInput = {
  title: string
  pageType: string | null
  occasionLabel: string | null
  input: unknown
  content: unknown
}

/** Kho dữ liệu v2 (L-1): ghi landing page đã sinh, theo tổ chức của phiên. */
export async function insertLandingPage(ctx: TenantContext, data: SaveLandingPageInput): Promise<{ id: string }> {
  return prisma.landing_pages.create({
    data: scopedData(ctx, {
      title: data.title,
      page_type: data.pageType,
      occasion_label: data.occasionLabel,
      input: data.input as InputJsonValue,
      content: data.content as InputJsonValue,
      created_by: ctx.userId,
    }),
    select: { id: true },
  })
}
