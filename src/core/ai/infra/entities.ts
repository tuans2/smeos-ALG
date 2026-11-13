/** Xem quy ước ở `src/modules/organization/infra/entities.ts`. */
import type { Prisma } from "@/generated/prisma/client"

export type {
  ai_capabilities,
  ai_models,
  ai_policies,
  ai_requests,
  ai_evaluations,
} from "@/generated/prisma/client"

export type InputJsonValue = Prisma.InputJsonValue
