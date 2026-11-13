/** `BRANCH` đã bỏ (ADR-012 D-T2): chi nhánh không phải tổ chức con — xem `branches`. */
export type PartnershipType = "SUBCONTRACTOR" | "FRANCHISE"
export type PartnershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "TERMINATED"

export interface ChainPartnershipEntity {
  id: string
  chainOrgId: string
  partnerOrgId: string
  partnerCode: string
  partnershipType: PartnershipType
  status: PartnershipStatus
  commissionRate?: number | undefined
  capacityDaily: number
  contactName?: string | undefined
  contactPhone?: string | undefined
  contactEmail?: string | undefined
  address?: string | undefined
  province?: string | undefined
  district?: string | undefined
  partnerOrgName?: string | undefined
  partnerOrgSlug?: string | undefined
  unlockedTools?: string[] | null | undefined
  createdAt: Date
  updatedAt: Date
}

export interface ProvisionPartnerInput {
  chainOrgId: string
  partnerStoreName: string
  partnerCode: string
  partnershipType?: PartnershipType | undefined
  contactName: string
  contactPhone: string
  contactEmail: string
  password?: string | undefined
  address?: string | undefined
  province?: string | undefined
  district?: string | undefined
  capacityDaily?: number | undefined
  commissionRate?: number | undefined
}

export interface InviteExistingStoreInput {
  chainOrgId: string
  identifier: string // Email đại diện hoặc Mã/Slug của cửa hàng đã tồn tại
  partnerCode: string
  partnershipType?: PartnershipType | undefined
  commissionRate?: number | undefined
  capacityDaily?: number | undefined
}

