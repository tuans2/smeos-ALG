/** Xem quy ước ở `src/modules/organization/infra/entities.ts`. */
import type { Prisma } from "@/generated/prisma/client"

export type {
  approval_state,
  pricing_rules,
  product_analyses,
  product_change_requests,
  product_import_batches,
  product_revisions,
  product_status,
  products,
} from "@/generated/prisma/client"

/** Kiểu giá trị JSON hợp lệ để ghi vào cột `Json` qua Prisma. */
export type InputJsonValue = Prisma.InputJsonValue
