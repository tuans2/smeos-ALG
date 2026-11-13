import type { prisma } from "@/core/tenancy/infra/prisma"

type Db = Pick<typeof prisma, "greeting_sessions" | "memberships">

/**
 * Chi nhánh của Sale phụ trách link mà khách dùng để đặt đơn — đơn Thẻ chào thuộc chi nhánh đó, để
 * nhân viên chi nhánh khác không thấy (checklist ALG 9.13). Sale không gắn chi nhánh → `null` (toàn tổ chức).
 */
export async function saleBranchOfSession(db: Db, organizationId: string, sessionId: string | null | undefined): Promise<string | null> {
  if (!sessionId) return null
  const session = await db.greeting_sessions.findFirst({ where: { id: sessionId, organization_id: organizationId }, select: { sale_id: true } })
  if (!session?.sale_id) return null
  const membership = await db.memberships.findFirst({
    where: { organization_id: organizationId, user_id: session.sale_id, status: "ACTIVE" },
    select: { branch_id: true },
  })
  return membership?.branch_id ?? null
}
