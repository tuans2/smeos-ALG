import { z } from "zod"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerSegment } from "../domain/customer-segment"
import { customerSegmentRulesSchema } from "../domain/customer-segment"
import type { ICustomerSegmentRepository } from "../domain/repositories/customer-segment-repository.interface"
import { getCustomerSegmentRepository } from "../infra/customer-segment-repository"

export const createCustomerSegmentInputSchema = z.object({
  name: z.string().trim().min(1, "Tên nhóm khách hàng không được để trống"),
  description: z.string().trim().optional(),
  kind: z.enum(["DYNAMIC", "STATIC"]).default("DYNAMIC"),
  rules: customerSegmentRulesSchema.optional(),
})

export type CreateCustomerSegmentInput = z.input<typeof createCustomerSegmentInputSchema>

export async function createCustomerSegmentUseCase(
  ctx: TenantContext,
  rawInput: CreateCustomerSegmentInput,
  repo: ICustomerSegmentRepository = getCustomerSegmentRepository()
): Promise<CustomerSegment> {
  const input = createCustomerSegmentInputSchema.parse(rawInput)

  return repo.create(ctx, {
    name: input.name,
    description: input.description ?? null,
    kind: input.kind,
    rules: input.rules ?? null,
    createdBy: ctx.userId ?? "system",
  })
}

