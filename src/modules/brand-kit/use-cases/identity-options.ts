/**
 * Bước 2 — Bộ nhận diện thương hiệu. Sinh phương án từ Hồ sơ cửa hàng (không nhận nội dung từ trình duyệt),
 * và áp phương án được chọn vào `brand_profiles` (màu, phông chữ, khẩu hiệu, logo) — nơi mọi công cụ khác
 * và trang Cài đặt cùng đọc, nên hai nơi luôn đồng bộ.
 */
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { callCapability } from "@/core/ai/gateway"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import { log } from "@/core/observability/log"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { ACTIVE_PROMPTS } from "@/modules/content-engine/domain/prompts/active"
import type { BrandIdentityLine, BrandIdentityPromptInput } from "@/modules/content-engine/domain/prompts/brand-identity/v1"
import { getBrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import { createBrandIdentityAdapter } from "../adapters/brand-identity-ai-adapter"
import { lockedReason } from "../domain/brand-journey"
import { BRAND_STYLES } from "../domain/brand-styles"
import { buildIdentityOption, cleanSlogan, parseIdentityContent, type IdentityOptionContent } from "../domain/identity-option"
import { buildLogoSvg } from "../domain/logo-svg"
import { planGeneration, type GenerationMode, type Slot } from "../domain/option-rules"
import { batchStateOf, defaultBrandKitDeps, loadBrandKitContext, type BrandKitContext, type BrandKitDeps } from "./brand-kit-context"
import { runPaidOption, type PaidOptionUsage } from "./paid-option-job"
import { storeGeneratedLogo } from "./store-generated-logo"

export type SloganWriter = (ctx: TenantContext, input: BrandIdentityPromptInput, jobId: string | null) => Promise<BrandIdentityLine[] | null>

/** AI viết khẩu hiệu qua cổng AI; không chạy được → null (dùng khẩu hiệu mẫu). */
export const writeSlogansWithAi: SloganWriter = async (ctx, input, jobId) => {
  try {
    const r = await callCapability(
      { capability: "content_generation", privacy: "SHOP", source: "CORE", jobId },
      createBrandIdentityAdapter(createContentLLM(), input, ctx.organizationId),
      aiGatewayDeps(ctx)
    )
    log.info("brand_identity.slogans", {
      organizationId: ctx.organizationId, promptId: ACTIVE_PROMPTS.brandIdentity.id,
      promptVersion: ACTIVE_PROMPTS.brandIdentity.version, source: r.kind === "xong" ? "ai" : "template",
    })
    return r.kind === "xong" ? r.output : null
  } catch {
    return null
  }
}

export interface IdentityDeps extends BrandKitDeps {
  readonly writeSlogans: SloganWriter
  readonly storeLogo: (ctx: TenantContext, svg: string) => Promise<string>
}

export const defaultIdentityDeps = (): IdentityDeps => ({
  ...defaultBrandKitDeps(),
  writeSlogans: writeSlogansWithAi,
  storeLogo: (ctx, svg) => storeGeneratedLogo(ctx, svg),
})

async function composeOptions(ctx: TenantContext, k: BrandKitContext, slots: readonly Slot[], jobId: string | null, deps: IdentityDeps) {
  const b = k.business!
  const lines = await deps.writeSlogans(ctx, {
    shopName: b.display_name,
    description: b.description,
    brandMessage: b.brand_message,
    targetCustomers: b.target_customers,
    industryLabel: null,
    styles: slots.map((s) => ({ key: s.style, label: BRAND_STYLES[s.style].label, voiceHint: BRAND_STYLES[s.style].voiceHint, variant: s.variant })),
    avoid: k.identity.map((o) => o.content.slogan),
  }, jobId)
  const used = new Set(k.identity.map((o) => o.content.slogan.toLocaleLowerCase("vi")))
  const options = slots.map((slot) => {
    const line = lines?.find((l) => l.style_key === slot.style)
    const slogan = cleanSlogan(line?.slogan)
    const fresh = slogan && !used.has(slogan.toLocaleLowerCase("vi")) ? slogan : null
    if (fresh) used.add(fresh.toLocaleLowerCase("vi"))
    return buildIdentityOption({ style: slot.style, variant: slot.variant, shopName: b.display_name, slogan: fresh, rationale: line?.rationale ?? null })
  })
  return { options, aiRan: lines !== null }
}

export interface GenerateIdentityResult {
  readonly created: readonly { id: string; content: IdentityOptionContent }[]
  readonly usage: PaidOptionUsage | null
}

export async function generateIdentityOptions(
  ctx: TenantContext,
  input: { mode: GenerationMode; idempotencyKey: string | null },
  deps: IdentityDeps = defaultIdentityDeps()
): Promise<GenerateIdentityResult> {
  requireCapability(ctx, "F2")
  const k = await loadBrandKitContext(ctx, deps)
  const locked = lockedReason("IDENTITY", k.flags)
  if (locked) throw validationFailed({ step: locked, missing: k.profile.missing.map((m) => m.label) })

  const plan = planGeneration(batchStateOf(k.identity, k.identityFingerprint), input.mode)
  if (!plan.ok) throw conflict(plan.reason)

  const save = async (jobId: string | null) => {
    const { options, aiRan } = await composeOptions(ctx, k, plan.slots, jobId, deps)
    const rows = await deps.repo.createMany(ctx, options.map((content) => ({
      kind: "IDENTITY" as const, style_key: content.style_key, batch: plan.batch, content,
      profile_fingerprint: k.identityFingerprint, job_id: jobId,
    })))
    return { value: rows.map((r, i) => ({ id: r.id, content: options[i]! })), aiRan }
  }

  if (!plan.paid) return { created: (await save(null)).value, usage: null }
  if (!input.idempotencyKey) throw validationFailed({ "idempotency-key": "Bắt buộc khi tạo thêm phương án" })
  const paid = await runPaidOption(ctx, { kind: "IDENTITY", idempotencyKey: input.idempotencyKey, payload: { batch: plan.batch } }, save, async (jobId) => {
    const rows = (await deps.repo.list(ctx, "IDENTITY")).filter((r) => r.job_id === jobId)
    const parsed = rows.flatMap((r) => { const c = parseIdentityContent(r.content); return c ? [{ id: r.id, content: c }] : [] })
    return parsed.length > 0 ? parsed : null
  })
  return { created: paid.value, usage: paid.usage }
}

export async function selectIdentityOption(ctx: TenantContext, optionId: string, deps: IdentityDeps = defaultIdentityDeps()) {
  requireCapability(ctx, "F2")
  const k = await loadBrandKitContext(ctx, deps)
  const locked = lockedReason("IDENTITY", k.flags)
  if (locked) throw validationFailed({ step: locked })
  const option = k.identity.find((o) => o.row.id === optionId)
  if (!option) throw notFound()

  const c = option.content
  let logoAssetId = k.brand?.logo_asset_id ?? null
  let content = c
  if (!k.uploadedLogo) {
    logoAssetId = c.generated_logo_asset_id ?? await deps.storeLogo(ctx, buildLogoSvg({
      name: k.business!.display_name, initials: c.initials, palette: c.palette, fontHeading: c.font_heading, layout: c.logo_layout,
    }))
    if (c.generated_logo_asset_id !== logoAssetId) {
      content = { ...c, generated_logo_asset_id: logoAssetId }
      await deps.repo.updateContent(ctx, optionId, content)
    }
  }

  const brandRepo = getBrandProfileRepository()
  const current = await brandRepo.current(ctx)
  await brandRepo.upsert(ctx, {
    primary_color: c.palette.primary,
    secondary_color: c.palette.secondary,
    accent_color: c.palette.accent,
    background_color: c.palette.background,
    text_color: c.palette.text,
    font_heading: c.font_heading,
    font_body: c.font_body,
    logo_asset_id: logoAssetId,
    slogan: c.slogan,
    tone_of_voice: current?.tone_of_voice ?? null,
    hashtags: current?.hashtags ?? null,
    cta_templates: current?.cta_templates ?? null,
    default_offers: current?.default_offers ?? null,
    forbidden_styles: current?.forbidden_styles ?? null,
    brand_assets: current?.brand_assets ?? null,
  })
  if (!(await deps.repo.select(ctx, "IDENTITY", optionId, new Date()))) throw notFound()
  return { id: optionId, content, logo_asset_id: logoAssetId }
}
