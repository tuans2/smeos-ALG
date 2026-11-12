import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listMembers } from "@/modules/organization/use-cases/list-members"
import { createStaffAccount } from "@/modules/organization/use-cases/staff-accounts"
import { createStaffBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listMembers(ctx), next_cursor: null })
  },
})

/**
 * `POST /members` (`A3`, trần cứng Điều hành — PO 08/10/2026): tạo tài khoản nhân viên dùng được ngay,
 * trả mật khẩu tạm MỘT lần để Điều hành chép gửi nhân viên.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "A3" },
  handler: async ({ request, ctx }) => {
    const parsed = createStaffBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const account = await createStaffAccount(ctx, {
      name: parsed.data.name,
      email: parsed.data.email,
      roleId: parsed.data.role_id,
      branchId: parsed.data.branch_id ?? null,
      phone: parsed.data.phone ?? null,
    })
    return jsonResponse({ data: account }, { status: 201, headers: { "cache-control": "no-store" } })
  },
})
