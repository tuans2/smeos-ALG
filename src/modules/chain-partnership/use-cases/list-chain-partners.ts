import type {
  IChainPartnershipRepository,
  ListPartnershipsFilter,
} from "../domain/repositories/chain-partnership-repository.interface"
import { getChainPartnershipRepository } from "../infra/prisma-partnership-repository"
import type { ChainPartnershipEntity } from "../domain/partnership-entities"

export class ListChainPartnersUseCase {
  constructor(
    private readonly partnershipRepo: IChainPartnershipRepository = getChainPartnershipRepository()
  ) {}

  async execute(filter: ListPartnershipsFilter): Promise<{
    items: ChainPartnershipEntity[]
    total: number
  }> {
    return this.partnershipRepo.listPartnerships(filter)
  }
}
