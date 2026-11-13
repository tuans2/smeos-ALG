import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./db-client"

/**
 * Ba việc trong một giao dịch (đặc tả 05 mục 6): kiểm hạn mức → ghi usage →
 * tạo generation_jobs → NOTIFY. `NOTIFY` gửi qua `pg_notify()` bên trong
 * CHÍNH giao dịch này — Postgres tự trì hoãn phát sự kiện `NOTIFY` tới sau
 * khi giao dịch commit, nên gọi `pg_notify` trong `tx` vẫn đúng thứ tự "đánh
 * thức worker sau khi dòng job nhìn thấy được", không cần một bước riêng
 * ngoài giao dịch.
 */
export function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return prisma.$transaction((tx) => fn(tx))
}
