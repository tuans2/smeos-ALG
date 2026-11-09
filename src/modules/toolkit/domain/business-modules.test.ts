import { describe, expect, it } from "vitest"

import {
  BUSINESS_MODULE_SPECS,
  deferredToolIds,
  getAllBusinessModules,
  getVisibleBusinessModules,
} from "./business-modules"
import {
  getStoreOperationsSection,
  STORE_OPERATION_GROUP_SPECS,
  STORE_OPERATIONS_TOOL_IDS,
} from "./store-operations"
import { countByStatus, getAllTools } from "./toolkit-catalog"

describe("6 Business Modules & Store Operations (PO 01/11/2026)", () => {
  it("đúng 6 module kinh doanh được đánh số thứ tự từ 1 đến 6", () => {
    const modules = getAllBusinessModules()
    expect(modules).toHaveLength(6)
    expect(modules.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(modules.map((m) => m.key)).toEqual(["brand", "content", "promotion", "sales", "care", "print"])
  })

  it("khu Vận hành cửa hàng có đúng 5 nhóm chuyên trách", () => {
    const section = getStoreOperationsSection(true)
    expect(section.key).toBe("store_operations")
    expect(section.groups).toHaveLength(5)
    expect(STORE_OPERATION_GROUP_SPECS).toHaveLength(5)
    expect(STORE_OPERATIONS_TOOL_IDS).toHaveLength(25)
  })

  it("mỗi công cụ trong 67 mã nằm đúng một chỗ trên toàn hệ thống", () => {
    const catalogTools = getAllTools()
    expect(catalogTools).toHaveLength(67)
    const catalogIds = catalogTools.map((t) => t.id).sort((a, b) => a - b)

    const moduleToolIds = BUSINESS_MODULE_SPECS.flatMap((m) => m.toolIds)
    const storeOpsToolIds = STORE_OPERATIONS_TOOL_IDS
    const totalPartitionIds = [...moduleToolIds, ...storeOpsToolIds].sort((a, b) => a - b)

    expect(totalPartitionIds).toHaveLength(67)
    expect(totalPartitionIds).toEqual(catalogIds)

    const uniquePartitionIds = new Set(totalPartitionIds)
    expect(uniquePartitionIds.size).toBe(67)
  })

  it("công cụ mục tiêu trong lộ trình (dev) có mã âm riêng và không trùng tên", () => {
    const allModules = getAllBusinessModules()
    const allTools = allModules.flatMap((m) => [...m.tools, ...m.deferredTools])
    const roadmapTools = allTools.filter((t) => t.isRoadmap)
    const catalogNames = new Set(getAllTools().map((t) => t.name))

    expect(roadmapTools.length).toBeGreaterThan(0)
    for (const t of roadmapTools) {
      expect(t.id).toBeLessThan(0)
      expect(catalogNames.has(t.name)).toBe(false)
      expect(t.href).toBeNull()
      expect(t.status).toBe("PLANNED")
    }

    const allIds = allTools.map((t) => t.id)
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it("production chỉ hiện công cụ DONE và asset Sẵn (READY), ẩn module rỗng", () => {
    const prodModules = getVisibleBusinessModules(false)

    for (const m of prodModules) {
      // Nhóm có hành trình thay thế (brand) hiện dù không còn công cụ/ấn phẩm nào
      expect(m.tools.length + m.assets.length + (m.journey ? 1 : 0)).toBeGreaterThan(0)

      for (const t of m.tools) {
        expect(t.status).toBe("DONE")
        expect(t.isRoadmap).toBe(false)
      }

      for (const a of m.assets) {
        expect(a.module).toBe(m.key)
      }
    }

    // Từ PR-6, 10 ấn phẩm nối workspace /in-an nên module print hiện ở production —
    // chỉ với asset Sẵn, không kèm công cụ nào chưa DONE.
    const print = prodModules.find((m) => m.key === "print")
    expect(print?.tools).toEqual([])
    expect(print?.assets.length).toBe(10)
    for (const a of print?.assets ?? []) {
      expect(a.customHref).toMatch(/^\/in-an\?asset=/)
    }

    // Store operations ở production chỉ hiện công cụ DONE
    const prodStoreOps = getStoreOperationsSection(false)
    for (const group of prodStoreOps.groups) {
      expect(group.tools.length).toBeGreaterThan(0)
      for (const t of group.tools) {
        expect(t.status).toBe("DONE")
      }
    }
  })

  it("Hồ sơ & Thương hiệu: hành trình 3 bước thay lưới cũ; nội dung cũ PHÁT_TRIỂN_SAU chỉ dev thấy (PO 08/11/2026)", () => {
    const dev = getAllBusinessModules().find((m) => m.key === "brand")!
    expect(dev.journey).toBe("BRAND_KIT")
    expect(dev.tools).toEqual([])
    expect(dev.assets).toEqual([])
    expect(dev.deferredAssets).toHaveLength(16)
    expect(dev.deferredTools.filter((t) => !t.isRoadmap).map((t) => t.id).sort((a, b) => a - b)).toEqual([11, 45, 51, 52, 64])

    const prod = getVisibleBusinessModules(false).find((m) => m.key === "brand")!
    expect(prod.journey).toBe("BRAND_KIT")
    expect(prod.deferredTools).toEqual([])
    expect(prod.deferredAssets).toEqual([])

    // Các nhóm khác không đổi
    for (const m of getAllBusinessModules().filter((x) => x.key !== "brand" && x.key !== "content" && x.key !== "promotion")) {
      expect(m.journey).toBeNull()
      expect(m.deferredTools).toEqual([])
    }
  })

  it("Tạo nội dung: hành trình 4 bước thay lưới cũ; 10 công cụ cũ PHÁT_TRIỂN_SAU chỉ dev thấy (PO 08/11/2026)", () => {
    const dev = getAllBusinessModules().find((m) => m.key === "content")!
    expect(dev.journey).toBe("CONTENT_STUDIO")
    expect(dev.tools).toEqual([])
    expect(dev.assets).toEqual([])
    expect(dev.deferredTools.filter((t) => !t.isRoadmap).map((t) => t.id).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 22, 49, 53])

    const prod = getVisibleBusinessModules(false).find((m) => m.key === "content")!
    expect(prod.journey).toBe("CONTENT_STUDIO")
    expect(prod.deferredTools).toEqual([])
    expect(prod.deferredAssets).toEqual([])
  })

  it("Quảng bá sản phẩm: 3 ô chức năng thay lưới cũ; 11 công cụ + ấn phẩm cũ PHÁT_TRIỂN_SAU chỉ dev thấy (PO 09/11/2026)", () => {
    const dev = getAllBusinessModules().find((m) => m.key === "promotion")!
    expect(dev.journey).toBe("PROMOTION_HUB")
    expect(dev.tools).toEqual([])
    expect(dev.assets).toEqual([])
    expect(dev.deferredTools.filter((t) => !t.isRoadmap).map((t) => t.id).sort((a, b) => a - b)).toEqual([8, 9, 10, 12, 13, 14, 21, 25, 54, 61, 66])
    expect(dev.deferredAssets.length).toBeGreaterThan(0)
    for (const a of dev.deferredAssets) expect(a.module).toBe("promotion")

    const prod = getVisibleBusinessModules(false).find((m) => m.key === "promotion")!
    expect(prod.journey).toBe("PROMOTION_HUB")
    expect(prod.tools).toEqual([])
    expect(prod.assets).toEqual([])
    expect(prod.deferredTools).toEqual([])
    expect(prod.deferredAssets).toEqual([])

    // Bán hàng, Chăm sóc, Ấn phẩm giữ lưới cũ
    for (const key of ["sales", "care", "print"]) {
      expect(getAllBusinessModules().find((m) => m.key === key)!.journey).toBeNull()
    }
  })

  it("số liệu đầu trang không đếm công cụ PHÁT_TRIỂN_SAU", () => {
    const hidden = deferredToolIds()
    expect([...hidden].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 21, 22, 25, 45, 49, 51, 52, 53, 54, 61, 64, 66])
    const all = countByStatus()
    const shown = countByStatus(hidden)
    const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(total(all)).toBe(67)
    expect(total(shown)).toBe(67 - 26)
  })
})
