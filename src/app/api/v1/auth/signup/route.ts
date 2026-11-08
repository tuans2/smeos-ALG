import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { PENDING_APPROVAL_MESSAGE } from "@/modules/organization/domain/account-approval"
import { signUp } from "@/modules/organization/use-cases/sign-up"
import { signupBody } from "@/app/api/v1/_contracts/requests-org"

// Đăng ký thật: hồ sơ luôn để trống — chỉ instant-trial mới seed data mẫu theo ngành

export const POST = handle(async (request) => {
  // Mỗi lần gọi tạo một tổ chức — chặn tạo hàng loạt từ một IP. 20/giờ: đủ cho cả nhóm đăng ký chung
  // một wifi và bộ E2E (~12 lần/lượt), trước 22/10/2026 không giới hạn (rà soát cụm B)
  await enforceRateLimit(request, { scope: "signup-ip", limit: 20, windowMs: 60 * 60_000 })
  const parsed = signupBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.name ?? null,
    organizationName: parsed.data.organization_name,
    industryKey: parsed.data.industry_key ?? undefined,
    organizationType: parsed.data.organization_type,
    // PO 08/10/2026: Đăng ký thật luôn để hồ sơ trống — không seed mock data bất kể môi trường.
    // Chỉ luồng instant-trial (dùng thử) mới seed hồ sơ mẫu theo ngành.
    seedProfile: false,
    // PO 22/10/2026: mọi đăng ký công khai chờ superadmin nền tảng duyệt (N13) — không mở phiên
    pendingApproval: true,
  })

  return jsonResponse(
    { user_id: result.userId, organization_id: result.organizationId, status: "PENDING_APPROVAL", message: PENDING_APPROVAL_MESSAGE },
    { status: 202 }
  )
})
