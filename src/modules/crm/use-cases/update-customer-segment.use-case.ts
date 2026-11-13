import { z } from "zod"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerSegment } from "../domain/customer-segment"
import { customerSegmentRulesSchema } from "../domain/customer-segment"
import type { ICustomerSegmentRepository } from "../domain/repositories/customer-segment-repository.interface"
import { getCustomerSegmentRepository } from "../infra/customer-segment-repository"

export const updateCustomerSegmentInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  kind: z.enum(["DYNAMIC", "STATIC"]).optional(),
  rules: customerSegmentRulesSchema.optional(),
})

export type UpdateCustomerSegmentInput = z.input<typeof updateCustomerSegmentInputSchema>

export async function updateCustomerSegmentUseCase(
  ctx: TenantContext,
  id: string,
  rawInput: UpdateCustomerSegmentInput,
  repo: ICustomerSegmentRepository = getCustomerSegmentRepository()
): Promise<CustomerSegment | null> {
  const input = updateCustomerSegmentInputSchema.parse(rawInput)
  return repo.update(ctx, id, input)
}

