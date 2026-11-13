import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./db-client"

/**
 * Đồng thời hoá bằng giao dịch cơ sở dữ liệu, không bằng khoá ghi toàn cục
 * (`YC-T9`). Đây là phản đề trực tiếp của `he_thong.giu_khoa()` ở FloraOS v1,
 * nơi một khoá 15 phút thuộc về một thư mục chứ không thuộc về tổ chức.
 *
 * Use-case mở giao dịch qua hàm này thay vì import `PrismaClient`, để luật
 * "không import client ngoài `infra/`" giữ được nguyên vẹn.
 */
export function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => fn(tx))
}
