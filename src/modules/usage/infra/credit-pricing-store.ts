import { prisma } from "@/core/tenancy/infra/prisma"
import type { InputJsonValue } from "./entities"
import type { DbClient } from "./db-client"
import { parseCreditPricing, type CreditPricing } from "../domain/credit-pricing"

/** `platform_settings.credit_pricing` — cấu hình quy đổi credit cấp nền tảng (PO Q10). */
export const CREDIT_PRICING_KEY = "credit_pricing"

export async function readCreditPricing(db: DbClient = prisma): Promise<CreditPricing> {
  const row = await db.platform_settings.findUnique({ where: { key: CREDIT_PRICING_KEY } })
  return parseCreditPricing(row?.value)
}

export async function writeCreditPricing(value: CreditPricing, actorUserId: string): Promise<CreditPricing> {
  await prisma.platform_settings.upsert({
    where: { key: CREDIT_PRICING_KEY },
    create: { key: CREDIT_PRICING_KEY, value: value as unknown as InputJsonValue, updated_by: actorUserId },
    update: { value: value as unknown as InputJsonValue, updated_by: actorUserId },
  })
  return value
}
