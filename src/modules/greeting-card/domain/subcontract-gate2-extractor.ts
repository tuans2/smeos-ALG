/**
 * subcontract-gate2-extractor.ts
 *
 * Tiện ích trích xuất Gate 2 & Bypass Requests từ coordination metadata
 * dùng cho Coordinator Board và Coordinator Order Card.
 */

export interface Gate2StateFromMetadata {
  claimedBranchId?: string | null
  hasQcPhoto?: boolean
  hasShipperInfo?: boolean
  hasDeliveryProof?: boolean
  shipperInfo?: {
    shipperName: string
    shipperPhone: string
    submittedAt: string
  } | null
  bypassRequests?: Record<string, {
    requestedAt?: string
    requestedByBranchId?: string
    requestedByBranchName?: string
    reason?: string
    status?: "PENDING" | "APPROVED" | "REJECTED"
    decisionAt?: string
    decidedBy?: string
    reviewNote?: string
  }> | null
}

export function extractGate2State(coordination: { metadata?: unknown } | null | undefined): Gate2StateFromMetadata | null {
  if (!coordination?.metadata || typeof coordination.metadata !== "object") return null
  const meta = coordination.metadata as Record<string, unknown>
  const subDispatch = meta.subcontract_dispatch as Record<string, unknown> | undefined

  const claimedBranchId = (subDispatch?.claimedBranchId as string | undefined) || null
  const qcPhotos = Array.isArray(meta.qc_photos) ? meta.qc_photos : []
  const shipperInfo = meta.shipper_info as { shipperName: string; shipperPhone: string; submittedAt: string } | undefined
  const deliveryProof = meta.delivery_proof as { note?: string; deliveredAt?: string } | undefined
  const bypassRequests = meta.bypass_requests as Record<string, {
    requestedAt?: string
    requestedByBranchId?: string
    requestedByBranchName?: string
    reason?: string
    status?: "PENDING" | "APPROVED" | "REJECTED"
    decisionAt?: string
    decidedBy?: string
    reviewNote?: string
  }> | undefined

  if (!claimedBranchId && !bypassRequests) return null

  return {
    claimedBranchId,
    hasQcPhoto: qcPhotos.length > 0,
    hasShipperInfo: Boolean(shipperInfo?.shipperName),
    hasDeliveryProof: Boolean(deliveryProof?.deliveredAt),
    shipperInfo: shipperInfo ?? null,
    bypassRequests: bypassRequests ?? null,
  }
}
