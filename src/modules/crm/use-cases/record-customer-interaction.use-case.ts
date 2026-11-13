import { z } from "zod"
import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerInteraction } from "../domain/customer-segment"
import {
  CUSTOMER_INTERACTION_CHANNELS,
  CUSTOMER_INTERACTION_DIRECTIONS,
} from "../domain/customer-segment"
import type { ICustomerInteractionRepository } from "../domain/repositories/customer-interaction-repository.interface"
import type { ICustomerRepository } from "../domain/repositories/customer-repository.interface"
import { getCustomerInteractionRepository } from "../infra/customer-interaction-repository"
import { getCustomerRepository } from "../infra/customer-repository"

export const recordCustomerInteractionInputSchema = z.object({
  customerId: z.string().uuid("Mã khách hàng không hợp lệ"),
  channel: z.enum(CUSTOMER_INTERACTION_CHANNELS),
  direction: z.enum(CUSTOMER_INTERACTION_DIRECTIONS).default("OUTBOUND"),
  assetUsageId: z.string().uuid().optional().nullable(),
  summary: z.string().trim().min(1, "Nội dung tương tác không được để trống"),
  outcome: z.string().trim().optional().nullable(),
  occurredAt: z.coerce.date().optional(),
})

export type RecordCustomerInteractionInput = z.input<typeof recordCustomerInteractionInputSchema>

export async function recordCustomerInteractionUseCase(
  ctx: TenantContext,
  rawInput: RecordCustomerInteractionInput,
  interactionRepo: ICustomerInteractionRepository = getCustomerInteractionRepository(),
  customerRepo: ICustomerRepository = getCustomerRepository()
): Promise<CustomerInteraction> {
  const input = recordCustomerInteractionInputSchema.parse(rawInput)

  const customer = await customerRepo.getById(ctx, input.customerId)
  if (!customer) {
    throw notFound()
  }

  return interactionRepo.create(ctx, {
    customerId: input.customerId,
    channel: input.channel,
    direction: input.direction,
    assetUsageId: input.assetUsageId ?? null,
    summary: input.summary,
    outcome: input.outcome ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    createdBy: ctx.userId ?? "system",
  })
}

