import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { patchBrandLibraryBody } from "@/app/api/v1/_contracts/requests-brand"
import { getBrandLibraryItem, updateBrandLibraryItem } from "@/modules/profiles/use-cases/brand-library"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx, params }) => {
    return jsonResponse({ data: await getBrandLibraryItem(ctx, ((params as { id: string })).id) })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx, params }) => {
    const parsed = patchBrandLibraryBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    const item = await updateBrandLibraryItem(ctx, ((params as { id: string })).id, {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description ?? null } : {}),
      ...(d.share_with_members !== undefined ? { share_with_members: d.share_with_members } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    })
    return jsonResponse({ data: item })
  },
})
