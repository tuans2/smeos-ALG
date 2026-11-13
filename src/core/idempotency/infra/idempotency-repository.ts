import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Khoá idempotent dùng chung (ROADMAP E5.3). Nguồn gửi sự kiện (Facebook, Zalo, cổng thanh toán)
 * có thể gửi lại cùng một sự kiện; chỉ lần đầu được xử lý.
 *
 * `organizationId` phải do máy chủ xác định (vd tra kênh theo page/OA id đã cấu hình), không lấy từ
 * thân sự kiện. Ghi khoá TRƯỚC khi xử lý: xử lý lỗi giữa chừng thì sự kiện gửi lại bị bỏ — chấp
 * nhận cho tin nhắn chat (tránh trả lời khách hai lần); luồng tiền phải ghi khoá trong cùng giao dịch.
 */
export const IDEMPOTENCY_RETENTION_DAYS = 30

/** `true` = lần đầu thấy khoá này, được xử lý; `false` = đã xử lý trước đó. */
export async function claimIdempotencyKey(organizationId: string, scope: string, key: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO idempotency_keys (id, organization_id, scope, key)
    VALUES (gen_random_uuid(), ${organizationId}, ${scope}, ${key})
    ON CONFLICT (organization_id, scope, key) DO NOTHING
    RETURNING id`
  return rows.length > 0
}

/** Dọn khoá cũ hơn hạn giữ — chạy toàn hệ thống từ cron, trả số dòng đã xoá. */
export async function purgeExpiredIdempotencyKeys(now: Date): Promise<number> {
  const { count } = await prisma.idempotency_keys.deleteMany({
    where: { created_at: { lt: new Date(now.getTime() - IDEMPOTENCY_RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
  })
  return count
}
