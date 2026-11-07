import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"
import { env } from "@/lib/env"
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
  smeosPrisma?: PrismaClient
  schemaVersion?: string
}

const CURRENT_SCHEMA_VERSION = "2026-11-07-pii-write"
if (globalForPrisma.schemaVersion !== CURRENT_SCHEMA_VERSION) {
  globalForPrisma.smeosPrisma?.$disconnect?.().catch(() => {})
  delete globalForPrisma.smeosPrisma
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
        application_name: "smeos-web",
      }, env.DB_RLS_MODE),
    ),
  })
  // ADR-014 P-3b: đọc `orders.delivery_address` → người nhận/địa chỉ lấy từ `order_recipients` (order-recipient-view.ts).
  // Kiểu kết quả không đổi (cùng cột, `recipient` chỉ còn khi người gọi xin) nên giữ kiểu `PrismaClient`.
  return base
    // ADR-014 P-5a: ghi cột cá nhân → ghi kèm bản mã/băm (pii-write.ts); khoá dữ liệu tra bằng client gốc
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            return query((await encryptPiiWriteArgs(base as unknown as PiiBaseClient, model, operation, args as never)) as typeof args)
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
          return applyRecipientView(await query(plan.args as typeof args), plan.keepRecipient)
        },
      },
    },
  }) as unknown as PrismaClient
}

export const prisma: PrismaClient = globalForPrisma.smeosPrisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.smeosPrisma = prisma
}
