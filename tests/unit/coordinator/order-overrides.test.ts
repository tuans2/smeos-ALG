import { describe, it, expect } from "vitest"
import { diffAgainstSnapshot } from "@/modules/coordinator/domain/order-overrides"
import type { CoordinatorProductSnapshot } from "@/modules/products/domain/product-master-index"

// ĐP-2.8 (26/09/2026): override có vết, bản tối thiểu (Hợp đồng MI §6). So BOM
// Sales gửi lên với snapshot chụp lúc chọn mẫu — không âm thầm ghi đè khi lệch.

function makeSnapshot(overrides: Partial<CoordinatorProductSnapshot> = {}): CoordinatorProductSnapshot {
  return {
    productId: "prod-1",
    code: "SP-001",
    name: "Bó Hồng Ohara Kem",
    category: "Bó hoa",
    style: "Hàn Quốc",
    colorPalette: { primaryColor: "Kem" },
    referenceImageUrls: [],
    bom: {
      flowers: [{ flowerName: "Hồng Ohara", quantity: 10, unit: "cành", color: "Kem", role: "Chủ đạo" }],
      foliage: [],
      wrapping: [],
      accessories: [],
    },
    warningTags: [],
    quotePriceVnd: 850000,
    masterUpdatedAt: "2026-09-20T00:00:00.000Z",
    capturedAt: "2026-09-26T00:00:00.000Z",
    ...overrides,
  }
}

describe("diffAgainstSnapshot — ĐP-2.8", () => {
  it("BOM khớp hệt snapshot → không có override nào", () => {
    const snapshot = makeSnapshot()
    const overrides = diffAgainstSnapshot(
      snapshot,
      [{ flowerName: "Hồng Ohara", quantity: 10, unit: "cành", color: "Kem", role: "Chủ đạo" }],
      "user-1"
    )
    expect(overrides).toEqual([])
  })

  it("Sales tăng số lượng so với snapshot → ghi 1 override cho quantity", () => {
    const snapshot = makeSnapshot()
    const overrides = diffAgainstSnapshot(
      snapshot,
      [{ flowerName: "Hồng Ohara", quantity: 15, unit: "cành", color: "Kem", role: "Chủ đạo" }],
      "user-1",
      new Date("2026-09-26T10:00:00.000Z")
    )
    expect(overrides).toEqual([
      {
        path: "bom.flowers[Hồng Ohara].quantity",
        masterValue: 10,
        orderValue: 15,
        by: "user-1",
        at: "2026-09-26T10:00:00.000Z",
      },
    ])
  })

  it("Sales đổi màu → ghi override cho color, khớp tên không phân biệt hoa/thường và khoảng trắng", () => {
    const snapshot = makeSnapshot()
    const overrides = diffAgainstSnapshot(
      snapshot,
      [{ flowerName: "  hồng ohara  ", quantity: 10, unit: "cành", color: "Hồng phấn", role: "Chủ đạo" }],
      "user-1"
    )
    expect(overrides).toHaveLength(1)
    expect(overrides[0]).toMatchObject({ path: "bom.flowers[Hồng Ohara].color", masterValue: "Kem", orderValue: "Hồng phấn" })
  })

  it("Sales xoá hẳn một loài khỏi snapshot → override bom.flowers[-]", () => {
    const snapshot = makeSnapshot()
    const overrides = diffAgainstSnapshot(snapshot, [], "user-1")
    expect(overrides).toEqual([
      expect.objectContaining({ path: "bom.flowers[-]", masterValue: "Hồng Ohara", orderValue: null }),
    ])
  })

  it("Sales thêm loài KHÔNG có trong snapshot → override bom.flowers[+]", () => {
    const snapshot = makeSnapshot()
    const overrides = diffAgainstSnapshot(
      snapshot,
      [
        { flowerName: "Hồng Ohara", quantity: 10, unit: "cành", color: "Kem", role: "Chủ đạo" },
        { flowerName: "Baby trắng", quantity: 5, unit: "cành", color: "Trắng", role: "Lấp đầy" },
      ],
      "user-1"
    )
    expect(overrides).toEqual([
      expect.objectContaining({ path: "bom.flowers[+]", masterValue: null, orderValue: "Baby trắng" }),
    ])
  })
})
