import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"
import { env } from "@/lib/env"
import { decryptPiiRow, piiResultExtension, readWithPiiKeys } from "@/core/security/infra/pii-read"
import { assertNoPiiFilter, type RuntimeModels } from "@/core/security/infra/pii-guard"
import { encryptPiiWriteArgs, type PiiBaseClient } from "@/core/security/infra/pii-write"
import { applyRecipientView, planRecipientRead } from "@/modules/orders/infra/order-recipient-view"
import { RlsPool } from "./rls-pool"

/**
 * Thể hiện `PrismaClient` duy nhất của cả hệ thống.
 *
 * Chỉ tệp nằm trong một thư mục `infra/` được import tệp này hoặc
 * `@/generated/prisma`. Module import thẳng client là đi vòng qua bộ gác tổ
 * chức, nên đó là lỗi chặn ở review — và có test khoá:
 * `tests/tenant/khong-import-prisma-ngoai-infra.test.ts`.
 *
 * Prisma 7 nối vào cơ sở dữ liệu qua driver adapter, nên chuỗi kết nối chỉ
 * xuất hiện ở đây và ở `prisma.config.ts`.
 */
const globalForPrisma = globalThis as unknown as {
  algPrisma?: PrismaClient
  schemaVersion?: string
}

const CURRENT_SCHEMA_VERSION = "2026-11-09-pii-cleanup"
if (globalForPrisma.schemaVersion !== CURRENT_SCHEMA_VERSION) {
  globalForPrisma.algPrisma?.$disconnect?.().catch(() => {})
  delete globalForPrisma.algPrisma
  globalForPrisma.schemaVersion = CURRENT_SCHEMA_VERSION
}

function createClient(): PrismaClient {
  const base = new PrismaClient({
    adapter: new PrismaPg(
      // RLS (ADR-013 D-I3, checklist ALG 1.18): pool tự đặt `app.org_id` theo ngữ cảnh của luồng đang chạy
      new RlsPool({
        connectionString: env.DATABASE_URL,
        // ADR-015 D-O5: pool có trần rõ ràng và tên ứng dụng để `pg_stat_activity` phân biệt dịch vụ.
        max: env.DATABASE_POOL_MAX,
        application_name: "alg-web",
      }, env.DB_RLS_MODE),
    ),
  })
  const runtimeModels = (base as unknown as { _runtimeDataModel?: { models: RuntimeModels } })._runtimeDataModel?.models
  // ADR-014 P-3b: đọc `orders.delivery_address` → người nhận/địa chỉ lấy từ `order_recipients` (order-recipient-view.ts).
  // Kiểu kết quả không đổi (cùng cột, `recipient` chỉ còn khi người gọi xin) nên giữ kiểu `PrismaClient`.
  return base
    // ADR-014 P-5: ghi cột cá nhân → bản mã + băm (pii-write.ts); đọc → giải mã (pii-read.ts, cả truy vấn lồng); lọc theo
    // cột cá nhân → lỗi (pii-guard.ts, P-5c); khoá dữ liệu tra bằng client gốc
    .$extends({
      result: piiResultExtension() as never,
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            assertNoPiiFilter(runtimeModels, model, args)
            const next = (await encryptPiiWriteArgs(base as unknown as PiiBaseClient, model, operation, args as never)) as typeof args
            return readWithPiiKeys(base, () => query(next))
          },
        },
      },
    })
    .$extends({
    query: {
      orders: {
        async $allOperations({ operation, args, query }) {
          const plan = planRecipientRead(operation, args as Parameters<typeof planRecipientRead>[1])
          if (!plan) return query(args)
          return applyRecipientView(await query(plan.args as typeof args), plan.keepRecipient, (r) => decryptPiiRow("order_recipients", r))
        },
      },
    },
  }) as unknown as PrismaClient
}

export const prisma: PrismaClient = globalForPrisma.algPrisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.algPrisma = prisma
}
