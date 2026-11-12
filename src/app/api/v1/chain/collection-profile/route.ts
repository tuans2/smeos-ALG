/**
 * GET & PUT /api/v1/chain/collection-profile
 *
 * Implements Chain Collection Profile management (§9.5.8):
 * - GET: Retrieves existing profile and list of collectable fields
 * - PUT: Validates and publishes a new immutable profile version
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { ChainCollectionProfileRepository } from "@/modules/field-platform/infra/chain-collection-repository"
import { getChainCollectionProfile } from "@/modules/field-platform/use-cases/get-chain-collection-profile"
import { publishChainCollectionProfile } from "@/modules/field-platform/use-cases/publish-chain-collection-profile"
import { type CollectionRule } from "@/modules/field-platform/domain/chain-collection-profile"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    const repo = new ChainCollectionProfileRepository()

    const result = await getChainCollectionProfile(ctx.organizationId, repo)
    return jsonResponse({ data: result })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const repo = new ChainCollectionProfileRepository()

    const body = (await request.json()) as { rules?: CollectionRule[] } | null
    // Thiếu hoặc sai dạng → 400 (audit API §17 — trước đây `Error` trần → 500)
    if (!body || !Array.isArray(body.rules)) throw validationFailed({ rules: "Danh sách quy tắc (rules) là bắt buộc." })

    const profile = await publishChainCollectionProfile(
      {
        organizationId: ctx.organizationId,
        rules: body.rules,
        publishedBy: ctx.userId,
      },
      repo
    )

    return jsonResponse({ data: profile })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
