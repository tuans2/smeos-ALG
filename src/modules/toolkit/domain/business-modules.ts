/**
 * 6 Business Modules của ALG trên /cong-cu (PO 01/11/2026).
 *
 * SSOT: `docs/kien-truc/Nâng cấp tasks/ALG_Marketing_Sales_Center/01_DANH_GIA_DONG_BO.md` §2
 * và `02_DANH_MUC_ASSET.md`.
 *
 * Thay thế growth-modules.ts (10 module cũ).
 * 6 module tăng trưởng:
 * 1. Hồ sơ & Thương hiệu (brand)
 * 2. Tạo nội dung (content)
 * 3. Quảng bá sản phẩm (promotion)
 * 4. Bán hàng & Báo giá (sales)
 * 5. Chăm sóc khách hàng (care)
 * 6. Ấn phẩm & Vật phẩm (print)
 *
 * Các công cụ ngoài 6 module thuộc khu "Vận hành cửa hàng" (store-operations.ts).
 */

import {
  type AssetTypeDefinition,
  type BusinessModuleKey,
  readinessOf,
} from "@/modules/marketing-center/domain/asset-type"
import {
  ALL_ASSET_TYPES,
  getAssetTypesByModule,
} from "@/modules/marketing-center/domain/asset-types"
import { BUSINESS_MODULE_ROADMAP } from "./business-module-roadmap"
import { deferredContentOf, type ModuleJourney } from "./deferred-module-content"
import { STORE_OPERATIONS_TOOL_IDS } from "./store-operations"
import { getAllTools, type ToolDefinition } from "./toolkit-catalog"

export type { BusinessModuleKey }

export interface ModuleTool extends ToolDefinition {
  readonly isRoadmap: boolean
}

export interface BusinessModuleSpec {
  readonly key: BusinessModuleKey
  readonly order: number
  readonly name: string
  readonly purpose: string
  readonly icon: string
  readonly toolIds: readonly number[]
}

export const BUSINESS_MODULE_SPECS: readonly BusinessModuleSpec[] = [
  {
    key: "brand",
    order: 1,
    name: "Hồ sơ & Thương hiệu",
    purpose: "Xây dựng hình ảnh cửa hàng nhất quán, chuyên nghiệp và đáng tin cậy",
    icon: "BadgeCheck",
    toolIds: [11, 45, 51, 52, 64],
  },
  {
    key: "content",
    order: 2,
    name: "Tạo nội dung",
    purpose: "Tạo hình ảnh, video và bài viết giới thiệu sản phẩm mà không cần thuê thiết kế",
    icon: "Camera",
    toolIds: [0, 1, 2, 3, 4, 5, 6, 22, 49, 53],
  },
  {
    key: "promotion",
    order: 3,
    name: "Quảng bá sản phẩm",
    purpose: "Giới thiệu sản phẩm và tiếp cận khách hàng tiềm năng qua mọi kênh",
    icon: "Megaphone",
    toolIds: [8, 9, 10, 12, 13, 14, 21, 25, 54, 61, 66],
  },
  {
    key: "sales",
    order: 4,
    name: "Bán hàng & Báo giá",
    purpose: "Tư vấn nhanh, chốt đơn dễ dàng và lập báo giá chuyên nghiệp",
    icon: "ShoppingBag",
    toolIds: [15, 16, 18, 24, 30, 55, 56, 57, 58, 65],
  },
  {
    key: "care",
    order: 5,
    name: "Chăm sóc khách hàng",
    purpose: "Gắn kết khách cũ, gửi thiệp tri ân và khuyến khích khách quay lại",
    icon: "HeartHandshake",
    toolIds: [7, 23, 26, 27, 28, 29],
  },
  {
    key: "print",
    order: 6,
    name: "Ấn phẩm & Vật phẩm",
    purpose: "Chuẩn bị ấn phẩm in tại quầy, standee, thẻ treo và áp phích trưng bày",
    icon: "Printer",
    toolIds: [],
  },
]

export interface BusinessModule {
  readonly key: BusinessModuleKey
  readonly order: number
  readonly name: string
  readonly purpose: string
  readonly icon: string
  readonly tools: readonly ModuleTool[]
  readonly assets: readonly AssetTypeDefinition[]
  /** Hành trình thay cho lưới ấn phẩm/công cụ (PO 08/11/2026); null = nhóm hiển thị như cũ */
  readonly journey: ModuleJourney | null
  /** Nội dung cũ gắn PHÁT_TRIỂN_SAU — chỉ môi trường phát triển nhận được (deferred-module-content.ts) */
  readonly deferredTools: readonly ModuleTool[]
  readonly deferredAssets: readonly AssetTypeDefinition[]
}

function asModuleTool(tool: ToolDefinition): ModuleTool {
  return { ...tool, isRoadmap: false }
}

function roadmapTool(name: string, id: number): ModuleTool {
  return {
    id,
    name,
    description: "Công cụ sẽ phát triển trong lộ trình",
    icon: "CircleDashed",
    label: "STORE",
    status: "PLANNED",
    progress: 0,
    href: null,
    statusNote: "Đang trong lộ trình phát triển",
    isRoadmap: true,
  }
}

/** Trả về 6 business modules ở dạng đầy đủ cho môi trường dev. */
export function getAllBusinessModules(): readonly BusinessModule[] {
  const toolMap = new Map<number, ToolDefinition>(getAllTools().map((t) => [t.id, t]))
  let roadmapCounter = 0

  return BUSINESS_MODULE_SPECS.map((spec) => {
    const existingTools = spec.toolIds
      .map((id) => toolMap.get(id))
      .filter((t): t is ToolDefinition => Boolean(t))
      .map(asModuleTool)

    const roadmapTools = (BUSINESS_MODULE_ROADMAP[spec.key] ?? []).map((name) =>
      roadmapTool(name, -++roadmapCounter),
    )

    const assets = getAssetTypesByModule(spec.key)
    const tools = [...existingTools, ...roadmapTools]
    const deferred = deferredContentOf(spec.key)

    return {
      key: spec.key,
      order: spec.order,
      name: spec.name,
      purpose: spec.purpose,
      icon: spec.icon,
      tools: deferred ? [] : tools,
      assets: deferred ? [] : assets,
      journey: deferred?.journey ?? null,
      deferredTools: deferred ? tools : [],
      deferredAssets: deferred ? assets : [],
    }
  })
}

/**
 * Lọc module và công cụ theo môi trường:
 * - Dev: hiện đủ 6 module, công cụ lộ trình và toàn bộ asset (Ready/Extend/New).
 * - Production: chỉ hiện công cụ DONE và asset Sẵn (READY); ẩn module nếu rỗng cả hai.
 */
export function getVisibleBusinessModules(isDev: boolean): readonly BusinessModule[] {
  const all = getAllBusinessModules()
  if (isDev) return all

  const toolMap = new Map<number, ToolDefinition>(getAllTools().map((t) => [t.id, t]))

  return all
    .map((mod) => {
      const prodTools = mod.tools.filter((t) => !t.isRoadmap && t.status === "DONE")
      const prodAssets = mod.assets.filter((asset) => {
        const tool = asset.toolId ? toolMap.get(asset.toolId) : null
        return readinessOf(asset, tool) === "READY"
      })

      return {
        ...mod,
        tools: prodTools,
        assets: prodAssets,
        deferredTools: [],
        deferredAssets: [],
      }
    })
    .filter((mod) => mod.journey !== null || mod.tools.length > 0 || mod.assets.length > 0)
}

export function countModuleTools(module: BusinessModule): number {
  return module.tools.length
}

export function countModuleAssets(module: BusinessModule): number {
  return module.assets.length
}

/** Mã công cụ thuộc nội dung PHÁT_TRIỂN_SAU — không tính vào số liệu đầu trang /cong-cu. */
export function deferredToolIds(): ReadonlySet<number> {
  return new Set(BUSINESS_MODULE_SPECS.filter((spec) => deferredContentOf(spec.key)).flatMap((spec) => spec.toolIds))
}
