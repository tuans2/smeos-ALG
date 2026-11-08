import { beforeEach, describe, expect, it } from "vitest"

import { AppError } from "@/core/http/errors"
import { resetRateLimits } from "@/core/http/rate-limit"
import type { IIntegrationTokenRepository } from "@/modules/integration/domain/repositories/integration-repository.interface"
import { INTEGRATION_RATE_LIMIT, requireIntegrationContext } from "@/modules/integration/use-cases/resolve-integration-context"

/** Audit API-09 (07/11/2026): Integration API (máy gọi máy) từng không có giới hạn tần suất. */
const repo = {
  // Mỗi token (băm khác nhau) là một dòng `integration_tokens` riêng
  findActiveByHash: async (hash: string) => ({ id: `tok-${hash.slice(0, 12)}`, organization_id: "org-a", client: "LocalBudd" }),
} as unknown as IIntegrationTokenRepository

const call = (token: string, tokenRepo = repo) =>
  requireIntegrationContext(
    new Request("http://localhost/api/v1/integration/products", { headers: { authorization: `Bearer ${token}` } }),
    tokenRepo
  )

describe("requireIntegrationContext — giới hạn tần suất theo token", () => {
  beforeEach(() => resetRateLimits())

  it(`${INTEGRATION_RATE_LIMIT.limit} lượt/phút mỗi token; lượt kế → RATE_LIMITED`, async () => {
    for (let i = 0; i < INTEGRATION_RATE_LIMIT.limit; i++) await call("token-a")
    const error = await call("token-a").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe("RATE_LIMITED")
  })

  it("token khác có trần riêng", async () => {
    for (let i = 0; i < INTEGRATION_RATE_LIMIT.limit; i++) await call("token-a")
    await expect(call("token-b")).resolves.toMatchObject({ source: "token", organizationId: "org-a" })
  })

  it("token sai vẫn 401, không thành 429", async () => {
    const badRepo = { findActiveByHash: async () => null } as unknown as IIntegrationTokenRepository
    const error = await call("sai", badRepo).catch((e: unknown) => e)
    expect((error as AppError).code).toBe("UNAUTHENTICATED")
  })
})
