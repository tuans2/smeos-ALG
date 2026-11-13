/** Xem quy ước ở `src/modules/organization/infra/entities.ts`. */
import type { Prisma } from "@/generated/prisma/client"

export type { business_profiles, brand_profiles } from "@/generated/prisma/client"

/** Kiểu giá trị JSON hợp lệ để ghi vào cột `Json` qua Prisma. */
export type InputJsonValue = Prisma.InputJsonValue
