import { AppError, unauthenticated } from "@/core/http/errors"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { asSystemDb, bindTenantDb } from "@/core/tenancy/db-context"
import type { TenantContext } from "@/core/tenancy"
import { withoutBoundaryCapabilities } from "@/modules/integration/domain/boundary-capabilities"
import { INTEGRATION_RATE_LIMIT } from "@/modules/integration/domain/integration-rate-limit"
import {
  readIntegrationCredential,
  SSO_HEADER,
} from "@/modules/integration/domain/integration-credential"
import type { integration_client } from "@/modules/integration/infra/entities"
import type { IIntegrationTokenRepository } from "@/modules/integration/domain/repositories/integration-repository.interface"
import { getIntegrationTokenRepository } from "@/modules/integration/infra/integration-token-repository"
import { hashIntegrationToken } from "@/modules/integration/infra/token-crypto"
import { tenantContextFor } from "@/modules/organization/use-cases/resolve-session"
import { WorkspaceRepository, getWorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { verifySsoToken } from "@/modules/sso/infra/sso-jwt"

/**
 * Danh tính của một lời gọi `/api/v1/integration/*`. Hai nhánh, không trộn:
 *
 * - `token` — máy gọi máy (`integration_tokens`, `YC-T8`). Không có người
 *   dùng đứng sau, nên `capabilities` rỗng và phạm vi là chính tập route này.
 * - `sso` — thay mặt một người đang đăng nhập (JWT `floraos_sso`, header
 *   `X-FloraOS-SSO`). Có người dùng thật, nên `capabilities` là năng lực THẬT
 *   của người đó trong tổ chức đó, và mọi use-case tái dùng tự cắt đúng phần
 *   người ấy không được xem.
 *
 * Nhánh `sso` là đường sửa lỗi rò dữ liệu chéo tổ chức: trước đây `LocalBudd`
 * mang một token toàn cục gắn cứng MỘT tổ chức, nên người của tổ chức B đăng
 * nhập vào vẫn đọc dữ liệu của tổ chức A (quyết định của anh Tony,
 * AskUserQuestion 2026-09-10 — phương án "core nhận `floraos_sso`").
 */
export type IntegrationContext =
  | {
      readonly source: "token"
      readonly organizationId: string
      readonly client: integration_client
      readonly tokenId: string
    }
  | {
      readonly source: "sso"
      readonly organizationId: string
      readonly userId: string
    }

/**
 * Giải `IntegrationContext` từ header của lời gọi — điểm vào của mọi route
 * `/api/v1/integration/*` (đặc tả 06 mục 11, `YC-T8`). Tương đương
 * `requireTenantContext` của phiên người dùng, nhưng danh tính đến từ một
 * chứng thư đã ký chứ không từ cookie phiên — `organization_id` không bao giờ
 * do client tự khai (đặc tả 08 mục 3).
 */
export async function requireIntegrationContext(
  request: Request,
  tokenRepo: IIntegrationTokenRepository = getIntegrationTokenRepository()
): Promise<IntegrationContext> {
  // Tra khoá tích hợp chưa biết tổ chức → quyền hệ thống; xong thì gắn tổ chức của khoá (RLS, checklist ALG 1.18)
  const resolved = await asSystemDb("integration-auth", () => resolveIntegration(request, tokenRepo))
  bindTenantDb(resolved.organizationId)
  await enforceRateLimit(request, integrationRateLimit(resolved))
  return resolved
}

/** Trần chung của mọi route `/integration/*` — xem `domain/integration-rate-limit.ts`. */
export { INTEGRATION_RATE_LIMIT }

function integrationRateLimit(ic: IntegrationContext) {
  const subject = ic.source === "token" ? `token:${ic.tokenId}` : `sso:${ic.organizationId}:${ic.userId}`
  return { scope: "integration-api", ...INTEGRATION_RATE_LIMIT, subject }
}

async function resolveIntegration(request: Request, tokenRepo: IIntegrationTokenRepository): Promise<IntegrationContext> {
  const credential = readIntegrationCredential(request.headers)
  if (!credential) throw unauthenticated()

  if (credential.kind === "sso") {
    const claims = verifySsoToken(credential.value, new Date())
    // `org` null = phiên gốc chưa chọn tổ chức nào. Không có tổ chức thì không
    // có gì để đọc — trả về đúng một câu trả lời như chữ ký sai, không phân
    // biệt lý do ra ngoài (cùng quy ước `verifySsoToken`).
    if (!claims?.org) throw unauthenticated()
    return { source: "sso", organizationId: claims.org, userId: claims.sub }
  }

  const row = await tokenRepo.findActiveByHash(
    hashIntegrationToken(credential.value),
    new Date()
  )
  if (!row) throw unauthenticated()

  return {
    source: "token",
    organizationId: row.organization_id,
    client: row.client as integration_client,
    tokenId: row.id,
  }
}

/**
 * Cổng "chỉ app này đọc được" của đặc tả 08 mục 4 (vd. `BusinessProfile` chỉ
 * dành cho `LocalBudd`).
 *
 * Chỉ áp cho nhánh `token`, nơi `client` là danh tính đã ký của chính app.
 * Nhánh `sso` không mang danh tính app — app nào cũng có thể tự khai — nên áp
 * ở đó chỉ tạo cảm giác an toàn giả. Thay vào đó nhánh `sso` được gác bằng
 * năng lực THẬT của người dùng, vốn chặt hơn: người không có `F1` không đọc
 * được `BusinessProfile` dù gọi từ app nào.
 */
export function requireIntegrationClient(
  ic: IntegrationContext,
  allowed: integration_client
): void {
  if (ic.source !== "token") return
  if (ic.client !== allowed) {
    throw new AppError("CAPABILITY_DENIED", "Token này không đọc được tài nguyên đó")
  }
}

/**
 * Dựng một `TenantContext` để TÁI DÙNG thẳng các use-case đã có của phiên
 * người dùng (`listProducts`, `getBusinessProfile`, `enqueueJob`, …) — đúng
 * nguyên tắc thu hoạch REUSE trước BUILD (`AGENTS.md`, chín câu hỏi #1).
 *
 * Nhánh `sso`: năng lực thật, giải bằng chính `tenantContextFor` mà
 * `resolveSession` dùng — một đường tính quyền duy nhất cho cả hai lối vào,
 * không có bản sao thứ hai để lệch nhau — RỒI trừ đi những mã không bao giờ
 * được vượt ranh giới core (`boundary-capabilities.ts`). Trừ, không bao giờ
 * thêm: đây là ranh giới dữ liệu của đặc tả 08 mục 4, không phải một cơ chế
 * phân quyền thứ hai.
 *
 * Nhánh `token`: `capabilities` luôn RỖNG. Token không phải một vai giao diện,
 * nên không được tra `hasCapability`/`requireCapability` — phạm vi của nó là
 * chính tập route `/integration/*` đang gọi nó (đặc tả 08 mục 3). Hệ quả tự
 * nhiên: các use-case tái dùng (vd. `listProducts` đọc `hasCapability(ctx,
 * "L5")` để quyết định lộ khối `pricing`) luôn ẩn phần đó với engine ngoài.
 * `userId` là một chuỗi tổng hợp, không phải `users.id` thật — an toàn vì
 * `generation_jobs.user_id`/`usage.user_id`/`assets.created_by` không mang
 * khoá ngoại tới `users` (`prisma/schema.prisma`).
 */
export async function toTenantContext(ic: IntegrationContext): Promise<TenantContext> {
  if (ic.source === "sso") {
    const resolved = await tenantContextFor(ic.userId, ic.organizationId)
    // Không còn là thành viên `ACTIVE` — mất quyền đọc ngay, không chờ JWT hết
    // hạn. Đây là lý do JWT cố tình sống ngắn (15 phút) chứ không mang sẵn
    // năng lực bên trong (`modules/sso/domain/sso-claims.ts`).
    if (!resolved) throw unauthenticated()
    return {
      ...resolved.ctx,
      capabilities: withoutBoundaryCapabilities(resolved.ctx.capabilities),
    }
  }

  const workspace = await getWorkspaceRepository().findDefaultForSessionOrganization(
    ic.organizationId
  )
  if (!workspace) throw new AppError("INTERNAL", "Tổ chức không có workspace nào")

  return {
    organizationId: ic.organizationId,
    workspaceId: workspace.id,
    userId: `integration:${ic.client.toLowerCase()}:${ic.tokenId}`,
    branchId: null,
    capabilities: new Set<string>(),
  }
}

export { SSO_HEADER }
