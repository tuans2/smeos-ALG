/**
 * IChainPartnershipRepository — Port Interface cho quản lý Đối tác Chuỗi.
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type {
  ChainPartnershipEntity,
  ProvisionPartnerInput,
  PartnershipStatus,
} from "../partnership-entities"

export interface ListPartnershipsFilter {
  chainOrgId: string
  status?: PartnershipStatus | undefined
  province?: string | undefined
  query?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface IChainPartnershipRepository {
  provisionPartner(input: ProvisionPartnerInput): Promise<{
    partnership: ChainPartnershipEntity
    partnerOrgId: string
    founderUserId: string
    /** Mật khẩu sinh ngẫu nhiên khi chuỗi không đặt — chỉ trả về đúng một lần (AUD-009). */
    temporaryPassword?: string | undefined
  }>
  listPartnerships(filter: ListPartnershipsFilter): Promise<{
    items: ChainPartnershipEntity[]
    total: number
  }>
  findPartnershipById(id: string): Promise<ChainPartnershipEntity | null>
  updateStatus(id: string, status: PartnershipStatus): Promise<ChainPartnershipEntity>
  /** Loại của tổ chức (`organizations.type`), `null` nếu không có — chỉ Chuỗi được liên kết cửa hàng có sẵn. */
  findOrganizationType(orgId: string): Promise<string | null>
  /**
   * Cửa hàng có sẵn theo slug hoặc email chủ tiệm, khớp CHÍNH XÁC. Không trả thông tin liên hệ của tổ chức kia
   * (audit hành trình C1): bên gọi là tổ chức khác.
   */
  findStoreByIdentifier(identifier: string): Promise<{ orgId: string; orgName: string } | null>
  /** Tạo hoặc dùng lại liên kết của cặp chuỗi–cửa hàng (ADR-012 T-3b); trùng mã đối tác → `conflict`. */
  linkExistingStore(params: {
    chainOrgId: string
    partnerOrgId: string
    partnerCode: string
    partnershipType?: string | undefined
    commissionRate?: number | undefined
    capacityDaily?: number | undefined
    contactName?: string | undefined
  }): Promise<ChainPartnershipEntity>
}
