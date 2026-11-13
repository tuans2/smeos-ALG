import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

export type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Mọi thao tác điều phối đổi ba trục `orders` + `order_coordinations` +
 * `order_events` + `audit_logs` cùng lúc — một giao dịch, không phải bốn lời
 * gọi rời có thể dừng giữa chừng.
 */
export function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => fn(tx))
}

/** Lỗi trùng khoá duy nhất của Prisma (vd. hai yêu cầu cùng sinh một mã đơn). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
}
