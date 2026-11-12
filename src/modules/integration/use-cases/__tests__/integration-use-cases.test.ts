import { describe, it, expect, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type {
  IIntegrationTokenRepository,
  IntegrationTokenRecord,
  IContentMetricsRepository,
  ContentMetricsRecord,
} from "../../domain/repositories/integration-repository.interface"
import { listIntegrationTokens } from "../list-integration-tokens"
import { issueIntegrationToken } from "../issue-integration-token"
import { revokeIntegrationToken } from "../revoke-integration-token"
import { rotateIntegrationToken } from "../rotate-integration-token"
import { recordContentMetrics } from "../record-content-metrics"

// ---- Mock tenant context ----
const ctx: TenantContext = {
  organizationId: "org-test",
  workspaceId: "ws-test",
  userId: "user-1",
  branchId: null,
  capabilities: new Set<string>(),
}

// ---- Token stubs ----
const makeToken = (overrides: Partial<IntegrationTokenRecord> = {}): IntegrationTokenRecord => ({
  id: "tok-1",
  organization_id: "org-test",
  client: "LOCALBUDD",
  token_hash: "hashedvalue",
  created_by: "user-1",
  expires_at: new Date("2027-01-01"),
  revoked_at: null,
  rotated_from_id: null,
  created_at: new Date("2026-01-01"),
  ...overrides,
})

// ---- Mock repositories ----
const makeTokenRepo = (
  overrides: Partial<IIntegrationTokenRepository> = {}
): IIntegrationTokenRepository => ({
  findActiveByHash: vi.fn().mockResolvedValue(null),
  list: vi.fn().mockResolvedValue([makeToken()]),
  findById: vi.fn().mockResolvedValue(makeToken()),
  create: vi.fn().mockImplementation(async (_ctx, input) =>
    makeToken({ id: "tok-new", client: input.client })
  ),
  revoke: vi.fn().mockResolvedValue(true),
  ...overrides,
})

const makeMetricsRepo = (
  overrides: Partial<IContentMetricsRepository> = {}
): IContentMetricsRepository => ({
  upsertByNaturalKey: vi.fn().mockResolvedValue({
    id: "cm-1",
    organization_id: "org-test",
    platform: "instagram",
    content_id: "post-123",
    metric_date: new Date("2026-10-01"),
    reach: 100,
    impressions: 500,
    engagement: 10,
    clicks: 20,
    conversions: 3,
    spend_usd: null,
  } as ContentMetricsRecord),
  ...overrides,
})

// ============================================================
// listIntegrationTokens
// ============================================================
describe("listIntegrationTokens", () => {
  it("returns token summaries without token_hash", async () => {
    const repo = makeTokenRepo()
    const results = await listIntegrationTokens(ctx, repo)
    expect(results).toHaveLength(1)
    const first = results[0]!
    expect(first.id).toBe("tok-1")
    expect(first.client).toBe("LOCALBUDD")
    // token_hash không được lộ
    expect((first as Record<string, unknown>).token_hash).toBeUndefined()
    expect(repo.list).toHaveBeenCalledWith(ctx)
  })
})

// ============================================================
// issueIntegrationToken
// ============================================================
describe("issueIntegrationToken", () => {
  it("creates a token for a valid client", async () => {
    const repo = makeTokenRepo()
    const result = await issueIntegrationToken(
      ctx,
      { client: "LOCALBUDD", createdBy: "user-1", ttlDays: 30 },
      repo
    )
    expect(result.client).toBe("LOCALBUDD")
    expect(result.token).toBeDefined() // raw token returned once
    expect(repo.create).toHaveBeenCalled()
  })

  it("throws validationFailed for unknown client", async () => {
    const repo = makeTokenRepo()
    await expect(
      issueIntegrationToken(ctx, { client: "UNKNOWN_APP", createdBy: "user-1" }, repo)
    ).rejects.toThrow()
  })

  it("throws validationFailed for ttlDays out of range", async () => {
    const repo = makeTokenRepo()
    await expect(
      issueIntegrationToken(ctx, { client: "LOCALBUDD", createdBy: "user-1", ttlDays: 9999 }, repo)
    ).rejects.toThrow()
  })
})

// ============================================================
// revokeIntegrationToken
// ============================================================
describe("revokeIntegrationToken", () => {
  it("calls repo.revoke with the token id", async () => {
    const repo = makeTokenRepo()
    await revokeIntegrationToken(ctx, "tok-1", repo)
    expect(repo.revoke).toHaveBeenCalledWith(ctx, "tok-1", expect.any(Date))
  })

  it("throws notFound when repo returns false", async () => {
    const repo = makeTokenRepo({ revoke: vi.fn().mockResolvedValue(false) })
    await expect(revokeIntegrationToken(ctx, "nonexistent", repo)).rejects.toThrow()
  })
})

// ============================================================
// rotateIntegrationToken
// ============================================================
describe("rotateIntegrationToken", () => {
  it("creates new token linked to old token id", async () => {
    const repo = makeTokenRepo()
    const result = await rotateIntegrationToken(ctx, "tok-1", repo)
    expect(result.rotated_from_id).toBe("tok-1")
    expect(result.token).toBeDefined()
    expect(repo.create).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ rotatedFromId: "tok-1" })
    )
  })

  it("throws notFound when current token not found", async () => {
    const repo = makeTokenRepo({ findById: vi.fn().mockResolvedValue(null) })
    await expect(rotateIntegrationToken(ctx, "nonexistent", repo)).rejects.toThrow()
  })

  it("giữ thời hạn đã chọn lúc cấp (token 30 ngày xoay ra token 30 ngày, audit API §19)", async () => {
    const short = makeToken({ created_at: new Date("2026-11-01T00:00:00Z"), expires_at: new Date("2026-12-01T00:00:00Z") })
    const repo = makeTokenRepo({ findById: vi.fn().mockResolvedValue(short) })
    const before = Date.now()
    await rotateIntegrationToken(ctx, "tok-1", repo)
    const { expiresAt } = vi.mocked(repo.create).mock.calls[0]![1] as { expiresAt: Date }
    const days = (expiresAt.getTime() - before) / 86_400_000
    expect(days).toBeGreaterThan(29.99)
    expect(days).toBeLessThan(30.01)
  })
})

// ============================================================
// recordContentMetrics
// ============================================================
describe("recordContentMetrics", () => {
  it("upserts metrics for valid input", async () => {
    const repo = makeMetricsRepo()
    const result = await recordContentMetrics(
      ctx,
      {
        platform: "instagram",
        contentId: "post-123",
        metricDate: "2026-10-01",
        reach: 100,
        impressions: 500,
      },
      repo
    )
    expect(result.platform).toBe("instagram")
    expect(repo.upsertByNaturalKey).toHaveBeenCalled()
  })

  it("throws validationFailed for invalid date", async () => {
    const repo = makeMetricsRepo()
    await expect(
      recordContentMetrics(
        ctx,
        { platform: "instagram", contentId: "p1", metricDate: "not-a-date" },
        repo
      )
    ).rejects.toThrow()
  })
})
