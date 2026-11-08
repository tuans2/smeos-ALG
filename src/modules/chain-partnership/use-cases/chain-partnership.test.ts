import { describe, it, expect, beforeEach } from "vitest"
import type { IChainPartnershipRepository, ListPartnershipsFilter } from "../domain/partnership-repository.interface"
import type { IInternalChatRepository, CreateConversationParams } from "@/modules/internal-chat/domain/chat-repository.interface"
import type { ChainPartnershipEntity, ProvisionPartnerInput } from "../domain/partnership-entities"
import { ProvisionPartnerAccountUseCase } from "./provision-partner-account"
import { ListChainPartnersUseCase } from "./list-chain-partners"

class InMemoryPartnershipRepository implements IChainPartnershipRepository {
  public partnerships: ChainPartnershipEntity[] = []

  async provisionPartner(input: ProvisionPartnerInput): Promise<{
    partnership: ChainPartnershipEntity
    partnerOrgId: string
    founderUserId: string
  }> {
    const entity: ChainPartnershipEntity = {
      id: "part-rel-1",
      chainOrgId: input.chainOrgId,
      partnerOrgId: "partner-org-1",
      partnerCode: input.partnerCode,
      partnershipType: input.partnershipType ?? "SUBCONTRACTOR",
      status: "ACTIVE",
      capacityDaily: input.capacityDaily ?? 10,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      partnerOrgName: input.partnerStoreName,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.partnerships.push(entity)
    return {
      partnership: entity,
      partnerOrgId: "partner-org-1",
      founderUserId: "founder-user-1",
    }
  }

  async listPartnerships(filter: ListPartnershipsFilter): Promise<{
    items: ChainPartnershipEntity[]
    total: number
  }> {
    return { items: this.partnerships, total: this.partnerships.length }
  }

  async findPartnershipById(id: string): Promise<ChainPartnershipEntity | null> {
    return this.partnerships.find((p) => p.id === id) ?? null
  }

  async updateStatus(id: string, status: Parameters<IChainPartnershipRepository["updateStatus"]>[1]): Promise<ChainPartnershipEntity> {
    const p = this.partnerships.find((x) => x.id === id)
    if (!p) throw new Error("Not found")
    p.status = status
    return p
  }

  public orgTypes: Record<string, string> = { "chain-hq-1": "CHAIN", "store-1": "STORE" }

  async findOrganizationType(orgId: string): Promise<string | null> {
    return this.orgTypes[orgId] ?? null
  }

  async findStoreByIdentifier(identifier: string): ReturnType<IChainPartnershipRepository["findStoreByIdentifier"]> {
    if (identifier === "existing@shop.vn" || identifier === "existing-shop") {
      return { orgId: "existing-org-1", orgName: "Tiệm Hoa Có Sẵn" }
    }
    return null
  }

  async linkExistingStore(params: Parameters<IChainPartnershipRepository["linkExistingStore"]>[0]): Promise<ChainPartnershipEntity> {
    const entity: ChainPartnershipEntity = {
      id: "part-linked-1",
      chainOrgId: params.chainOrgId,
      partnerOrgId: params.partnerOrgId,
      partnerCode: params.partnerCode,
      partnershipType: (params.partnershipType ?? "SUBCONTRACTOR") as ChainPartnershipEntity["partnershipType"],
      status: "ACTIVE",
      capacityDaily: params.capacityDaily ?? 10,
      contactName: params.contactName,
      partnerOrgName: "Tiệm Hoa Có Sẵn",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.partnerships.push(entity)
    return entity
  }
}


class InMemoryChatRepoMock implements Partial<IInternalChatRepository> {
  public createdConversations: CreateConversationParams[] = []

  async createConversation(params: CreateConversationParams): ReturnType<IInternalChatRepository["createConversation"]> {
    this.createdConversations.push(params)
    return { id: "conv-mock-1" } as Awaited<ReturnType<IInternalChatRepository["createConversation"]>>
  }
}

describe("Chain Partnership Use Cases", () => {
  let partnershipRepo: InMemoryPartnershipRepository
  let chatRepo: InMemoryChatRepoMock

  beforeEach(() => {
    partnershipRepo = new InMemoryPartnershipRepository()
    chatRepo = new InMemoryChatRepoMock()
  })

  it("cấp tài khoản đối tác thành công và tự động tạo phòng chat nội bộ", async () => {
    const useCase = new ProvisionPartnerAccountUseCase(
      partnershipRepo,
      chatRepo as unknown as IInternalChatRepository
    )

    const { partnership } = await useCase.execute(
      {
        chainOrgId: "chain-hq-1",
        partnerStoreName: "Tiệm Hoa Cầu Giấy",
        partnerCode: "DT-HN-01",
        contactName: "Nguyễn Văn Chủ Tiệm",
        contactPhone: "0987654321",
        contactEmail: "chutiem@hoacaugiay.vn",
      },
      "coordinator-user-1"
    )

    expect(partnership.partnerCode).toBe("DT-HN-01")
    expect(partnership.partnerOrgName).toBe("Tiệm Hoa Cầu Giấy")
    expect(partnershipRepo.partnerships).toHaveLength(1)

    // Kiểm tra kênh chat nội bộ 1-1 đã được tự động mở
    expect(chatRepo.createdConversations).toHaveLength(1)
    const conv = chatRepo.createdConversations[0]!
    expect(conv.conversationType).toBe("CHAIN_PARTNER")
    expect(conv.participantUserIds).toHaveLength(2)
  })

  it("liệt kê danh sách đối tác của chuỗi", async () => {
    const useCase = new ListChainPartnersUseCase(partnershipRepo)
    partnershipRepo.partnerships.push({
      id: "part-1",
      chainOrgId: "chain-hq-1",
      partnerOrgId: "p-org-1",
      partnerCode: "DT-01",
      partnershipType: "SUBCONTRACTOR",
      status: "ACTIVE",
      capacityDaily: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await useCase.execute({ chainOrgId: "chain-hq-1" })
    expect(result.total).toBe(1)
    expect(result.items[0]!.partnerCode).toBe("DT-01")
  })

  it("Chuỗi liên kết cửa hàng đã có tài khoản; không tự mở phòng chat thay cửa hàng (UJ-01)", async () => {
    const { LinkExistingStoreUseCase } = await import("./link-existing-store")
    const useCase = new LinkExistingStoreUseCase(partnershipRepo)

    const partnership = await useCase.execute({
      chainOrgId: "chain-hq-1",
      identifier: "existing@shop.vn",
      partnerCode: "DT-EXISTING-01",
    })

    expect(partnership.partnerCode).toBe("DT-EXISTING-01")
    expect(partnership.contactEmail).toBeUndefined()
    expect(partnershipRepo.partnerships).toHaveLength(1)
    expect(chatRepo.createdConversations).toHaveLength(0)
  })

  it("tổ chức không phải Chuỗi không liên kết được cửa hàng khác (UJ-01)", async () => {
    const { LinkExistingStoreUseCase } = await import("./link-existing-store")
    const useCase = new LinkExistingStoreUseCase(partnershipRepo)

    await expect(
      useCase.execute({ chainOrgId: "store-1", identifier: "existing-shop", partnerCode: "DT-02" })
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(partnershipRepo.partnerships).toHaveLength(0)
  })

  it("không tìm thấy và tự liên kết chính mình đều là 404 (UJ-01)", async () => {
    const { LinkExistingStoreUseCase } = await import("./link-existing-store")
    const useCase = new LinkExistingStoreUseCase(partnershipRepo)

    await expect(
      useCase.execute({ chainOrgId: "chain-hq-1", identifier: "khong-co", partnerCode: "DT-03" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})


