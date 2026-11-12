import { conflict, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import type { BranchCandidate } from "@/modules/greeting-card/domain/chain-dispatch-engine"
import { GoongGeocoder } from "@/modules/greeting-card/adapters/goong-geocoder"
import { fillMissingBranchLocations } from "@/modules/greeting-card/use-cases/resolve-geo-location"
import { CHAIN_ONLY_MESSAGE, isChainOrganizationType } from "@/modules/greeting-card/domain/brochure-workflow-policy"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { chainBranchImportBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/greeting-card/chain-branches/bulk-import
 * Nhập danh sách chi nhánh chuỗi từ file Excel vào `branches` có `accepts_dispatch` (ADR-012 T-4c; trùng mã → cập nhật)
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.assignFlorist },
  handler: async ({ request, ctx }) => {
    if (!isChainOrganizationType((await new OrganizationRepository().current(ctx))?.type)) throw conflict(CHAIN_ONLY_MESSAGE)

    const body = await request.json().catch(() => ({}))
    const parsed = chainBranchImportBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const { branches } = parsed.data

    const candidates: BranchCandidate[] = branches.map((b) => ({
      branchId: b.branchId,
      branchName: b.branchName,
      address: b.address ?? "",
      area: { ward: b.ward, district: b.district, province: b.province ?? b.city, serviceWards: b.serviceWards ?? [] },
      location:
        typeof b.latitude === "number" && typeof b.longitude === "number"
          ? { latitude: b.latitude, longitude: b.longitude }
          : null,
      qualityScore: b.qualityScore,
      activeJobsCount: b.activeJobsCount,
      maxConcurrentJobs: b.maxConcurrentJobs,
      isActive: b.isActive,
      channels: {
        phone: b.channels?.phone,
        telegramChatId: b.channels?.telegramChatId,
        zaloPhone: b.channels?.zaloPhone,
      },
    }))

    // Chi nhánh có địa chỉ mà thiếu toạ độ → tự tra toạ độ để phân đơn theo khoảng cách
    const geo = await fillMissingBranchLocations(candidates, new GoongGeocoder())

    const { created, updated, total } = await new ChainBranchRepository().upsertMany(ctx.organizationId, geo.branches)

    return jsonResponse({
      data: {
        created,
        updated,
        total,
        geocoded: geo.geocoded,
        geocodeNotFound: geo.notFound,
        geocodeSkipped: geo.skipped,
        errors: [],
      },
    })
  },
})

export const dynamic = "force-dynamic"
