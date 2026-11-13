/** Xem quy ước ở `src/modules/organization/infra/entities.ts`. */
import type { Prisma, approval_state } from "@/generated/prisma/client"

export type {
  product_copies,
  approval_state,
} from "@/generated/prisma/client"

export type product_copiesCreateInput = Prisma.product_copiesCreateInput;
export type product_copiesUpdateInput = Prisma.product_copiesUpdateInput;
export type product_copiesWhereInput = Prisma.product_copiesWhereInput;
export type product_copiesWhereUniqueInput = Prisma.product_copiesWhereUniqueInput;