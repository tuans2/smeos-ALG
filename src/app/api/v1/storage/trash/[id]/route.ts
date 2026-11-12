import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { permanentDelete } from "@/modules/storage/use-cases/manage-trash"
import { TRASH_ITEM_TYPES, type TrashItemType } from "@/modules/storage/domain/trash-types"
import { defineRoute } from "@/core/http/define-route"

type Context = { params: Promise<{ id: string }> }

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: permanentDelete" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const url = new URL(request.url)
    const type = url.searchParams.get("type") as TrashItemType | null

    if (!type || !(TRASH_ITEM_TYPES as readonly string[]).includes(type)) {
      throw validationFailed({ type: "Tham số type không hợp lệ" })
    }

    await permanentDelete(ctx, { id, type })
    return jsonResponse({ success: true })
  },
})
