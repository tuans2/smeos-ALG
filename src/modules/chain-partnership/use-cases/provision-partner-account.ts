import type { IChainPartnershipRepository } from "../domain/repositories/chain-partnership-repository.interface"
import { getChainPartnershipRepository } from "../infra/prisma-partnership-repository"
import type { IInternalChatRepository } from "@/modules/internal-chat/domain/repositories/chat-repository.interface"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { applyPartnerLinkEffects } from "./partner-link-effects"
import type { ChainPartnershipEntity, ProvisionPartnerInput } from "../domain/partnership-entities"

export class ProvisionPartnerAccountUseCase {
  constructor(
    private readonly partnershipRepo: IChainPartnershipRepository = getChainPartnershipRepository(),
    private readonly chatRepo: IInternalChatRepository = getInternalChatRepository()
  ) {}

  async execute(
    input: ProvisionPartnerInput,
    coordinatorUserId: string
  ): Promise<{ partnership: ChainPartnershipEntity; temporaryPassword?: string | undefined }> {
    // 1. Cấp tài khoản Cửa hàng đối tác & Tạo quan hệ chuỗi
    const result = await this.partnershipRepo.provisionPartner(input)

    // 2. Phòng trao đổi Chuỗi ↔ Cửa hàng đối tác (một phòng cho cả liên kết; mọi nhân viên có quyền ở hai bên vào được)
    await applyPartnerLinkEffects(
      {
        chainOrgId: input.chainOrgId,
        partnerOrgId: result.partnerOrgId,
        status: "ACTIVE",
        actorUserId: coordinatorUserId,
        roomTitle: `Trao đổi: ${input.partnerStoreName} (${input.partnerCode})`,
      },
      this.chatRepo
    )

    return { partnership: result.partnership, temporaryPassword: result.temporaryPassword }
  }
}
