import { jsonResponse } from "@/core/http/response"
import { listOrganizations } from "@/modules/organization/use-cases/list-organizations"
import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "custom", reason: "liệt kê tổ chức mà người dùng là thành viên (resolveSession, chưa cần chọn tổ chức)" },
  handler: async ({ request }) => {
    const resolved = await resolveSession(request)
    return jsonResponse({ data: await listOrganizations(resolved.user.id), next_cursor: null })
  },
})
