import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { updateCurrentOrganization } from "@/modules/organization/use-cases/update-current-organization"
import {
  DISPLAY_SETTINGS_KEY,
  OPTIONAL_DISPLAY_FIELDS,
  REQUIRED_DISPLAY_FIELDS,
  readDisplaySettings,
  sanitizeEnabledFields,
  type DisplaySettings,
} from "../domain/display-fields"
import { PRICE_VISIBILITY_KEY, readPriceVisibility, type PriceVisibility } from "../domain/price-visibility"
import { THANK_YOU_KEY, readThankYouPolicy, type ThankYouPolicy } from "../domain/thank-you-voucher"
import { GREETING_TEMPLATES } from "../domain/greeting-template-registry"

export interface DisplaySettingsView {
  required: readonly string[]
  fields: readonly { key: string; label: string }[]
  /** Chỉ các mẫu cửa hàng đã chỉnh; mẫu vắng mặt = mặc định bật tất cả */
  settings: DisplaySettings
  /** Công tắc giá và thông tin giảm giá cho cả cửa hàng (ALG 5.5) */
  pricing: PriceVisibility
  /** Mã cảm ơn dùng một lần sau đơn hoàn tất (ALG 5.15) */
  thankYou: ThankYouPolicy
}

function view(orgSettings: unknown): DisplaySettingsView {
  return {
    required: REQUIRED_DISPLAY_FIELDS,
    fields: OPTIONAL_DISPLAY_FIELDS,
    settings: readDisplaySettings(orgSettings),
    pricing: readPriceVisibility(orgSettings),
    thankYou: readThankYouPolicy(orgSettings),
  }
}

/** Cấu hình hiển thị Thẻ chào của cửa hàng hiện tại. */
export async function getDisplaySettings(ctx: TenantContext): Promise<DisplaySettingsView> {
  const org = await getCurrentOrganization(ctx)
  if (!org) throw notFound()
  return view(org.settings)
}

/**
 * Lưu các trường bật cho một mẫu và/hoặc công tắc giá, giảm giá; giữ nguyên cấu hình các mẫu khác
 * và các khoá cài đặt khác.
 */
export async function updateDisplaySettings(
  ctx: TenantContext,
  input: {
    templateId?: string | undefined
    fields?: unknown
    pricing?: { hidePrice?: boolean | undefined; showDiscounts?: boolean | undefined } | undefined
    thankYou?: { enabled?: boolean | undefined; percent?: number | undefined } | undefined
  },
): Promise<DisplaySettingsView> {
  if (input.templateId === undefined && input.pricing === undefined && input.thankYou === undefined) throw validationFailed({ body: "Không có cài đặt nào để lưu" })
  if (input.templateId !== undefined && !(input.templateId in GREETING_TEMPLATES)) throw validationFailed({ templateId: "Mẫu không tồn tại" })
  const org = await getCurrentOrganization(ctx)
  if (!org) throw notFound()
  const patch: Record<string, unknown> = {}
  if (input.templateId !== undefined) {
    patch[DISPLAY_SETTINGS_KEY] = { ...readDisplaySettings(org.settings), [input.templateId]: sanitizeEnabledFields(input.fields) }
  }
  if (input.pricing !== undefined) {
    const current = readPriceVisibility(org.settings)
    patch[PRICE_VISIBILITY_KEY] = {
      hidePrice: input.pricing.hidePrice ?? current.hidePrice,
      showDiscounts: input.pricing.showDiscounts ?? current.showDiscounts,
    } satisfies PriceVisibility
  }
  if (input.thankYou !== undefined) {
    const current = readThankYouPolicy(org.settings)
    patch[THANK_YOU_KEY] = {
      enabled: input.thankYou.enabled ?? current.enabled,
      percent: input.thankYou.percent ?? current.percent,
      validDays: current.validDays,
    } satisfies ThankYouPolicy
  }
  const updated = await updateCurrentOrganization(ctx, { settings: patch })
  return view(updated.settings)
}
