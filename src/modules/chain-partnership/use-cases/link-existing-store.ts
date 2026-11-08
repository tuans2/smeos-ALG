import { conflict, notFound } from "@/core/http/errors"
import { isChainTier } from "@/core/governance/tier-of"
import type { IChainPartnershipRepository } from "../domain/repositories/chain-partnership-repository.interface"
import { getChainPartnershipRepository } from "../infra/prisma-partnership-repository"
import type { ChainPartnershipEntity, InviteExistingStoreInput } from "../domain/partnership-entities"

/** Lý do từ chối khi tổ chức không phải Chuỗi gọi tính năng liên kết cửa hàng. */
export const CHAIN_ONLY_LINK_MESSAGE =
  "Liên kết cửa hàng chỉ dành cho mô hình Chuỗi cửa hàng. Gửi yêu cầu đổi mô hình cho Admin SaaS duyệt."

/**
 * Chuỗi liên kết một cửa hàng đã có tài khoản.
 *
 * Audit hành trình 06/11/2026 (C1, gói UJ-01): trước đây mọi tổ chức có `F2` gọi được, tìm theo tên trên toàn
 * hệ thống, trả SĐT/email chủ tiệm kia, hồi sinh liên kết đã chấm dứt và kéo chủ tiệm vào phòng chat. Nay:
 * - chỉ tổ chức loại Chuỗi;
 * - không tìm thấy và tự liên kết chính mình trả cùng một 404 (không xác nhận tổ chức tồn tại);
 * - không mở phòng chat thay cửa hàng — phòng chat mở khi cửa hàng chấp nhận lời mời (UJ-10).
 */
export class LinkExistingStoreUseCase {
  constructor(private readonly partnershipRepo: IChainPartnershipRepository = getChainPartnershipRepository()) {}

  async execute(input: InviteExistingStoreInput): Promise<ChainPartnershipEntity> {
    const orgType = await this.partnershipRepo.findOrganizationType(input.chainOrgId)
    if (!isChainTier(orgType)) throw conflict(CHAIN_ONLY_LINK_MESSAGE)

    const store = await this.partnershipRepo.findStoreByIdentifier(input.identifier)
    if (!store || store.orgId === input.chainOrgId) throw notFound()

    return this.partnershipRepo.linkExistingStore({
      chainOrgId: input.chainOrgId,
      partnerOrgId: store.orgId,
      partnerCode: input.partnerCode,
      partnershipType: input.partnershipType,
      commissionRate: input.commissionRate,
      capacityDaily: input.capacityDaily,
      contactName: store.orgName,
    })
  }
}
