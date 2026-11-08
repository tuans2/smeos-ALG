import type { PlatformContext } from "@/core/platform/platform-context"

import { describePlatformAccess } from "../domain/platform-access"
import { getPlatformAccessLogRepository, type PlatformAccessLogRepository } from "../infra/platform-access-log-repository"

/**
 * Ghi truy cập của nhân viên nền tảng vào dữ liệu một tổ chức (ADR-013 D-I5, D-60). Gọi ở MỌI handler của
 * `platform/organizations/[id]/*` và `platform/orgs-data/[orgId]/*` ngay sau khi gác quyền, TRƯỚC khi đọc/ghi dữ liệu
 * (test kiến trúc `platform-access-guard`). Ghi lỗi → ném lỗi, không trả dữ liệu: đây là biện pháp bù rủi ro R-2.
 */
export async function recordPlatformAccess(
  request: Request,
  pctx: PlatformContext,
  repo: Pick<PlatformAccessLogRepository, "recordIfOrgExists"> = getPlatformAccessLogRepository(),
): Promise<void> {
  const access = describePlatformAccess(request.method, request.url)
  if (!access) return
  await repo.recordIfOrgExists({
    organizationId: access.organizationId,
    operatorId: pctx.userId,
    purpose: access.purpose,
    method: request.method.toUpperCase(),
    route: new URL(request.url).pathname,
  })
}
