/**
 * Cài đặt nút "Đặt hàng" / "Liên hệ / Cần tư vấn" trên trang khách — Điều hành bật tắt cho toàn bộ hoặc
 * từng nguồn (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.2). Lưu ở
 * `organizations.settings.order_entry_actions`; tổ chức chỉ lấy từ `ctx`.
 */

import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import {
  ORDER_ENTRY_ACTIONS_SETTINGS_KEY,
  parseEntryActionsSettings,
  resolveEntryActions,
  validateEntryActionsSettings,
  type EntryActions,
  type EntryActionsSettings,
} from "../domain/entry-actions"
import { ORDER_SOURCE_CODES, ORDER_SOURCES, type OrderSourceCode } from "../domain/order-source"

/** Nguồn có trang khách mang nút Đặt hàng / Liên hệ — hiện trong màn cài đặt. */
export const CONFIGURABLE_SOURCES: readonly OrderSourceCode[] = ORDER_SOURCE_CODES.filter((c) => ORDER_SOURCES[c].hasCustomerEntryActions)

export interface EntryActionsView {
  settings: EntryActionsSettings
  sources: { code: OrderSourceCode; label: string; effective: EntryActions }[]
}

function view(settings: EntryActionsSettings): EntryActionsView {
  return {
    settings,
    sources: CONFIGURABLE_SOURCES.map((code) => ({ code, label: ORDER_SOURCES[code].label, effective: resolveEntryActions(settings, code) })),
  }
}

export async function getEntryActions(ctx: TenantContext, repo = getOrganizationRepository()): Promise<EntryActionsView> {
  const org = await repo.current(ctx)
  if (!org) throw notFound()
  return view(parseEntryActionsSettings(org.settings))
}

export async function updateEntryActions(
  ctx: TenantContext,
  input: unknown,
  repo = getOrganizationRepository(),
  audit: typeof recordAuditLog = recordAuditLog,
): Promise<EntryActionsView> {
  const next = parseEntryActionsSettings({ [ORDER_ENTRY_ACTIONS_SETTINGS_KEY]: input })
  const errors = validateEntryActionsSettings(next)
  if (errors.length > 0) {
    throw validationFailed(Object.fromEntries(errors.map((e) => [e.source, e.message])))
  }
  const org = await repo.current(ctx)
  if (!org) throw notFound()
  const current = (org.settings as Record<string, unknown> | null) ?? {}
  await repo.updateSettings(ctx, { ...current, [ORDER_ENTRY_ACTIONS_SETTINGS_KEY]: next })
  await audit(ctx, {
    action: "orders.entry_actions_updated",
    entityType: "organizations",
    entityId: org.id,
    before: current[ORDER_ENTRY_ACTIONS_SETTINGS_KEY] ?? null,
    after: next,
  })
  return view(next)
}
