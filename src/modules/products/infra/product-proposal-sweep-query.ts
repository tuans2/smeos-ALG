import { prisma } from "@/core/tenancy/infra/prisma"

export type ProposalSweepRow = {
  id: string
  organization_id: string
  name: string
  code: string
  status: string
  attributes: unknown
}

/**
 * Truy vấn XUYÊN tổ chức cho tác vụ quét mẫu đề xuất (`internal/chain-dispatch-sweep`,
 * xác thực bằng CRON_SECRET) — cùng dạng `ChainDispatchSweepQuery`. Chỉ đọc; mọi
 * lần ghi đi qua repository có `TenantContext` của đúng tổ chức của từng dòng.
 * Bỏ mẫu đã vào thùng rác (`ARCHIVED`).
 */
export class ProductProposalSweepQuery {
  listPage(limit: number, afterId: string | null): Promise<ProposalSweepRow[]> {
    return prisma.products.findMany({
      where: {
        status: { not: "ARCHIVED" },
        OR: (["pending", "rejected", "expired"] as const).map((s) => ({ attributes: { path: ["proposal", "status"], equals: s } })),
        ...(afterId ? { id: { gt: afterId } } : {}),
      },
      orderBy: { id: "asc" },
      take: limit,
      select: { id: true, organization_id: true, name: true, code: true, status: true, attributes: true },
    })
  }
}
