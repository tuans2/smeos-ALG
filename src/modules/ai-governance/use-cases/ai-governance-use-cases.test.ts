import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type {
  IAiRegistryRepository,
  IAiPolicyRepository,
  IAiRequestRepository,
  AiCapabilityRow,
  AiModelRow,
  AiPolicyRecord,
  AiRequestRecord,
} from "@/core/ai/domain/ai-repository.interface"
import { getAiPolicy } from "./get-ai-policy"
import { listAiRequests, summarizeAiRequests } from "./list-ai-requests"
import { reviewAiRequest } from "./review-ai-request"

vi.mock("@/modules/audit/use-cases/record-audit-log", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
}))

const mockContext: TenantContext = {
  organizationId: "org-test-123",
  workspaceId: "ws-test-123",
  userId: "user-test-123",
  branchId: null,
  capabilities: new Set(["CAP-01"]),
}

describe("ai-governance use-cases", () => {
  describe("getAiPolicy", () => {
    it("returns capabilities combined with policies and models", async () => {
      const mockRegistryRepo: IAiRegistryRepository = {
        capabilities: vi.fn().mockResolvedValue([
          {
            code: "AIC-01",
            enabled: true,
            needs_approval: false,
            privacy_floor: "SHOP",
            accept_threshold: 0.8,
            measure_channels: {},
          } as AiCapabilityRow,
        ]),
        capability: vi.fn(),
        eligibleModels: vi.fn().mockResolvedValue([
          {
            key: "gpt-4o",
            display_name: "GPT-4o",
            measure_state: "PROVEN",
            leaves_infra: true,
            cost_class: "STANDARD",
            quality_class: "HIGH",
            capabilities: ["AIC-01"],
            enabled: true,
            license: "COMMERCIAL",
            territory: "GLOBAL",
            allowed_use: "ALL",
            commercial_use: true,
          } as AiModelRow,
        ]),
        allModels: vi.fn(),
      }

      const mockPolicyRepo: IAiPolicyRepository = {
        list: vi.fn().mockResolvedValue([
          {
            id: "policy-1",
            organization_id: "org-test-123",
            capability_code: "AIC-01",
            allowed_models: ["gpt-4o"],
            quality_target: "HIGH",
            cost_ceiling: 100,
            privacy_floor: "SHOP",
            updated_by: "user-1",
            updated_at: new Date(),
          } as AiPolicyRecord,
        ]),
        find: vi.fn(),
        upsert: vi.fn(),
      }

      const result = await getAiPolicy(mockContext, mockRegistryRepo, mockPolicyRepo)
      expect(result.capabilities).toHaveLength(1)
      expect(result.capabilities[0]?.capability_code).toBe("AIC-01")
      expect(result.capabilities[0]?.allowed_models).toHaveLength(1)
      expect(result.capabilities[0]?.allowed_models[0]?.key).toBe("gpt-4o")
    })
  })

  describe("listAiRequests and summarizeAiRequests", () => {
    it("lists ai requests with mapped fields", async () => {
      const mockRequestRepo: IAiRequestRepository = {
        record: vi.fn(),
        list: vi.fn().mockResolvedValue([
          {
            id: "req-1",
            organization_id: "org-test-123",
            capability_code: "AIC-01",
            model_key: "gpt-4o",
            outcome: "ACCEPTED",
            source: "CORE",
            attempt: 1,
            escalated_from: null,
            fallback_from: null,
            job_id: "job-1",
            cost_usd: 0.05,
            latency_ms: 250,
            quality_score: 0.95,
            created_at: new Date(),
          } as AiRequestRecord,
        ]),
        listReviewQueue: vi.fn(),
        getById: vi.fn(),
        updateOutcome: vi.fn(),
      }

      const result = await listAiRequests(mockContext, {}, mockRequestRepo)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.model_key).toBe("gpt-4o")
    })

    it("summarizes requests by capability and model", async () => {
      const mockRequestRepo: IAiRequestRepository = {
        record: vi.fn(),
        list: vi.fn().mockResolvedValue([
          {
            id: "req-1",
            organization_id: "org-test-123",
            capability_code: "AIC-01",
            model_key: "gpt-4o",
            outcome: "ACCEPTED",
            source: "CORE",
            cost_usd: 0.05,
            latency_ms: 200,
            quality_score: 0.9,
            created_at: new Date(),
          } as AiRequestRecord,
          {
            id: "req-2",
            organization_id: "org-test-123",
            capability_code: "AIC-01",
            model_key: "gpt-4o",
            outcome: "FAILED",
            source: "CORE",
            cost_usd: 0.02,
            latency_ms: 300,
            quality_score: 0.4,
            created_at: new Date(),
          } as AiRequestRecord,
        ]),
        listReviewQueue: vi.fn(),
        getById: vi.fn(),
        updateOutcome: vi.fn(),
      }

      const summary = await summarizeAiRequests(mockContext, {}, mockRequestRepo)
      expect(summary.data).toHaveLength(1)
      expect(summary.data[0]?.calls).toBe(2)
      expect(summary.data[0]?.accepted).toBe(1)
      expect(summary.data[0]?.failed).toBe(1)
    })
  })

  describe("reviewAiRequest", () => {
    it("updates outcome for an existing request in review queue", async () => {
      const mockRequestRepo: IAiRequestRepository = {
        record: vi.fn(),
        list: vi.fn(),
        listReviewQueue: vi.fn(),
        getById: vi.fn().mockResolvedValue({
          id: "req-1",
          organization_id: "org-test-123",
          capability_code: "AIC-01",
          model_key: "gpt-4o",
          outcome: "NEEDS_REVIEW",
          source: "CORE",
          created_at: new Date(),
        } as AiRequestRecord),
        updateOutcome: vi.fn().mockResolvedValue({
          id: "req-1",
          organization_id: "org-test-123",
          capability_code: "AIC-01",
          model_key: "gpt-4o",
          outcome: "ACCEPTED",
          source: "CORE",
          created_at: new Date(),
        } as AiRequestRecord),
      }

      const result = await reviewAiRequest(mockContext, "req-1", "approve", "Looks good", mockRequestRepo)
      expect(result.id).toBe("req-1")
      expect(result.outcome).toBe("ACCEPTED")
      expect(result.action).toBe("approve")
      expect(mockRequestRepo.updateOutcome).toHaveBeenCalledWith(mockContext, "req-1", "ACCEPTED")
    })
  })
})
