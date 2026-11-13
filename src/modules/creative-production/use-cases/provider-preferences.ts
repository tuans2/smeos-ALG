import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { runInTransaction } from "@/modules/jobs/infra/transaction"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"

import {
  isProviderKind,
  orgProviderOrders,
  PROVIDER_CATALOG,
  PROVIDER_KINDS,
  resolveProviderOrder,
  validateOrgOrder,
  type ProviderKind,
} from "../domain/provider-catalog"

/** Có khoá trong môi trường máy chủ (worker dùng chung `.env`). `envKey` rỗng = không cần khoá. */
function configured(envKey: string): boolean {
  return envKey === "" || Boolean(process.env[envKey]?.trim())
}

export interface ProviderPreferencesView {
  readonly kinds: Record<
    ProviderKind,
    {
      readonly label: string
      readonly order: string[]
      readonly providers: {
        key: string
        label: string
        /** Tên trung tính cho cửa hàng (không tên hãng/model). */
        display_name: string
        vendor: string
        quality: string
        note: string
        configured: boolean
      }[]
      readonly local_fallback: { key: string; label: string } | null
    }
  >
}

/** Thứ tự thử của tiệm cho một loại, kèm bên người dùng chọn cho lượt này (nếu có). */
export async function providerOrderFor(
  ctx: TenantContext,
  kind: ProviderKind,
  requested?: string | null
): Promise<string[]> {
  // Đọc cài đặt hỏng không được làm hỏng lượt tạo: lùi về thứ tự mặc định.
  const org = await getOrganizationRepository().current(ctx).catch(() => null)
  return resolveProviderOrder(kind, orgProviderOrders(org?.settings)[kind], requested)
}

/** `GET /creative-production/providers` (`I1`) — danh mục + thứ tự của tiệm + bên nào đã có khoá. */
export async function getProviderPreferences(ctx: TenantContext): Promise<ProviderPreferencesView> {
  requireCapability(ctx, "I1")
  const org = await getOrganizationRepository().current(ctx)
  const orders = orgProviderOrders(org?.settings)
  const kinds = {} as ProviderPreferencesView["kinds"]
  for (const kind of PROVIDER_KINDS) {
    const spec = PROVIDER_CATALOG[kind]
    kinds[kind] = {
      label: spec.label,
      order: resolveProviderOrder(kind, orders[kind]),
      providers: spec.providers.map((p) => ({
        key: p.key,
        label: p.label,
        display_name: p.displayName,
        vendor: p.vendor,
        quality: p.quality,
        note: p.note,
        configured: configured(p.envKey),
      })),
      local_fallback: spec.localFallback,
    }
  }
  return { kinds }
}

/**
 * `PUT /creative-production/providers` (`U2` — cùng quyền đặt chính sách AI
 * của tổ chức, trần cứng Điều hành). Ghi `organizations.settings.creative_providers[kind]`
 * + `audit_logs` trong một giao dịch.
 */
export async function setProviderOrder(ctx: TenantContext, kind: unknown, order: unknown): Promise<ProviderPreferencesView> {
  requireCapability(ctx, "U2")
  if (!isProviderKind(kind)) throw validationFailed({ kind: `Phải là một trong: ${PROVIDER_KINDS.join(", ")}` })
  const checked = validateOrgOrder(kind, order)
  if (!checked.ok) throw validationFailed({ order: checked.error })

  await runInTransaction(async (tx) => {
    const repo = getOrganizationRepository(tx)
    const org = await repo.current(ctx)
    const settings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, unknown>
    const before = orgProviderOrders(settings)[kind] ?? null
    const creative = (settings.creative_providers && typeof settings.creative_providers === "object"
      ? settings.creative_providers
      : {}) as Record<string, unknown>
    await repo.update(ctx, { settings: { ...settings, creative_providers: { ...creative, [kind]: checked.order } } })
    await recordAuditLog(
      ctx,
      { action: "creative.providers.set_order", entityType: "organization", entityId: ctx.organizationId, before: { kind, order: before }, after: { kind, order: checked.order } },
      tx
    )
  })
  return getProviderPreferences(ctx)
}
