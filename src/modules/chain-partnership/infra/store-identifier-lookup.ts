import type { PrismaClient } from "@/generated/prisma/client"

/**
 * Tìm cửa hàng sẵn có cho Chuỗi liên kết — tách khỏi `prisma-partnership-repository.ts` (K11).
 *
 * Audit hành trình 06/11/2026 (C1): trước đây khớp cả theo TÊN tổ chức (không phân biệt hoa thường) và trả về
 * email/SĐT chủ tiệm cho tổ chức gọi. Nay chỉ khớp chính xác slug hoặc email chủ tiệm (thông tin cửa hàng tự
 * đưa cho Chuỗi), và chỉ trả id + tên.
 */
export interface StoreByIdentifier {
  orgId: string
  orgName: string
}

export async function findStoreByIdentifier(db: PrismaClient, identifier: string): Promise<StoreByIdentifier | null> {
  const key = identifier.trim().toLowerCase()
  if (!key) return null

  const org = await db.organizations.findUnique({ where: { slug: key }, select: { id: true, name: true } })
  if (org) return { orgId: org.id, orgName: org.name }

  // Email chủ tiệm: chỉ tổ chức người đó đang là thành viên hoạt động, lâu nhất (chủ tiệm tạo tổ chức).
  const user = await db.users.findUnique({
    where: { email: key },
    select: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { invited_at: "asc" },
        take: 1,
        select: { organization: { select: { id: true, name: true } } },
      },
    },
  })
  const owned = user?.memberships[0]?.organization
  return owned ? { orgId: owned.id, orgName: owned.name } : null
}
