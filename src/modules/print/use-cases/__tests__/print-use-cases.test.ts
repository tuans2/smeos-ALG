import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { createPrintRenditionUseCase } from "../create-print-rendition.use-case"
import { listPrintRenditionsUseCase } from "../list-print-renditions.use-case"
import { exportPrintPdfUseCase } from "../export-print-pdf.use-case"
import type { IPrintRenditionRepository } from "../../domain/repositories/print-rendition-repository.interface"
import type { PrintRendition } from "../../domain/print-rendition"

const fakeCtx: TenantContext = {
  organizationId: "org-test-1",
  workspaceId: "ws-test-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["M5", "Q1"]),
}

describe("Print Use Cases", () => {
  it("creates print rendition and executes preflight check", async () => {
    const mockRepo: IPrintRenditionRepository = {
      create: vi.fn().mockImplementation((_, data) => {
        return Promise.resolve({
          id: "rendition-1",
          organizationId: "org-test-1",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    }

    const result = await createPrintRenditionUseCase(
      fakeCtx,
      {
        sourceType: "CARE_CARD",
        presetCode: "A6",
        imageWidthPx: 1400,
        imageHeightPx: 1900,
        hasQrCode: true,
        qrSizeMm: 22,
      },
      mockRepo
    )

    expect(result.id).toBe("rendition-1")
    expect(result.presetCode).toBe("A6")
    expect(result.status).toBe("READY")
    expect(result.preflight?.passed).toBe(true)
    expect(mockRepo.create).toHaveBeenCalled()
  })

  it("lists print renditions", async () => {
    const mockRepo: IPrintRenditionRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: "rendition-1",
            organizationId: "org-test-1",
            presetCode: "A6",
            status: "READY",
            widthMm: 105,
            heightMm: 148,
            bleedMm: 3,
            dpi: 300,
            sourceType: "CARE_CARD",
            createdBy: "user-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      }),
      update: vi.fn(),
    }

    const list = await listPrintRenditionsUseCase(fakeCtx, {}, mockRepo)
    expect(list.total).toBe(1)
    expect(list.items[0]?.presetCode).toBe("A6")
  })

  it("exports PDF with trim marks via jsPDF", async () => {
    const mockRendition: PrintRendition = {
      id: "rendition-1",
      organizationId: "org-test-1",
      presetCode: "A6",
      status: "PENDING",
      widthMm: 105,
      heightMm: 148,
      bleedMm: 3,
      dpi: 300,
      sourceType: "CARE_CARD",
      createdBy: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockRepo: IPrintRenditionRepository = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockRendition),
      list: vi.fn(),
      update: vi.fn().mockResolvedValue({ ...mockRendition, status: "READY" }),
    }

    const exportRes = await exportPrintPdfUseCase(
      fakeCtx,
      "rendition-1",
      {
        title: "Thiệp cảm ơn tri ân khách hàng",
        includeBleedMarks: true,
      },
      mockRepo
    )

    expect(exportRes.fileName).toContain("alg_print_a6")
    expect(exportRes.mimeType).toBe("application/pdf")
    expect(exportRes.base64).toContain("data:application/pdf")
    expect(exportRes.widthMm).toBe(105 + 6) // with bleed 3mm each side
    expect(exportRes.heightMm).toBe(148 + 6)
    expect(mockRepo.update).toHaveBeenCalledWith(
      fakeCtx,
      "rendition-1",
      expect.objectContaining({ status: "READY" })
    )
  })
})

