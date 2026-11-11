/**
 * POST /api/v1/chain/collection-profile/preview
 *
 * Implements preview impact calculation before publishing a Chain Collection Profile (§9.5.8):
 * - Validates rules against S3 prohibition, floor <= ceiling, S2 purpose
 * - Checks against active Store DSAs
 * - Calculates affected store counts and risk classification (R1 vs R2)
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { ChainCollectionProfileRepository } from "@/modules/field-platform/infra/chain-collection-repository"
import { previewChainCollectionProfile } from "@/modules/field-platform/use-cases/preview-chain-collection-profile"
import { type CollectionRule } from "@/modules/field-platform/domain/chain-collection-profile"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  const repo = new ChainCollectionProfileRepository()

  const body = (await request.json()) as { rules?: CollectionRule[] } | null
  // Thiếu hoặc sai dạng → 400 (audit API §17 — trước đây `Error` trần → 500)
  if (!body || !Array.isArray(body.rules)) throw validationFailed({ rules: "Danh sách quy tắc (rules) là bắt buộc." })

  const result = await previewChainCollectionProfile(ctx.organizationId, body.rules, repo)
  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
