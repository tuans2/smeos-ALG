import type { Prisma, PrismaClient } from "@/generated/prisma/client"

/**
 * Mọi repository nhận `DbClient` chứ không nhận `PrismaClient`, để cùng một
 * repository chạy được cả ngoài lẫn trong một giao dịch (đặc tả 05 mục 6:
 * kiểm hạn mức → ghi usage → tạo generation_jobs → NOTIFY, cùng một giao
 * dịch).
 */
export type DbClient = PrismaClient | Prisma.TransactionClient
