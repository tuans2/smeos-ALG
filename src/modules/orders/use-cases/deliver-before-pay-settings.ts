/**
 * Hạn mức "giao trước, thu sau" Sale được tự quyết (§5, PO 31/10/2026) — `organizations.settings.order_deliver_before_pay`.
 * Chính sách COD / thu trước giao vẫn ở cài đặt thanh toán sẵn có của tiệm (không nhân bản ở đây).
 */

import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import {
  DELIVER_BEFORE_PAY_SETTINGS_KEY,
  parseDeliverBeforePaySettings,
  validateDeliverBeforePaySettings,
} from "../workflow/deliver-before-pay"

export async function getDeliverBeforePaySettings(ctx: TenantContext, repo = getOrganizationRepository()) {
  const org = await repo.current(ctx)
  if (!org) throw notFound()
  return parseDeliverBeforePaySettings(org.settings)
}

export async function updateDeliverBeforePaySettings(
  ctx: TenantContext,
  input: unknown,
  repo = getOrganizationRepository(),
  audit: typeof recordAuditLog = recordAuditLog,
) {
  const errors = validateDeliverBeforePaySettings(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  const org = await repo.current(ctx)
  if (!org) throw notFound()
  const current = (org.settings as Record<string, unknown> | null) ?? {}
  const next = parseDeliverBeforePaySettings({ [DELIVER_BEFORE_PAY_SETTINGS_KEY]: { ...(current[DELIVER_BEFORE_PAY_SETTINGS_KEY] as object | undefined), ...(input as object) } })
  await repo.updateSettings(ctx, { ...current, [DELIVER_BEFORE_PAY_SETTINGS_KEY]: next })
  await audit(ctx, { action: "orders.deliver_before_pay_settings_updated", entityType: "organizations", entityId: org.id, before: current[DELIVER_BEFORE_PAY_SETTINGS_KEY] ?? null, after: next })
  return next
}
