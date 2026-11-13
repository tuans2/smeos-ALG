import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

/**
 * Tài khoản nhận tiền thuê bao của nền tảng (checklist ALG 10.7) — `platform_settings.platform_billing_account`,
 * Console nhập. Chưa nhập thì hoá đơn không hiện mã VietQR (không bao giờ dùng số tài khoản mẫu).
 */
export const BILLING_ACCOUNT_KEY = "platform_billing_account"

export interface BillingAccount { bankBin: string; bankName: string; accountNumber: string; accountHolder: string }

export function parseBillingAccount(raw: unknown): BillingAccount | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  if (!r) return null
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string).trim() : "")
  const acc = { bankBin: s("bankBin"), bankName: s("bankName"), accountNumber: s("accountNumber"), accountHolder: s("accountHolder") }
  return /^\d{6}$/.test(acc.bankBin) && /^\d{6,20}$/.test(acc.accountNumber) && acc.accountHolder ? acc : null
}

export async function readBillingAccount(): Promise<BillingAccount | null> {
  const row = await prisma.platform_settings.findUnique({ where: { key: BILLING_ACCOUNT_KEY } })
  return parseBillingAccount(row?.value)
}

export async function writeBillingAccount(acc: BillingAccount, actorUserId: string): Promise<void> {
  const value = acc as unknown as Prisma.InputJsonValue
  await prisma.platform_settings.upsert({
    where: { key: BILLING_ACCOUNT_KEY },
    create: { key: BILLING_ACCOUNT_KEY, value, updated_by: actorUserId },
    update: { value, updated_by: actorUserId },
  })
}
