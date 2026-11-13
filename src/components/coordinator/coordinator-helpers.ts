import type { FlowerBomItem, StructuredAddress } from "@/modules/products/domain/product-master-index"
import type { CoordinationOrder } from "./coordinator-api"

export type DetailTab = "SALES_INTAKE" | "BRIEF" | "PRODUCTION" | "QC" | "DELIVERY" | "EXCEPTION" | "CLOSURE"

export const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  MISSING_INFORMATION: "Thiếu thông tin",
  PARTNER_DECLINE: "Đối tác từ chối",
  PARTNER_DELAY: "Đối tác trễ",
  MATERIAL_SHORTAGE: "Thiếu vật liệu",
  QC_FAILURE: "QC không đạt",
  DELIVERY_FAILURE: "Giao thất bại",
  CUSTOMER_CHANGE: "Khách đổi yêu cầu",
  COMMERCIAL_ISSUE: "Vấn đề thương mại",
}

export function asAddress(value: unknown): StructuredAddress | string {
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>
    if (typeof o.street === "string" || typeof o.city === "string") {
      return {
        street: String(o.street ?? ""),
        ward: String(o.ward ?? ""),
        district: String(o.district ?? ""),
        city: String(o.city ?? ""),
      }
    }
  }
  return typeof value === "string" ? value : ""
}

export function priorityOf(order: CoordinationOrder): "STANDARD" | "RUSH" | "VIP" {
  const note = order.internalNote ?? ""
  if (note.startsWith("[Ưu tiên: RUSH]")) return "RUSH"
  if (note.startsWith("[Ưu tiên: VIP]")) return "VIP"
  return "STANDARD"
}

export const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN") : "—")
export const fmtVnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

export function asFlowers(order: CoordinationOrder): FlowerBomItem[] {
  return order.flowers as unknown as FlowerBomItem[]
}

export function bomFlowersOf(order: CoordinationOrder): FlowerBomItem[] {
  return order.product ? order.product.bom.flowers : asFlowers(order)
}
