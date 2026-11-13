import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import { insertLandingPage, type SaveLandingPageInput } from "../infra/landing-page-repository"

/**
 * Lưu landing page vừa sinh để tìm lại trong Kho dữ liệu (Screen Contract
 * `kho-du-lieu.md` §14 L-1). Lỗi ghi không làm hỏng lượt sinh — người dùng vẫn
 * nhận nội dung; trả `null` và ghi log.
 */
export async function saveLandingPage(
  ctx: TenantContext,
  data: SaveLandingPageInput,
  insert: typeof insertLandingPage = insertLandingPage
): Promise<string | null> {
  try {
    return (await insert(ctx, data)).id
  } catch (error) {
    log.warn("landing_page.save_failed", {
      organizationId: ctx.organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
