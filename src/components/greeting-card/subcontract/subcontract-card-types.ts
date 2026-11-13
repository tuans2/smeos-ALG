import type { SubcontractDispatchStatus } from "@/modules/greeting-card/domain/subcontract-order"

/** Kiểu dữ liệu Thẻ gia công của chi nhánh (trang /subcontract/[orderCode]). */

export interface SubcontractCardProduct {
  name: string
  imageUrl?: string | null
  bomItems?: Array<{ name: string; quantity: number; unit: string; role?: string }>
}

export interface DeliveryProofInfo {
  photoUrls: string[]
  note?: string | null | undefined
  deliveredAt?: string | null | undefined
  deliveredByBranch?: string | null | undefined
}

/** Dữ liệu chung của thẻ mà API `GET /public/subcontract/[orderCode]` trả về. */
export interface SubcontractClaimCardProps {
  orderCode: string
  branchId: string
  branchName: string
  product: SubcontractCardProduct
  deliveryAddress: string
  deliveryTime: string
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  isPhoneMasked?: boolean | undefined
  cardMessage?: string | null | undefined
  specialNotes?: string | null | undefined
  subcontractPriceVnd: number
  dispatchStatus: SubcontractDispatchStatus
  claimedByBranchId?: string | null | undefined
  claimedBranchName?: string | null | undefined
  graceExpiresAt?: string | null | undefined
  productionStatus?: string | null | undefined
  qcPhotos?: string[] | undefined
  onClaim: () => Promise<void>
  onCancelClaim: () => Promise<void>
  onCommitEarly?: (() => Promise<void>) | undefined
  onQcUploaded?: (() => void) | undefined
}
