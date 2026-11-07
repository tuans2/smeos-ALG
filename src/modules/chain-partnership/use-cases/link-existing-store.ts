import { conflict, notFound } from "@/core/http/errors"
import { isChainTier } from "@/core/governance/tier-of"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import type { IChainPartnershipRepository } from "../domain/repositories/chain-partnership-repository.interface"
import { getChainPartnershipRepository } from "../infra/prisma-partnership-repository"
import type { ChainPartnershipEntity, InviteExistingStoreInput } from "../domain/partnership-entities"
import { isPartnershipInviteExpired, PARTNERSHIP_INVITE_TTL_DAYS } from "../domain/partnership-lifecycle"

/** Lý do từ chối khi tổ chức không phải Chuỗi gọi tính năng liên kết cửa hàng. */
export const CHAIN_ONLY_LINK_MESSAGE =
  "Liên kết cửa hàng chỉ dành cho mô hình Chuỗi cửa hàng. Gửi yêu cầu đổi mô hình cho Admin SaaS duyệt."

export const ALREADY_PARTNER_MESSAGE = "Cửa hàng này đang hợp tác với chuỗi — không cần mời lại."

/**
 * Chuỗi MỜI một cửa hàng đã có tài khoản liên kết làm đối tác.
 *
 * Audit hành trình C1 (UJ-01 chặn, UJ-10 hoàn thiện — UQ2): liên kết tạo ở `PENDING`, KHÔNG mở khoá gì (mọi
 * đường đọc chỉ nhận liên kết `ACTIVE`) cho tới khi cửa hàng đồng ý trong 7 ngày; cửa hàng nhận thông báo.
 * - chỉ tổ chức loại Chuỗi; không tìm thấy và tự mời chính mình trả cùng một 404;
 * - đang hợp tác/tạm ngưng → 409; lời mời cũ (còn hay hết hạn) hoặc đã chấm dứt → gửi lại lời mời mới.
 */
export class LinkExistingStoreUseCase {
  constructor(
    private readonly partnershipRepo: IChainPartnershipRepository = getChainPartnershipRepository(),
    private readonly notify: typeof notifyOrganization = notifyOrganization,
  ) {}

  async execute(input: InviteExistingStoreInput, now: Date = new Date()): Promise<ChainPartnershipEntity> {
    const chain = await this.partnershipRepo.findOrganization(input.chainOrgId)
    if (!isChainTier(chain?.type)) throw conflict(CHAIN_ONLY_LINK_MESSAGE)

    const store = await this.partnershipRepo.findStoreByIdentifier(input.identifier)
    if (!store || store.orgId === input.chainOrgId) throw notFound()

    const existing = await this.partnershipRepo.findLinkStatus(input.chainOrgId, store.orgId)
    if (existing && (existing.status === "ACTIVE" || existing.status === "SUSPENDED")) throw conflict(ALREADY_PARTNER_MESSAGE)
    const resend = existing?.status === "PENDING" && !isPartnershipInviteExpired(existing.validFrom, now)

    const partnership = await this.partnershipRepo.linkExistingStore({
      chainOrgId: input.chainOrgId,
      partnerOrgId: store.orgId,
      partnerCode: input.partnerCode,
      partnershipType: input.partnershipType,
      commissionRate: input.commissionRate,
      capacityDaily: input.capacityDaily,
      contactName: store.orgName,
      status: "PENDING",
    })

    // Không chờ: thông báo lỗi không làm hỏng việc gửi lời mời
    void this.notify({
      organizationId: store.orgId,
      eventKey: "CHAIN_LINK_INVITED",
      title: resend ? "Chuỗi nhắc lại lời mời liên kết" : "Chuỗi mời liên kết",
      message: `Chuỗi ${chain?.name ?? ""} mời cửa hàng liên kết làm đối tác. Vào Cài đặt để đồng ý hoặc từ chối trong ${PARTNERSHIP_INVITE_TTL_DAYS} ngày.`,
      deepLink: "/cai-dat",
    })
    return partnership
  }
}
