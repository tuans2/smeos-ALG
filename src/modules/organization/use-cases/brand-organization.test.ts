import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { getOrganizationBrand } from "./get-organization-brand"
import { updateOrganizationBrand } from "./update-organization-brand"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"

const MOCK_CTX: TenantContext = {
  organizationId: "org-test-123",
  workspaceId: "ws-test-123",
  userId: "user-123",
  branchId: null,
  capabilities: new Set(["F1", "F2"]),
}

describe("Organization Brand Use-Cases (F1-04)", () => {
  it("retrieves null when organization has no ui_brand setting", async () => {
    const mockRepo = {
      current: vi.fn().mockResolvedValue({
        id: "org-test-123",
        name: "Tiệm Thử Nghiệm",
        settings: {},
      }),
    } as unknown as OrganizationRepository

    const result = await getOrganizationBrand(MOCK_CTX, mockRepo)
    expect(result).toBeNull()
  })

  it("retrieves existing ui_brand from organization settings", async () => {
    const mockRepo = {
      current: vi.fn().mockResolvedValue({
        id: "org-test-123",
        name: "Tiệm Thử Nghiệm",
        settings: {
          ui_brand: {
            primary: "#2563EB",
            accent: "#EA580C",
          },
        },
      }),
    } as unknown as OrganizationRepository

    const result = await getOrganizationBrand(MOCK_CTX, mockRepo)
    expect(result).toEqual({
      primary: "#2563EB",
      accent: "#EA580C",
    })
  })

  it("successfully updates brand when contrast is adequate (>= 4.5:1)", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: "org-test-123" })
    const mockRepo = {
      current: vi.fn().mockResolvedValue({
        id: "org-test-123",
        settings: { existing_key: "value" },
      }),
      update: mockUpdate,
    } as unknown as OrganizationRepository

    const brandInput = {
      primary: "#7A2E42", // High contrast mộc lan red
      primaryDark: "#57202F",
      accent: "#C89B3C",
    }

    const updated = await updateOrganizationBrand(MOCK_CTX, brandInput, mockRepo)
    expect(updated).toEqual(brandInput)
    expect(mockUpdate).toHaveBeenCalledWith(MOCK_CTX, {
      settings: {
        existing_key: "value",
        ui_brand: brandInput,
      },
    })
  })

  it("rejects brand update with 422 when primary contrast is low (< 4.5:1)", async () => {
    const mockRepo = {
      current: vi.fn().mockResolvedValue({ id: "org-test-123", settings: {} }),
      update: vi.fn(),
    } as unknown as OrganizationRepository

    // #FFFF00 is bright yellow on white, contrast ratio ~ 1.07:1
    const lowContrastInput = {
      primary: "#FFFF00",
    }

    await expect(
      updateOrganizationBrand(MOCK_CTX, lowContrastInput, mockRepo)
    ).rejects.toThrow()
  })

  it("rejects invalid hex code format with 422", async () => {
    const mockRepo = {
      current: vi.fn().mockResolvedValue({ id: "org-test-123", settings: {} }),
      update: vi.fn(),
    } as unknown as OrganizationRepository

    await expect(
      updateOrganizationBrand(MOCK_CTX, { primary: "invalid-color" }, mockRepo)
    ).rejects.toThrow()
  })
})

