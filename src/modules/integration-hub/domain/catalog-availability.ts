/**
 * Trạng thái hiển thị của từng đầu nối với một tổ chức — luật thuần.
 * Thứ tự xét: môi trường → tầng → gói dịch vụ → mức sẵn sàng → đã kết nối.
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"
import type { ConnectorManifest } from "./connector-manifest"
import type { GovernanceMode } from "./integration-governance"

export type ConnectorAvailability =
  | "HIDDEN"
  | "LOCKED_BY_UPPER"
  | "NOT_FOR_TIER"
  | "INHERITED"
  | "NEEDS_UPGRADE"
  | "COMING_SOON"
  | "LEGACY"
  | "CONNECTED"
  | "AVAILABLE"

export interface AvailabilityInput {
  readonly tier: GovernanceTier
  readonly planFeatures: ReadonlySet<string>
  readonly connectedKeys: ReadonlySet<string>
  readonly isProduction: boolean
  /** Tuyến đang bị khoá tính năng (production). */
  readonly isRouteLocked?: (href: string) => boolean
  /** Trang của tích hợp không có trong bản cài này (bản giao theo giai đoạn) → ẩn hẳn, không còn liên kết chết. */
  readonly isRouteOutOfPhase?: (href: string) => boolean
  /** Chế độ hiệu lực do tầng trên đặt cho đầu nối (GĐ3); vắng = ALLOW_OWN. */
  readonly modeOf?: (connectorKey: string) => GovernanceMode
}

export function availabilityOf(manifest: ConnectorManifest, input: AvailabilityInput): ConnectorAvailability {
  if (manifest.devOnly && input.isProduction) return "HIDDEN"
  if (manifest.featureRoute && input.isRouteOutOfPhase?.(manifest.featureRoute)) return "HIDDEN"
  const role = manifest.tiers[input.tier]
  if (role === "NONE") return "HIDDEN"
  const mode = manifest.governable ? (input.modeOf?.(manifest.key) ?? "ALLOW_OWN") : "ALLOW_OWN"
  if (mode === "FORBID") return "LOCKED_BY_UPPER"
  if (role === "INHERIT" || mode === "INHERIT_ONLY") return "INHERITED"
  if (role !== "CONNECT") return "NOT_FOR_TIER"
  if (manifest.planFeature && !input.planFeatures.has(manifest.planFeature)) return "NEEDS_UPGRADE"
  if (manifest.status === "COMING_SOON") return "COMING_SOON"
  if (manifest.featureRoute && input.isRouteLocked?.(manifest.featureRoute)) return "COMING_SOON"
  if (manifest.status === "LEGACY") return "LEGACY"
  // MANAGED: `connectedKeys` gồm cả trạng thái đọc từ phân hệ sẵn có (legacy-connection-status).
  return input.connectedKeys.has(manifest.key) ? "CONNECTED" : "AVAILABLE"
}

/** Có được bắt đầu kết nối mới tại Trung tâm Tích hợp không. */
export function canStartConnect(availability: ConnectorAvailability, manifest: ConnectorManifest): boolean {
  return availability === "AVAILABLE" || (availability === "CONNECTED" && manifest.multiAccount)
}
